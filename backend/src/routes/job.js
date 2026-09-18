import { Router } from "express";
import { query, queryOne, execute, buildSet } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import { checkInquiryAccess, logActivity } from "../lib/workspace.js";
import {
  mapAgreement,
  mapTodo,
  mapTimeEntry,
  mapPayment,
  computeJobFinance,
} from "../lib/finance.js";
import { notifyInquiryCounterpart } from "../lib/notifications.js";
import { renderInvoicePdf } from "../lib/invoice.js";

const router = Router();
router.use(requireAuth, attachRole);

async function requireAccess(req, res) {
  const { ok, inquiry, isWorkspaceOwner, isAdmin } = await checkInquiryAccess(
    req.params.id,
    req.dbUser.id,
    req.userRole
  );
  if (!ok) {
    res.status(403).json({ error: "Access denied" });
    return null;
  }
  return { inquiry, isWorkspaceOwner, isAdmin, isFreelancer: isWorkspaceOwner || req.userRole === "expert" };
}

async function latestAgreed(inquiryId) {
  return queryOne(
    `SELECT * FROM price_agreements
     WHERE inquiry_id = $1 AND status = 'agreed'
     ORDER BY agreed_at DESC NULLS LAST
     LIMIT 1`,
    [inquiryId]
  );
}

// ── Agreements ───────────────────────────────────────────────────────────────

