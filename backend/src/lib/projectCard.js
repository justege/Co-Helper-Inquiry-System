import crypto from "crypto";
import { query, queryOne, execute } from "../db.js";
import { getProjectAccess, listProjectWatcherIds, mapUserBrief } from "./workspace.js";
import { createNotification } from "./notifications.js";
import {
  createSignedDownloadUrl,
  createSignedUploadUrl,
  removeObject,
} from "../storage.js";
import { parseCommentBody, parseItemTitle } from "./todoCard.js";
import { mapTodo, TODO_EXTRAS } from "./work.js";

export const PROJECT_ATTACHMENT_BUCKET = "project-attachments";
export const MAX_PROJECT_ATTACHMENT_BYTES = 15 * 1024 * 1024;
export const PROJECT_STATUSES = ["backlog", "in_progress", "waiting_on_client", "done"];
export const PROJECT_PRIORITIES = ["low", "medium", "high"];
export const BLOCKER_KINDS = ["client", "scope", "dependency", "internal", "other"];

export { parseCommentBody, parseItemTitle };

export function mapSqlDate(value) {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function safeFileName(name) {
  const base = String(name || "file")
    .replace(/[/\\]/g, "")
    .replace(/[^\w.\-()+ ]+/g, "_")
    .trim()
    .slice(0, 120);
  return base || "file";
}

async function touchProject(projectId) {
  await execute(`UPDATE projects SET updated_at = NOW() WHERE id = $1`, [projectId]);
}

export function mapProjectComment(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    milestoneId: row.milestone_id ?? null,
    body: row.body,
    createdAt: row.created_at,
    author: mapUserBrief({
      id: row.author_id,
      email: row.author_email,
      first_name: row.author_first_name,
      last_name: row.author_last_name,
      username: row.author_username,
      company_name: row.author_company_name,
    }),
  };
}

export function mapProjectGoal(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    done: Boolean(row.done),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function daysBetween(from, to) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function mapProjectMilestone(row) {
  const dueAt = mapSqlDate(row.due_at);
  const completedAt = mapSqlDate(row.completed_at);
  const done = Boolean(row.done);
  const today = todayStamp();
  let late = false;
  let delayedDays = null;
  if (dueAt) {
    if (done && completedAt && completedAt > dueAt) {
      late = true;
      delayedDays = daysBetween(dueAt, completedAt);
    } else if (!done && today > dueAt) {
      late = true;
      delayedDays = daysBetween(dueAt, today);
    }
  }
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    dueAt,
    done,
    completedAt,
    late,
    delayedDays,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    todoCount: Number(row.todo_count) || 0,
    openTodoCount: Number(row.open_todo_count) || 0,
    openBlockerCount: Number(row.open_blocker_count) || 0,
  };
}

export function mapProjectBlocker(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    milestoneId: row.milestone_id ?? null,
    todoId: row.todo_id ?? null,
    todoTitle: row.todo_title ?? null,
    title: row.title,
    body: row.body ?? null,
    kind: row.kind || "other",
    status: row.status || "open",
    delayedDays: row.delayed_days != null ? Number(row.delayed_days) : null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
    author: mapUserBrief({
      id: row.created_by,
      email: row.author_email,
      first_name: row.author_first_name,
      last_name: row.author_last_name,
      username: row.author_username,
      company_name: row.author_company_name,
    }),
  };
}

export function mapProjectAttachment(row, downloadUrl = null) {
  return {
    id: row.id,
    projectId: row.project_id,
    fileName: row.file_name,
    contentType: row.content_type ?? null,
    byteSize: row.byte_size ?? null,
    createdAt: row.created_at,
    uploadedBy: row.uploaded_by ?? null,
    downloadUrl,
  };
}

async function listProjectComments(projectId) {
  return query(
    `SELECT c.*,
            u.email AS author_email,
            u.first_name AS author_first_name,
            u.last_name AS author_last_name,
            u.username AS author_username,
            u.company_name AS author_company_name
     FROM project_comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.project_id = $1
     ORDER BY c.created_at ASC`,
    [projectId]
  );
}

const MILESTONE_SELECT = `
  SELECT m.*,
         COALESCE((SELECT COUNT(*) FROM todos t WHERE t.milestone_id = m.id), 0)::int AS todo_count,
         COALESCE((
           SELECT COUNT(*) FROM todos t
           WHERE t.milestone_id = m.id AND t.status NOT IN ('done', 'invoiced')
         ), 0)::int AS open_todo_count,
         COALESCE((
           SELECT COUNT(*) FROM project_blockers b
           WHERE b.milestone_id = m.id AND b.status = 'open'
         ), 0)::int AS open_blocker_count
  FROM project_milestones m
`;

