export function mapAgreement(row) {
  if (!row) return null;
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    proposedBy: row.proposed_by,
    billingType: row.billing_type,
    hourlyRate: row.hourly_rate != null ? Number(row.hourly_rate) : null,
    estimatedHours: row.estimated_hours != null ? Number(row.estimated_hours) : null,
    projectPrice: row.project_price != null ? Number(row.project_price) : null,
    currency: row.currency,
    status: row.status,
    notes: row.notes ?? null,
    agreedAt: row.agreed_at ?? null,
    createdAt: row.created_at,
  };
}

export function mapTodo(row) {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    title: row.title,
    body: row.body ?? null,
    status: row.status,
    assigneeId: row.assignee_id,
    dueDate: row.due_date ?? null,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hoursLogged: Number(row.hours_logged) || 0,
  };
}

export function mapTimeEntry(row) {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    todoId: row.todo_id ?? null,
    todoTitle: row.todo_title ?? null,
    userId: row.user_id,
    hours: Number(row.hours),
    note: row.note ?? null,
    billable: row.billable,
    entryDate: row.entry_date,
    createdAt: row.created_at,
  };
}

export function mapPayment(row) {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    recordedBy: row.recorded_by,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    note: row.note ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
  };
}

/**
 * agreed value = fixed project_price, or hourly_rate × billable hours.
 */
export function computeJobFinance({ agreement, timeEntries = [], payments = [] }) {
  const billableHours = timeEntries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + Number(e.hours), 0);
  const totalHours = timeEntries.reduce((sum, e) => sum + Number(e.hours), 0);

  let agreedValue = 0;
  let billingType = null;
  let currency = "TRY";

  if (agreement) {
    billingType = agreement.billing_type;
    currency = agreement.currency || "TRY";
    if (agreement.billing_type === "project") {
      agreedValue = Number(agreement.project_price) || 0;
    } else {
      agreedValue = (Number(agreement.hourly_rate) || 0) * billableHours;
    }
  }

  const paid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = payments
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    billingType,
    currency,
    billableHours,
    totalHours,
    agreedValue,
    paid,
    outstanding,
    remaining: Math.max(0, agreedValue - paid),
  };
}
