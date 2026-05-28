import { Router } from "express";
import supabase from "../db.js";
import { createSignedUploadUrl } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";

import { validateInquiryInput, toInquiryResponse } from "../lib/inquiryValidation.js";

const router = Router();

function toProjectOffer(po, { includePartners = false } = {}) {
  const base = {
    id: po.id,
    totalClientPrice: Number(po.total_client_price),
    validUntil: po.valid_until ?? null,
    status: po.status,
    notes: po.notes ?? null,
    leadTimeDays: po.lead_time_days ?? null,
    createdAt: po.created_at,
    itemCount: po.project_offer_items ? po.project_offer_items.length : 0,
  };
  if (!includePartners) return base;
  return {
    ...base,
    experts: po.project_offer_items
      ? po.project_offer_items
          .filter((i) => i.expert_offers)
          .map((i) => ({
            id: i.expert_offers.id,
            proposedPrice: Number(i.expert_offers.proposed_price),
            leadTimeDays: i.expert_offers.estimated_lead_time_days ?? null,
            notes: i.expert_offers.notes ?? null,
            expert: i.expert_offers.users
              ? {
                  id: i.expert_offers.users.id,
                  firstName: i.expert_offers.users.first_name,
                  lastName: i.expert_offers.users.last_name,
                  companyName: i.expert_offers.users.company_name,
                }
              : null,
          }))
      : [],
  };
}

function toInquiry(r, { includePartners = false } = {}) {
  const base = toInquiryResponse(r);
  return {
    ...base,
    projectOffers: r.project_offers
      ? r.project_offers.map((po) => toProjectOffer(po, { includePartners }))
      : undefined,
  };
}

// POST /api/inquiries
router.post("/", requireAuth, attachRole, async (req, res) => {
  const validation = validateInquiryInput(req.body);
  if (validation.error) return res.status(400).json({ error: validation.error });

  const {
    title,
    description,
    categoryId,
    type,
    urgency,
    targetStartDate,
    targetEndDate,
    estimatedQuantity,
  } = validation.data;

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      client_id: req.dbUser.id,
      category_id: categoryId,
      title,
      description,
      type,
      urgency,
      target_start_date: targetStartDate,
      target_end_date: targetEndDate,
      estimated_quantity: estimatedQuantity,
      status: "pending",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(toInquiry(data));
});

// GET /api/inquiries/mine
router.get("/mine", requireAuth, attachRole, async (req, res) => {
  const { data, error } = await supabase
    .from("inquiries")
    .select("*, categories(id, name, type)")
    .eq("client_id", req.dbUser.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map((row) => toInquiry(row)));
});

// GET /api/inquiries/:id  — rich: includes offers, lead time, notes; partners admin-only
router.get("/:id", requireAuth, attachRole, async (req, res) => {
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);
  const offerSelect = isAdmin
    ? `project_offers(
        id, total_client_price, valid_until, status, created_at, notes, lead_time_days,
        project_offer_items(
          id,
          expert_offers(
            id, proposed_price, estimated_lead_time_days, notes,
            users!expert_offers_expert_id_fkey(id, first_name, last_name, company_name)
          )
        )
      )`
    : `project_offers(
        id, total_client_price, valid_until, status, created_at, notes, lead_time_days,
        project_offer_items(id)
      )`;

  const { data, error } = await supabase
    .from("inquiries")
    .select(`
      *,
      categories(id, name, type),
      ${offerSelect}
    `)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Inquiry not found" });

  const isOwner = data.client_id === req.dbUser.id;
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Access denied" });

  res.json(toInquiry(data, { includePartners: isAdmin }));
});

