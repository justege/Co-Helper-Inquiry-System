import { query, queryOne, execute, withTransaction } from "../db.js";
import { mapClient, mapUserBrief, getProjectAccess, getWorkspaceByOwner, assertProjectAssignee, listProjectPeople } from "./workspace.js";

export const TODO_STATUSES = ["backlog", "in_progress", "waiting_on_client", "done", "invoiced"];
export const TODO_PRIORITIES = ["low", "medium", "high"];
export const TODO_COLORS = ["violet", "blue", "teal", "green", "yellow", "orange", "pink", "slate"];

function mapSqlDate(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const shifted = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function parseJsonList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseDateInput(value) {
  if (value == null || value === "") return { value: null };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: "Date must be YYYY-MM-DD" };
  }
  return { value };
}

export function parseTodoTags(value) {
  if (value == null) return { skip: true };
  if (!Array.isArray(value)) return { error: "Tags must be a list" };
  const tags = [...new Set(value.map((item) => String(item || "").trim().slice(0, 24)).filter(Boolean))].slice(0, 8);
  return { value: tags };
}

export function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function asNullableNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parsePositiveHours(value, { required = false, max = 10000 } = {}) {
  if (value == null || value === "") {
    return required ? { error: "Hours are required" } : { value: null };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > max) {
    return { error: `Hours must be between 0 and ${max}` };
  }
  return { value: Math.round(n * 100) / 100 };
}

export function weekStartDate(timeZone = "Europe/Istanbul") {
  try {
    const now = new Date();
    const local = new Date(now.toLocaleString("en-US", { timeZone }));
    const day = local.getDay();
    const offset = day === 0 ? 6 : day - 1;
    local.setHours(0, 0, 0, 0);
    local.setDate(local.getDate() - offset);
    const y = local.getFullYear();
    const m = String(local.getMonth() + 1).padStart(2, "0");
    const d = String(local.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    const now = new Date();
    const day = now.getUTCDay();
    const offset = day === 0 ? 6 : day - 1;
    now.setUTCHours(0, 0, 0, 0);
    now.setUTCDate(now.getUTCDate() - offset);
    return now.toISOString().slice(0, 10);
  }
}

export function remainingHours(estimate, logged) {
  if (estimate == null) return null;
  return Math.max(0, asNumber(estimate) - asNumber(logged));
}

function parseAssignees(row) {
  let raw = row?.assignees_json;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  const list = Array.isArray(raw) ? raw : [];
  const people = list
    .map((person) =>
      mapUserBrief({
        id: person.id,
        email: person.email,
        first_name: person.firstName ?? person.first_name,
        last_name: person.lastName ?? person.last_name,
        username: person.username,
        company_name: person.companyName ?? person.company_name,
      })
    )
    .filter(Boolean);
  if (people.length) return people;
  if (!row?.assignee_id) return [];
  const fallback = mapUserBrief({
    id: row.assignee_id,
    email: row.assignee_email,
    first_name: row.assignee_first_name,
    last_name: row.assignee_last_name,
    username: row.assignee_username,
    company_name: row.assignee_company_name,
  });
  return fallback ? [fallback] : [];
}

export function mapTodo(row, { forClient = false } = {}) {
  if (!row) return null;
  const logged = asNumber(row.logged_hours);
  const estimate = asNullableNumber(row.estimated_hours);
  const assignees = parseAssignees(row);
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    title: row.title,
    body: forClient && row.internal ? null : row.body ?? null,
    internal: forClient ? undefined : Boolean(row.internal),
    status: row.status,
    estimatedHours: estimate,
    loggedHours: logged,
    remainingHours: remainingHours(estimate, logged),
    sortOrder: row.sort_order,
    commentCount: Number(row.comment_count) || 0,
    itemCount: Number(row.item_count) || 0,
    itemDoneCount: Number(row.item_done_count) || 0,
    attachmentCount: Number(row.attachment_count) || 0,
    acceptanceCount: Number(row.acceptance_count) || 0,
    acceptanceTestedCount: Number(row.acceptance_tested_count) || 0,
    acceptedAt: row.accepted_at ?? null,
    acceptedBy: row.accepted_by ?? null,
    milestoneId: row.milestone_id ?? null,
    assigneeId: assignees[0]?.id ?? row.assignee_id ?? null,
    assignee: assignees[0] ?? null,
    assignees,
    startAt: mapSqlDate(row.start_at),
    dueAt: mapSqlDate(row.due_at),
    color: TODO_COLORS.includes(row.color) ? row.color : null,
    priority: TODO_PRIORITIES.includes(row.priority) ? row.priority : "medium",
    tags: Array.isArray(row.tags) ? row.tags : [],
    dependsOnIds: parseJsonList(row.depends_on_json).map(String).filter(Boolean),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTimeEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    todoId: row.todo_id,
    userId: row.user_id,
    hours: asNumber(row.hours),
    note: row.note ?? null,
    billable: Boolean(row.billable),
    invoiceId: row.invoice_id ?? null,
    entryDate: row.entry_date,
    createdAt: row.created_at,
  };
}

export function mapInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    clientId: row.client_id,
    number: row.number,
    status: row.status,
    currency: row.currency,
    subtotal: asNumber(row.subtotal),
    taxPercent: asNumber(row.tax_percent),
    total: asNumber(row.total),
    dueAt: row.due_at,
    sentAt: row.sent_at,
    paidAt: row.paid_at,
    note: row.note ?? null,
    createdAt: row.created_at,
    projectName: row.project_name ?? undefined,
    clientName: row.client_company_name || row.client_email || undefined,
  };
}

