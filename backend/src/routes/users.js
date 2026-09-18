import { Router } from "express";
import { query, queryOne, execute, buildSet } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isSuperadmin, isAdminOrAbove } from "../middleware/requireRole.js";
import { ensureUserByFirebaseUid, fetchUserWithCategories } from "../lib/userProfile.js";
import { ensureWorkspaceForOwner } from "../lib/workspace.js";

const router = Router();

export function toUser(row) {
  if (!row) return null;
  const cats = Array.isArray(row.user_categories) ? row.user_categories : [];
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    username: row.username ?? null,
    avatarUrl: row.avatar_url ?? null,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    companyName: row.company_name ?? null,
    phone: row.phone ?? null,
    contactPref: row.contact_pref ?? "email",
    role: row.role ?? "client",
    categories: cats.map((uc) => uc.categories).filter(Boolean),
    createdAt: row.created_at,
  };
}

router.get("/me", requireAuth, async (req, res) => {
  try {
    await ensureUserByFirebaseUid({
      firebaseUid: req.uid,
      email: req.firebaseUser.email ?? "",
    });

    const data = await fetchUserWithCategories("u.firebase_uid = $1", [req.uid]);
    if (!data) return res.status(404).json({ error: "User not found" });

    if (data.role === "expert") {
      await ensureWorkspaceForOwner(data.id, data.company_name || data.username);
    }

    res.json(toUser(data));
  } catch (err) {
    console.error("[users/me]", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  const { username, avatarUrl, firstName, lastName, companyName } = req.body ?? {};
  try {
    await execute(
      `INSERT INTO users (firebase_uid, email, username, avatar_url, first_name, last_name, company_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (firebase_uid) DO UPDATE SET
         email = EXCLUDED.email,
         username = COALESCE(EXCLUDED.username, users.username),
         avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
         first_name = COALESCE(EXCLUDED.first_name, users.first_name),
         last_name = COALESCE(EXCLUDED.last_name, users.last_name),
         company_name = COALESCE(EXCLUDED.company_name, users.company_name)`,
      [
        req.uid,
        req.firebaseUser.email ?? "",
        username !== undefined ? username : null,
        avatarUrl !== undefined ? avatarUrl : null,
        firstName !== undefined ? firstName : null,
        lastName !== undefined ? lastName : null,
        companyName !== undefined ? companyName : null,
      ]
    );

    if (username !== undefined || avatarUrl !== undefined || firstName !== undefined || lastName !== undefined || companyName !== undefined) {
      const fields = {};
      if (username !== undefined) fields.username = username;
      if (avatarUrl !== undefined) fields.avatar_url = avatarUrl;
      if (firstName !== undefined) fields.first_name = firstName;
      if (lastName !== undefined) fields.last_name = lastName;
      if (companyName !== undefined) fields.company_name = companyName;
      const { set, values, next } = buildSet(fields);
      if (set) {
        await execute(`UPDATE users SET ${set} WHERE firebase_uid = $${next}`, [...values, req.uid]);
      }
    }

    const data = await fetchUserWithCategories("u.firebase_uid = $1", [req.uid]);
    res.json(toUser(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", requireAuth, ...isAdminOrAbove, async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.*,
         COALESCE((
           SELECT json_agg(json_build_object(
             'category_id', uc.category_id,
             'categories', json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'type', c.type, 'description', c.description)
           ))
           FROM user_categories uc
           JOIN categories c ON c.id = uc.category_id
           WHERE uc.user_id = u.id
         ), '[]'::json) AS user_categories
       FROM users u
       ORDER BY u.created_at DESC`
    );
    res.json(rows.map(toUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/role", requireAuth, ...isSuperadmin, async (req, res) => {
  const { role } = req.body ?? {};
  if (!["superadmin", "admin", "client", "expert"].includes(role)) {
    return res.status(400).json({ error: "role must be superadmin, admin, client, or expert" });
  }
  try {
    const data = await queryOne("UPDATE users SET role = $1 WHERE id = $2 RETURNING *", [role, req.params.id]);
    if (!data) return res.status(404).json({ error: "User not found" });
    if (role === "expert") {
      await ensureWorkspaceForOwner(data.id, data.company_name || data.username);
    }
    res.json(toUser(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/categories", requireAuth, ...isAdminOrAbove, async (req, res) => {
  const { categoryIds = [] } = req.body ?? {};
  try {
    await execute("DELETE FROM user_categories WHERE user_id = $1", [req.params.id]);
    for (const cid of categoryIds) {
      await execute(
        "INSERT INTO user_categories (user_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [req.params.id, cid]
      );
    }
    const data = await fetchUserWithCategories("u.id = $1", [req.params.id]);
    res.json(toUser(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
