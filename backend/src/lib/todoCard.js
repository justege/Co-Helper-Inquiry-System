import crypto from "crypto";
import { query, queryOne, execute } from "../db.js";
import { getProjectAccess, listProjectPeople, listProjectWatcherIds, mapUserBrief } from "./workspace.js";
import { getTodoById, mapTimeEntry, mapTodo } from "./work.js";
import { createNotification } from "./notifications.js";
import {
  createSignedDownloadUrl,
  createSignedUploadUrl,
  removeObject,
} from "../storage.js";

export const TODO_ATTACHMENT_BUCKET = "todo-attachments";
export const MAX_TODO_ATTACHMENT_BYTES = 15 * 1024 * 1024;
export const MAX_TODO_DESCRIPTION = 20000;

export function parseTodoDescription(value) {
  if (value == null) return { value: null };
  if (typeof value !== "string") return { error: "Description must be text" };
  const body = value.trim();
  if (body.length > MAX_TODO_DESCRIPTION) {
    return { error: `Description must be at most ${MAX_TODO_DESCRIPTION} characters` };
  }
  return { value: body || null };
}

export function parseCommentBody(value) {
  const body = typeof value === "string" ? value.trim() : "";
  if (body.length < 1 || body.length > 8000) return { error: "Comment must be 1–8000 characters" };
  return { body };
}

export function parseItemTitle(value) {
  const title = typeof value === "string" ? value.trim() : "";
  if (title.length < 1 || title.length > 300) return { error: "Item must be 1–300 characters" };
  return { title };
}

function safeFileName(name) {
  const base = String(name || "file")
    .replace(/[/\\]/g, "")
    .replace(/[^\w.\-()+ ]+/g, "_")
    .trim()
    .slice(0, 120);
  return base || "file";
}

function clientNameFromProject(project) {
  return (
    project.client_company_name ||
    [project.client_first_name, project.client_last_name].filter(Boolean).join(" ") ||
    project.client_email ||
    null
  );
}

