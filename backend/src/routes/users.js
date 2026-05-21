import { Router } from "express";
import supabase from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isSuperadmin, isAdminOrAbove } from "../middleware/requireRole.js";

const router = Router();

// ── GET /api/users/me ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        { firebase_uid: req.uid, email: req.firebaseUser.email ?? "" },
        { onConflict: "firebase_uid" }
      )
      .select("*, user_categories(category_id, categories(*))")
      .single();

    if (error) throw error;
    res.json(toUser(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/users/me ── (own profile — cannot change own role) ────────────────
router.put("/me", requireAuth, async (req, res) => {
  const { username, avatarUrl } = req.body ?? {};
  const updates = {
    firebase_uid: req.uid,
    email: req.firebaseUser.email ?? "",
  };
  if (username !== undefined) updates.username = username;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  try {
    const { data, error } = await supabase
      .from("users")
      .upsert(updates, { onConflict: "firebase_uid" })
      .select("*, user_categories(category_id, categories(*))")
      .single();

    if (error) throw error;
    res.json(toUser(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users ── (admin and above) ───────────────────────────────────────
router.get("/", requireAuth, ...isAdminOrAbove, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*, user_categories(category_id, categories(*))")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data.map(toUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/users/:id/role ── (superadmin only) ───────────────────────────────
router.put("/:id/role", requireAuth, ...isSuperadmin, async (req, res) => {
  const { role } = req.body ?? {};
  if (!["superadmin", "admin", "member"].includes(role)) {
    return res.status(400).json({ error: "role must be superadmin, admin, or member" });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(toUser(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/users/:id/categories ── (admin and above) ────────────────────────
// Body: { categoryIds: ["uuid", ...] }  — replaces all categories for the user
router.put("/:id/categories", requireAuth, ...isAdminOrAbove, async (req, res) => {
  const { categoryIds = [] } = req.body ?? {};

  try {
    // Delete existing assignments then re-insert
    await supabase.from("user_categories").delete().eq("user_id", req.params.id);

    if (categoryIds.length > 0) {
      const rows = categoryIds.map((cid) => ({
        user_id: req.params.id,
        category_id: cid,
      }));
      const { error } = await supabase.from("user_categories").insert(rows);
      if (error) throw error;
    }

    const { data, error } = await supabase
      .from("users")
      .select("*, user_categories(category_id, categories(*))")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    res.json(toUser(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function toUser(row) {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    username: row.username ?? null,
    avatarUrl: row.avatar_url ?? null,
    role: row.role ?? "member",
    categories: (row.user_categories ?? []).map((uc) => uc.categories),
    createdAt: row.created_at,
  };
}

export default router;