// GET /api/inquiries/:id/documents — list documents
router.get("/:id/documents", requireAuth, attachRole, async (req, res) => {
  const { data: inq } = await supabase
    .from("inquiries").select("client_id").eq("id", req.params.id).single();
  const isOwner = inq?.client_id === req.dbUser.id;
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Access denied" });

  const { data, error } = await supabase
    .from("inquiry_documents")
    .select("id, file_name, file_path, file_size, mime_type, created_at, confirmed, users!inquiry_documents_uploaded_by_fkey(first_name, last_name)")
    .eq("inquiry_id", req.params.id)
    .eq("confirmed", true)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data ?? []).map((d) => ({
    id: d.id,
    fileName: d.file_name,
    filePath: d.file_path,
    fileSize: d.file_size,
    mimeType: d.mime_type,
    createdAt: d.created_at,
    uploadedBy: d.users ? { firstName: d.users.first_name, lastName: d.users.last_name } : null,
  })));
});

// POST /api/inquiries/:id/documents/init-upload — get signed upload URL
router.post("/:id/documents/init-upload", requireAuth, attachRole, async (req, res) => {
  const { fileName, fileSize, mimeType } = req.body ?? {};
  if (!fileName?.trim()) return res.status(400).json({ error: "fileName is required" });

  // Check access
  const { data: inq } = await supabase
    .from("inquiries").select("client_id").eq("id", req.params.id).single();
  const isOwner = inq?.client_id === req.dbUser.id;
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Access denied" });

  const filePath = `${req.params.id}/${Date.now()}-${fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // Create pending document record
  const { data: doc, error: dbErr } = await supabase
    .from("inquiry_documents")
    .insert({
      inquiry_id: req.params.id,
      uploaded_by: req.dbUser.id,
      file_name: fileName.trim(),
      file_path: filePath,
      file_size: fileSize ? Number(fileSize) : null,
      mime_type: mimeType ?? null,
      confirmed: false,
    })
    .select()
    .single();
  if (dbErr) return res.status(500).json({ error: dbErr.message });

  // Generate signed upload URL (valid 10 min)
  const { data: urlData, error: urlErr } = await createSignedUploadUrl("inquiry-documents", filePath);

  if (urlErr) {
    // Clean up record if storage fails
    await supabase.from("inquiry_documents").delete().eq("id", doc.id);
    return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  }

  res.status(201).json({ documentId: doc.id, uploadUrl: urlData.signedUrl, filePath });
});

// POST /api/inquiries/:id/documents/:docId/confirm — mark upload as done
router.post("/:id/documents/:docId/confirm", requireAuth, attachRole, async (req, res) => {
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);
  let query = supabase
    .from("inquiry_documents")
    .update({ confirmed: true })
    .eq("id", req.params.docId)
    .eq("inquiry_id", req.params.id);
  if (!isAdmin) query = query.eq("uploaded_by", req.dbUser.id);
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/inquiries/:id/documents/:docId/url — get signed download URL
router.get("/:id/documents/:docId/url", requireAuth, attachRole, async (req, res) => {
  const { data: doc, error: docErr } = await supabase
    .from("inquiry_documents")
    .select("*, inquiries!inner(client_id)")
    .eq("id", req.params.docId)
    .eq("inquiry_id", req.params.id)
    .single();

  if (docErr || !doc) return res.status(404).json({ error: "Document not found" });
  const isOwner = doc.inquiries.client_id === req.dbUser.id;
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Access denied" });

  const { data: urlData, error: urlErr } = await supabase.storage
    .from("inquiry-documents")
    .createSignedUrl(doc.file_path, 3600);

  if (urlErr) return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  res.json({ url: urlData.signedUrl, fileName: doc.file_name });
});

// DELETE /api/inquiries/:id/documents/:docId
router.delete("/:id/documents/:docId", requireAuth, attachRole, async (req, res) => {
  const { data: doc, error: docErr } = await supabase
    .from("inquiry_documents")
    .select("*, inquiries!inner(client_id)")
    .eq("id", req.params.docId)
    .eq("inquiry_id", req.params.id)
    .single();

  if (docErr || !doc) return res.status(404).json({ error: "Document not found" });
  const isOwner = doc.inquiries.client_id === req.dbUser.id;
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Access denied" });

  // Delete from storage
  await supabase.storage.from("inquiry-documents").remove([doc.file_path]);
  // Delete from DB
  await supabase.from("inquiry_documents").delete().eq("id", req.params.docId);
  res.status(204).send();
});

export default router;
