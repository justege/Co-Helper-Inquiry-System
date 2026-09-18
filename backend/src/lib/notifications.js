import { query, queryOne, execute } from "../db.js";

export function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    payload: row.payload ?? {},
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

export async function createNotification({ userId, type, title, body = null, payload = {} }) {
  if (!userId) return null;
  try {
    return await queryOne(
      `INSERT INTO notifications (user_id, type, title, body, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [userId, type, title, body, JSON.stringify(payload ?? {})]
    );
  } catch (err) {
    console.error("[notifications]", err.message);
    return null;
  }
}

export async function listNotifications(userId, { unreadOnly = false, limit = 40 } = {}) {
  const where = unreadOnly
    ? "user_id = $1 AND read_at IS NULL"
    : "user_id = $1";
  return query(
    `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
}

export async function unreadCount(userId) {
  const row = await queryOne(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return row?.count ?? 0;
}

export async function markRead(userId, id) {
  await execute(
    `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [id, userId]
  );
}

export async function markAllRead(userId) {
  await execute(
    `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
}

/** Notify the other party on a job (client or workspace owner). */
export async function notifyInquiryCounterpart({ inquiryId, actorId, type, title, body, payload = {} }) {
  const inq = await queryOne(
    `SELECT i.client_id, w.owner_id
     FROM inquiries i
     LEFT JOIN workspaces w ON w.id = i.workspace_id
     WHERE i.id = $1`,
    [inquiryId]
  );
  if (!inq) return;
  const targets = [inq.client_id, inq.owner_id].filter((id) => id && id !== actorId);
  await Promise.all(
    [...new Set(targets)].map((userId) =>
      createNotification({ userId, type, title, body, payload: { inquiryId, ...payload } })
    )
  );
}
