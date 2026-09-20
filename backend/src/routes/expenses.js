import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import { mapInvoice } from "../lib/work.js";
import {
  listExpenses,
  createExpenseVendor,
  updateExpenseVendor,
  deleteExpenseVendor,
  createExpense,
  updateExpense,
  deleteExpense,
  createInvoiceFromExpenses,
} from "../lib/expenses.js";

const router = Router();

function bad(res, status, error) {
  return res.status(status).json({ error });
}

function handle(err, res) {
  if (err.status && err.status < 500) return bad(res, err.status, err.message);
  console.error(err);
  return bad(res, 500, err.message);
}

router.get("/expenses", requireAuth, attachRole, async (req, res) => {
  try {
    res.json(await listExpenses(req.dbUser));
  } catch (err) {
    handle(err, res);
  }
});

router.post("/expense-vendors", requireAuth, attachRole, async (req, res) => {
  try {
    const vendor = await createExpenseVendor(req.dbUser, req.body || {});
    res.status(201).json(vendor);
  } catch (err) {
    handle(err, res);
  }
});

router.patch("/expense-vendors/:id", requireAuth, attachRole, async (req, res) => {
  try {
    const vendor = await updateExpenseVendor(req.dbUser, req.params.id, req.body || {});
    res.json(vendor);
  } catch (err) {
    handle(err, res);
  }
});

router.delete("/expense-vendors/:id", requireAuth, attachRole, async (req, res) => {
  try {
    await deleteExpenseVendor(req.dbUser, req.params.id);
    res.status(204).send();
  } catch (err) {
    handle(err, res);
  }
});

router.post("/expense-vendors/:id/expenses", requireAuth, attachRole, async (req, res) => {
  try {
    const expense = await createExpense(req.dbUser, req.params.id, req.body || {});
    res.status(201).json(expense);
  } catch (err) {
    handle(err, res);
  }
});

router.patch("/expenses/:id", requireAuth, attachRole, async (req, res) => {
  try {
    res.json(await updateExpense(req.dbUser, req.params.id, req.body || {}));
  } catch (err) {
    handle(err, res);
  }
});

router.delete("/expenses/:id", requireAuth, attachRole, async (req, res) => {
  try {
    await deleteExpense(req.dbUser, req.params.id);
    res.status(204).send();
  } catch (err) {
    handle(err, res);
  }
});

router.post("/projects/:id/expense-invoices", requireAuth, attachRole, async (req, res) => {
  try {
    const dueAt =
      typeof req.body?.dueAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.dueAt)
        ? req.body.dueAt
        : null;
    const { invoice, lines, mapped } = await createInvoiceFromExpenses({
      user: req.dbUser,
      projectId: req.params.id,
      allocationIds: req.body?.allocationIds,
      note: typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 2000) : null,
      taxPercent: req.body?.taxPercent ?? 0,
      dueAt,
    });
    res.status(201).json({ invoice: mapped || mapInvoice(invoice), lines });
  } catch (err) {
    handle(err, res);
  }
});

export default router;
