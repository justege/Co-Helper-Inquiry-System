import { query, queryOne, execute, withTransaction } from "../db.js";
import { getProjectAccess, getWorkspaceByOwner } from "./workspace.js";
import { asNumber, mapInvoice, mapInvoiceLine, nextInvoiceNumber, parseDateInput } from "./work.js";
import {
  addDaysIso,
  isoDate,
  snapshotBuyer,
  snapshotSeller,
  taxSetupForWorkspace,
  todayIso,
} from "./billingProfile.js";

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

function money(value) {
  return Math.round(asNumber(value) * 100) / 100;
}

export function parseMoneyInput(value, { required = false, max = 1_000_000 } = {}) {
  if (value == null || value === "") {
    return required ? { error: "Amount is required" } : { value: 0 };
  }
  const n = Number(String(value).trim().replace(/\s/g, "").replace("€", "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > max) {
    return { error: `Amount must be between 0 and ${max}` };
  }
  return { value: money(n) };
}

function parseName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (name.length < 1 || name.length > 120) return { error: "Name must be 1–120 characters" };
  return { name };
}

function parseKind(value) {
  if (value == null || value === "") return { kind: "split" };
  if (value !== "split" && value !== "columns") return { error: "Type must be split or columns" };
  return { kind: value };
}

function parseText(value, max) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, max);
  return text || null;
}

async function requireOwnerWorkspace(user) {
  if (user.role !== "expert" && !["admin", "superadmin"].includes(user.role)) {
    fail(403, "Only workspace owners can manage expenses");
  }
  const ws = await getWorkspaceByOwner(user.id);
  if (!ws) fail(404, "Workspace not found");
  return ws;
}

function splitPercents(splits, total) {
  const active = splits.filter((s) => asNumber(s.percent) > 0);
  if (!active.length || total <= 0) return splits.map((s) => ({ ...s, amount: 0 }));
  const computed = active.map((s) => ({
    projectId: s.projectId,
    amount: money((total * asNumber(s.percent)) / 100),
  }));
  const allocated = money(computed.reduce((sum, row) => sum + row.amount, 0));
  const expected = money((total * active.reduce((sum, s) => sum + asNumber(s.percent), 0)) / 100);
  const drift = money(expected - allocated);
  if (computed.length && drift !== 0) {
    computed[computed.length - 1].amount = money(computed[computed.length - 1].amount + drift);
  }
  const byProject = Object.fromEntries(computed.map((row) => [row.projectId, row.amount]));
  return splits.map((s) => ({ ...s, amount: byProject[s.projectId] ?? 0 }));
}

async function assertVendorProjects(workspaceId, splits) {
  if (!Array.isArray(splits) || splits.length === 0) fail(400, "Pick at least one project");
  const seen = new Set();
  const cleaned = [];
  for (const [index, raw] of splits.entries()) {
    const projectId = typeof raw?.projectId === "string" ? raw.projectId : "";
    if (!projectId) fail(400, "Each split needs a project");
    if (seen.has(projectId)) fail(400, "A project can only appear once");
    seen.add(projectId);
    const project = await queryOne(
      `SELECT id, name, client_id, workspace_id FROM projects WHERE id = $1 AND workspace_id = $2`,
      [projectId, workspaceId]
    );
    if (!project) fail(400, "Project not found in this workspace");
    let percent = null;
    if (raw.percent != null && raw.percent !== "") {
      const n = Number(raw.percent);
      if (!Number.isFinite(n) || n < 0 || n > 100) fail(400, "Percent must be between 0 and 100");
      percent = money(n);
    }
    cleaned.push({ projectId, percent, sortOrder: index });
  }
  return cleaned;
}

function mapProjectBrief(row) {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    clientName: row.client_company_name || row.client_email || null,
  };
}

function mapAllocation(row) {
  return {
    id: row.id,
    expenseId: row.expense_id,
    projectId: row.project_id,
    amount: money(row.amount),
    invoiceId: row.invoice_id ?? null,
    invoiceNumber: row.invoice_number ?? null,
    invoiceStatus: row.invoice_status ?? null,
  };
}

function mapExpense(row, allocations) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    incurredAt: row.incurred_at,
    amount: money(row.amount),
    currency: row.currency,
    reference: row.reference ?? null,
    note: row.note ?? null,
    createdAt: row.created_at,
    allocations: allocations.filter((a) => a.expenseId === row.id),
  };
}