export function mapInvoiceLine(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    todoId: row.todo_id,
    timeEntryId: row.time_entry_id,
    description: row.description,
    hours: asNumber(row.hours),
    rate: asNumber(row.rate),
    amount: asNumber(row.amount),
    sortOrder: row.sort_order,
  };
}

export function mapProjectPricing(row) {
  return {
    billingType: row.billing_type || "hourly",
    hourlyRate: asNullableNumber(row.hourly_rate),
    fixedPrice: asNullableNumber(row.fixed_price),
    estimatedHours: asNullableNumber(row.estimated_hours),
    weeklyHoursTarget: asNullableNumber(row.weekly_hours_target),
  };
}

export const TODO_EXTRAS = `
         COALESCE((
           SELECT SUM(te.hours) FROM time_entries te WHERE te.todo_id = t.id
         ), 0) AS logged_hours,
         COALESCE((SELECT COUNT(*) FROM todo_comments tc WHERE tc.todo_id = t.id), 0)::int AS comment_count,
         COALESCE((SELECT COUNT(*) FROM todo_checklist_items ti WHERE ti.todo_id = t.id AND COALESCE(ti.kind, 'work') = 'work'), 0)::int AS item_count,
         COALESCE((SELECT COUNT(*) FROM todo_checklist_items ti WHERE ti.todo_id = t.id AND COALESCE(ti.kind, 'work') = 'work' AND ti.done), 0)::int AS item_done_count,
         COALESCE((SELECT COUNT(*) FROM todo_checklist_items ti WHERE ti.todo_id = t.id AND ti.kind = 'acceptance'), 0)::int AS acceptance_count,
         COALESCE((SELECT COUNT(*) FROM todo_checklist_items ti WHERE ti.todo_id = t.id AND ti.kind = 'acceptance' AND ti.tested_at IS NOT NULL), 0)::int AS acceptance_tested_count,
         COALESCE((SELECT COUNT(*) FROM todo_attachments ta WHERE ta.todo_id = t.id), 0)::int AS attachment_count,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', u.id,
             'email', u.email,
             'firstName', u.first_name,
             'lastName', u.last_name,
             'username', u.username,
             'companyName', u.company_name
           ) ORDER BY ta.created_at)
           FROM todo_assignees ta
           JOIN users u ON u.id = ta.user_id
           WHERE ta.todo_id = t.id
         ), '[]'::json) AS assignees_json,
         COALESCE((
           SELECT json_agg(d.depends_on_id ORDER BY d.depends_on_id)
           FROM todo_dependencies d
           WHERE d.todo_id = t.id
         ), '[]'::json) AS depends_on_json
`;

const TODO_WITH_HOURS = `
  SELECT t.*,
         ${TODO_EXTRAS},
         au.email AS assignee_email,
         au.first_name AS assignee_first_name,
         au.last_name AS assignee_last_name,
         au.username AS assignee_username,
         au.company_name AS assignee_company_name
  FROM todos t
  LEFT JOIN users au ON au.id = t.assignee_id
`;

export async function getTodoById(id) {
  return queryOne(`${TODO_WITH_HOURS} WHERE t.id = $1`, [id]);
}

export async function parkNow(workspaceId, exceptTodoId = null, runner = { query: query, queryOne: queryOne }) {
  if (exceptTodoId) {
    await runner.query(
      `UPDATE todos
       SET status = 'backlog', updated_at = NOW()
       WHERE workspace_id = $1 AND status = 'in_progress' AND id <> $2`,
      [workspaceId, exceptTodoId]
    );
  } else {
    await runner.query(
      `UPDATE todos
       SET status = 'backlog', updated_at = NOW()
       WHERE workspace_id = $1 AND status = 'in_progress'`,
      [workspaceId]
    );
  }
}

export async function setTodoNow(workspaceId, todoId) {
  return withTransaction(async (tx) => {
    await parkNow(workspaceId, todoId, tx);
    const row = await tx.queryOne(
      `UPDATE todos SET status = 'in_progress', updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND status <> 'invoiced'
       RETURNING *`,
      [todoId, workspaceId]
    );
    if (!row) {
      const err = new Error("To-do not found or already invoiced");
      err.status = 404;
      throw err;
    }
    return row;
  });
}

function projectPace({ weeklyHoursTarget, trailingAvg, workspaceWeekly, thisWeekOther }) {
  if (weeklyHoursTarget != null && weeklyHoursTarget > 0) return weeklyHoursTarget;
  if (trailingAvg != null && trailingAvg > 0) return Math.round(trailingAvg * 10) / 10;
  const remainingCapacity = Math.max(0, workspaceWeekly - thisWeekOther);
  if (remainingCapacity > 0) return Math.round(remainingCapacity * 10) / 10;
  return workspaceWeekly > 0 ? workspaceWeekly : null;
}

function etaWeeks(remaining, pace) {
  if (remaining == null || pace == null || pace <= 0) return null;
  return Math.round((remaining / pace) * 10) / 10;
}

