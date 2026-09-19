import { query, queryOne } from "../db.js";

export function isClientRole(role) {
  return role === "client" || role === "member";
}

export async function fetchUser(whereSql, params) {
  return queryOne(`SELECT * FROM users u WHERE ${whereSql}`, params);
}

/** @deprecated use fetchUser */
export const fetchUserWithCategories = fetchUser;

export async function ensureUserByFirebaseUid({
  firebaseUid,
  email = "",
  username,
  role = "client",
}) {
  const existing = await queryOne(
    "SELECT id, role FROM users WHERE firebase_uid = $1",
    [firebaseUid]
  );

  const patch = { email: email ?? "" };
  if (username !== undefined) patch.username = username.trim();

  if (existing) {
    return queryOne(
      `UPDATE users SET email = $1${username !== undefined ? ", username = $2" : ""}
       WHERE id = $${username !== undefined ? 3 : 2}
       RETURNING id, role`,
      username !== undefined
        ? [patch.email, patch.username, existing.id]
        : [patch.email, existing.id]
    );
  }

  try {
    return await queryOne(
      `INSERT INTO users (firebase_uid, email, username, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role`,
      [firebaseUid, email ?? "", username !== undefined ? username.trim() : null, role]
    );
  } catch (err) {
    if (err.code !== "23505") throw err;
    const raced = await queryOne(
      "SELECT id, role FROM users WHERE firebase_uid = $1",
      [firebaseUid]
    );
    if (!raced) throw err;
    return queryOne(
      `UPDATE users SET email = $1${username !== undefined ? ", username = $2" : ""}
       WHERE id = $${username !== undefined ? 3 : 2}
       RETURNING id, role`,
      username !== undefined
        ? [patch.email, patch.username, raced.id]
        : [patch.email, raced.id]
    );
  }
}
