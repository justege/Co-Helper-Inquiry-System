import { Router } from "express";
import supabase from "../db.js";
import { createSignedUploadUrl } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole, requireRole } from "../middleware/requireRole.js";

const router = Router();

// All routes require authentication
router.use(requireAuth, attachRole);

// ── Helper to verify the requester is the partner or an admin ─────────────────
function isOwnerOrAdmin(req, partnerId) {
  return req.dbUser.id === partnerId || ["admin", "superadmin"].includes(req.userRole);
}

async function partnerHasCategory(partnerId, categoryId) {
  if (!categoryId) return true;
  const { data } = await supabase
    .from("user_categories")
    .select("category_id")
    .eq("user_id", partnerId)
    .eq("category_id", categoryId)
    .maybeSingle();
  return Boolean(data);
}

// ── GET /api/partner-services/me — list current partner's services ───────────
router.get("/me", async (req, res) => {
  const { includeInactive } = req.query;
  const partnerId = req.dbUser.id;

  let query = supabase
    .from("partner_services")
    .select("*")
    .eq("partner_id", partnerId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (includeInactive !== "true") query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json((data ?? []).map(toService));
});

// ── GET /api/partner-services/me/documents — list current partner's documents ─
router.get("/me/documents", async (req, res) => {
  const { data, error } = await supabase
    .from("partner_documents")
    .select("*")
    .eq("partner_id", req.dbUser.id)
    .eq("confirmed", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json((data ?? []).map(toDoc));
});

// ── POST /api/partner-services/me/documents/init-upload ───────────────────────
router.post("/me/documents/init-upload", async (req, res) => {
  const partnerId = req.dbUser.id;
  const { title, fileName, fileSize, mimeType, docType } = req.body ?? {};
  if (!fileName?.trim()) return res.status(400).json({ error: "fileName is required" });

  const filePath = `${partnerId}/${Date.now()}-${fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { data: doc, error: dbErr } = await supabase
    .from("partner_documents")
    .insert({
      partner_id: partnerId,
      title: title?.trim() || fileName.trim(),
      file_name: fileName.trim(),
      file_path: filePath,
      file_size: fileSize ? Number(fileSize) : null,
      mime_type: mimeType ?? null,
      doc_type: docType ?? "brochure",
      confirmed: false,
    })
    .select()
    .single();

  if (dbErr) return res.status(500).json({ error: dbErr.message });

  const { data: urlData, error: urlErr } = await createSignedUploadUrl("partner-documents", filePath);

  if (urlErr) {
    await supabase.from("partner_documents").delete().eq("id", doc.id);
    return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  }

  res.status(201).json({ documentId: doc.id, uploadUrl: urlData.signedUrl, filePath });
});

// ── POST /api/partner-services/me/documents/:docId/confirm ────────────────────
router.post("/me/documents/:docId/confirm", async (req, res) => {
  const { error } = await supabase
    .from("partner_documents")
    .update({ confirmed: true })
    .eq("id", req.params.docId)
    .eq("partner_id", req.dbUser.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── GET /api/partner-services/me/documents/:docId/url ───────────────────────
router.get("/me/documents/:docId/url", async (req, res) => {
  const { data: doc, error: docErr } = await supabase
    .from("partner_documents")
    .select("*")
    .eq("id", req.params.docId)
    .eq("partner_id", req.dbUser.id)
    .single();

  if (docErr || !doc) return res.status(404).json({ error: "Document not found" });

  const { data: urlData, error: urlErr } = await supabase.storage
    .from("partner-documents")
    .createSignedUrl(doc.file_path, 3600);

  if (urlErr) return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  res.json({ url: urlData.signedUrl, fileName: doc.file_name });
});

// ── DELETE /api/partner-services/me/documents/:docId ────────────────────────
router.delete("/me/documents/:docId", async (req, res) => {
  const { data: doc } = await supabase
    .from("partner_documents")
    .select("file_path")
    .eq("id", req.params.docId)
    .eq("partner_id", req.dbUser.id)
    .single();

  if (doc?.file_path) {
    await supabase.storage.from("partner-documents").remove([doc.file_path]);
  }
  await supabase.from("partner_documents").delete().eq("id", req.params.docId);
  res.status(204).send();
});

// ── GET /api/partner-services/:partnerId — list a partner's services ──────────
router.get("/:partnerId", async (req, res) => {
  const { partnerId } = req.params;
  const { includeInactive } = req.query;

  const showAll = isOwnerOrAdmin(req, partnerId) && includeInactive === "true";

  let query = supabase
    .from("partner_services")
    .select("*")
    .eq("partner_id", partnerId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!showAll) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json((data ?? []).map(toService));
});

// ── POST /api/partner-services — create a service ────────────────────────────
router.post("/", ...requireRole("expert"), async (req, res) => {
  const { title, description, priceFrom, priceTo, priceUnit, currency, sortOrder, categoryId } =
    req.body ?? {};
  if (!title?.trim()) return res.status(400).json({ error: "title is required" });

  if (categoryId && !(await partnerHasCategory(req.dbUser.id, categoryId))) {
    return res.status(400).json({ error: "Category is not assigned to your profile" });
  }

  const { data, error } = await supabase
    .from("partner_services")
    .insert({
      partner_id: req.dbUser.id,
      category_id: categoryId ?? null,
      title: title.trim(),
      description: description?.trim() || null,
      price_from: priceFrom != null ? Number(priceFrom) : null,
      price_to: priceTo != null ? Number(priceTo) : null,
      price_unit: priceUnit ?? "piece",
      currency: currency ?? "EUR",
      sort_order: sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(toService(data));
});

// ── PUT /api/partner-services/:id — update a service ─────────────────────────
router.put("/:id", async (req, res) => {
  // Fetch first to verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from("partner_services")
    .select("partner_id")
    .eq("id", req.params.id)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: "Service not found" });
  if (!isOwnerOrAdmin(req, existing.partner_id))
    return res.status(403).json({ error: "Access denied" });

  const { title, description, priceFrom, priceTo, priceUnit, currency, isActive, sortOrder, categoryId } =
    req.body ?? {};
  const updates = { updated_at: new Date().toISOString() };
  if (title?.trim()) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (priceFrom !== undefined) updates.price_from = priceFrom != null ? Number(priceFrom) : null;
  if (priceTo !== undefined) updates.price_to = priceTo != null ? Number(priceTo) : null;
  if (priceUnit) updates.price_unit = priceUnit;
  if (currency) updates.currency = currency;
  if (isActive !== undefined) updates.is_active = Boolean(isActive);
  if (sortOrder !== undefined) updates.sort_order = Number(sortOrder);
  if (categoryId !== undefined) {
    if (categoryId && !(await partnerHasCategory(existing.partner_id, categoryId))) {
      return res.status(400).json({ error: "Category is not assigned to your profile" });
    }
    updates.category_id = categoryId || null;
  }

  const { data, error } = await supabase
    .from("partner_services")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(toService(data));
});

// ── DELETE /api/partner-services/:id — delete a service ──────────────────────
router.delete("/:id", async (req, res) => {
  const { data: existing } = await supabase
    .from("partner_services")
    .select("partner_id")
    .eq("id", req.params.id)
    .single();

  if (!existing) return res.status(404).json({ error: "Service not found" });
  if (!isOwnerOrAdmin(req, existing.partner_id))
    return res.status(403).json({ error: "Access denied" });

  await supabase.from("partner_services").delete().eq("id", req.params.id);
  res.status(204).send();
});

// ── GET /api/partner-services/:partnerId/documents — list documents ──────────
router.get("/:partnerId/documents", async (req, res) => {
  const { data, error } = await supabase
    .from("partner_documents")
    .select("*")
    .eq("partner_id", req.params.partnerId)
    .eq("confirmed", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json((data ?? []).map(toDoc));
});

// ── POST /api/partner-services/:partnerId/documents/init-upload ───────────────
router.post("/:partnerId/documents/init-upload", async (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.partnerId))
    return res.status(403).json({ error: "Access denied" });

  const { title, fileName, fileSize, mimeType, docType } = req.body ?? {};
  if (!fileName?.trim()) return res.status(400).json({ error: "fileName is required" });

  const filePath = `${req.params.partnerId}/${Date.now()}-${fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { data: doc, error: dbErr } = await supabase
    .from("partner_documents")
    .insert({
      partner_id: req.params.partnerId,
      title: title?.trim() || fileName.trim(),
      file_name: fileName.trim(),
      file_path: filePath,
      file_size: fileSize ? Number(fileSize) : null,
      mime_type: mimeType ?? null,
      doc_type: docType ?? "brochure",
      confirmed: false,
    })
    .select()
    .single();

  if (dbErr) return res.status(500).json({ error: dbErr.message });

  const { data: urlData, error: urlErr } = await createSignedUploadUrl("partner-documents", filePath);

  if (urlErr) {
    await supabase.from("partner_documents").delete().eq("id", doc.id);
    return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  }

  res.status(201).json({ documentId: doc.id, uploadUrl: urlData.signedUrl, filePath });
});

// ── POST /api/partner-services/:partnerId/documents/:docId/confirm ────────────
router.post("/:partnerId/documents/:docId/confirm", async (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.partnerId))
    return res.status(403).json({ error: "Access denied" });

  const { error } = await supabase
    .from("partner_documents")
    .update({ confirmed: true })
    .eq("id", req.params.docId)
    .eq("partner_id", req.params.partnerId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── GET /api/partner-services/:partnerId/documents/:docId/url ────────────────
router.get("/:partnerId/documents/:docId/url", async (req, res) => {
  const { data: doc, error: docErr } = await supabase
    .from("partner_documents")
    .select("*")
    .eq("id", req.params.docId)
    .eq("partner_id", req.params.partnerId)
    .single();

  if (docErr || !doc) return res.status(404).json({ error: "Document not found" });

  const { data: urlData, error: urlErr } = await supabase.storage
    .from("partner-documents")
    .createSignedUrl(doc.file_path, 3600);

  if (urlErr) return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  res.json({ url: urlData.signedUrl, fileName: doc.file_name });
});

// ── DELETE /api/partner-services/:partnerId/documents/:docId ─────────────────
router.delete("/:partnerId/documents/:docId", async (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.partnerId))
    return res.status(403).json({ error: "Access denied" });

  const { data: doc } = await supabase
    .from("partner_documents")
    .select("file_path")
    .eq("id", req.params.docId)
    .single();

  if (doc?.file_path) {
    await supabase.storage.from("partner-documents").remove([doc.file_path]);
  }
  await supabase.from("partner_documents").delete().eq("id", req.params.docId);
  res.status(204).send();
});

// ── Mappers ───────────────────────────────────────────────────────────────────

function toService(s) {
  return {
    id: s.id,
    partnerId: s.partner_id,
    categoryId: s.category_id ?? null,
    title: s.title,
    description: s.description ?? null,
    priceFrom: s.price_from != null ? Number(s.price_from) : null,
    priceTo: s.price_to != null ? Number(s.price_to) : null,
    priceUnit: s.price_unit,
    currency: s.currency,
    isActive: s.is_active,
    sortOrder: s.sort_order,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

function toDoc(d) {
  return {
    id: d.id,
    partnerId: d.partner_id,
    title: d.title,
    fileName: d.file_name,
    filePath: d.file_path,
    fileSize: d.file_size ?? null,
    mimeType: d.mime_type ?? null,
    docType: d.doc_type,
    isPublic: d.is_public,
    createdAt: d.created_at,
  };
}

export default router;