function summarizeProject({
  project,
  todos,
  loggedHours,
  thisWeekHours,
  trailingAvg,
  unbilledHours,
  workspaceWeekly,
  thisWeekOther,
  lastWorkedAt,
  forClient,
  canWork,
}) {
  const visibleTodos = forClient ? todos.filter((t) => !t.internal) : todos;
  const open = visibleTodos.filter((t) => t.status !== "done" && t.status !== "invoiced");
  const fromTodos = open.reduce((sum, t) => {
    if (t.estimated_hours == null) return sum;
    return sum + remainingHours(t.estimated_hours, t.logged_hours);
  }, 0);
  const hasTodoEstimates = open.some((t) => t.estimated_hours != null);
  const override = asNullableNumber(project.estimated_hours);
  const estimated = override != null
    ? override
    : hasTodoEstimates
      ? open.reduce((s, t) => s + asNumber(t.estimated_hours), 0) +
        visibleTodos.filter((t) => t.status === "done" || t.status === "invoiced").reduce((s, t) => s + asNumber(t.estimated_hours), 0)
      : null;
  const remaining = override != null
    ? remainingHours(override, loggedHours)
    : hasTodoEstimates
      ? fromTodos
      : null;
  const weeklyPace = projectPace({
    weeklyHoursTarget: asNullableNumber(project.weekly_hours_target),
    trailingAvg,
    workspaceWeekly,
    thisWeekOther,
  });
  const waitingOnClient = visibleTodos.some((t) => t.status === "waiting_on_client");
  const isNow = visibleTodos.some((t) => t.status === "in_progress");
  const allClosed = visibleTodos.length > 0 && visibleTodos.every((t) => t.status === "done" || t.status === "invoiced");
  const finished = allClosed && asNumber(unbilledHours) === 0;

  return {
    id: project.id,
    workspaceId: project.workspace_id,
    clientId: project.client_id,
    name: project.name,
    description: project.description ?? null,
    status: project.status || "backlog",
    priority: project.priority || "medium",
    startAt: project.start_at
      ? (project.start_at instanceof Date
          ? project.start_at.toISOString().slice(0, 10)
          : String(project.start_at).slice(0, 10))
      : null,
    dueAt: project.due_at
      ? (project.due_at instanceof Date
          ? project.due_at.toISOString().slice(0, 10)
          : String(project.due_at).slice(0, 10))
      : null,
    currentMilestoneId: project.current_milestone_id ?? null,
    createdAt: project.created_at,
    updatedAt: project.updated_at ?? null,
    ...mapProjectPricing(project),
    client: project.client_email
      ? {
          id: project.client_id,
          email: project.client_email,
          firstName: project.client_first_name ?? null,
          lastName: project.client_last_name ?? null,
          companyName: project.client_company_name ?? null,
        }
      : mapClient(project.client),
    loggedHours: asNumber(loggedHours),
    estimatedHours: estimated,
    remainingHours: remaining,
    thisWeekHours: asNumber(thisWeekHours),
    weeklyPace,
    etaWeeks: etaWeeks(remaining, weeklyPace),
    waitingOnClient,
    isNow,
    nowTodo: visibleTodos.find((t) => t.status === "in_progress")
      ? mapTodo(visibleTodos.find((t) => t.status === "in_progress"), { forClient })
      : null,
    openCount: open.length,
    waitingCount: visibleTodos.filter((t) => t.status === "waiting_on_client").length,
    commentCount: visibleTodos.reduce((sum, t) => sum + (Number(t.comment_count) || 0), 0),
    currentMilestoneTitle: project.current_milestone_title ?? null,
    collaboratorCount: Number(project.collaborator_count) || 0,
    finished,
    lastWorkedAt: lastWorkedAt ?? null,
    unbilledHours: forClient ? undefined : asNumber(unbilledHours),
    weeklyHours: workspaceWeekly,
    canWork: Boolean(canWork),
    todos: visibleTodos
      .slice()
      .sort((a, b) => {
        const rank = { in_progress: 0, waiting_on_client: 1, backlog: 2, done: 3, invoiced: 4 };
        const d = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
        if (d !== 0) return d;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      })
      .map((t) => mapTodo(t, { forClient })),
  };
}

function sortWorkbenchProjects(projects) {
  return projects.slice().sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? 1 : -1;
    if (a.isNow !== b.isNow) return a.isNow ? -1 : 1;
    if (a.waitingOnClient !== b.waitingOnClient) return a.waitingOnClient ? -1 : 1;
    const at = a.lastWorkedAt ? new Date(a.lastWorkedAt).getTime() : 0;
    const bt = b.lastWorkedAt ? new Date(b.lastWorkedAt).getTime() : 0;
    if (at !== bt) return bt - at;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function loadProjectsForWorkbench(user) {
  if (user.role === "expert") {
    const ws = await getWorkspaceByOwner(user.id);
    if (!ws) return { workspace: null, projects: [] };
    const projects = await query(
      `SELECT p.*,
              w.weekly_hours AS workspace_weekly_hours,
              w.timezone AS workspace_timezone,
              w.currency AS workspace_currency,
              w.name AS workspace_name,
              c.email AS client_email,
              c.first_name AS client_first_name,
              c.last_name AS client_last_name,
              c.company_name AS client_company_name,
              c.user_id AS client_user_id,
              m.title AS current_milestone_title,
              (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS collaborator_count
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN project_milestones m ON m.id = p.current_milestone_id
       WHERE p.workspace_id = $1
       ORDER BY p.created_at DESC`,
      [ws.id]
    );
    return { workspace: ws, projects };
  }

  const projects = await query(
    `SELECT p.*,
            w.weekly_hours AS workspace_weekly_hours,
            w.timezone AS workspace_timezone,
            w.currency AS workspace_currency,
            w.name AS workspace_name,
            w.owner_id,
            c.email AS client_email,
            c.first_name AS client_first_name,
            c.last_name AS client_last_name,
            c.company_name AS client_company_name,
            c.user_id AS client_user_id,
            m.title AS current_milestone_title,
            (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS collaborator_count
     FROM projects p
     JOIN workspaces w ON w.id = p.workspace_id
     JOIN clients c ON c.id = p.client_id
     LEFT JOIN project_milestones m ON m.id = p.current_milestone_id
     WHERE c.user_id = $1
        OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = $1
        )
     ORDER BY p.created_at DESC`,
    [user.id]
  );
  return { workspace: null, projects };
}

async function aggregatesForProjects(projectIds, weekStart) {
  if (!projectIds.length) {
    return { logged: {}, week: {}, trailing: {}, unbilled: {}, last: {} };
  }
  const [logged, week, trailing, unbilled, last] = await Promise.all([
    query(
      `SELECT project_id, COALESCE(SUM(hours), 0) AS hours
       FROM time_entries WHERE project_id = ANY($1::uuid[])
       GROUP BY project_id`,
      [projectIds]
    ),
    query(
      `SELECT project_id, COALESCE(SUM(hours), 0) AS hours
       FROM time_entries
       WHERE project_id = ANY($1::uuid[]) AND entry_date >= $2
       GROUP BY project_id`,
      [projectIds, weekStart]
    ),
    query(
      `SELECT project_id, COALESCE(SUM(hours), 0) / 4.0 AS hours
       FROM time_entries
       WHERE project_id = ANY($1::uuid[]) AND entry_date >= CURRENT_DATE - 28
       GROUP BY project_id`,
      [projectIds]
    ),
    query(
      `SELECT project_id, COALESCE(SUM(hours), 0) AS hours
       FROM time_entries
       WHERE project_id = ANY($1::uuid[]) AND billable = TRUE AND invoice_id IS NULL
       GROUP BY project_id`,
      [projectIds]
    ),
    query(
      `SELECT DISTINCT ON (project_id) project_id, entry_date, created_at
       FROM time_entries
       WHERE project_id = ANY($1::uuid[])
       ORDER BY project_id, entry_date DESC, created_at DESC`,
      [projectIds]
    ),
  ]);
  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.project_id, asNumber(r.hours)]));
  return {
    logged: toMap(logged),
    week: toMap(week),
    trailing: toMap(trailing),
    unbilled: toMap(unbilled),
    last: Object.fromEntries(last.map((r) => [r.project_id, r.created_at])),
  };
}

