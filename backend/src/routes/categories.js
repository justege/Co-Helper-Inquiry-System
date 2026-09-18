import { Router } from "express";
import { query, queryOne, execute, buildSet } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isSuperadmin } from "../middleware/requireRole.js";

const router = Router();

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

router.get("/", requireAuth, async (req, res) => {
  const { type } = req.query;
  const VALID_TYPES = ["service", "tool_sourcing"];
  try {
    const rows = type && VALID_TYPES.includes(type)
      ? await query("SELECT * FROM categories WHERE type = $1 ORDER BY name", [type])
      : await query("SELECT * FROM categories ORDER BY name");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const data = await queryOne("SELECT * FROM categories WHERE id = $1", [req.params.id]);
  if (!data) return res.status(404).json({ error: "Category not found" });
  res.json(data);
});

router.post("/", requireAuth, ...isSuperadmin, async (req, res) => {
  const { name, type = "service", description } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  const VALID_TYPES = ["service", "tool_sourcing"];
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: "type must be service or tool_sourcing" });
  try {
    const data = await queryOne(
      `INSERT INTO categories (name, slug, type, description, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), slugify(name.trim()), type, description?.trim() || null, req.dbUser.id]
    );
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireAuth, ...isSuperadmin, async (req, res) => {
  const { name, type, description } = req.body ?? {};
  const VALID_TYPES = ["service", "tool_sourcing"];
  const fields = {};
  if (name?.trim()) {
    fields.name = name.trim();
    fields.slug = slugify(name.trim());
  }
  if (type && VALID_TYPES.includes(type)) fields.type = type;
  if (description !== undefined) fields.description = description?.trim() || null;
  const { set, values, next } = buildSet(fields);
  if (!set) return res.status(400).json({ error: "Nothing to update" });
  try {
    const data = await queryOne(`UPDATE categories SET ${set} WHERE id = $${next} RETURNING *`, [...values, req.params.id]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAuth, ...isSuperadmin, async (req, res) => {
  try {
    await execute("DELETE FROM categories WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
