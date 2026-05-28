import { Router } from "express";
import supabase from "../db.js";
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

// GET /api/public/categories — no auth (landing page form)
router.get("/categories", async (req, res) => {
  const { type } = req.query;

  let query = supabase.from("categories").select("id, name, slug, type, description").order("name");
  if (type && VALID_TYPES.includes(type)) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/public/category-services — catalog services per category (partner onboarding)
router.get("/category-services", async (req, res) => {
  const { categoryId } = req.query;

  let query = supabase
    .from("category_services")
    .select("id, category_id, name, slug, description, is_live, sort_order, categories(id, name, slug)")
    .order("sort_order", { ascending: true });

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json((data ?? []).map(toCategoryService));
});

// POST /api/public/partner-registration — expert signup + profile bootstrap
router.post("/partner-registration", requireAuth, async (req, res) => {
  const {
    username,
    companyName,
    bio,
    locationCity,
    categoryIds = [],
    services = [],
  } = req.body ?? {};

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

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("[partner-registration]", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/inquiry-submission — signup + first inquiry (client registers via Firebase first)
router.post("/inquiry-submission", requireAuth, async (req, res) => {
  const { username, ...inquiryBody } = req.body ?? {};

  if (!username || typeof username !== "string" || username.trim().length < 2)
    return res.status(400).json({ error: "username must be at least 2 characters" });

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
      return res.status(403).json({
        error: "Only client accounts can submit project briefs from the landing page",
      });
    }

    const { data: category } = await supabase
      .from("categories")
      .select("id, type")
      .eq("id", inquiry.categoryId)
      .maybeSingle();

    if (!category) return res.status(400).json({ error: "Category not found" });
    if (category.type !== inquiry.type)
      return res.status(400).json({ error: "Category type does not match inquiry type" });

    const { data: row, error: inqErr } = await supabase
      .from("inquiries")
      .insert({
        client_id: profile.id,
        category_id: inquiry.categoryId,
        title: inquiry.title,
        description: inquiry.description,
        type: inquiry.type,
        urgency: inquiry.urgency,
        target_start_date: inquiry.targetStartDate,
        target_end_date: inquiry.targetEndDate,
        estimated_quantity: inquiry.estimatedQuantity,
        status: "pending",
      })
      .select("*, categories(id, name, type)")
      .single();

    if (inqErr) throw inqErr;

    res.status(201).json({ inquiry: toInquiryResponse(row) });
  } catch (err) {
    console.error("[inquiry-submission]", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