export function mapComment(row) {
  return {
    id: row.id,
    todoId: row.todo_id,
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

export function mapChecklistItem(row) {
  return {
    id: row.id,
    todoId: row.todo_id,
    title: row.title,
    kind: row.kind === "acceptance" ? "acceptance" : "work",
    done: Boolean(row.done),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    testedAt: row.tested_at ?? null,
    testedBy: row.tested_by ?? null,
  };
}

export function mapAttachment(row, downloadUrl = null) {
  return {
    id: row.id,
    todoId: row.todo_id,
    fileName: row.file_name,
    contentType: row.content_type ?? null,
    byteSize: row.byte_size ?? null,
    createdAt: row.created_at,
    uploadedBy: row.uploaded_by ?? null,
    downloadUrl,
  };
}

export async function getTodoAccess(todoId, user) {
  const todo = await getTodoById(todoId);
  if (!todo) return null;
  const access = await getProjectAccess(todo.project_id, user);
  if (!access) return null;
  if (todo.internal && access.role === "client") return null;
  return { todo, ...access };
}

async function touchTodo(todoId) {
  await execute(`UPDATE todos SET updated_at = NOW() WHERE id = $1`, [todoId]);
}

async function listComments(todoId) {
  return query(
    `SELECT c.*,
            u.email AS author_email,
            u.first_name AS author_first_name,
            u.last_name AS author_last_name,
            u.username AS author_username,
            u.company_name AS author_company_name
     FROM todo_comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.todo_id = $1
     ORDER BY c.created_at ASC`,
    [todoId]
  );
}

export async function getTodoCard(todoId, user) {
  const access = await getTodoAccess(todoId, user);
  if (!access) return null;
  const { todo, project, role } = access;
  const forClient = role === "client";

  const [comments, items, attachments, entries, milestones, people, siblings] = await Promise.all([
    listComments(todoId),
    query(
      `SELECT * FROM todo_checklist_items WHERE todo_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [todoId]
    ),
    query(`SELECT * FROM todo_attachments WHERE todo_id = $1 ORDER BY created_at DESC`, [todoId]),
    query(
      `SELECT * FROM time_entries WHERE todo_id = $1 ORDER BY entry_date DESC, created_at DESC LIMIT 50`,
      [todoId]
    ),
    query(
      `SELECT id, title, done FROM project_milestones WHERE project_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [todo.project_id]
    ),
    listProjectPeople(project),
    query(
      `SELECT id, title FROM todos
       WHERE project_id = $1 AND id <> $2 AND status <> 'invoiced'
       ORDER BY sort_order ASC, created_at ASC
       LIMIT 80`,
      [todo.project_id, todoId]
    ),
  ]);

  const files = await Promise.all(
    attachments.map(async (row) => {
      const signed = await createSignedDownloadUrl(TODO_ATTACHMENT_BUCKET, row.file_path, 3600);
      return mapAttachment(row, signed.data?.signedUrl ?? null);
    })
  );

  const mappedItems = items.map(mapChecklistItem);
  const canAccept = role === "client" || role === "owner" || role === "admin";

  return {
    role,
    meId: user.id,
    canWork: role !== "client",
    canSetNow: role === "owner" || role === "admin",
    canEditMeta: role !== "client",
    canTest: canAccept,
    canAccept,
    locked: todo.status === "invoiced",
    todo: {
      ...mapTodo(todo, { forClient }),
      projectName: project.name,
      clientName: clientNameFromProject(project),
      clientId: project.client_id,
    },
    comments: comments.map(mapComment),
    items: mappedItems.filter((item) => item.kind !== "acceptance"),
    criteria: mappedItems.filter((item) => item.kind === "acceptance"),
    attachments: files,
    timeEntries: (forClient ? entries.filter((e) => e.billable) : entries).map(mapTimeEntry),
    milestones: milestones.map((row) => ({
      id: row.id,
      title: row.title,
      done: Boolean(row.done),
    })),
    currentMilestoneId: project.current_milestone_id ?? null,
    people,
    siblings: siblings.map((row) => ({ id: row.id, title: row.title })),
  };
}

async function listAssigneeIds(todoId) {
  const rows = await query(`SELECT user_id FROM todo_assignees WHERE todo_id = $1`, [todoId]);
  return rows.map((row) => row.user_id);
}

async function notifyTodoWatchers({ todo, project, authorId, type, title, body }) {
  const extra = await listAssigneeIds(todo.id);
  if (todo.assignee_id) extra.push(todo.assignee_id);
  const targets = await listProjectWatcherIds(project, extra);
  await Promise.all(
    targets
      .filter((userId) => userId && userId !== authorId)
      .map((userId) =>
        createNotification({
          userId,
          type,
          title,
          body,
          payload: { todoId: todo.id, projectId: todo.project_id },
        })
      )
  );
}

export async function addTodoComment({ todo, project, user, body }) {
  const row = await queryOne(
    `INSERT INTO todo_comments (todo_id, author_id, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [todo.id, user.id, body]
  );
  await touchTodo(todo.id);
  await notifyTodoWatchers({
    todo,
    project,
    authorId: user.id,
    type: "todo.comment",
    title: `Comment on ${todo.title}`,
    body: body.slice(0, 140),
  });
  const withAuthor = {
    ...row,
    author_id: user.id,
    author_email: user.email,
    author_first_name: user.first_name,
    author_last_name: user.last_name,
    author_username: user.username,
    author_company_name: user.company_name,
  };
  return mapComment(withAuthor);
}

export async function deleteTodoComment({ commentId, todoId, user, role }) {
  const row = await queryOne(`SELECT * FROM todo_comments WHERE id = $1 AND todo_id = $2`, [
    commentId,
    todoId,
  ]);
  if (!row) return { error: "Comment not found", status: 404 };
  if (row.author_id !== user.id && role !== "owner" && role !== "admin") {
    return { error: "You can only remove your own comments", status: 403 };
  }
  await execute(`DELETE FROM todo_comments WHERE id = $1`, [commentId]);
  await touchTodo(todoId);
  return { ok: true };
}

export async function addChecklistItem({ todo, title, kind = "work" }) {
  const itemKind = kind === "acceptance" ? "acceptance" : "work";
  const next = await queryOne(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM todo_checklist_items WHERE todo_id = $1`,
    [todo.id]
  );
  const row = await queryOne(
    `INSERT INTO todo_checklist_items (todo_id, title, sort_order, kind)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [todo.id, title, next?.next ?? 1, itemKind]
  );
  await touchTodo(todo.id);
  return mapChecklistItem(row);
}

export async function updateChecklistItem({ itemId, todoId, title, done, tested, userId, role }) {
  const existing = await queryOne(
    `SELECT * FROM todo_checklist_items WHERE id = $1 AND todo_id = $2`,
    [itemId, todoId]
  );
  if (!existing) return null;
  const kind = existing.kind === "acceptance" ? "acceptance" : "work";
  const canTest = role === "client" || role === "owner" || role === "admin";
  if (role === "client" && (kind !== "acceptance" || tested === undefined)) {
    const err = new Error("The client tests acceptance criteria on this to-do");
    err.status = 403;
    throw err;
  }
  if (kind === "work" && tested !== undefined) {
    const err = new Error("Work items are not tested by the client");
    err.status = 400;
    throw err;
  }
  let testedAt = existing.tested_at;
  let testedBy = existing.tested_by;
  if (kind === "acceptance" && tested !== undefined) {
    if (!canTest) {
      const err = new Error("Only the client can test acceptance criteria");
      err.status = 403;
      throw err;
    }
    if (tested) {
      testedAt = new Date();
      testedBy = userId;
    } else {
      testedAt = null;
      testedBy = null;
      await execute(
        `UPDATE todos SET accepted_at = NULL, accepted_by = NULL, updated_at = NOW()
         WHERE id = $1 AND accepted_at IS NOT NULL AND status <> 'invoiced'`,
        [todoId]
      );
    }
  }
  const row = await queryOne(
    `UPDATE todo_checklist_items
     SET title = $3, done = $4, tested_at = $5, tested_by = $6
     WHERE id = $1 AND todo_id = $2
     RETURNING *`,
    [
      itemId,
      todoId,
      title ?? existing.title,
      done == null ? existing.done : Boolean(done),
      testedAt,
      testedBy,
    ]
  );
  await touchTodo(todoId);
  return mapChecklistItem(row);
}

export async function deleteChecklistItem({ itemId, todoId }) {
  const row = await queryOne(
    `DELETE FROM todo_checklist_items WHERE id = $1 AND todo_id = $2 RETURNING id`,
    [itemId, todoId]
  );
  if (row) await touchTodo(todoId);
  return Boolean(row);
}

export async function markTodoReady({ todo, project, user }) {
  const stats = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM todo_checklist_items WHERE todo_id = $1 AND kind = 'acceptance'`,
    [todo.id]
  );
  if (!stats?.total) {
    const err = new Error("Add at least one acceptance criterion before sending this to the client");
    err.status = 400;
    throw err;
  }
  await execute(
    `UPDATE todos SET status = 'waiting_on_client', updated_at = NOW()
     WHERE id = $1 AND status <> 'invoiced'`,
    [todo.id]
  );
  await notifyTodoWatchers({
    todo,
    project,
    authorId: user.id,
    type: "todo.ready",
    title: `Ready to test: ${todo.title}`,
    body: "Acceptance criteria are ready for the client to test.",
  });
  return getTodoById(todo.id);
}

export async function acceptTodo({ todo, project, user, role }) {
  if (role !== "client" && role !== "owner" && role !== "admin") {
    const err = new Error("The client accepts this to-do after testing it");
    err.status = 403;
    throw err;
  }
  const stats = await queryOne(
    `SELECT
       COUNT(*) FILTER (WHERE kind = 'acceptance')::int AS total,
       COUNT(*) FILTER (WHERE kind = 'acceptance' AND tested_at IS NOT NULL)::int AS tested
     FROM todo_checklist_items WHERE todo_id = $1`,
    [todo.id]
  );
  if (!stats?.total) {
    const err = new Error("Add at least one acceptance criterion before accepting this to-do");
    err.status = 400;
    throw err;
  }
  if (stats.tested < stats.total) {
    const err = new Error("Test every acceptance criterion before accepting");
    err.status = 400;
    throw err;
  }
  await execute(
    `UPDATE todos
     SET status = 'done', accepted_at = NOW(), accepted_by = $1, updated_at = NOW()
     WHERE id = $2 AND status <> 'invoiced'`,
    [user.id, todo.id]
  );
  await notifyTodoWatchers({
    todo,
    project,
    authorId: user.id,
    type: "todo.accepted",
    title: `Accepted: ${todo.title}`,
    body: "The client accepted this to-do.",
  });
  return getTodoById(todo.id);
}

export async function signTodoAttachment({ todo, fileName, contentType, size }) {
  if (size != null && (!Number.isFinite(Number(size)) || Number(size) <= 0)) {
    return { error: "File size is required", status: 400 };
  }
  if (Number(size) > MAX_TODO_ATTACHMENT_BYTES) {
    return { error: "Files must be 15MB or smaller", status: 400 };
  }
  const name = safeFileName(fileName);
  const filePath = `${todo.workspace_id}/${todo.id}/${crypto.randomUUID()}-${name}`;
  const signed = await createSignedUploadUrl(TODO_ATTACHMENT_BUCKET, filePath, {
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

export async function confirmTodoAttachment({ todo, user, filePath, fileName, contentType, size }) {
  const prefix = `${todo.workspace_id}/${todo.id}/`;
  if (typeof filePath !== "string" || !filePath.startsWith(prefix) || filePath.includes("..")) {
    return { error: "Invalid file path", status: 400 };
  }
  if (Number(size) > MAX_TODO_ATTACHMENT_BYTES) {
    return { error: "Files must be 15MB or smaller", status: 400 };
  }
  const row = await queryOne(
    `INSERT INTO todo_attachments
       (todo_id, workspace_id, uploaded_by, file_path, file_name, content_type, byte_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      todo.id,
      todo.workspace_id,
      user.id,
      filePath,
      safeFileName(fileName),
      typeof contentType === "string" ? contentType.slice(0, 200) : null,
      Number.isFinite(Number(size)) ? Math.round(Number(size)) : null,
    ]
  );
  await touchTodo(todo.id);
  const signed = await createSignedDownloadUrl(TODO_ATTACHMENT_BUCKET, row.file_path, 3600);
  return mapAttachment(row, signed.data?.signedUrl ?? null);
}

export async function deleteTodoAttachment({ attachmentId, todoId }) {
  const row = await queryOne(
    `DELETE FROM todo_attachments WHERE id = $1 AND todo_id = $2 RETURNING *`,
    [attachmentId, todoId]
  );
  if (!row) return null;
  await removeObject(TODO_ATTACHMENT_BUCKET, row.file_path).catch(() => null);
  await touchTodo(todoId);
  return row;
}

export async function removeTodoFiles(todoId) {
  const files = await query(`SELECT file_path FROM todo_attachments WHERE todo_id = $1`, [todoId]);
  await Promise.all(
    files.map((f) => removeObject(TODO_ATTACHMENT_BUCKET, f.file_path).catch(() => null))
  );
}
