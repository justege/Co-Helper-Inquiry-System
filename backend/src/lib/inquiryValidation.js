const URGENCIES = ["low", "medium", "high", "critical"];
const TYPES = ["service", "tool_sourcing"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateInquiryInput(body) {
  const {
    title,
    description,
    categoryId,
    type,
    urgency = "medium",
    targetStartDate = null,
    targetEndDate = null,
    estimatedQuantity = null,
  } = body ?? {};

  if (!title || typeof title !== "string" || title.trim().length < 3 || title.trim().length > 255)
    return { error: "title must be 3–255 characters" };

  if (!description || typeof description !== "string" || description.trim().length < 10)
    return { error: "description must be at least 10 characters" };

  if (!categoryId || !UUID_RE.test(categoryId))
    return { error: "categoryId must be a valid UUID" };

  if (!TYPES.includes(type))
    return { error: "type must be 'service' or 'tool_sourcing'" };

  if (!URGENCIES.includes(urgency))
    return { error: "urgency must be low, medium, high, or critical" };

  if (
    type === "tool_sourcing" &&
    (!Number.isInteger(estimatedQuantity) || estimatedQuantity <= 0)
  )
    return { error: "estimatedQuantity (positive integer) is required for tool_sourcing inquiries" };

  if (targetStartDate && targetEndDate && targetStartDate > targetEndDate)
    return { error: "targetStartDate must be on or before targetEndDate" };

  return {
    data: {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      type,
      urgency,
      targetStartDate: targetStartDate || null,
      targetEndDate: targetEndDate || null,
      estimatedQuantity: type === "tool_sourcing" ? estimatedQuantity : null,
    },
  };
}

export function toInquiryResponse(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    categoryId: row.category_id,
    category: row.categories
      ? { id: row.categories.id, name: row.categories.name, type: row.categories.type }
      : undefined,
    title: row.title,
    description: row.description,
    type: row.type,
    urgency: row.urgency,
    targetStartDate: row.target_start_date ?? null,
    targetEndDate: row.target_end_date ?? null,
    estimatedQuantity: row.estimated_quantity ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
