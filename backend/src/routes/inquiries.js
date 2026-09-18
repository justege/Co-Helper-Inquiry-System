import { Router } from "express";
import { query, queryOne, execute, buildSet } from "../db.js";
import { createSignedUploadUrl, createSignedDownloadUrl, removeObject } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";

import { validateInquiryInput, toInquiryResponse } from "../lib/inquiryValidation.js";
import { getWorkspaceByOwner, isWorkspaceMember, logActivity, checkInquiryAccess } from "../lib/workspace.js";

const router = Router();

const INQUIRY_WITH_CATEGORY = `
  i.*,
  CASE WHEN c.id IS NULL THEN NULL
       ELSE json_build_object('id', c.id, 'name', c.name, 'type', c.type)
  END AS categories,
  CASE WHEN p.id IS NULL THEN NULL
       ELSE json_build_object('id', p.id, 'name', p.name)
  END AS project,
  CASE WHEN cu.id IS NULL THEN NULL
       ELSE json_build_object(
         'id', cu.id,
         'first_name', cu.first_name,
         'last_name', cu.last_name,
         'company_name', cu.company_name,
         'email', cu.email
       )
  END AS client
`;

const INQUIRY_JOINS = `
  LEFT JOIN categories c ON c.id = i.category_id
  LEFT JOIN projects p ON p.id = i.project_id
  LEFT JOIN users cu ON cu.id = i.client_id
`;

const BOARD_STATUSES = new Set(["pending", "in_progress", "waiting", "delivered"]);
const BOARD_PLACEHOLDER_DESCRIPTION = "Added from the board — add details here.";

async function defaultServiceCategoryId() {
  const row = await queryOne(
    `SELECT id FROM categories WHERE type = 'service' ORDER BY name LIMIT 1`
  );
  return row?.id ?? null;
}

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

async function loadProjectOffers(inquiryId, includePartners) {
  const offers = await query(
    `SELECT id, total_client_price, valid_until, status, created_at, notes, lead_time_days
     FROM project_offers
     WHERE inquiry_id = $1
     ORDER BY created_at`,
    [inquiryId]
  );
  if (offers.length === 0) return [];

  const offerIds = offers.map((o) => o.id);
  let items;
  if (includePartners) {
    items = await query(
      `SELECT poi.id, poi.project_offer_id,
              CASE WHEN eo.id IS NULL THEN NULL
                   ELSE json_build_object(
                     'id', eo.id,
                     'proposed_price', eo.proposed_price,
                     'estimated_lead_time_days', eo.estimated_lead_time_days,
                     'notes', eo.notes,
                     'users', CASE WHEN u.id IS NULL THEN NULL
                                   ELSE json_build_object(
                                     'id', u.id,
                                     'first_name', u.first_name,
                                     'last_name', u.last_name,
                                     'company_name', u.company_name
                                   )
                              END
                   )
              END AS expert_offers
       FROM project_offer_items poi
       LEFT JOIN expert_offers eo ON eo.id = poi.expert_offer_id
       LEFT JOIN users u ON u.id = eo.expert_id
       WHERE poi.project_offer_id = ANY($1::uuid[])`,
      [offerIds]
    );
  } else {
    items = await query(
      `SELECT id, project_offer_id
       FROM project_offer_items
       WHERE project_offer_id = ANY($1::uuid[])`,
      [offerIds]
    );
  }

  const itemsByOffer = new Map();
  for (const item of items) {
    const list = itemsByOffer.get(item.project_offer_id) ?? [];
    list.push(item);
    itemsByOffer.set(item.project_offer_id, list);
  }

  return offers.map((po) => ({
    ...po,
    project_offer_items: itemsByOffer.get(po.id) ?? [],
  }));
}

function mapMessage(m) {
  return {
    id: m.id,
    body: m.body,
    originalBody: m.original_body,
    createdAt: m.created_at,
    authorId: m.author_id,
    author: m.users
      ? {
          id: m.users.id,
          firstName: m.users.first_name,
          lastName: m.users.last_name,
          companyName: m.users.company_name,
          email: m.users.email,
        }
      : null,
  };
}