function mapDiscussion(row) {
  return {
    id: `${row.source}:${row.id}`,
    source: row.source,
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
    projectId: row.project_id,
    projectName: row.project_name,
    todoId: row.todo_id ?? null,
    todoTitle: row.todo_title ?? null,
  };
}

async function listRecentDiscussions(projectIds, hideInternalOnProjectIds) {
  if (!projectIds.length) return [];
  const rows = await query(
    `SELECT * FROM (
       SELECT c.id,
              'project'::text AS source,
              c.body,
              c.created_at,
              c.author_id,
              u.email AS author_email,
              u.first_name AS author_first_name,
              u.last_name AS author_last_name,
              u.username AS author_username,
              u.company_name AS author_company_name,
              p.id AS project_id,
              p.name AS project_name,
              NULL::uuid AS todo_id,
              NULL::text AS todo_title
         FROM project_comments c
         JOIN projects p ON p.id = c.project_id
         JOIN users u ON u.id = c.author_id
        WHERE c.project_id = ANY($1::uuid[])
       UNION ALL
       SELECT c.id,
              'todo'::text AS source,
              c.body,
              c.created_at,
              c.author_id,
              u.email AS author_email,
              u.first_name AS author_first_name,
              u.last_name AS author_last_name,
              u.username AS author_username,
              u.company_name AS author_company_name,
              p.id AS project_id,
              p.name AS project_name,
              t.id AS todo_id,
              t.title AS todo_title
         FROM todo_comments c
         JOIN todos t ON t.id = c.todo_id
         JOIN projects p ON p.id = t.project_id
         JOIN users u ON u.id = c.author_id
        WHERE t.project_id = ANY($1::uuid[])
          AND NOT (t.internal = TRUE AND t.project_id = ANY($2::uuid[]))
     ) feed
     ORDER BY created_at DESC
     LIMIT 20`,
    [projectIds, hideInternalOnProjectIds]
  );
  return rows.map(mapDiscussion);
}

function clientLabel(project) {
  return (
    project.client_company_name ||
    [project.client_first_name, project.client_last_name].filter(Boolean).join(" ") ||
    project.client_email ||
    project.client?.companyName ||
    project.client?.email ||
    null
  );
}

