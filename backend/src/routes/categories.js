import { Router } from "express";
import supabase from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isSuperadmin } from "../middleware/requireRole.js";

const router = Router();

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── GET /api/categories ── (any authenticated user) ────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── GET /api/categories/:id ── (any authenticated user) ───────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: "Category not found" });
  res.json(data);
});

// ── POST /api/categories ── (superadmin only) ──────────────────────────────────
router.post("/", requireAuth, ...isSuperadmin, async (req, res) => {
  const { name } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), slug: slugify(name.trim()), created_by: req.dbUser.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── PUT /api/categories/:id ── (superadmin only) ───────────────────────────────
router.put("/:id", requireAuth, ...isSuperadmin, async (req, res) => {
  const { name } = req.body ?? {};
  const updates = {};
  if (name?.trim()) {
    updates.name = name.trim();
    updates.slug = slugify(name.trim());
  }

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── DELETE /api/categories/:id ── (superadmin only) ───────────────────────────
router.delete("/:id", requireAuth, ...isSuperadmin, async (req, res) => {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