// POST /api/inquiries
// Clients create a job for themselves, optionally inside a freelancer's workspace
// (workspaceId). Freelancers (expert role) create a job on behalf of one of their
// invited clients (clientId).
router.post("/", requireAuth, attachRole, async (req, res) => {
  const isQuickAdd = Boolean(req.body?.quickAdd);
  let title;
  let description;
  let categoryId;
  let type;
  let urgency;
  let targetStartDate = null;
  let targetEndDate = null;
  let estimatedQuantity = null;

  if (isQuickAdd) {
    title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (title.length < 3 || title.length > 255) {
      return res.status(400).json({ error: "title must be 3–255 characters" });
    }
    description = BOARD_PLACEHOLDER_DESCRIPTION;
    categoryId = await defaultServiceCategoryId();
    if (!categoryId) return res.status(500).json({ error: "No service category is seeded" });
    type = "service";
    urgency = "medium";
  } else {
    const validation = validateInquiryInput(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });
    ({
      title,
      description,
      categoryId,
      type,
      urgency,
      targetStartDate,
      targetEndDate,
      estimatedQuantity,
    } = validation.data);
  }

  let clientId = req.dbUser.id;
  let workspaceId = null;

  if (req.userRole === "expert") {
    const workspace = await getWorkspaceByOwner(req.dbUser.id);
    if (!workspace) return res.status(400).json({ error: "You don't have a workspace yet" });

    const requestedClientId = req.body?.clientId || req.dbUser.id;

    const isMember = await isWorkspaceMember(workspace.id, requestedClientId);
    if (!isMember) return res.status(403).json({ error: "That client is not in your workspace" });

    clientId = requestedClientId;
    workspaceId = workspace.id;
  } else if (req.body?.workspaceId) {
    const isMember = await isWorkspaceMember(req.body.workspaceId, req.dbUser.id);
    if (!isMember) return res.status(403).json({ error: "You are not a member of that workspace" });
    workspaceId = req.body.workspaceId;
  }

  try {
    const data = await queryOne(
      `INSERT INTO inquiries (
         client_id, workspace_id, category_id, title, description, type, urgency,
         target_start_date, target_end_date, estimated_quantity, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        clientId,
        workspaceId,
        categoryId,
        title,
        description,
        type,
        urgency,
        targetStartDate,
        targetEndDate,
        estimatedQuantity,
      ]
    );

    if (workspaceId) {
      await logActivity({
        workspaceId,
        inquiryId: data.id,
        actorId: req.dbUser.id,
        type: "inquiry.created",
        payload: { title },
      }).catch(() => null);
    }

    res.status(201).json(toInquiry(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/inquiries/mine
// Freelancers see every job in their workspace; clients see jobs they opened.
router.get("/mine", requireAuth, attachRole, async (req, res) => {
  try {
    let where = "i.client_id = $1";
    let param = req.dbUser.id;

    if (req.userRole === "expert") {
      const workspace = await getWorkspaceByOwner(req.dbUser.id);
      if (!workspace) return res.json([]);
      where = "i.workspace_id = $1";
      param = workspace.id;
    }

    const data = await query(
      `SELECT ${INQUIRY_WITH_CATEGORY}
       FROM inquiries i
       ${INQUIRY_JOINS}
       WHERE ${where}
       ORDER BY i.created_at DESC`,
      [param]
    );

    res.json(data.map((row) => toInquiry(row)));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/inquiries/:id  — rich: includes offers, lead time, notes; partners admin-only
router.get("/:id", requireAuth, attachRole, async (req, res) => {
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);

  try {
    const data = await queryOne(
      `SELECT ${INQUIRY_WITH_CATEGORY},
              CASE WHEN w.id IS NULL THEN NULL
                   ELSE json_build_object('owner_id', w.owner_id)
              END AS workspaces
       FROM inquiries i
       ${INQUIRY_JOINS}
       LEFT JOIN workspaces w ON w.id = i.workspace_id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (!data) return res.status(404).json({ error: "Inquiry not found" });

    const isOwner = data.client_id === req.dbUser.id;
    const isWorkspaceOwner = data.workspaces?.owner_id === req.dbUser.id;
    if (!isOwner && !isWorkspaceOwner && !isAdmin) return res.status(403).json({ error: "Access denied" });

    data.project_offers = await loadProjectOffers(data.id, isAdmin);
    res.json(toInquiry(data, { includePartners: isAdmin }));
  } catch (err) {
    return res.status(404).json({ error: "Inquiry not found" });
  }
});

