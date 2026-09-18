import { Router } from "express";
import { query, queryOne, execute, buildSet } from "../db.js";
import { createSignedUploadUrl, createSignedDownloadUrl, removeObject } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole, requireRole } from "../middleware/requireRole.js";

const router = Router();

const PARTNER_DOCS_BUCKET = "partner-documents";

// All routes require authentication
router.use(requireAuth, attachRole);

// ── Helper to verify the requester is the partner or an admin ─────────────────
function isOwnerOrAdmin(req, partnerId) {
  return req.dbUser.id === partnerId || ["admin", "superadmin"].includes(req.userRole);
}

async function partnerHasCategory(partnerId, categoryId) {
  if (!categoryId) return true;
  const data = await queryOne(
    `SELECT category_id FROM user_categories
     WHERE user_id = $1 AND category_id = $2`,
    [partnerId, categoryId]
  );
  return Boolean(data);
}

// ── GET /api/partner-services/me — list current partner's services ───────────
router.get("/me", async (req, res) => {
  const { includeInactive } = req.query;
  const partnerId = req.dbUser.id;

  try {
    const data = await query(
      `SELECT * FROM partner_services
       WHERE partner_id = $1
         ${includeInactive === "true" ? "" : "AND is_active = TRUE"}
       ORDER BY sort_order ASC, created_at ASC`,
      [partnerId]
    );
    res.json((data ?? []).map(toService));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/partner-services/me/documents — list current partner's documents ─
router.get("/me/documents", async (req, res) => {
  try {
    const data = await query(
      `SELECT * FROM partner_documents
       WHERE partner_id = $1 AND confirmed = TRUE
       ORDER BY created_at DESC`,
      [req.dbUser.id]
    );
    res.json((data ?? []).map(toDoc));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/partner-services/me/documents/init-upload ───────────────────────
router.post("/me/documents/init-upload", async (req, res) => {
  const partnerId = req.dbUser.id;
  const { title, fileName, fileSize, mimeType, docType } = req.body ?? {};
  if (!fileName?.trim()) return res.status(400).json({ error: "fileName is required" });

  const filePath = `${partnerId}/${Date.now()}-${fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  let doc;
  try {
    doc = await queryOne(
      `INSERT INTO partner_documents (
         partner_id, title, file_name, file_path, file_size, mime_type, doc_type, confirmed
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING *`,
      [
        partnerId,
        title?.trim() || fileName.trim(),
        fileName.trim(),
        filePath,
        fileSize ? Number(fileSize) : null,
        mimeType ?? null,
        docType ?? "brochure",
      ]
    );
  } catch (dbErr) {
    return res.status(500).json({ error: dbErr.message });
  }

  const { data: urlData, error: urlErr } = await createSignedUploadUrl(PARTNER_DOCS_BUCKET, filePath);

  if (urlErr) {
    await execute(`DELETE FROM partner_documents WHERE id = $1`, [doc.id]);
    return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  }

  res.status(201).json({ documentId: doc.id, uploadUrl: urlData.signedUrl, filePath });
});

// ── POST /api/partner-services/me/documents/:docId/confirm ────────────────────
router.post("/me/documents/:docId/confirm", async (req, res) => {
  try {
    await execute(
      `UPDATE partner_documents SET confirmed = TRUE WHERE id = $1 AND partner_id = $2`,
      [req.params.docId, req.dbUser.id]
    );
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/partner-services/me/documents/:docId/url ───────────────────────
router.get("/me/documents/:docId/url", async (req, res) => {
  const doc = await queryOne(
    `SELECT * FROM partner_documents WHERE id = $1 AND partner_id = $2`,
    [req.params.docId, req.dbUser.id]
  );

  if (!doc) return res.status(404).json({ error: "Document not found" });

  const { data: urlData, error: urlErr } = await createSignedDownloadUrl(
    PARTNER_DOCS_BUCKET,
    doc.file_path,
    3600
  );

  if (urlErr) return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  res.json({ url: urlData.signedUrl, fileName: doc.file_name });
});

// ── DELETE /api/partner-services/me/documents/:docId ────────────────────────
router.delete("/me/documents/:docId", async (req, res) => {
  const doc = await queryOne(
    `SELECT file_path FROM partner_documents WHERE id = $1 AND partner_id = $2`,
    [req.params.docId, req.dbUser.id]
  );

  if (doc?.file_path) {
    await removeObject(PARTNER_DOCS_BUCKET, doc.file_path);
  }
  await execute(`DELETE FROM partner_documents WHERE id = $1`, [req.params.docId]);
  res.status(204).send();
});

// ── GET /api/partner-services/:partnerId — list a partner's services ──────────
router.get("/:partnerId", async (req, res) => {
  const { partnerId } = req.params;
  const { includeInactive } = req.query;

  const showAll = isOwnerOrAdmin(req, partnerId) && includeInactive === "true";

  try {
    const data = await query(
      `SELECT * FROM partner_services
       WHERE partner_id = $1
         ${showAll ? "" : "AND is_active = TRUE"}
       ORDER BY sort_order ASC, created_at ASC`,
      [partnerId]
    );
    res.json((data ?? []).map(toService));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/partner-services — create a service ────────────────────────────
router.post("/", ...requireRole("expert"), async (req, res) => {
  const { title, description, priceFrom, priceTo, priceUnit, currency, sortOrder, categoryId } =
    req.body ?? {};
  if (!title?.trim()) return res.status(400).json({ error: "title is required" });

  if (categoryId && !(await partnerHasCategory(req.dbUser.id, categoryId))) {
    return res.status(400).json({ error: "Category is not assigned to your profile" });
  }

  try {
    const data = await queryOne(
      `INSERT INTO partner_services (
         partner_id, category_id, title, description,
         price_from, price_to, price_unit, currency, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.dbUser.id,
        categoryId ?? null,
        title.trim(),
        description?.trim() || null,
        priceFrom != null ? Number(priceFrom) : null,
        priceTo != null ? Number(priceTo) : null,
        priceUnit ?? "piece",
        currency ?? "EUR",
        sortOrder ?? 0,
      ]
    );
    res.status(201).json(toService(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/partner-services/:id — update a service ─────────────────────────
router.put("/:id", async (req, res) => {
  const existing = await queryOne(
    `SELECT partner_id FROM partner_services WHERE id = $1`,
    [req.params.id]
  );

  if (!existing) return res.status(404).json({ error: "Service not found" });
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

  try {
    const { set, values, next } = buildSet(updates);
    const data = await queryOne(
      `UPDATE partner_services SET ${set} WHERE id = $${next} RETURNING *`,
      [...values, req.params.id]
    );
    res.json(toService(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/partner-services/:id — delete a service ──────────────────────
router.delete("/:id", async (req, res) => {
  const existing = await queryOne(
    `SELECT partner_id FROM partner_services WHERE id = $1`,
    [req.params.id]
  );

  if (!existing) return res.status(404).json({ error: "Service not found" });
  if (!isOwnerOrAdmin(req, existing.partner_id))
    return res.status(403).json({ error: "Access denied" });

  await execute(`DELETE FROM partner_services WHERE id = $1`, [req.params.id]);
  res.status(204).send();
});

// ── GET /api/partner-services/:partnerId/documents — list documents ──────────
router.get("/:partnerId/documents", async (req, res) => {
  try {
    const data = await query(
      `SELECT * FROM partner_documents
       WHERE partner_id = $1 AND confirmed = TRUE
       ORDER BY created_at DESC`,
      [req.params.partnerId]
    );
    res.json((data ?? []).map(toDoc));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/partner-services/:partnerId/documents/init-upload ───────────────
router.post("/:partnerId/documents/init-upload", async (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.partnerId))
    return res.status(403).json({ error: "Access denied" });

  const { title, fileName, fileSize, mimeType, docType } = req.body ?? {};
  if (!fileName?.trim()) return res.status(400).json({ error: "fileName is required" });

  const filePath = `${req.params.partnerId}/${Date.now()}-${fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  let doc;
  try {
    doc = await queryOne(
      `INSERT INTO partner_documents (
         partner_id, title, file_name, file_path, file_size, mime_type, doc_type, confirmed
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING *`,
      [
        req.params.partnerId,
        title?.trim() || fileName.trim(),
        fileName.trim(),
        filePath,
        fileSize ? Number(fileSize) : null,
        mimeType ?? null,
        docType ?? "brochure",
      ]
    );
  } catch (dbErr) {
    return res.status(500).json({ error: dbErr.message });
  }

  const { data: urlData, error: urlErr } = await createSignedUploadUrl(PARTNER_DOCS_BUCKET, filePath);

  if (urlErr) {
    await execute(`DELETE FROM partner_documents WHERE id = $1`, [doc.id]);
    return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  }

  res.status(201).json({ documentId: doc.id, uploadUrl: urlData.signedUrl, filePath });
});

// ── POST /api/partner-services/:partnerId/documents/:docId/confirm ────────────
router.post("/:partnerId/documents/:docId/confirm", async (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.partnerId))
    return res.status(403).json({ error: "Access denied" });

  try {
    await execute(
      `UPDATE partner_documents SET confirmed = TRUE WHERE id = $1 AND partner_id = $2`,
      [req.params.docId, req.params.partnerId]
    );
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/partner-services/:partnerId/documents/:docId/url ────────────────
router.get("/:partnerId/documents/:docId/url", async (req, res) => {
  const doc = await queryOne(
    `SELECT * FROM partner_documents WHERE id = $1 AND partner_id = $2`,
    [req.params.docId, req.params.partnerId]
  );

  if (!doc) return res.status(404).json({ error: "Document not found" });

  const { data: urlData, error: urlErr } = await createSignedDownloadUrl(
    PARTNER_DOCS_BUCKET,
    doc.file_path,
    3600
  );

  if (urlErr) return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  res.json({ url: urlData.signedUrl, fileName: doc.file_name });
});

// ── DELETE /api/partner-services/:partnerId/documents/:docId ─────────────────
router.delete("/:partnerId/documents/:docId", async (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.partnerId))
    return res.status(403).json({ error: "Access denied" });

  const doc = await queryOne(
    `SELECT file_path FROM partner_documents WHERE id = $1`,
    [req.params.docId]
  );

  if (doc?.file_path) {
    await removeObject(PARTNER_DOCS_BUCKET, doc.file_path);
  }
  await execute(`DELETE FROM partner_documents WHERE id = $1`, [req.params.docId]);
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