const BLOCKER_SELECT = `
  SELECT b.*,
         t.title AS todo_title,
         u.email AS author_email,
         u.first_name AS author_first_name,
         u.last_name AS author_last_name,
         u.username AS author_username,
         u.company_name AS author_company_name
  FROM project_blockers b
  LEFT JOIN todos t ON t.id = b.todo_id
  LEFT JOIN users u ON u.id = b.created_by
`;

export async function getMilestoneById(id) {
  return queryOne(`${MILESTONE_SELECT} WHERE m.id = $1`, [id]);
}

export async function listProjectMilestones(projectId) {
  return query(`${MILESTONE_SELECT} WHERE m.project_id = $1 ORDER BY m.sort_order ASC, m.created_at ASC`, [
    projectId,
  ]);
}

export async function listProjectBlockers(projectId, milestoneId) {
  if (milestoneId) {
    return query(
      `${BLOCKER_SELECT} WHERE b.project_id = $1 AND b.milestone_id = $2 ORDER BY b.created_at DESC`,
      [projectId, milestoneId]
    );
  }
  return query(`${BLOCKER_SELECT} WHERE b.project_id = $1 ORDER BY b.created_at DESC`, [projectId]);
}

export async function getProjectTicket(projectId, user) {
  const access = await getProjectAccess(projectId, user);
  if (!access) return null;

  const [goals, milestones, comments, attachments, blockers] = await Promise.all([
    query(
      `SELECT * FROM project_goals WHERE project_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [projectId]
    ),
    listProjectMilestones(projectId),
    listProjectComments(projectId),
    query(
      `SELECT * FROM project_attachments WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId]
    ),
    listProjectBlockers(projectId),
  ]);

  const files = await Promise.all(
    attachments.map(async (row) => {
      const signed = await createSignedDownloadUrl(PROJECT_ATTACHMENT_BUCKET, row.file_path, 3600);
      return mapProjectAttachment(row, signed.data?.signedUrl ?? null);
    })
  );

  return {
    access,
    goals: goals.map(mapProjectGoal),
    milestones: milestones.map(mapProjectMilestone),
    comments: comments.map(mapProjectComment),
    attachments: files,
    blockers: blockers.map(mapProjectBlocker),
  };
}