router.get("/:id/agreements", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  try {
    const data = await query(
      `SELECT * FROM price_agreements WHERE inquiry_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(data.map(mapAgreement));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/agreements", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;

  const billingType = req.body?.billingType;
  if (!["hourly", "project"].includes(billingType)) {
    return res.status(400).json({ error: "billingType must be hourly or project" });
  }

  const hourlyRate = req.body?.hourlyRate != null ? Number(req.body.hourlyRate) : null;
  const estimatedHours = req.body?.estimatedHours != null ? Number(req.body.estimatedHours) : null;
  const projectPrice = req.body?.projectPrice != null ? Number(req.body.projectPrice) : null;

  if (billingType === "hourly" && !(hourlyRate > 0)) {
    return res.status(400).json({ error: "hourlyRate is required" });
  }
  if (billingType === "project" && !(projectPrice > 0)) {
    return res.status(400).json({ error: "projectPrice is required" });
  }

  try {
    const data = await queryOne(
      `INSERT INTO price_agreements (
         inquiry_id, proposed_by, billing_type, hourly_rate, estimated_hours,
         project_price, currency, notes, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'proposed')
       RETURNING *`,
      [
        req.params.id,
        req.dbUser.id,
        billingType,
        billingType === "hourly" ? hourlyRate : null,
        billingType === "hourly" ? estimatedHours : null,
        billingType === "project" ? projectPrice : null,
        req.body?.currency || "TRY",
        req.body?.notes?.trim() || null,
      ]
    );

    if (ctx.inquiry.workspace_id) {
      await logActivity({
        workspaceId: ctx.inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "agreement.proposed",
        payload: { billingType },
      }).catch(() => null);
    }
    await notifyInquiryCounterpart({
      inquiryId: req.params.id,
      actorId: req.dbUser.id,
      type: "agreement.proposed",
      title: "New price agreement",
      body: "A pricing agreement was proposed on a job.",
    });

    res.status(201).json(mapAgreement(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/agreements/:agreementId/agree", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;

  const existing = await queryOne(
    `SELECT * FROM price_agreements WHERE id = $1 AND inquiry_id = $2`,
    [req.params.agreementId, req.params.id]
  );
  if (!existing) return res.status(404).json({ error: "Agreement not found" });
  if (existing.status !== "proposed") {
    return res.status(400).json({ error: "Only a proposed agreement can be accepted" });
  }
  if (existing.proposed_by === req.dbUser.id && !ctx.isAdmin) {
    return res.status(400).json({ error: "The other party needs to agree" });
  }

  try {
    await execute(
      `UPDATE price_agreements SET status = 'superseded'
       WHERE inquiry_id = $1 AND status = 'agreed'`,
      [req.params.id]
    );

    const data = await queryOne(
      `UPDATE price_agreements
       SET status = 'agreed', agreed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [existing.id]
    );

    if (["pending", "matching", "offered", "accepted"].includes(ctx.inquiry.status)) {
      await execute(`UPDATE inquiries SET status = 'in_progress' WHERE id = $1`, [req.params.id]);
    }

    if (ctx.inquiry.workspace_id) {
      await logActivity({
        workspaceId: ctx.inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "agreement.agreed",
        payload: { billingType: existing.billing_type },
      }).catch(() => null);
    }

    res.json(mapAgreement(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/agreements/:agreementId/decline", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;

  try {
    const data = await queryOne(
      `UPDATE price_agreements
       SET status = 'declined'
       WHERE id = $1 AND inquiry_id = $2 AND status = 'proposed'
       RETURNING *`,
      [req.params.agreementId, req.params.id]
    );
    if (!data) return res.status(400).json({ error: "Could not decline this agreement" });

    if (ctx.inquiry.workspace_id) {
      await logActivity({
        workspaceId: ctx.inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "agreement.declined",
        payload: {},
      }).catch(() => null);
    }

    res.json(mapAgreement(data));
  } catch (err) {
    return res.status(400).json({ error: "Could not decline this agreement" });
  }
});

// ── Todos ────────────────────────────────────────────────────────────────────

router.get("/:id/todos", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  try {
    const data = await query(
      `SELECT t.*,
              COALESCE((
                SELECT SUM(te.hours) FROM time_entries te WHERE te.todo_id = t.id
              ), 0) AS hours_logged
       FROM inquiry_todos t
       WHERE t.inquiry_id = $1
       ORDER BY t.sort_order, t.created_at`,
      [req.params.id]
    );
    res.json(data.map(mapTodo));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/todos", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  const title = req.body?.title?.trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  if (title.length > 300) return res.status(400).json({ error: "title is too long" });

  try {
    const last = await queryOne(
      `SELECT sort_order FROM inquiry_todos
       WHERE inquiry_id = $1
       ORDER BY sort_order DESC
       LIMIT 1`,
      [req.params.id]
    );

    const data = await queryOne(
      `INSERT INTO inquiry_todos (
         inquiry_id, title, body, assignee_id, due_date, sort_order, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.params.id,
        title,
        req.body?.body?.trim() || null,
        req.body?.assigneeId || null,
        req.body?.dueDate || null,
        (last?.sort_order ?? 0) + 1,
        req.dbUser.id,
      ]
    );

    if (ctx.inquiry.workspace_id) {
      await logActivity({
        workspaceId: ctx.inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "todo.created",
        payload: { title },
      }).catch(() => null);
    }

    res.status(201).json(mapTodo(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/todos/:todoId", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;

  const updates = { updated_at: new Date().toISOString() };
  if (typeof req.body?.title === "string") {
    const title = req.body.title.trim();
    if (!title) return res.status(400).json({ error: "title cannot be empty" });
    updates.title = title;
  }
  if (typeof req.body?.body === "string") updates.body = req.body.body.trim() || null;
  if (req.body?.status === "open" || req.body?.status === "done") updates.status = req.body.status;
  if (req.body?.assigneeId !== undefined) updates.assignee_id = req.body.assigneeId || null;
  if (req.body?.dueDate !== undefined) updates.due_date = req.body.dueDate || null;

  try {
    const { set, values, next } = buildSet(updates);
    const data = await queryOne(
      `UPDATE inquiry_todos SET ${set}
       WHERE id = $${next} AND inquiry_id = $${next + 1}
       RETURNING *`,
      [...values, req.params.todoId, req.params.id]
    );
    if (!data) return res.status(404).json({ error: "To-do not found" });

    if (ctx.inquiry.workspace_id && updates.status === "done") {
      await logActivity({
        workspaceId: ctx.inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "todo.completed",
        payload: { title: data.title },
      }).catch(() => null);
    }

    res.json(mapTodo(data));
  } catch (err) {
    return res.status(404).json({ error: "To-do not found" });
  }
});

router.delete("/:id/todos/:todoId", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  try {
    await execute(
      `DELETE FROM inquiry_todos WHERE id = $1 AND inquiry_id = $2`,
      [req.params.todoId, req.params.id]
    );
    res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Time entries ─────────────────────────────────────────────────────────────

router.get("/:id/time-entries", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  try {
    const data = await query(
      `SELECT te.*, td.title AS todo_title
       FROM time_entries te
       LEFT JOIN inquiry_todos td ON td.id = te.todo_id
       WHERE te.inquiry_id = $1
       ORDER BY te.entry_date DESC, te.created_at DESC`,
      [req.params.id]
    );
    res.json(data.map(mapTimeEntry));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/time-entries", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  if (!ctx.isWorkspaceOwner && req.userRole !== "expert" && !ctx.isAdmin) {
    return res.status(403).json({ error: "Only the freelancer can log hours" });
  }

  const hours = Number(req.body?.hours);
  if (!(hours > 0) || hours > 24) {
    return res.status(400).json({ error: "hours must be between 0 and 24" });
  }

  let todoId = req.body?.todoId || null;
  let todoTitle = null;
  if (todoId) {
    const todo = await queryOne(
      `SELECT id, title FROM inquiry_todos WHERE id = $1 AND inquiry_id = $2`,
      [todoId, req.params.id]
    );
    if (!todo) return res.status(400).json({ error: "That to-do is not on this job" });
    todoTitle = todo.title;
  }

  try {
    const data = await queryOne(
      `INSERT INTO time_entries (inquiry_id, todo_id, user_id, hours, note, billable, entry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.params.id,
        todoId,
        req.dbUser.id,
        hours,
        req.body?.note?.trim() || null,
        req.body?.billable !== false,
        req.body?.entryDate || new Date().toISOString().slice(0, 10),
      ]
    );

    if (ctx.inquiry.workspace_id) {
      await logActivity({
        workspaceId: ctx.inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "hours.logged",
        payload: { hours, todoId, title: todoTitle },
      }).catch(() => null);
    }

    res.status(201).json({ ...mapTimeEntry(data), todoTitle });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/time-entries/:entryId", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;

  const entry = await queryOne(
    `SELECT * FROM time_entries WHERE id = $1 AND inquiry_id = $2`,
    [req.params.entryId, req.params.id]
  );
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  if (entry.user_id !== req.dbUser.id && !ctx.isWorkspaceOwner && !ctx.isAdmin) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    await execute(`DELETE FROM time_entries WHERE id = $1`, [entry.id]);
    res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Payments ─────────────────────────────────────────────────────────────────

router.get("/:id/payments", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  try {
    const data = await query(
      `SELECT * FROM payments WHERE inquiry_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(data.map(mapPayment));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:id/payments", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  if (!ctx.isWorkspaceOwner && req.userRole !== "expert" && !ctx.isAdmin) {
    return res.status(403).json({ error: "Only the freelancer can record payments" });
  }

  const amount = Number(req.body?.amount);
  if (!(amount > 0)) return res.status(400).json({ error: "amount must be greater than 0" });
  const status = req.body?.status || "unpaid";
  if (!["unpaid", "partial", "paid"].includes(status)) {
    return res.status(400).json({ error: "status must be unpaid, partial, or paid" });
  }

  try {
    const data = await queryOne(
      `INSERT INTO payments (inquiry_id, recorded_by, amount, currency, status, note, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.params.id,
        req.dbUser.id,
        amount,
        req.body?.currency || "TRY",
        status,
        req.body?.note?.trim() || null,
        status === "paid" ? new Date().toISOString() : null,
      ]
    );

    if (ctx.inquiry.workspace_id) {
      await logActivity({
        workspaceId: ctx.inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "payment.recorded",
        payload: { amount, status },
      }).catch(() => null);
    }
    await notifyInquiryCounterpart({
      inquiryId: req.params.id,
      actorId: req.dbUser.id,
      type: "payment.recorded",
      title: "Payment recorded",
      body: `A payment of ${amount} was logged.`,
    });

    res.status(201).json(mapPayment(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/payments/:paymentId", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  if (!ctx.isWorkspaceOwner && req.userRole !== "expert" && !ctx.isAdmin) {
    return res.status(403).json({ error: "Only the freelancer can update payments" });
  }

  const updates = {};
  if (req.body?.status) {
    if (!["unpaid", "partial", "paid"].includes(req.body.status)) {
      return res.status(400).json({ error: "status must be unpaid, partial, or paid" });
    }
    updates.status = req.body.status;
    updates.paid_at = req.body.status === "paid" ? new Date().toISOString() : null;
  }
  if (typeof req.body?.note === "string") updates.note = req.body.note.trim() || null;
  if (req.body?.amount != null) {
    const amount = Number(req.body.amount);
    if (!(amount > 0)) return res.status(400).json({ error: "amount must be greater than 0" });
    updates.amount = amount;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });

  try {
    const { set, values, next } = buildSet(updates);
    const data = await queryOne(
      `UPDATE payments SET ${set}
       WHERE id = $${next} AND inquiry_id = $${next + 1}
       RETURNING *`,
      [...values, req.params.paymentId, req.params.id]
    );
    if (!data) return res.status(404).json({ error: "Payment not found" });

    if (ctx.inquiry.workspace_id && updates.status) {
      await logActivity({
        workspaceId: ctx.inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "payment.updated",
        payload: { status: updates.status },
      }).catch(() => null);
    }

    res.json(mapPayment(data));
  } catch (err) {
    return res.status(404).json({ error: "Payment not found" });
  }
});

// ── Per-job finance snapshot ─────────────────────────────────────────────────

router.get("/:id/finance", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;

  const [agreement, timeEntries, payments] = await Promise.all([
    latestAgreed(req.params.id),
    query(`SELECT * FROM time_entries WHERE inquiry_id = $1`, [req.params.id]),
    query(`SELECT * FROM payments WHERE inquiry_id = $1`, [req.params.id]),
  ]);

  res.json(computeJobFinance({
    agreement,
    timeEntries,
    payments,
  }));
});

router.get("/:id/invoice.pdf", async (req, res) => {
  const ctx = await requireAccess(req, res);
  if (!ctx) return;
  try {
    const pdf = await renderInvoicePdf(req.params.id);
    if (!pdf) return res.status(404).json({ error: "Job not found" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error("[invoice]", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