// PATCH /api/inquiries/:id/status — workspace board columns only
router.patch("/:id/status", requireAuth, attachRole, async (req, res) => {
  const { ok, inquiry } = await checkInquiryAccess(req.params.id, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });
  if (!inquiry?.workspace_id) {
    return res.status(400).json({ error: "Status can only be changed on workspace jobs" });
  }

  const next = typeof req.body?.status === "string" ? req.body.status.trim() : "";
  if (!BOARD_STATUSES.has(next)) {
    return res.status(400).json({ error: "status must be pending, in_progress, waiting, or delivered" });
  }
  if (inquiry.status === next) {
    const current = await queryOne(
      `SELECT ${INQUIRY_WITH_CATEGORY}
       FROM inquiries i
       ${INQUIRY_JOINS}
       WHERE i.id = $1`,
      [req.params.id]
    );
    return res.json(toInquiry(current));
  }

  try {
    const data = await queryOne(
      `WITH updated AS (
         UPDATE inquiries SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *
       )
       SELECT u.*,
              CASE WHEN c.id IS NULL THEN NULL
                   ELSE json_build_object('id', c.id, 'name', c.name, 'type', c.type)
              END AS categories,
              CASE WHEN p.id IS NULL THEN NULL
                   ELSE json_build_object('id', p.id, 'name', p.name)
              END AS project,
              CASE WHEN cu.id IS NULL THEN NULL
                   ELSE json_build_object(
                     'id', cu.id,
                     'first_name', cu.first_name,
                     'last_name', cu.last_name,
                     'company_name', cu.company_name,
                     'email', cu.email
                   )
              END AS client
       FROM updated u
       LEFT JOIN categories c ON c.id = u.category_id
       LEFT JOIN projects p ON p.id = u.project_id
       LEFT JOIN users cu ON cu.id = u.client_id`,
      [next, req.params.id]
    );
    if (!data) return res.status(500).json({ error: "Update failed" });

    await logActivity({
      workspaceId: inquiry.workspace_id,
      inquiryId: req.params.id,
      actorId: req.dbUser.id,
      type: "status.changed",
      payload: { from: inquiry.status, to: next },
    }).catch(() => null);

    res.json(toInquiry(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/inquiries/:id — edit the job requirements (title/description)
router.patch("/:id", requireAuth, attachRole, async (req, res) => {
  const { ok, inquiry } = await checkInquiryAccess(req.params.id, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });

  const updates = {};
  if (typeof req.body?.title === "string") {
    const title = req.body.title.trim();
    if (title.length < 3 || title.length > 255) return res.status(400).json({ error: "title must be 3–255 characters" });
    updates.title = title;
  }
  if (typeof req.body?.description === "string") {
    const description = req.body.description.trim();
    if (description.length < 10) return res.status(400).json({ error: "description must be at least 10 characters" });
    updates.description = description;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });

  try {
    const { set, values, next } = buildSet(updates);
    const data = await queryOne(
      `WITH updated AS (
         UPDATE inquiries SET ${set} WHERE id = $${next} RETURNING *
       )
       SELECT u.*,
              CASE WHEN c.id IS NULL THEN NULL
                   ELSE json_build_object('id', c.id, 'name', c.name, 'type', c.type)
              END AS categories
       FROM updated u
       LEFT JOIN categories c ON c.id = u.category_id`,
      [...values, req.params.id]
    );
    if (!data) return res.status(500).json({ error: "Update failed" });

    if (inquiry?.workspace_id) {
      await logActivity({
        workspaceId: inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "requirement.updated",
        payload: { fields: Object.keys(updates) },
      }).catch(() => null);
    }

    res.json(toInquiry(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/inquiries/:id/documents — list documents
router.get("/:id/documents", requireAuth, attachRole, async (req, res) => {
  const { ok } = await checkInquiryAccess(req.params.id, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });

  try {
    const data = await query(
      `SELECT d.id, d.file_name, d.file_path, d.file_size, d.mime_type, d.created_at, d.confirmed,
              CASE WHEN u.id IS NULL THEN NULL
                   ELSE json_build_object('first_name', u.first_name, 'last_name', u.last_name)
              END AS users
       FROM inquiry_documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.inquiry_id = $1 AND d.confirmed = true
       ORDER BY d.created_at DESC`,
      [req.params.id]
    );
    res.json(data.map((d) => ({
      id: d.id,
      fileName: d.file_name,
      filePath: d.file_path,
      fileSize: d.file_size,
      mimeType: d.mime_type,
      createdAt: d.created_at,
      uploadedBy: d.users ? { firstName: d.users.first_name, lastName: d.users.last_name } : null,
    })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/inquiries/:id/documents/init-upload — get signed upload URL
router.post("/:id/documents/init-upload", requireAuth, attachRole, async (req, res) => {
  const { fileName, fileSize, mimeType } = req.body ?? {};
  if (!fileName?.trim()) return res.status(400).json({ error: "fileName is required" });

  const { ok } = await checkInquiryAccess(req.params.id, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });

  const filePath = `${req.params.id}/${Date.now()}-${fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  try {
    const doc = await queryOne(
      `INSERT INTO inquiry_documents (
         inquiry_id, uploaded_by, file_name, file_path, file_size, mime_type, confirmed
       ) VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING *`,
      [
        req.params.id,
        req.dbUser.id,
        fileName.trim(),
        filePath,
        fileSize ? Number(fileSize) : null,
        mimeType ?? null,
      ]
    );

    const { data: urlData, error: urlErr } = await createSignedUploadUrl("inquiry-documents", filePath);

    if (urlErr) {
      await execute("DELETE FROM inquiry_documents WHERE id = $1", [doc.id]);
      return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
    }

    res.status(201).json({ documentId: doc.id, uploadUrl: urlData.signedUrl, filePath });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/inquiries/:id/documents/:docId/confirm — mark upload as done
router.post("/:id/documents/:docId/confirm", requireAuth, attachRole, async (req, res) => {
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);
  try {
    if (isAdmin) {
      await execute(
        `UPDATE inquiry_documents SET confirmed = true WHERE id = $1 AND inquiry_id = $2`,
        [req.params.docId, req.params.id]
      );
    } else {
      await execute(
        `UPDATE inquiry_documents SET confirmed = true
         WHERE id = $1 AND inquiry_id = $2 AND uploaded_by = $3`,
        [req.params.docId, req.params.id, req.dbUser.id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/inquiries/:id/documents/:docId/url — get signed download URL
router.get("/:id/documents/:docId/url", requireAuth, attachRole, async (req, res) => {
  const doc = await queryOne(
    `SELECT * FROM inquiry_documents WHERE id = $1 AND inquiry_id = $2`,
    [req.params.docId, req.params.id]
  );

  if (!doc) return res.status(404).json({ error: "Document not found" });
  const { ok } = await checkInquiryAccess(req.params.id, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });

  const { data: urlData, error: urlErr } = await createSignedDownloadUrl("inquiry-documents", doc.file_path, 3600);

  if (urlErr) return res.status(500).json({ error: `Storage error: ${urlErr.message}` });
  res.json({ url: urlData.signedUrl, fileName: doc.file_name });
});

// ── Job chat ──────────────────────────────────────────────────────────────────

// GET /api/inquiries/:id/messages
router.get("/:id/messages", requireAuth, attachRole, async (req, res) => {
  const { ok } = await checkInquiryAccess(req.params.id, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });

  try {
    const data = await query(
      `SELECT m.id, m.body, m.original_body, m.created_at, m.author_id,
              CASE WHEN u.id IS NULL THEN NULL
                   ELSE json_build_object(
                     'id', u.id, 'first_name', u.first_name, 'last_name', u.last_name,
                     'company_name', u.company_name, 'email', u.email
                   )
              END AS users
       FROM inquiry_messages m
       LEFT JOIN users u ON u.id = m.author_id
       WHERE m.inquiry_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json(data.map(mapMessage));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/inquiries/:id/messages
router.post("/:id/messages", requireAuth, attachRole, async (req, res) => {
  const { ok, inquiry } = await checkInquiryAccess(req.params.id, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });

  const body = req.body?.body?.trim();
  if (!body) return res.status(400).json({ error: "Message body is required" });
  if (body.length > 10000) return res.status(400).json({ error: "Message is too long" });
  const originalBody = req.body?.originalBody?.trim() || null;

  try {
    const data = await queryOne(
      `WITH inserted AS (
         INSERT INTO inquiry_messages (inquiry_id, author_id, body, original_body)
         VALUES ($1, $2, $3, $4)
         RETURNING id, body, original_body, created_at, author_id
       )
       SELECT i.*,
              CASE WHEN u.id IS NULL THEN NULL
                   ELSE json_build_object(
                     'id', u.id, 'first_name', u.first_name, 'last_name', u.last_name,
                     'company_name', u.company_name, 'email', u.email
                   )
              END AS users
       FROM inserted i
       LEFT JOIN users u ON u.id = i.author_id`,
      [req.params.id, req.dbUser.id, body, originalBody]
    );

    if (inquiry?.workspace_id) {
      await logActivity({
        workspaceId: inquiry.workspace_id,
        inquiryId: req.params.id,
        actorId: req.dbUser.id,
        type: "message.sent",
        payload: {},
      }).catch(() => null);
    }

    res.status(201).json(mapMessage(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Activity log ──────────────────────────────────────────────────────────────

// GET /api/inquiries/:id/activity
router.get("/:id/activity", requireAuth, attachRole, async (req, res) => {
  const { ok } = await checkInquiryAccess(req.params.id, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });

  try {
    const data = await query(
      `SELECT e.id, e.type, e.payload, e.created_at, e.actor_id,
              CASE WHEN u.id IS NULL THEN NULL
                   ELSE json_build_object(
                     'id', u.id, 'first_name', u.first_name, 'last_name', u.last_name,
                     'company_name', u.company_name, 'email', u.email
                   )
              END AS users
       FROM activity_events e
       LEFT JOIN users u ON u.id = e.actor_id
       WHERE e.inquiry_id = $1
       ORDER BY e.created_at DESC`,
      [req.params.id]
    );

    res.json(data.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      createdAt: e.created_at,
      actorId: e.actor_id,
      actor: e.users
        ? {
            id: e.users.id,
            firstName: e.users.first_name,
            lastName: e.users.last_name,
            companyName: e.users.company_name,
            email: e.users.email,
          }
        : null,
    })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/inquiries/:id/documents/:docId
router.delete("/:id/documents/:docId", requireAuth, attachRole, async (req, res) => {
  const doc = await queryOne(
    `SELECT * FROM inquiry_documents WHERE id = $1 AND inquiry_id = $2`,
    [req.params.docId, req.params.id]
  );

  if (!doc) return res.status(404).json({ error: "Document not found" });
  const { ok } = await checkInquiryAccess(req.params.id, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });

  await removeObject("inquiry-documents", doc.file_path);
  await execute("DELETE FROM inquiry_documents WHERE id = $1", [req.params.docId]);
  res.status(204).send();
});

export default router;
