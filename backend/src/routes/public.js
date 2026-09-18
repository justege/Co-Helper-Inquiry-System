import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { validateInquiryInput, toInquiryResponse } from "../lib/inquiryValidation.js";
import { ensureUserByFirebaseUid, isClientRole } from "../lib/userProfile.js";
import { registerPartner } from "../lib/partnerRegistration.js";

const router = Router();
const VALID_TYPES = ["service", "tool_sourcing"];

function toCategoryService(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    isLive: row.is_live,
    sortOrder: row.sort_order,
  };
}

router.get("/categories", async (req, res) => {
  const { type } = req.query;
  try {
    const data = type && VALID_TYPES.includes(type)
      ? await query("SELECT id, name, slug, type, description FROM categories WHERE type = $1 ORDER BY name", [type])
      : await query("SELECT id, name, slug, type, description FROM categories ORDER BY name");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/category-services", async (req, res) => {
  const { categoryId } = req.query;
  try {
    const data = categoryId
      ? await query(
          `SELECT id, category_id, name, slug, description, is_live, sort_order
           FROM category_services WHERE category_id = $1 ORDER BY sort_order`,
          [categoryId]
        )
      : await query(
          `SELECT id, category_id, name, slug, description, is_live, sort_order
           FROM category_services ORDER BY sort_order`
        );
    res.json(data.map(toCategoryService));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/partner-registration", requireAuth, async (req, res) => {
  const { username, companyName, bio, locationCity, categoryIds = [], services = [] } = req.body ?? {};
  try {
    const result = await registerPartner({
      firebaseUid: req.uid,
      email: req.firebaseUser.email ?? "",
      username,
      companyName,
      bio,
      locationCity,
      categoryIds,
      services,
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("[partner-registration]", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/inquiry-submission", requireAuth, async (req, res) => {
  const { username, ...inquiryBody } = req.body ?? {};
  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return res.status(400).json({ error: "username must be at least 2 characters" });
  }
  const validation = validateInquiryInput(inquiryBody);
  if (validation.error) return res.status(400).json({ error: validation.error });
  const inquiry = validation.data;

  try {
    const profile = await ensureUserByFirebaseUid({
      firebaseUid: req.uid,
      email: req.firebaseUser.email ?? "",
      username: username.trim(),
      role: "client",
    });
    if (!isClientRole(profile.role)) {
      return res.status(403).json({ error: "Only client accounts can submit project briefs from the landing page" });
    }

    const category = await queryOne("SELECT id, type FROM categories WHERE id = $1", [inquiry.categoryId]);
    if (!category) return res.status(400).json({ error: "Category not found" });
    if (category.type !== inquiry.type) {
      return res.status(400).json({ error: "Category type does not match inquiry type" });
    }

    const row = await queryOne(
      `INSERT INTO inquiries (
         client_id, category_id, title, description, type, urgency,
         target_start_date, target_end_date, estimated_quantity, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
       RETURNING *`,
      [
        profile.id, inquiry.categoryId, inquiry.title, inquiry.description, inquiry.type,
        inquiry.urgency, inquiry.targetStartDate, inquiry.targetEndDate, inquiry.estimatedQuantity,
      ]
    );
    row.categories = { id: category.id, name: null, type: category.type };
    res.status(201).json({ inquiry: toInquiryResponse(row) });
  } catch (err) {
    console.error("[inquiry-submission]", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