export async function getMilestoneDetail({ projectId, milestoneId, user }) {
  const access = await getProjectAccess(projectId, user);
  if (!access) return null;
  const milestone = await getMilestoneById(milestoneId);
  if (!milestone || milestone.project_id !== projectId) return { error: "Milestone not found", status: 404 };

  const forClient = access.role === "client";
  const [todos, projectComments, todoComments, blockers] = await Promise.all([
    query(
      `SELECT t.*, ${TODO_EXTRAS}
       FROM todos t
       WHERE t.project_id = $1 AND t.milestone_id = $2
       ORDER BY t.sort_order ASC, t.created_at ASC`,
      [projectId, milestoneId]
    ),
    query(
      `SELECT c.*,
              u.email AS author_email,
              u.first_name AS author_first_name,
              u.last_name AS author_last_name,
              u.username AS author_username,
              u.company_name AS author_company_name
       FROM project_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.project_id = $1 AND c.milestone_id = $2
       ORDER BY c.created_at ASC`,
      [projectId, milestoneId]
    ),
    query(
      `SELECT c.*,
              t.id AS todo_id,
              t.title AS todo_title,
              t.internal AS todo_internal,
              u.email AS author_email,
              u.first_name AS author_first_name,
              u.last_name AS author_last_name,
              u.username AS author_username,
              u.company_name AS author_company_name
       FROM todo_comments c
       JOIN todos t ON t.id = c.todo_id
       JOIN users u ON u.id = c.author_id
       WHERE t.project_id = $1 AND t.milestone_id = $2
       ORDER BY c.created_at ASC`,
      [projectId, milestoneId]
    ),
    listProjectBlockers(projectId, milestoneId),
  ]);

  const visibleTodos = forClient ? todos.filter((row) => !row.internal) : todos;
  const visibleTodoComments = forClient
    ? todoComments.filter((row) => !row.todo_internal)
    : todoComments;

  const conversations = [
    ...projectComments.map((row) => ({
      id: `milestone:${row.id}`,
      source: "milestone",
      commentId: row.id,
      todoId: null,
      todoTitle: null,
      body: row.body,
      createdAt: row.created_at,
      author: mapProjectComment(row).author,
    })),
    ...visibleTodoComments.map((row) => ({
      id: `todo:${row.id}`,
      source: "todo",
      commentId: row.id,
      todoId: row.todo_id,
      todoTitle: row.todo_title,
      body: row.body,
      createdAt: row.created_at,
      author: mapUserBrief({
        id: row.author_id,
        email: row.author_email,
        first_name: row.author_first_name,
        last_name: row.author_last_name,
        username: row.author_username,
        company_name: row.author_company_name,
      }),
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return {
    access,
    milestone: mapProjectMilestone(milestone),
    todos: visibleTodos.map((row) => mapTodo(row, { forClient })),
    conversations,
    blockers: blockers.map(mapProjectBlocker),
  };
}

async function notifyProjectWatchers({ project, authorId, type, title, body }) {
  const targets = await listProjectWatcherIds(project);
  await Promise.all(
    targets
      .filter((userId) => userId && userId !== authorId)
      .map((userId) =>
        createNotification({
          userId,
          type,
          title,
          body,
          payload: { projectId: project.id },
        })
      )
  );
}

export async function addProjectComment({ project, user, body, milestoneId }) {
  let milestone = null;
  if (milestoneId) {
    milestone = await queryOne(`SELECT id FROM project_milestones WHERE id = $1 AND project_id = $2`, [
      milestoneId,
      project.id,
    ]);
    if (!milestone) {
      const err = new Error("Milestone not found on this project");
      err.status = 400;
      throw err;
    }
  }
  const row = await queryOne(
    `INSERT INTO project_comments (project_id, author_id, body, milestone_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [project.id, user.id, body, milestone?.id ?? null]
  );
  await touchProject(project.id);
  await notifyProjectWatchers({
    project,
    authorId: user.id,
    type: "project.comment",
    title: `Comment on ${project.name}`,
    body: body.slice(0, 140),
  });
  return mapProjectComment({
    ...row,
    author_id: user.id,
    author_email: user.email,
    author_first_name: user.first_name,
    author_last_name: user.last_name,
    author_username: user.username,
    author_company_name: user.company_name,
  });
}

export async function deleteProjectComment({ commentId, projectId, user, role }) {
  const row = await queryOne(`SELECT * FROM project_comments WHERE id = $1 AND project_id = $2`, [
    commentId,
    projectId,
  ]);
  if (!row) return { error: "Comment not found", status: 404 };
  if (row.author_id !== user.id && role !== "owner" && role !== "admin") {
    return { error: "You can only remove your own comments", status: 403 };
  }
  await execute(`DELETE FROM project_comments WHERE id = $1`, [commentId]);
  await touchProject(projectId);
  return { ok: true };
}

export async function addProjectGoal({ project, title }) {
  const next = await queryOne(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM project_goals WHERE project_id = $1`,
    [project.id]
  );
  const row = await queryOne(
    `INSERT INTO project_goals (project_id, title, sort_order)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [project.id, title, next?.next ?? 1]
  );
  await touchProject(project.id);
  return mapProjectGoal(row);
}

export async function updateProjectGoal({ goalId, projectId, title, done }) {
  const existing = await queryOne(
    `SELECT * FROM project_goals WHERE id = $1 AND project_id = $2`,
    [goalId, projectId]
  );
  if (!existing) return null;
  const row = await queryOne(
    `UPDATE project_goals
     SET title = $3, done = $4
     WHERE id = $1 AND project_id = $2
     RETURNING *`,
    [goalId, projectId, title ?? existing.title, done == null ? existing.done : Boolean(done)]
  );
  await touchProject(projectId);
  return mapProjectGoal(row);
}

export async function deleteProjectGoal({ goalId, projectId }) {
  const row = await queryOne(
    `DELETE FROM project_goals WHERE id = $1 AND project_id = $2 RETURNING id`,
    [goalId, projectId]
  );
  if (row) await touchProject(projectId);
  return Boolean(row);
}

export function parseMilestoneDue(value) {
  if (value === undefined) return { skip: true };
  if (value === null || value === "") return { value: null };
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { error: "dueAt must be YYYY-MM-DD" };
  return { value: s };
}

export async function addProjectMilestone({ project, title, dueAt }) {
  const next = await queryOne(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM project_milestones WHERE project_id = $1`,
    [project.id]
  );
  const inserted = await queryOne(
    `INSERT INTO project_milestones (project_id, title, due_at, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [project.id, title, dueAt ?? null, next?.next ?? 1]
  );
  await touchProject(project.id);
  return mapProjectMilestone(await getMilestoneById(inserted.id));
}

export async function updateProjectMilestone({ milestoneId, projectId, title, dueAt, done, completedAt }) {
  const existing = await queryOne(
    `SELECT * FROM project_milestones WHERE id = $1 AND project_id = $2`,
    [milestoneId, projectId]
  );
  if (!existing) return null;
  const nextDone = done == null ? existing.done : Boolean(done);
  let nextCompleted = existing.completed_at;
  if (completedAt !== undefined) {
    nextCompleted = completedAt;
  } else if (done != null) {
    if (nextDone && !existing.done) nextCompleted = todayStamp();
    if (!nextDone) nextCompleted = null;
  }
  await queryOne(
    `UPDATE project_milestones
     SET title = $3,
         due_at = $4,
         done = $5,
         completed_at = $6
     WHERE id = $1 AND project_id = $2
     RETURNING id`,
    [
      milestoneId,
      projectId,
      title ?? existing.title,
      dueAt === undefined ? existing.due_at : dueAt,
      nextDone,
      nextCompleted,
    ]
  );
  await touchProject(projectId);
  return mapProjectMilestone(await getMilestoneById(milestoneId));
}

export function parseBlockerKind(value) {
  if (value == null || value === "") return { value: "other" };
  if (!BLOCKER_KINDS.includes(value)) return { error: "kind must be client, scope, dependency, internal, or other" };
  return { value };
}

export function parseDelayedDays(value) {
  if (value === undefined) return { skip: true };
  if (value === null || value === "") return { value: null };
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0 || n > 3650) return { error: "delayedDays must be 0–3650" };
  return { value: n };
}

async function assertMilestoneOnProject(projectId, milestoneId) {
  if (!milestoneId) return null;
  const row = await queryOne(`SELECT id FROM project_milestones WHERE id = $1 AND project_id = $2`, [
    milestoneId,
    projectId,
  ]);
  if (!row) {
    const err = new Error("Milestone not found on this project");
    err.status = 400;
    throw err;
  }
  return row;
}

async function assertTodoOnProject(projectId, todoId) {
  if (!todoId) return null;
  const row = await queryOne(`SELECT id, title FROM todos WHERE id = $1 AND project_id = $2`, [
    todoId,
    projectId,
  ]);
  if (!row) {
    const err = new Error("To-do not found on this project");
    err.status = 400;
    throw err;
  }
  return row;
}

export async function addProjectBlocker({
  project,
  user,
  title,
  body,
  kind,
  delayedDays,
  milestoneId,
  todoId,
}) {
  await assertMilestoneOnProject(project.id, milestoneId);
  await assertTodoOnProject(project.id, todoId);
  const inserted = await queryOne(
    `INSERT INTO project_blockers
       (project_id, milestone_id, todo_id, title, body, kind, delayed_days, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      project.id,
      milestoneId || null,
      todoId || null,
      title,
      body || null,
      kind || "other",
      delayedDays ?? null,
      user.id,
    ]
  );
  await touchProject(project.id);
  const row = await queryOne(`${BLOCKER_SELECT} WHERE b.id = $1`, [inserted.id]);
  return mapProjectBlocker(row);
}

export async function updateProjectBlocker({
  blockerId,
  projectId,
  title,
  body,
  kind,
  status,
  delayedDays,
  milestoneId,
  todoId,
}) {
  const existing = await queryOne(`SELECT * FROM project_blockers WHERE id = $1 AND project_id = $2`, [
    blockerId,
    projectId,
  ]);
  if (!existing) return null;
  if (milestoneId !== undefined) await assertMilestoneOnProject(projectId, milestoneId);
  if (todoId !== undefined) await assertTodoOnProject(projectId, todoId);
  const nextStatus = status == null ? existing.status : status === "resolved" ? "resolved" : "open";
  let resolvedAt = existing.resolved_at;
  if (status != null) {
    if (nextStatus === "resolved" && existing.status !== "resolved") resolvedAt = new Date();
    if (nextStatus === "open") resolvedAt = null;
  }
  await queryOne(
    `UPDATE project_blockers
     SET title = $3,
         body = $4,
         kind = $5,
         status = $6,
         delayed_days = $7,
         milestone_id = $8,
         todo_id = $9,
         resolved_at = $10
     WHERE id = $1 AND project_id = $2
     RETURNING id`,
    [
      blockerId,
      projectId,
      title ?? existing.title,
      body === undefined ? existing.body : body,
      kind ?? existing.kind,
      nextStatus,
      delayedDays === undefined ? existing.delayed_days : delayedDays,
      milestoneId === undefined ? existing.milestone_id : milestoneId,
      todoId === undefined ? existing.todo_id : todoId,
      resolvedAt,
    ]
  );
  await touchProject(projectId);
  const row = await queryOne(`${BLOCKER_SELECT} WHERE b.id = $1`, [blockerId]);
  return mapProjectBlocker(row);
}

export async function deleteProjectBlocker({ blockerId, projectId }) {
  const row = await queryOne(
    `DELETE FROM project_blockers WHERE id = $1 AND project_id = $2 RETURNING id`,
    [blockerId, projectId]
  );
  if (row) await touchProject(projectId);
  return Boolean(row);
}

export async function deleteProjectMilestone({ milestoneId, projectId }) {
  const row = await queryOne(
    `DELETE FROM project_milestones WHERE id = $1 AND project_id = $2 RETURNING id`,
    [milestoneId, projectId]
  );
  if (row) await touchProject(projectId);
  return Boolean(row);
}

export async function signProjectAttachment({ project, fileName, contentType, size }) {
  if (size != null && (!Number.isFinite(Number(size)) || Number(size) <= 0)) {
    return { error: "File size is required", status: 400 };
  }
  if (Number(size) > MAX_PROJECT_ATTACHMENT_BYTES) {
    return { error: "Files must be 15MB or smaller", status: 400 };
  }
  const name = safeFileName(fileName);
  const filePath = `${project.workspace_id}/${project.id}/${crypto.randomUUID()}-${name}`;
  const signed = await createSignedUploadUrl(PROJECT_ATTACHMENT_BUCKET, filePath, {
    contentType: contentType || undefined,
  });
  if (signed.error || !signed.data?.signedUrl) {
    return { error: "Could not create upload URL", status: 500 };
  }
  return {
    uploadUrl: signed.data.signedUrl,
    filePath,
    fileName: name,
    contentType: contentType || null,
  };
}

export async function confirmProjectAttachment({ project, user, filePath, fileName, contentType, size }) {
  const prefix = `${project.workspace_id}/${project.id}/`;
  if (typeof filePath !== "string" || !filePath.startsWith(prefix) || filePath.includes("..")) {
    return { error: "Invalid file path", status: 400 };
  }
  if (Number(size) > MAX_PROJECT_ATTACHMENT_BYTES) {
    return { error: "Files must be 15MB or smaller", status: 400 };
  }
  const row = await queryOne(
    `INSERT INTO project_attachments
       (project_id, workspace_id, uploaded_by, file_path, file_name, content_type, byte_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      project.id,
      project.workspace_id,
      user.id,
      filePath,
      safeFileName(fileName),
      typeof contentType === "string" ? contentType.slice(0, 200) : null,
      Number.isFinite(Number(size)) ? Math.round(Number(size)) : null,
    ]
  );
  await touchProject(project.id);
  const signed = await createSignedDownloadUrl(PROJECT_ATTACHMENT_BUCKET, row.file_path, 3600);
  return mapProjectAttachment(row, signed.data?.signedUrl ?? null);
}

export async function deleteProjectAttachment({ attachmentId, projectId }) {
  const row = await queryOne(
    `DELETE FROM project_attachments WHERE id = $1 AND project_id = $2 RETURNING *`,
    [attachmentId, projectId]
  );
  if (!row) return null;
  await removeObject(PROJECT_ATTACHMENT_BUCKET, row.file_path).catch(() => null);
  await touchProject(projectId);
  return row;
}

export async function removeProjectFiles(projectId) {
  const files = await query(`SELECT file_path FROM project_attachments WHERE project_id = $1`, [
    projectId,
  ]);
  await Promise.all(
    files.map((f) => removeObject(PROJECT_ATTACHMENT_BUCKET, f.file_path).catch(() => null))
  );
}