export async function getWorkbench(user) {
  const { workspace, projects } = await loadProjectsForWorkbench(user);
  const isOwner = user.role === "expert";
  const tz = workspace?.timezone || projects[0]?.workspace_timezone || "Europe/Istanbul";
  const weekStart = weekStartDate(tz);
  const projectIds = projects.map((p) => p.id);
  const workspaceIds = [...new Set(projects.map((p) => p.workspace_id))];
  if (workspace && !workspaceIds.includes(workspace.id)) workspaceIds.push(workspace.id);

  const [todos, nowRows, agg, collabRows] = await Promise.all([
    projectIds.length
      ? query(`${TODO_WITH_HOURS} WHERE t.project_id = ANY($1::uuid[])`, [projectIds])
      : [],
    workspaceIds.length
      ? query(
          `SELECT t.*,
                  ${TODO_EXTRAS},
                  au.email AS assignee_email,
                  au.first_name AS assignee_first_name,
                  au.last_name AS assignee_last_name,
                  au.username AS assignee_username,
                  au.company_name AS assignee_company_name,
                  p.name AS project_name,
                  p.client_id,
                  c.email AS client_email,
                  c.first_name AS client_first_name,
                  c.last_name AS client_last_name,
                  c.company_name AS client_company_name
           FROM todos t
           LEFT JOIN users au ON au.id = t.assignee_id
           JOIN projects p ON p.id = t.project_id
           JOIN clients c ON c.id = p.client_id
           WHERE t.workspace_id = ANY($1::uuid[]) AND t.status = 'in_progress'`,
          [workspaceIds]
        )
      : [],
    aggregatesForProjects(projectIds, weekStart),
    !isOwner && user.id
      ? query(`SELECT project_id FROM project_members WHERE user_id = $1`, [user.id])
      : Promise.resolve([]),
  ]);

  const todosByProject = new Map();
  for (const t of todos) {
    const list = todosByProject.get(t.project_id) || [];
    list.push(t);
    todosByProject.set(t.project_id, list);
  }

  const thisWeekTotal = projects.reduce((s, p) => s + asNumber(agg.week[p.id]), 0);
  const collabIds = new Set(collabRows.map((r) => r.project_id));
  const isCollaborator = collabIds.size > 0;
  const isClientOnAny = projects.some((p) => p.client_user_id === user.id);
  const role = isOwner ? "owner" : isClientOnAny && !isCollaborator ? "client" : isCollaborator ? "collaborator" : "client";
  const hideInternalOn = projects.filter((p) => !isOwner && p.client_user_id === user.id).map((p) => p.id);

  const summarized = projects.map((project) => {
    const weekly = asNumber(project.workspace_weekly_hours ?? workspace?.weekly_hours, 20);
    const thisWeek = asNumber(agg.week[project.id]);
    const forClient = !isOwner && project.client_user_id === user.id;
    const canWork = isOwner || (collabIds.has(project.id) && project.client_user_id !== user.id);
    return summarizeProject({
      project,
      todos: todosByProject.get(project.id) || [],
      loggedHours: agg.logged[project.id] || 0,
      thisWeekHours: thisWeek,
      trailingAvg: agg.trailing[project.id] || 0,
      unbilledHours: agg.unbilled[project.id] || 0,
      workspaceWeekly: weekly,
      thisWeekOther: thisWeekTotal - thisWeek,
      lastWorkedAt: agg.last[project.id] || null,
      forClient,
      canWork,
    });
  });

  const visible = sortWorkbenchProjects(summarized);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  let now = null;
  let nowElsewhere = false;
  for (const row of nowRows) {
    const yours = summarized.some((p) => p.id === row.project_id);
    const forClient = hideInternalOn.includes(row.project_id);
    if (forClient && row.internal) continue;
    const mapped = {
      ...mapTodo(row, { forClient }),
      projectId: row.project_id,
      projectName: row.project_name,
      clientName:
        row.client_company_name ||
        [row.client_first_name, row.client_last_name].filter(Boolean).join(" ") ||
        row.client_email,
      clientId: row.client_id,
      belongsToYou: yours,
    };
    if (yours) {
      now = mapped;
      break;
    }
    nowElsewhere = true;
  }

  const suggested = !now
    ? visible
        .flatMap((p) => p.todos.map((t) => ({ ...t, projectId: p.id, projectName: p.name, clientName: p.client?.companyName || p.client?.email })))
        .find((t) => t.status === "backlog" && (!t.assigneeId || t.assigneeId === user.id)) || null
    : null;

  const lastOnYours = visible
    .filter((p) => p.lastWorkedAt)
    .sort((a, b) => new Date(b.lastWorkedAt) - new Date(a.lastWorkedAt))[0];

  const weeklyHours = asNumber(workspace?.weekly_hours ?? projects[0]?.workspace_weekly_hours, 20);
  const openStatuses = new Set(["backlog", "in_progress", "waiting_on_client"]);
  const rank = { in_progress: 0, waiting_on_client: 1, backlog: 2 };
  const myTodos = [];
  const waitingOnYou = [];
  for (const row of todos) {
    if (!openStatuses.has(row.status)) continue;
    const project = projectById.get(row.project_id);
    const forClient = hideInternalOn.includes(row.project_id);
    if (forClient && row.internal) continue;
    const mapped = {
      ...mapTodo(row, { forClient }),
      projectId: row.project_id,
      projectName: project?.name,
      clientName: project ? clientLabel(project) : null,
    };
    if ((mapped.assignees || []).some((person) => person.id === user.id) || row.assignee_id === user.id) {
      myTodos.push(mapped);
    } else if (row.status === "waiting_on_client" && project?.client_user_id === user.id) {
      waitingOnYou.push(mapped);
    }
  }
  myTodos.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
  waitingOnYou.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));

  const discussions = await listRecentDiscussions(projectIds, hideInternalOn);

  return {
    role,
    meId: user.id,
    workspace: workspace
      ? {
          id: workspace.id,
          name: workspace.name,
          currency: workspace.currency || "EUR",
          timezone: workspace.timezone || "Europe/Istanbul",
          weeklyHours,
        }
      : projects[0]
        ? {
            id: projects[0].workspace_id,
            name: projects[0].workspace_name,
            currency: projects[0].workspace_currency || "EUR",
            timezone: projects[0].workspace_timezone || "Europe/Istanbul",
            weeklyHours,
          }
        : null,
    now,
    nowElsewhere: Boolean(!isOwner && nowElsewhere && !now),
    lastWorkedAt: lastOnYours?.lastWorkedAt ?? null,
    lastWorkedProjectId: lastOnYours?.id ?? null,
    suggested,
    thisWeekHours: thisWeekTotal,
    weeklyHours,
    unbilledHours: isOwner ? visible.reduce((s, p) => s + asNumber(p.unbilledHours), 0) : undefined,
    myTodos: myTodos.slice(0, 12),
    waitingOnYou: waitingOnYou.slice(0, 8),
    discussions,
    projects: visible,
    projectCount: summarized.length,
  };
}