function mapVendor(row, splits, expenses) {
  return {
    id: row.id,
    name: row.name,
    note: row.note ?? null,
    kind: row.kind,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    splits: splits
      .filter((s) => s.vendor_id === row.id)
      .map((s) => ({
        projectId: s.project_id,
        percent: s.percent == null ? null : money(s.percent),
        sortOrder: s.sort_order,
        projectName: s.project_name,
        clientName: s.client_company_name || s.client_email || null,
      })),
    expenses: expenses.filter((e) => e.vendorId === row.id),
  };
}

export async function listExpenses(user) {
  const ws = await requireOwnerWorkspace(user);
  const [vendors, splits, expenses, allocations, projects] = await Promise.all([
    query(
      `SELECT * FROM expense_vendors WHERE workspace_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [ws.id]
    ),
    query(
      `SELECT s.*, p.name AS project_name, c.company_name AS client_company_name, c.email AS client_email
       FROM expense_vendor_splits s
       JOIN projects p ON p.id = s.project_id
       JOIN clients c ON c.id = p.client_id
       WHERE s.vendor_id IN (SELECT id FROM expense_vendors WHERE workspace_id = $1)
       ORDER BY s.sort_order ASC`,
      [ws.id]
    ),
    query(
      `SELECT * FROM expenses WHERE workspace_id = $1 ORDER BY incurred_at DESC, created_at DESC`,
      [ws.id]
    ),
    query(
      `SELECT a.*, i.number AS invoice_number, i.status AS invoice_status
       FROM expense_allocations a
       JOIN expenses e ON e.id = a.expense_id
       LEFT JOIN invoices i ON i.id = a.invoice_id
       WHERE e.workspace_id = $1
       ORDER BY a.project_id`,
      [ws.id]
    ),
    query(
      `SELECT p.id, p.name, p.client_id, c.company_name AS client_company_name, c.email AS client_email
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.workspace_id = $1
       ORDER BY p.created_at DESC`,
      [ws.id]
    ),
  ]);
  const mappedAllocations = allocations.map(mapAllocation);
  const mappedExpenses = expenses.map((row) => mapExpense(row, mappedAllocations));
  return {
    role: "owner",
    currency: ws.currency || "EUR",
    projects: projects.map(mapProjectBrief),
    vendors: vendors.map((row) => mapVendor(row, splits, mappedExpenses)),
  };
}

export async function createExpenseVendor(user, body) {
  const ws = await requireOwnerWorkspace(user);
  const parsed = parseName(body?.name);
  if (parsed.error) fail(400, parsed.error);
  const kind = parseKind(body?.kind);
  if (kind.error) fail(400, kind.error);
  const splits = await assertVendorProjects(ws.id, body?.splits);
  if (kind.kind === "split" && splits.some((s) => s.percent == null)) {
    fail(400, "Shared costs need a percent for each project");
  }
  const maxOrder = await queryOne(
    `SELECT COALESCE(MAX(sort_order), -1) AS n FROM expense_vendors WHERE workspace_id = $1`,
    [ws.id]
  );
  const vendor = await withTransaction(async (tx) => {
    const created = await tx.queryOne(
      `INSERT INTO expense_vendors (workspace_id, name, note, kind, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ws.id, parsed.name, parseText(body?.note, 300), kind.kind, (maxOrder?.n ?? -1) + 1]
    );
    for (const split of splits) {
      await tx.query(
        `INSERT INTO expense_vendor_splits (vendor_id, project_id, percent, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [created.id, split.projectId, kind.kind === "split" ? split.percent : null, split.sortOrder]
      );
    }
    return created;
  });
  const data = await listExpenses(user);
  return data.vendors.find((v) => v.id === vendor.id);
}

export async function updateExpenseVendor(user, vendorId, body) {
  const ws = await requireOwnerWorkspace(user);
  const vendor = await queryOne(
    `SELECT * FROM expense_vendors WHERE id = $1 AND workspace_id = $2`,
    [vendorId, ws.id]
  );
  if (!vendor) fail(404, "Vendor not found");
  const fields = [];
  const values = [];
  let i = 1;
  if (body?.name !== undefined) {
    const parsed = parseName(body.name);
    if (parsed.error) fail(400, parsed.error);
    fields.push(`name = $${i++}`);
    values.push(parsed.name);
  }
  if (body?.note !== undefined) {
    fields.push(`note = $${i++}`);
    values.push(parseText(body.note, 300));
  }
  if (body?.kind !== undefined) {
    const kind = parseKind(body.kind);
    if (kind.error) fail(400, kind.error);
    fields.push(`kind = $${i++}`);
    values.push(kind.kind);
  }
  if (fields.length) {
    values.push(vendor.id);
    await execute(`UPDATE expense_vendors SET ${fields.join(", ")} WHERE id = $${i}`, values);
  }
  if (body?.splits) {
    const kind = body.kind || vendor.kind;
    const splits = await assertVendorProjects(ws.id, body.splits);
    if (kind === "split" && splits.some((s) => s.percent == null)) {
      fail(400, "Shared costs need a percent for each project");
    }
    const billed = await queryOne(
      `SELECT 1
       FROM expense_allocations a
       JOIN expenses e ON e.id = a.expense_id
       WHERE e.vendor_id = $1 AND a.invoice_id IS NOT NULL
       LIMIT 1`,
      [vendor.id]
    );
    await withTransaction(async (tx) => {
      if (billed) {
        const keep = splits.map((s) => s.projectId);
        const extra = await tx.query(
          `SELECT project_id FROM expense_vendor_splits WHERE vendor_id = $1`,
          [vendor.id]
        );
        for (const row of extra) {
          if (!keep.includes(row.project_id)) {
            fail(409, "Cannot remove a project that already has invoiced costs");
          }
        }
      } else {
        await tx.query(`DELETE FROM expense_vendor_splits WHERE vendor_id = $1`, [vendor.id]);
      }
      for (const split of splits) {
        await tx.query(
          `INSERT INTO expense_vendor_splits (vendor_id, project_id, percent, sort_order)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (vendor_id, project_id)
           DO UPDATE SET percent = EXCLUDED.percent, sort_order = EXCLUDED.sort_order`,
          [vendor.id, split.projectId, kind === "split" ? split.percent : null, split.sortOrder]
        );
      }
    });
  }
  const data = await listExpenses(user);
  return data.vendors.find((v) => v.id === vendor.id);
}

export async function deleteExpenseVendor(user, vendorId) {
  const ws = await requireOwnerWorkspace(user);
  const vendor = await queryOne(
    `SELECT * FROM expense_vendors WHERE id = $1 AND workspace_id = $2`,
    [vendorId, ws.id]
  );
  if (!vendor) fail(404, "Vendor not found");
  const billed = await queryOne(
    `SELECT 1
     FROM expense_allocations a
     JOIN expenses e ON e.id = a.expense_id
     WHERE e.vendor_id = $1 AND a.invoice_id IS NOT NULL
     LIMIT 1`,
    [vendor.id]
  );
  if (billed) fail(409, "Cannot delete a vendor that has invoiced costs");
  await execute(`DELETE FROM expense_vendors WHERE id = $1`, [vendor.id]);
}

async function loadVendor(workspaceId, vendorId) {
  const vendor = await queryOne(
    `SELECT * FROM expense_vendors WHERE id = $1 AND workspace_id = $2`,
    [vendorId, workspaceId]
  );
  if (!vendor) fail(404, "Vendor not found");
  const splits = await query(
    `SELECT * FROM expense_vendor_splits WHERE vendor_id = $1 ORDER BY sort_order ASC`,
    [vendor.id]
  );
  if (!splits.length) fail(400, "Add projects to this vendor first");
  return { vendor, splits };
}

function allocationsFromBody(splits, vendor, amount, allocations) {
  if (vendor.kind === "split") {
    if (Array.isArray(allocations) && allocations.length) {
      const byProject = Object.fromEntries(
        allocations.map((row) => [row.projectId, parseMoneyInput(row.amount).value])
      );
      return splits.map((s) => ({
        projectId: s.project_id,
        amount: money(byProject[s.project_id] ?? 0),
      }));
    }
    return splitPercents(
      splits.map((s) => ({ projectId: s.project_id, percent: s.percent })),
      amount
    );
  }
  const byProject = Object.fromEntries(
    (allocations || []).map((row) => [row.projectId, parseMoneyInput(row.amount).value])
  );
  return splits.map((s) => ({
    projectId: s.project_id,
    amount: money(byProject[s.project_id] ?? 0),
  }));
}

async function replaceAllocations(tx, expense, nextAllocations) {
  const existing = await tx.query(
    `SELECT * FROM expense_allocations WHERE expense_id = $1`,
    [expense.id]
  );
  const invoiced = existing.filter((row) => row.invoice_id);
  for (const row of invoiced) {
    const next = nextAllocations.find((item) => item.projectId === row.project_id);
    if (!next || money(next.amount) !== money(row.amount)) {
      fail(409, "Invoiced amounts are locked");
    }
  }
  await tx.query(
    `DELETE FROM expense_allocations WHERE expense_id = $1 AND invoice_id IS NULL`,
    [expense.id]
  );
  for (const item of nextAllocations) {
    const current = invoiced.find((row) => row.project_id === item.projectId);
    if (current) continue;
    if (item.amount <= 0) continue;
    await tx.query(
      `INSERT INTO expense_allocations (expense_id, project_id, amount)
       VALUES ($1, $2, $3)`,
      [expense.id, item.projectId, item.amount]
    );
  }
}

export async function createExpense(user, vendorId, body) {
  const ws = await requireOwnerWorkspace(user);
  const { vendor, splits } = await loadVendor(ws.id, vendorId);
  const date = parseDateInput(body?.incurredAt);
  if (date.error || !date.value) fail(400, "Date must be YYYY-MM-DD");
  let amount = parseMoneyInput(body?.amount);
  if (amount.error) fail(400, amount.error);
  const nextAllocations = allocationsFromBody(splits, vendor, amount.value, body?.allocations);
  if (vendor.kind === "columns") {
    amount = { value: money(nextAllocations.reduce((sum, row) => sum + row.amount, 0)) };
  }
  if (amount.value <= 0 && nextAllocations.every((row) => row.amount <= 0)) {
    fail(400, "Enter an amount");
  }
  const expense = await withTransaction(async (tx) => {
    const created = await tx.queryOne(
      `INSERT INTO expenses (workspace_id, vendor_id, incurred_at, amount, currency, reference, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        ws.id,
        vendor.id,
        date.value,
        amount.value,
        ws.currency || "EUR",
        parseText(body?.reference, 80),
        parseText(body?.note, 500),
        user.id,
      ]
    );
    await replaceAllocations(tx, created, nextAllocations);
    return created;
  });
  const data = await listExpenses(user);
  const found = data.vendors.flatMap((v) => v.expenses).find((e) => e.id === expense.id);
  return found;
}

export async function updateExpense(user, expenseId, body) {
  const ws = await requireOwnerWorkspace(user);
  const expense = await queryOne(
    `SELECT * FROM expenses WHERE id = $1 AND workspace_id = $2`,
    [expenseId, ws.id]
  );
  if (!expense) fail(404, "Expense not found");
  const { vendor, splits } = await loadVendor(ws.id, expense.vendor_id);

  let incurredAt = expense.incurred_at;
  if (body?.incurredAt !== undefined) {
    const date = parseDateInput(body.incurredAt);
    if (date.error || !date.value) fail(400, "Date must be YYYY-MM-DD");
    incurredAt = date.value;
  }
  let amount = money(expense.amount);
  if (body?.amount !== undefined) {
    const parsed = parseMoneyInput(body.amount, { required: true });
    if (parsed.error) fail(400, parsed.error);
    amount = parsed.value;
  }
  const nextAllocations = allocationsFromBody(
    splits,
    vendor,
    amount,
    body?.allocations !== undefined ? body.allocations : undefined
  );
  if (vendor.kind === "columns" && body?.allocations) {
    amount = money(nextAllocations.reduce((sum, row) => sum + row.amount, 0));
  }
  const reference =
    body?.reference !== undefined ? parseText(body.reference, 80) : expense.reference;
  const note = body?.note !== undefined ? parseText(body.note, 500) : expense.note;

  await withTransaction(async (tx) => {
    await tx.query(
      `UPDATE expenses
          SET incurred_at = $2, amount = $3, reference = $4, note = $5
        WHERE id = $1`,
      [expense.id, incurredAt, amount, reference, note]
    );
    if (body?.allocations !== undefined || body?.amount !== undefined) {
      await replaceAllocations(tx, expense, nextAllocations);
    }
  });
  const data = await listExpenses(user);
  return data.vendors.flatMap((v) => v.expenses).find((e) => e.id === expense.id);
}

export async function deleteExpense(user, expenseId) {
  const ws = await requireOwnerWorkspace(user);
  const expense = await queryOne(
    `SELECT * FROM expenses WHERE id = $1 AND workspace_id = $2`,
    [expenseId, ws.id]
  );
  if (!expense) fail(404, "Expense not found");
  const billed = await queryOne(
    `SELECT 1 FROM expense_allocations WHERE expense_id = $1 AND invoice_id IS NOT NULL LIMIT 1`,
    [expense.id]
  );
  if (billed) fail(409, "Cannot delete an expense that has been invoiced");
  await execute(`DELETE FROM expenses WHERE id = $1`, [expense.id]);
}

export async function createInvoiceFromExpenses({ user, projectId, allocationIds, note, taxPercent, dueAt }) {
  const ws = await requireOwnerWorkspace(user);
  const access = await getProjectAccess(projectId, user);
  if (!access || access.role !== "owner") fail(404, "Project not found");
  const ids = Array.isArray(allocationIds)
    ? allocationIds.filter((id) => typeof id === "string")
    : [];
  const rows = await query(
    `SELECT a.*,
            e.incurred_at,
            e.reference,
            e.amount AS expense_amount,
            v.name AS vendor_name
     FROM expense_allocations a
     JOIN expenses e ON e.id = a.expense_id
     JOIN expense_vendors v ON v.id = e.vendor_id
     WHERE e.workspace_id = $1
       AND a.project_id = $2
       AND a.invoice_id IS NULL
       AND a.amount > 0
       ${ids.length ? "AND a.id = ANY($3::uuid[])" : ""}
     ORDER BY e.incurred_at ASC, v.sort_order ASC`,
    ids.length ? [ws.id, access.project.id, ids] : [ws.id, access.project.id]
  );
  if (!rows.length) fail(400, "No unbilled expenses for this project");

  if (taxPercent != null && taxPercent !== "") {
    const requested = Number(taxPercent);
    if (!Number.isFinite(requested) || requested < 0 || requested > 100) fail(400, "Invalid tax percent");
  }

  const lines = rows.map((row, index) => {
    const dateLabel =
      typeof row.incurred_at === "string" ? row.incurred_at : String(row.incurred_at).slice(0, 10);
    const ref = row.reference ? ` (${row.reference})` : "";
    return {
      allocationId: row.id,
      description: `${row.vendor_name}${ref} · ${dateLabel}`,
      hours: 0,
      rate: money(row.amount),
      amount: money(row.amount),
      sortOrder: index,
    };
  });
  const tax = taxSetupForWorkspace(ws, taxPercent);
  const subtotal = money(lines.reduce((sum, line) => sum + line.amount, 0));
  const taxAmount = money(subtotal * (tax.taxPercent / 100));
  const total = money(subtotal + taxAmount);
  const number = await nextInvoiceNumber(ws.id);
  const owner = await queryOne(`SELECT * FROM users WHERE id = $1`, [ws.owner_id]);
  const client = await queryOne(`SELECT * FROM clients WHERE id = $1`, [access.project.client_id]);
  const seller = snapshotSeller(ws, owner);
  const buyer = snapshotBuyer(client);
  const issueDate = todayIso();
  const dates = rows.map((row) => isoDate(row.incurred_at)).filter(Boolean).sort();
  const servicePeriodStart = dates[0] || issueDate;
  const servicePeriodEnd = dates[dates.length - 1] || issueDate;
  const due = dueAt || addDaysIso(issueDate, seller.paymentTermsDays);

  return withTransaction(async (tx) => {
    const invoice = await tx.queryOne(
      `INSERT INTO invoices
         (workspace_id, project_id, client_id, number, status, currency, subtotal, tax_percent, total, due_at, note, created_by,
          issue_date, service_date, service_period_start, service_period_end, tax_category, tax_note, seller_snapshot, buyer_snapshot)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19::jsonb)
       RETURNING *`,
      [
        ws.id,
        access.project.id,
        access.project.client_id,
        number,
        ws.currency || "EUR",
        subtotal,
        tax.taxPercent,
        total,
        due,
        note || "Pass-through costs",
        user.id,
        issueDate,
        servicePeriodEnd,
        servicePeriodStart,
        servicePeriodEnd,
        tax.taxCategory,
        tax.taxNote,
        JSON.stringify(seller),
        JSON.stringify(buyer),
      ]
    );
    const createdLines = [];
    for (const line of lines) {
      const created = await tx.queryOne(
        `INSERT INTO invoice_lines
           (invoice_id, description, hours, rate, amount, sort_order, expense_allocation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [invoice.id, line.description, line.hours, line.rate, line.amount, line.sortOrder, line.allocationId]
      );
      createdLines.push(created);
      await tx.query(`UPDATE expense_allocations SET invoice_id = $1 WHERE id = $2`, [
        invoice.id,
        line.allocationId,
      ]);
    }
    return { invoice, lines: createdLines.map(mapInvoiceLine), mapped: mapInvoice({ ...invoice, project_name: access.project.name }) };
  });
}
