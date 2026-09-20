import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import { ensureWorkspaceForOwner, getProjectAccess, mapClient } from "../lib/workspace.js";
import {
  TODO_STATUSES,
  TODO_PRIORITIES,
  TODO_COLORS,
  asNumber,
  parsePositiveHours,
  parseDateInput,
  parseTodoTags,
  mapTodo,
  mapTimeEntry,
  mapInvoice,
  mapInvoiceLine,
  getTodoById,
  setTodoNow,
  getWorkbench,
  getProjectWork,
  createTodo,
  reorderProjectTodos,
  setTodoAssignees,
  setTodoDependencies,
  createInvoiceFromWork,
  getInvoiceAccess,
  loadInvoiceRenderContext,
  listInvoicesForUser,
  loadInvoiceDetail,
  cancelInvoice,
  unbilledEntries,
  listTimesheet,
  createTimeEntryDirect,
  updateTimeEntry,
} from "../lib/work.js";
import {
  addChecklistItem,
  addTodoComment,
  acceptTodo,
  confirmTodoAttachment,
  deleteChecklistItem,
  deleteTodoAttachment,
  deleteTodoComment,
  getTodoAccess,
  getTodoCard,
  markTodoReady,
  parseCommentBody,
  parseItemTitle,
  parseTodoDescription,
  removeTodoFiles,
  signTodoAttachment,
  updateChecklistItem,
} from "../lib/todoCard.js";
import { buildInvoiceDocument } from "../lib/invoicePdf.js";
import { sendEmail, appUrl, invoiceEmail, workspaceDisplayName } from "../lib/email.js";
import { createNotification } from "../lib/notifications.js";

const router = Router();

function bad(res, status, error) {
  return res.status(status).json({ error });
}

function parseTitle(value) {
  const title = typeof value === "string" ? value.trim() : "";
  if (title.length < 1 || title.length > 300) return { error: "Title must be 1–300 characters" };
  return { title };
}