export async function getProjectWork(projectId, user) {
  const access = await getProjectAccess(projectId, user);
  if (!access) return null;
  const project = await queryOne(
    `SELECT p.*,
            w.weekly_hours AS workspace_weekly_hours,
            w.timezone AS workspace_timezone,
            w.currency AS workspace_currency,
            w.name AS workspace_name,
            c.email AS client_email,
            c.first_name AS client_first_name,
            c.last_name AS client_last_name,
            c.company_name AS client_company_name,
            m.title AS current_milestone_title,
            (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS collaborator_count
     FROM projects p
     JOIN workspaces w ON w.id = p.workspace_id
     JOIN clients c ON c.id = p.client_id
     LEFT JOIN project_milestones m ON m.id = p.current_milestone_id
     WHERE p.id = $1`,
    [projectId]
  );
  const tz = project.workspace_timezone || "Europe/Istanbul";
  const weekStart = weekStartDate(tz);
  const [todos, entries, agg, nowInWorkspace] = await Promise.all([
    query(`${TODO_WITH_HOURS} WHERE t.project_id = $1`, [projectId]),
    query(
      `SELECT * FROM time_entries WHERE project_id = $1 ORDER BY entry_date DESC, created_at DESC LIMIT 80`,
      [projectId]
    ),
    aggregatesForProjects([projectId], weekStart),
    queryOne(
      `${TODO_WITH_HOURS} WHERE t.workspace_id = $1 AND t.status = 'in_progress'`,
      [project.workspace_id]
    ),
  ]);
  const weekAll = await queryOne(
    `SELECT COALESCE(SUM(hours), 0) AS hours
     FROM time_entries WHERE workspace_id = $1 AND entry_date >= $2`,
    [project.workspace_id, weekStart]
  );
  const thisWeek = asNumber(agg.week[projectId]);
  const summary = summarizeProject({
    project,
    todos,
    loggedHours: agg.logged[projectId] || 0,
    thisWeekHours: thisWeek,
    trailingAvg: agg.trailing[projectId] || 0,
    unbilledHours: agg.unbilled[projectId] || 0,
    workspaceWeekly: asNumber(project.workspace_weekly_hours, 20),
    thisWeekOther: asNumber(weekAll?.hours) - thisWeek,
    lastWorkedAt: agg.last[projectId] || null,
    forClient: access.role === "client",
    canWork: access.role !== "client",
  });
  const nowBelongs = nowInWorkspace?.project_id === projectId;
  return {
    role: access.role,
    nowElsewhere: Boolean(nowInWorkspace && !nowBelongs && access.role === "client"),
    now: nowBelongs ? mapTodo(nowInWorkspace, { forClient: access.role === "client" }) : null,
    project: summary,
    timeEntries: (access.role === "client" ? entries.filter((e) => e.billable) : entries).map(mapTimeEntry),
    weeklyHours: asNumber(project.workspace_weekly_hours, 20),
    currency: project.workspace_currency || "EUR",
  };
}