router.get("/workbench", requireAuth, attachRole, async (req, res) => {
  try {
    if (req.userRole === "expert") {
      await ensureWorkspaceForOwner(req.dbUser.id, req.dbUser.company_name || req.dbUser.username);
    }
    res.json(await getWorkbench(req.dbUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/work", requireAuth, attachRole, async (req, res) => {
  try {
    const data = await getProjectWork(req.params.id, req.dbUser);
    if (!data) return bad(res, 404, "Project not found");
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/todos/reorder", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access) return bad(res, 404, "Project not found");
    if (access.role === "client") return bad(res, 403, "Clients cannot move to-dos");
    await reorderProjectTodos({
      project: access.project,
      role: access.role,
      items: req.body?.items,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post("/projects/:id/todos", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access) return bad(res, 404, "Project not found");
    if (access.role === "client") return bad(res, 403, "Clients cannot add to-dos");
    const parsed = parseTitle(req.body?.title);
    if (parsed.error) return bad(res, 400, parsed.error);
    const hours = parsePositiveHours(req.body?.estimatedHours);
    if (hours.error) return bad(res, 400, hours.error);
    const startNow = Boolean(req.body?.startNow) && (access.role === "owner" || access.role === "admin");
    const description = parseTodoDescription(req.body?.body);
    if (description.error) return bad(res, 400, description.error);
    const startAt = parseDateInput(req.body?.startAt);
    if (startAt.error) return bad(res, 400, startAt.error);
    const dueAt = parseDateInput(req.body?.dueAt);
    if (dueAt.error) return bad(res, 400, dueAt.error);
    const tags = parseTodoTags(req.body?.tags);
    if (tags.error) return bad(res, 400, tags.error);
    const row = await createTodo({
      project: access.project,
      user: req.dbUser,
      title: parsed.title,
      body: description.value,
      estimatedHours: hours.value,
      internal: Boolean(req.body?.internal) && access.role !== "client",
      startNow,
      milestoneId: req.body?.milestoneId || null,
      assigneeId: req.body?.assigneeId || null,
      assigneeIds: req.body?.assigneeIds,
      acceptanceCriteria: req.body?.acceptanceCriteria ?? req.body?.acceptance,
      startAt: startAt.value,
      dueAt: dueAt.value,
      color: TODO_COLORS.includes(req.body?.color) ? req.body.color : null,
      priority: req.body?.priority,
      tags: tags.value,
    });
    res.status(201).json(mapTodo(row));
  } catch (err) {
    if (err.code === "23505") return bad(res, 409, "Something is already in progress");
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get("/todos/:id", requireAuth, attachRole, async (req, res) => {
  try {
    const card = await getTodoCard(req.params.id, req.dbUser);
    if (!card) return bad(res, 404, "To-do not found");
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/todos/:id", requireAuth, attachRole, async (req, res) => {
  try {
    const existing = await getTodoById(req.params.id);
    if (!existing) return bad(res, 404, "To-do not found");
    const access = await getProjectAccess(existing.project_id, req.dbUser);
    if (!access) return bad(res, 404, "To-do not found");
    if (existing.internal && access.role === "client") return bad(res, 404, "To-do not found");
    if (existing.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");

    if (access.role === "client") {
      if (req.body?.body === undefined) return bad(res, 403, "Clients can update the description on a to-do");
      const description = parseTodoDescription(req.body.body);
      if (description.error) return bad(res, 400, description.error);
      await execute(`UPDATE todos SET body = $1, updated_at = NOW() WHERE id = $2`, [
        description.value,
        existing.id,
      ]);
      return res.json(mapTodo(await getTodoById(existing.id), { forClient: true }));
    }

    const fields = [];
    const values = [];
    let i = 1;
    if (req.body?.title != null) {
      const parsed = parseTitle(req.body.title);
      if (parsed.error) return bad(res, 400, parsed.error);
      fields.push(`title = $${i++}`);
      values.push(parsed.title);
    }
    if (req.body?.body !== undefined) {
      const description = parseTodoDescription(req.body.body);
      if (description.error) return bad(res, 400, description.error);
      fields.push(`body = $${i++}`);
      values.push(description.value);
    }
    if (req.body?.internal !== undefined && access.role !== "collaborator") {
      fields.push(`internal = $${i++}`);
      values.push(Boolean(req.body.internal));
    }
    if (req.body?.estimatedHours !== undefined) {
      const hours = parsePositiveHours(req.body.estimatedHours);
      if (hours.error) return bad(res, 400, hours.error);
      fields.push(`estimated_hours = $${i++}`);
      values.push(hours.value);
    }
    if (req.body?.sortOrder != null) {
      const n = Math.round(Number(req.body.sortOrder));
      if (!Number.isFinite(n) || n < 0 || n > 10000) return bad(res, 400, "sortOrder is invalid");
      fields.push(`sort_order = $${i++}`);
      values.push(n);
    }
    if (req.body?.milestoneId !== undefined) {
      if (req.body.milestoneId === null || req.body.milestoneId === "") {
        fields.push(`milestone_id = $${i++}`);
        values.push(null);
      } else {
        const milestone = await queryOne(
          `SELECT id FROM project_milestones WHERE id = $1 AND project_id = $2`,
          [req.body.milestoneId, existing.project_id]
        );
        if (!milestone) return bad(res, 400, "Milestone not found on this project");
        fields.push(`milestone_id = $${i++}`);
        values.push(milestone.id);
      }
    }
    if (req.body?.assigneeIds !== undefined || req.body?.assigneeId !== undefined) {
      const ids = Array.isArray(req.body?.assigneeIds)
        ? req.body.assigneeIds
        : req.body?.assigneeId
          ? [req.body.assigneeId]
          : [];
      await setTodoAssignees(access.project, existing.id, ids);
    }
    if (req.body?.dependsOnIds !== undefined) {
      await setTodoDependencies(existing.project_id, existing.id, req.body.dependsOnIds);
    }
    if (req.body?.startAt !== undefined) {
      const parsed = parseDateInput(req.body.startAt);
      if (parsed.error) return bad(res, 400, parsed.error);
      fields.push(`start_at = $${i++}`);
      values.push(parsed.value);
    }
    if (req.body?.dueAt !== undefined) {
      const parsed = parseDateInput(req.body.dueAt);
      if (parsed.error) return bad(res, 400, parsed.error);
      fields.push(`due_at = $${i++}`);
      values.push(parsed.value);
    }
    if (req.body?.color !== undefined) {
      if (req.body.color === null || req.body.color === "") {
        fields.push(`color = $${i++}`);
        values.push(null);
      } else if (!TODO_COLORS.includes(req.body.color)) {
        return bad(res, 400, "Invalid color");
      } else {
        fields.push(`color = $${i++}`);
        values.push(req.body.color);
      }
    }
    if (req.body?.priority !== undefined) {
      if (!TODO_PRIORITIES.includes(req.body.priority)) return bad(res, 400, "Invalid priority");
      fields.push(`priority = $${i++}`);
      values.push(req.body.priority);
    }
    if (req.body?.tags !== undefined) {
      const parsed = parseTodoTags(req.body.tags);
      if (parsed.error) return bad(res, 400, parsed.error);
      fields.push(`tags = $${i++}`);
      values.push(parsed.value);
    }
    if (req.body?.status) {
      if (!TODO_STATUSES.includes(req.body.status) || req.body.status === "invoiced") {
        return bad(res, 400, "Invalid status");
      }
      if (req.body.status === "in_progress") {
        if (access.role !== "owner" && access.role !== "admin") {
          return bad(res, 403, "Only the workspace owner can set Now");
        }
        await setTodoNow(existing.workspace_id, existing.id);
        const row = await getTodoById(existing.id);
        return res.json(mapTodo(row));
      }
      if (req.body.status === "done") {
        const stats = await queryOne(
          `SELECT
             COUNT(*) FILTER (WHERE kind = 'acceptance')::int AS total,
             COUNT(*) FILTER (WHERE kind = 'acceptance' AND tested_at IS NOT NULL)::int AS tested
           FROM todo_checklist_items WHERE todo_id = $1`,
          [existing.id]
        );
        if (stats?.total && !existing.accepted_at && stats.tested < stats.total) {
          return bad(res, 400, "The client needs to test and accept this to-do first");
        }
      }
      if (req.body.status === "waiting_on_client") {
        const stats = await queryOne(
          `SELECT COUNT(*)::int AS total FROM todo_checklist_items WHERE todo_id = $1 AND kind = 'acceptance'`,
          [existing.id]
        );
        if (!stats?.total) {
          return bad(res, 400, "Add at least one acceptance criterion before sending this to the client");
        }
      }
      fields.push(`status = $${i++}`);
      values.push(req.body.status);
    }
    if (
      !fields.length &&
      req.body?.assigneeIds === undefined &&
      req.body?.assigneeId === undefined &&
      req.body?.dependsOnIds === undefined
    ) {
      return res.json(mapTodo(existing));
    }
    if (fields.length) {
      fields.push("updated_at = NOW()");
      values.push(existing.id);
      await execute(`UPDATE todos SET ${fields.join(", ")} WHERE id = $${i}`, values);
    }
    res.json(mapTodo(await getTodoById(existing.id)));
  } catch (err) {
    if (err.code === "23505") return bad(res, 409, "Something is already in progress");
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post("/todos/:id/ready", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    if (access.role === "client") return bad(res, 403, "The team sends this to you when it is ready to test");
    if (access.todo.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    res.json(mapTodo(await markTodoReady({ todo: access.todo, project: access.project, user: req.dbUser })));
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post("/todos/:id/accept", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    if (access.todo.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    res.json(mapTodo(await acceptTodo({
      todo: access.todo,
      project: access.project,
      user: req.dbUser,
      role: access.role,
    })));
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post("/todos/:id/start", requireAuth, attachRole, async (req, res) => {
  try {
    const existing = await getTodoById(req.params.id);
    if (!existing) return bad(res, 404, "To-do not found");
    const access = await getProjectAccess(existing.project_id, req.dbUser);
    if (!access) return bad(res, 404, "To-do not found");
    if (access.role !== "owner" && access.role !== "admin") {
      return bad(res, 403, "Only the workspace owner can set Now");
    }
    if (existing.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    await setTodoNow(existing.workspace_id, existing.id);
    res.json(mapTodo(await getTodoById(existing.id)));
  } catch (err) {
    if (err.code === "23505") return bad(res, 409, "Something is already in progress");
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete("/todos/:id", requireAuth, attachRole, async (req, res) => {
  try {
    const existing = await getTodoById(req.params.id);
    if (!existing) return bad(res, 404, "To-do not found");
    const access = await getProjectAccess(existing.project_id, req.dbUser);
    if (!access || access.role === "client") return bad(res, 404, "To-do not found");
    if (existing.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    const billed = await queryOne(
      `SELECT id FROM time_entries WHERE todo_id = $1 AND invoice_id IS NOT NULL LIMIT 1`,
      [existing.id]
    );
    if (billed) return bad(res, 409, "This to-do has invoiced hours");
    await removeTodoFiles(existing.id);
    await execute(`DELETE FROM todos WHERE id = $1`, [existing.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/todos/:id/time", requireAuth, attachRole, async (req, res) => {
  try {
    const todo = await getTodoById(req.params.id);
    if (!todo) return bad(res, 404, "To-do not found");
    const access = await getProjectAccess(todo.project_id, req.dbUser);
    if (!access) return bad(res, 404, "To-do not found");
    if (access.role === "client") return bad(res, 403, "Clients cannot log time");
    if (todo.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    const hours = parsePositiveHours(req.body?.hours, { required: true, max: 24 });
    if (hours.error) return bad(res, 400, hours.error);
    const entryDate =
      typeof req.body?.entryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.entryDate)
        ? req.body.entryDate
        : new Date().toISOString().slice(0, 10);
    const row = await queryOne(
      `INSERT INTO time_entries
         (workspace_id, project_id, todo_id, user_id, hours, note, billable, entry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        todo.workspace_id,
        todo.project_id,
        todo.id,
        req.dbUser.id,
        hours.value,
        typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) || null : null,
        req.body?.billable === false ? false : true,
        entryDate,
      ]
    );
    res.status(201).json(mapTimeEntry(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/timesheet", requireAuth, attachRole, async (req, res) => {
  try {
    res.json(
      await listTimesheet(req.dbUser, {
        from: req.query.from,
        to: req.query.to,
        projectId: typeof req.query.projectId === "string" ? req.query.projectId : null,
      })
    );
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post("/time-entries", requireAuth, attachRole, async (req, res) => {
  try {
    const row = await createTimeEntryDirect({
      user: req.dbUser,
      projectId: req.body?.projectId,
      todoId: req.body?.todoId,
      hours: req.body?.hours,
      entryDate: req.body?.entryDate,
      note: req.body?.note,
      billable: req.body?.billable,
    });
    res.status(201).json(mapTimeEntry(row));
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.patch("/time-entries/:id", requireAuth, attachRole, async (req, res) => {
  try {
    const row = await updateTimeEntry({
      user: req.dbUser,
      entryId: req.params.id,
      projectId: req.body?.projectId,
      todoId: req.body?.todoId,
      hours: req.body?.hours,
      entryDate: req.body?.entryDate,
      note: req.body?.note,
      billable: req.body?.billable,
    });
    res.json(mapTimeEntry(row));
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete("/time-entries/:id", requireAuth, attachRole, async (req, res) => {
  try {
    const entry = await queryOne(`SELECT * FROM time_entries WHERE id = $1`, [req.params.id]);
    if (!entry) return bad(res, 404, "Time entry not found");
    const access = await getProjectAccess(entry.project_id, req.dbUser);
    if (!access || access.role === "client") return bad(res, 404, "Time entry not found");
    if (entry.invoice_id) return bad(res, 409, "Invoiced hours are locked");
    if (access.role === "collaborator" && entry.user_id !== req.dbUser.id) {
      return bad(res, 403, "You can only remove your own hours");
    }
    await execute(`DELETE FROM time_entries WHERE id = $1`, [entry.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

async function loadTodoAccess(req, res) {
  const access = await getTodoAccess(req.params.id, req.dbUser);
  if (!access) {
    bad(res, 404, "To-do not found");
    return null;
  }
  return access;
}

router.post("/todos/:id/comments", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    const parsed = parseCommentBody(req.body?.body);
    if (parsed.error) return bad(res, 400, parsed.error);
    const comment = await addTodoComment({
      todo: access.todo,
      project: access.project,
      user: req.dbUser,
      body: parsed.body,
    });
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/todos/:id/comments/:commentId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    const result = await deleteTodoComment({
      commentId: req.params.commentId,
      todoId: access.todo.id,
      user: req.dbUser,
      role: access.role,
    });
    if (result.error) return bad(res, result.status, result.error);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/todos/:id/items", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    if (access.role === "client") return bad(res, 403, "The team writes the criteria and work items");
    if (access.todo.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    const parsed = parseItemTitle(req.body?.title);
    if (parsed.error) return bad(res, 400, parsed.error);
    const kind = req.body?.kind === "acceptance" ? "acceptance" : "work";
    res.status(201).json(await addChecklistItem({ todo: access.todo, title: parsed.title, kind }));
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.patch("/todos/:id/items/:itemId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    if (access.todo.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    let title;
    if (req.body?.title != null) {
      if (access.role === "client") return bad(res, 403, "The client tests criteria, they do not edit them");
      const parsed = parseItemTitle(req.body.title);
      if (parsed.error) return bad(res, 400, parsed.error);
      title = parsed.title;
    }
    const item = await updateChecklistItem({
      itemId: req.params.itemId,
      todoId: access.todo.id,
      title,
      done: access.role === "client" ? undefined : req.body?.done,
      tested: req.body?.tested,
      userId: req.dbUser.id,
      role: access.role,
    });
    if (!item) return bad(res, 404, "Item not found");
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete("/todos/:id/items/:itemId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    if (access.role === "client") return bad(res, 403, "The team owns the criteria list");
    if (access.todo.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    const ok = await deleteChecklistItem({ itemId: req.params.itemId, todoId: access.todo.id });
    if (!ok) return bad(res, 404, "Item not found");
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/todos/:id/attachments/sign", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    if (access.todo.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    const result = await signTodoAttachment({
      todo: access.todo,
      fileName: req.body?.fileName,
      contentType: req.body?.contentType,
      size: req.body?.size,
    });
    if (result.error) return bad(res, result.status, result.error);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/todos/:id/attachments", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    if (access.todo.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    const result = await confirmTodoAttachment({
      todo: access.todo,
      user: req.dbUser,
      filePath: req.body?.filePath,
      fileName: req.body?.fileName,
      contentType: req.body?.contentType,
      size: req.body?.size,
    });
    if (result.error) return bad(res, result.status, result.error);
    res.status(201).json(result);
  } catch (err) {
    if (err.code === "23505") return bad(res, 409, "That file is already attached");
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/todos/:id/attachments/:attachmentId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadTodoAccess(req, res);
    if (!access) return;
    if (access.todo.status === "invoiced") return bad(res, 409, "Invoiced to-dos are locked");
    const row = await deleteTodoAttachment({
      attachmentId: req.params.attachmentId,
      todoId: access.todo.id,
    });
    if (!row) return bad(res, 404, "Attachment not found");
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/invoices", requireAuth, attachRole, async (req, res) => {
  try {
    const rows = await listInvoicesForUser(req.dbUser);
    res.json({ invoices: rows.map(mapInvoice) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/unbilled", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access || (access.role !== "owner" && access.role !== "admin")) {
      return bad(res, 404, "Project not found");
    }
    const entries = await unbilledEntries(access.project.id);
    res.json({
      entries: entries.map((e) => ({
        ...mapTimeEntry(e),
        todoTitle: e.todo_title ?? null,
      })),
      hourlyRate: access.project.hourly_rate != null ? asNumber(access.project.hourly_rate) : null,
      currency: undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/invoices", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") return bad(res, 403, "Only workspace owners can invoice");
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access || access.role !== "owner") return bad(res, 404, "Project not found");
    const ws = await ensureWorkspaceForOwner(req.dbUser.id, req.dbUser.company_name);
    const tax = req.body?.taxPercent != null ? Number(req.body.taxPercent) : undefined;
    if (tax != null && (!Number.isFinite(tax) || tax < 0 || tax > 100)) return bad(res, 400, "Invalid tax percent");
    const ids = Array.isArray(req.body?.timeEntryIds)
      ? req.body.timeEntryIds.filter((id) => typeof id === "string")
      : null;
    const { invoice, lines } = await createInvoiceFromWork({
      workspace: ws,
      project: access.project,
      clientId: access.project.client_id,
      user: req.dbUser,
      timeEntryIds: ids?.length ? ids : null,
      note: typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 2000) : null,
      taxPercent: tax,
      dueAt: typeof req.body?.dueAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.dueAt) ? req.body.dueAt : null,
    });
    if (req.body?.send) {
      await sendInvoice(invoice.id, req);
    }
    const fresh = await queryOne(`SELECT * FROM invoices WHERE id = $1`, [invoice.id]);
    res.status(201).json({ invoice: mapInvoice(fresh), lines: lines.map(mapInvoiceLine) });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get("/invoices/:id", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await getInvoiceAccess(req.params.id, req.dbUser);
    if (!access) return bad(res, 404, "Invoice not found");
    const ctx = await loadInvoiceRenderContext(access.invoice.id);
    const lines = ctx?.lines || await loadInvoiceDetail(access.invoice.id);
    res.json({
      invoice: mapInvoice(access.invoice),
      lines: lines.map(mapInvoiceLine),
      role: access.role,
      projectName: access.invoice.project_name,
      client: mapClient(ctx?.client) || {
        email: access.invoice.client_email,
        firstName: access.invoice.client_first_name,
        lastName: access.invoice.client_last_name,
        companyName: access.invoice.client_company_name,
      },
      billing: {
        complete: !(ctx?.missing || []).length,
        missing: ctx?.missing || [],
        format: "zugferd-en16931",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/invoices/:id/pdf", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await getInvoiceAccess(req.params.id, req.dbUser);
    if (!access) return bad(res, 404, "Invoice not found");
    const ctx = await loadInvoiceRenderContext(access.invoice.id);
    if (!ctx) return bad(res, 404, "Invoice not found");
    const built = await buildInvoiceDocument(ctx, { requireZugferd: false });
    const filename = `${access.invoice.number.replace(/[^\w.-]+/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("X-Invoice-Format", built.zugferd ? "zugferd-en16931" : "pdf");
    res.send(built.pdf);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message, missing: err.missing });
  }
});

async function sendInvoice(invoiceId, req) {
  const access = await getInvoiceAccess(invoiceId, req.dbUser);
  if (!access || (access.role !== "owner" && access.role !== "admin")) {
    const err = new Error("Invoice not found");
    err.status = 404;
    throw err;
  }
  if (access.invoice.status === "cancelled") {
    const err = new Error("Cancelled invoices cannot be sent");
    err.status = 409;
    throw err;
  }
  const ctx = await loadInvoiceRenderContext(access.invoice.id);
  if (!ctx) {
    const err = new Error("Invoice not found");
    err.status = 404;
    throw err;
  }
  const built = await buildInvoiceDocument(ctx, { requireZugferd: true });
  const sent = await queryOne(
    `UPDATE invoices SET status = 'sent', sent_at = COALESCE(sent_at, NOW()) WHERE id = $1 RETURNING *`,
    [access.invoice.id]
  );
  const ws = ctx.workspace;
  const url = appUrl(`/app/invoices/${sent.id}`);
  const filename = `${sent.number.replace(/[^\w.-]+/g, "_")}.pdf`;
  const totalLabel = `${Number(sent.total).toFixed(2)} ${sent.currency}`;
  await sendEmail({
    workspace: ws,
    replyTo: ws.billing_email || undefined,
    ...invoiceEmail({
      to: access.invoice.client_email,
      number: sent.number,
      workspaceName: workspaceDisplayName(ws, ctx.owner),
      projectName: access.invoice.project_name,
      totalLabel,
      invoiceUrl: url,
    }),
    attachments: [
      { filename, content: built.pdf, contentType: "application/pdf" },
    ],
  });
  if (access.invoice.client_user_id) {
    await createNotification({
      userId: access.invoice.client_user_id,
      type: "invoice.sent",
      title: `Invoice ${sent.number}`,
      body: `${access.invoice.project_name} · ${sent.total} ${sent.currency}`,
      payload: { invoiceId: sent.id, projectId: sent.project_id },
    });
  }
  return sent;
}

router.post("/invoices/:id/send", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") return bad(res, 403, "Only workspace owners can send invoices");
  try {
    const sent = await sendInvoice(req.params.id, req);
    res.json(mapInvoice(sent));
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post("/invoices/:id/paid", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") return bad(res, 403, "Only workspace owners can mark invoices paid");
  try {
    const access = await getInvoiceAccess(req.params.id, req.dbUser);
    if (!access || access.role !== "owner") return bad(res, 404, "Invoice not found");
    if (access.invoice.status === "cancelled") return bad(res, 409, "Cancelled invoices cannot be paid");
    const row = await queryOne(
      `UPDATE invoices SET status = 'paid', paid_at = NOW(), sent_at = COALESCE(sent_at, NOW())
       WHERE id = $1 RETURNING *`,
      [access.invoice.id]
    );
    res.json(mapInvoice(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/invoices/:id/cancel", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") return bad(res, 403, "Only workspace owners can cancel invoices");
  try {
    const access = await getInvoiceAccess(req.params.id, req.dbUser);
    if (!access || access.role !== "owner") return bad(res, 404, "Invoice not found");
    if (access.invoice.status === "paid") return bad(res, 409, "Paid invoices cannot be cancelled");
    if (access.invoice.status === "cancelled") return res.json(mapInvoice(access.invoice));
    await cancelInvoice(access.invoice);
    const row = await queryOne(`SELECT * FROM invoices WHERE id = $1`, [access.invoice.id]);
    res.json(mapInvoice(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