export async function reorderProjectTodos({ project, role, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("items are required");
    err.status = 400;
    throw err;
  }
  if (items.length > 200) {
    const err = new Error("Too many items");
    err.status = 400;
    throw err;
  }

  const todos = await query(`SELECT * FROM todos WHERE project_id = $1`, [project.id]);
  const byId = new Map(todos.map((t) => [t.id, t]));
  const normalized = [];
  const seen = new Set();

  for (const item of items) {
    const id = item?.id;
    if (typeof id !== "string" || !byId.has(id) || seen.has(id)) {
      const err = new Error("To-do not found on this project");
      err.status = 400;
      throw err;
    }
    seen.add(id);
    const existing = byId.get(id);
    const status = item.status || existing.status;
    if (!TODO_STATUSES.includes(status)) {
      const err = new Error("Invalid status");
      err.status = 400;
      throw err;
    }
    const sortOrder = Math.round(Number(item.sortOrder));
    if (!Number.isFinite(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
      const err = new Error("sortOrder is invalid");
      err.status = 400;
      throw err;
    }
    if (existing.status === "invoiced" && status !== "invoiced") {
      const err = new Error("Invoiced to-dos are locked");
      err.status = 409;
      throw err;
    }
    if (status === "invoiced" && existing.status !== "invoiced") {
      const err = new Error("Mark paid by creating an invoice");
      err.status = 400;
      throw err;
    }
    if (status === "in_progress" && role !== "owner" && role !== "admin") {
      const err = new Error("Only the workspace owner can set Now");
      err.status = 403;
      throw err;
    }
    normalized.push({ id, status, sortOrder, existing });
  }

  const nowItems = normalized.filter((item) => item.status === "in_progress");
  if (nowItems.length > 1) {
    const err = new Error("Only one to-do can be Now");
    err.status = 400;
    throw err;
  }

  await withTransaction(async (tx) => {
    const now = nowItems[0];
    if (now && now.existing.status !== "in_progress") {
      await parkNow(project.workspace_id, now.id, tx);
    }
    for (const item of normalized) {
      if (item.existing.status === "invoiced") {
        await tx.query(`UPDATE todos SET sort_order = $1, updated_at = NOW() WHERE id = $2`, [
          item.sortOrder,
          item.id,
        ]);
        continue;
      }
      await tx.query(
        `UPDATE todos SET status = $1, sort_order = $2, updated_at = NOW()
         WHERE id = $3 AND status <> 'invoiced'`,
        [item.status, item.sortOrder, item.id]
      );
    }
  });

  return { ok: true };
}

export async function nextSortOrder(projectId) {
  const row = await queryOne(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM todos WHERE project_id = $1`,
    [projectId]
  );
  return row?.next ?? 1;
}

export async function setTodoAssignees(project, todoId, userIds) {
  const unique = [...new Set((Array.isArray(userIds) ? userIds : []).filter(Boolean))];
  if (unique.length > 12) {
    const err = new Error("A to-do can have at most 12 people on it");
    err.status = 400;
    throw err;
  }
  const people = await listProjectPeople(project);
  for (const id of unique) {
    if (!people.some((person) => person.id === id)) {
      const err = new Error("That person is not on this project");
      err.status = 400;
      throw err;
    }
  }
  await execute(`DELETE FROM todo_assignees WHERE todo_id = $1`, [todoId]);
  for (const id of unique) {
    await execute(
      `INSERT INTO todo_assignees (todo_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [todoId, id]
    );
  }
  await execute(`UPDATE todos SET assignee_id = $1, updated_at = NOW() WHERE id = $2`, [
    unique[0] || null,
    todoId,
  ]);
}

export async function setTodoDependencies(projectId, todoId, dependsOnIds) {
  const unique = [...new Set((Array.isArray(dependsOnIds) ? dependsOnIds : []).filter((id) => id && id !== todoId))];
  if (unique.length > 20) {
    const err = new Error("A to-do can depend on at most 20 others");
    err.status = 400;
    throw err;
  }
  if (unique.length) {
    const rows = await query(
      `SELECT id FROM todos WHERE project_id = $1 AND id = ANY($2::uuid[])`,
      [projectId, unique]
    );
    if (rows.length !== unique.length) {
      const err = new Error("A dependency must be a to-do on this project");
      err.status = 400;
      throw err;
    }
    const reverse = await query(
      `SELECT todo_id FROM todo_dependencies WHERE depends_on_id = $1 AND todo_id = ANY($2::uuid[])`,
      [todoId, unique]
    );
    if (reverse.length) {
      const err = new Error("That would create a loop");
      err.status = 400;
      throw err;
    }
  }
  await execute(`DELETE FROM todo_dependencies WHERE todo_id = $1`, [todoId]);
  for (const id of unique) {
    await execute(
      `INSERT INTO todo_dependencies (todo_id, depends_on_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [todoId, id]
    );
  }
}

export async function createTodo({
  project,
  user,
  title,
  body,
  estimatedHours,
  internal,
  startNow,
  milestoneId,
  assigneeId,
  assigneeIds,
  acceptanceCriteria,
  startAt,
  dueAt,
  color,
  priority,
  tags,
}) {
  const sort = await nextSortOrder(project.id);
  if (startNow) await parkNow(project.workspace_id);
  let milestone = null;
  if (milestoneId) {
    milestone = await queryOne(
      `SELECT id FROM project_milestones WHERE id = $1 AND project_id = $2`,
      [milestoneId, project.id]
    );
    if (!milestone) {
      const err = new Error("Milestone not found on this project");
      err.status = 400;
      throw err;
    }
  }
  const ids = Array.isArray(assigneeIds) && assigneeIds.length
    ? assigneeIds
    : assigneeId
      ? [assigneeId]
      : [user.id];
  await Promise.all(ids.map((id) => assertProjectAssignee(project, id)));
  const row = await queryOne(
    `INSERT INTO todos (workspace_id, project_id, title, body, internal, status, estimated_hours, sort_order, created_by, milestone_id, assignee_id, start_at, due_at, color, priority, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      project.workspace_id,
      project.id,
      title,
      body || null,
      Boolean(internal),
      startNow ? "in_progress" : "backlog",
      estimatedHours,
      sort,
      user.id,
      milestone?.id ?? null,
      ids[0] || user.id,
      startAt || null,
      dueAt || null,
      color || TODO_COLORS[Math.abs(sort) % TODO_COLORS.length],
      TODO_PRIORITIES.includes(priority) ? priority : "medium",
      Array.isArray(tags) ? tags : [],
    ]
  );
  await setTodoAssignees(project, row.id, ids);
  const criteria = Array.isArray(acceptanceCriteria)
    ? acceptanceCriteria
    : typeof acceptanceCriteria === "string"
      ? [acceptanceCriteria]
      : [];
  let order = 1;
  for (const raw of criteria) {
    const titleText = typeof raw === "string" ? raw.trim() : "";
    if (!titleText || titleText.length > 300) continue;
    await execute(
      `INSERT INTO todo_checklist_items (todo_id, title, sort_order, kind)
       VALUES ($1, $2, $3, 'acceptance')`,
      [row.id, titleText, order++]
    );
  }
  return getTodoById(row.id);
}

export async function nextInvoiceNumber(workspaceId) {
  const row = await queryOne(
    `SELECT number FROM invoices WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [workspaceId]
  );
  const current = row?.number ? Number(String(row.number).replace(/\D/g, "")) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

export async function unbilledEntries(projectId, ids = null) {
  if (ids?.length) {
    return query(
      `SELECT te.*, t.title AS todo_title
       FROM time_entries te
       LEFT JOIN todos t ON t.id = te.todo_id
       WHERE te.project_id = $1 AND te.billable = TRUE AND te.invoice_id IS NULL AND te.id = ANY($2::uuid[])
       ORDER BY te.entry_date ASC, te.created_at ASC`,
      [projectId, ids]
    );
  }
  return query(
    `SELECT te.*, t.title AS todo_title
     FROM time_entries te
     LEFT JOIN todos t ON t.id = te.todo_id
     WHERE te.project_id = $1 AND te.billable = TRUE AND te.invoice_id IS NULL
     ORDER BY te.entry_date ASC, te.created_at ASC`,
    [projectId]
  );
}

export async function createInvoiceFromWork({
  workspace,
  project,
  clientId,
  user,
  timeEntryIds,
  note,
  taxPercent = 0,
  dueAt = null,
}) {
  const entries = await unbilledEntries(project.id, timeEntryIds);
  const rate = asNumber(project.hourly_rate);
  const groups = new Map();
  if (entries.length) {
    for (const entry of entries) {
      const key = entry.todo_id || `entry:${entry.id}`;
      const current = groups.get(key) || {
        todoId: entry.todo_id,
        description: entry.todo_title || entry.note || "Work",
        hours: 0,
        entries: [],
      };
      current.hours += asNumber(entry.hours);
      current.entries.push(entry);
      groups.set(key, current);
    }
  } else if ((project.billing_type === "fixed" || project.billing_type === "hybrid") && asNumber(project.fixed_price) > 0) {
    groups.set("fixed", {
      todoId: null,
      description: project.name,
      hours: 0,
      amount: asNumber(project.fixed_price),
      entries: [],
    });
  } else {
    const err = new Error("No unbilled hours to invoice");
    err.status = 400;
    throw err;
  }

  const lines = [...groups.values()].map((g, i) => {
    const hours = Math.round(g.hours * 100) / 100;
    const amount = g.amount != null ? g.amount : Math.round(hours * rate * 100) / 100;
    return {
      todoId: g.todoId,
      description: g.description,
      hours,
      rate: g.amount != null ? amount : rate,
      amount,
      sortOrder: i,
      entries: g.entries,
    };
  });
  const subtotal = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const tax = Math.round(subtotal * (asNumber(taxPercent) / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const number = await nextInvoiceNumber(workspace.id);

  return withTransaction(async (tx) => {
    const invoice = await tx.queryOne(
      `INSERT INTO invoices
         (workspace_id, project_id, client_id, number, status, currency, subtotal, tax_percent, total, due_at, note, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        workspace.id,
        project.id,
        clientId,
        number,
        workspace.currency || "EUR",
        subtotal,
        asNumber(taxPercent),
        total,
        dueAt,
        note || null,
        user.id,
      ]
    );
    for (const line of lines) {
      const created = await tx.queryOne(
        `INSERT INTO invoice_lines (invoice_id, todo_id, description, hours, rate, amount, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [invoice.id, line.todoId, line.description, line.hours, line.rate, line.amount, line.sortOrder]
      );
      line.id = created.id;
      for (const entry of line.entries) {
        await tx.query(
          `UPDATE time_entries SET invoice_id = $1 WHERE id = $2`,
          [invoice.id, entry.id]
        );
      }
      if (line.todoId) {
        await tx.query(
          `UPDATE todos SET status = 'invoiced', updated_at = NOW()
           WHERE id = $1 AND status = 'done'`,
          [line.todoId]
        );
      }
    }
    return { invoice, lines };
  });
}

export async function getInvoiceAccess(invoiceId, user) {
  const invoice = await queryOne(
    `SELECT i.*,
            p.name AS project_name,
            p.workspace_id,
            w.owner_id,
            w.name AS workspace_name,
            w.currency AS workspace_currency,
            w.timezone,
            c.email AS client_email,
            c.first_name AS client_first_name,
            c.last_name AS client_last_name,
            c.company_name AS client_company_name,
            c.user_id AS client_user_id
     FROM invoices i
     JOIN projects p ON p.id = i.project_id
     JOIN workspaces w ON w.id = i.workspace_id
     JOIN clients c ON c.id = i.client_id
     WHERE i.id = $1`,
    [invoiceId]
  );
  if (!invoice) return null;
  if (invoice.owner_id === user.id) return { invoice, role: "owner" };
  if (["admin", "superadmin"].includes(user.role)) return { invoice, role: "admin" };
  if (invoice.client_user_id === user.id && invoice.status !== "draft") {
    return { invoice, role: "client" };
  }
  return null;
}

export async function listInvoicesForUser(user) {
  if (user.role === "expert") {
    const ws = await getWorkspaceByOwner(user.id);
    if (!ws) return [];
    return query(
      `SELECT i.*, p.name AS project_name,
              c.email AS client_email, c.company_name AS client_company_name
       FROM invoices i
       JOIN projects p ON p.id = i.project_id
       JOIN clients c ON c.id = i.client_id
       WHERE i.workspace_id = $1
       ORDER BY i.created_at DESC`,
      [ws.id]
    );
  }
  return query(
    `SELECT i.*, p.name AS project_name,
            c.email AS client_email, c.company_name AS client_company_name
     FROM invoices i
     JOIN projects p ON p.id = i.project_id
     JOIN clients c ON c.id = i.client_id
     WHERE c.user_id = $1 AND i.status <> 'draft'
     ORDER BY i.created_at DESC`,
    [user.id]
  );
}

export async function loadInvoiceDetail(invoiceId) {
  const lines = await query(
    `SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY sort_order ASC`,
    [invoiceId]
  );
  return lines;
}

export async function cancelInvoice(invoice) {
  await withTransaction(async (tx) => {
    await tx.query(
      `UPDATE time_entries SET invoice_id = NULL WHERE invoice_id = $1`,
      [invoice.id]
    );
    await tx.query(
      `UPDATE todos SET status = 'done', updated_at = NOW()
       WHERE status = 'invoiced' AND id IN (
         SELECT todo_id FROM invoice_lines WHERE invoice_id = $1 AND todo_id IS NOT NULL
       )`,
      [invoice.id]
    );
    await tx.query(
      `UPDATE invoices SET status = 'cancelled' WHERE id = $1`,
      [invoice.id]
    );
  });
}
