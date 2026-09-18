import { Router } from "express";
import { query, queryOne, execute, buildSet } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isAdminOrAbove, isSuperadmin } from "../middleware/requireRole.js";
import { toExpertProfile } from "../lib/expertProfile.js";
import { toProjectOffer } from "../lib/projectOffer.js";

const router = Router();

// All admin routes require admin or above
router.use(requireAuth, ...isAdminOrAbove);

const CLIENT_JSON = `json_build_object(
  'id', u.id, 'email', u.email, 'first_name', u.first_name,
  'last_name', u.last_name, 'company_name', u.company_name
)`;

const CATEGORY_JSON = `CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
  'id', c.id, 'name', c.name, 'type', c.type
) END`;

const USER_CATEGORIES_JSON = `COALESCE((
  SELECT json_agg(json_build_object(
    'category_id', uc.category_id,
    'categories', json_build_object(
      'id', cat.id, 'name', cat.name, 'slug', cat.slug,
      'type', cat.type, 'description', cat.description
    )
  ))
  FROM user_categories uc
  JOIN categories cat ON cat.id = uc.category_id
  WHERE uc.user_id = u.id
), '[]'::json)`;

const PROJECT_OFFERS_NESTED = `COALESCE((
  SELECT json_agg(po_obj ORDER BY po_created_at DESC)
  FROM (
    SELECT po.created_at AS po_created_at,
      json_build_object(
        'id', po.id,
        'inquiry_id', po.inquiry_id,
        'total_client_price', po.total_client_price,
        'valid_until', po.valid_until,
        'status', po.status,
        'created_at', po.created_at,
        'notes', po.notes,
        'lead_time_days', po.lead_time_days,
        'project_offer_items', COALESCE((
          SELECT json_agg(json_build_object(
            'id', poi.id,
            'expert_offers', json_build_object(
              'id', eo.id,
              'expert_id', eo.expert_id,
              'proposed_price', eo.proposed_price,
              'estimated_lead_time_days', eo.estimated_lead_time_days,
              'notes', eo.notes,
              'users', json_build_object(
                'id', eu.id, 'email', eu.email, 'first_name', eu.first_name,
                'last_name', eu.last_name, 'company_name', eu.company_name
              )
            )
          ))
          FROM project_offer_items poi
          JOIN expert_offers eo ON eo.id = poi.expert_offer_id
          LEFT JOIN users eu ON eu.id = eo.expert_id
          WHERE poi.project_offer_id = po.id
        ), '[]'::json)
      ) AS po_obj
    FROM project_offers po
    WHERE po.inquiry_id = i.id
  ) nested
), '[]'::json)`;

async function fetchInquiryWithClient(id) {
  return queryOne(
    `SELECT i.*, ${CLIENT_JSON} AS users, ${CATEGORY_JSON} AS categories
     FROM inquiries i
     JOIN users u ON u.id = i.client_id
     LEFT JOIN categories c ON c.id = i.category_id
     WHERE i.id = $1`,
    [id]
  );
}

async function upsertExpertOffer({ inquiryId, expertId, proposedPrice, leadTimeDays, notes }) {
  return queryOne(
    `INSERT INTO expert_offers (
       inquiry_id, expert_id, proposed_price, estimated_lead_time_days, notes, status
     ) VALUES ($1, $2, $3, $4, $5, 'submitted')
     ON CONFLICT (inquiry_id, expert_id) DO UPDATE SET
       proposed_price = EXCLUDED.proposed_price,
       estimated_lead_time_days = EXCLUDED.estimated_lead_time_days,
       notes = EXCLUDED.notes,
       status = EXCLUDED.status
     RETURNING *`,
    [inquiryId, expertId, proposedPrice, leadTimeDays, notes]
  );
}

async function fetchProjectOfferForMapper(offerId) {
  return queryOne(
    `SELECT po.*,
       COALESCE((
         SELECT json_agg(json_build_object(
           'id', poi.id,
           'expert_offers', json_build_object(
             'id', eo.id,
             'expert_id', eo.expert_id,
             'proposed_price', eo.proposed_price,
             'estimated_lead_time_days', eo.estimated_lead_time_days,
             'notes', eo.notes,
             'users', CASE WHEN eu.id IS NULL THEN NULL ELSE json_build_object(
               'id', eu.id, 'email', eu.email, 'first_name', eu.first_name,
               'last_name', eu.last_name, 'company_name', eu.company_name
             ) END
           )
         ))
         FROM project_offer_items poi
         JOIN expert_offers eo ON eo.id = poi.expert_offer_id
         LEFT JOIN users eu ON eu.id = eo.expert_id
         WHERE poi.project_offer_id = po.id
       ), '[]'::json) AS project_offer_items
     FROM project_offers po
     WHERE po.id = $1`,
    [offerId]
  );
}

function mapNote(n) {
  const author = n.author ?? n.users ?? {};
  return {
    id: n.id,
    content: n.content,
    createdAt: n.created_at,
    author: {
      id: author.id,
      email: author.email,
      firstName: author.first_name,
      lastName: author.last_name,
      role: author.role,
    },
  };
}

// ── GET /api/admin/inquiries ── list all inquiries with client + category info ──
router.get("/inquiries", async (req, res) => {
  try {
    const { status, type } = req.query;
    const params = [];
    const where = [];
    if (status) {
      params.push(status);
      where.push(`i.status = $${params.length}`);
    }
    if (type) {
      params.push(type);
      where.push(`i.type = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const data = await query(
      `SELECT i.*, ${CLIENT_JSON} AS users, ${CATEGORY_JSON} AS categories
       FROM inquiries i
       JOIN users u ON u.id = i.client_id
       LEFT JOIN categories c ON c.id = i.category_id
       ${whereSql}
       ORDER BY i.created_at DESC`,
      params
    );

    res.json(data.map(toInquiry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/inquiries/:id ── get single inquiry ───────────────────────
router.get("/inquiries/:id", async (req, res) => {
  try {
    const data = await queryOne(
      `SELECT i.*, ${CLIENT_JSON} AS users, ${CATEGORY_JSON} AS categories,
              ${PROJECT_OFFERS_NESTED} AS project_offers
       FROM inquiries i
       JOIN users u ON u.id = i.client_id
       LEFT JOIN categories c ON c.id = i.category_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!data) throw new Error("Inquiry not found");
    res.json(toInquiry(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Inquiry content (title, description, dates, etc.) is owned by the client — admins
// manage status, assignment, notes, and offers only.

// ── PUT /api/admin/inquiries/:id/status ── update inquiry status ──────────────
router.put("/inquiries/:id/status", async (req, res) => {
  const VALID = ["pending", "matching", "offered", "accepted", "in_progress", "waiting", "delivered", "escalated", "cancelled"];
  const { status } = req.body ?? {};
  if (!VALID.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID.join(", ")}` });
  }
  try {
    await execute(
      `UPDATE inquiries SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, req.params.id]
    );
    const data = await fetchInquiryWithClient(req.params.id);
    if (!data) throw new Error("Inquiry not found");
    res.json(toInquiry(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/experts ── list all expert users with profiles ─────────────
router.get("/experts", async (req, res) => {
  try {
    const users = await query(
      `SELECT u.*, ${USER_CATEGORIES_JSON} AS user_categories
       FROM users u
       WHERE u.role = 'expert'
       ORDER BY u.created_at DESC`
    );

    const expertIds = users.map((u) => u.id);
    const profiles = expertIds.length
      ? await query(
          `SELECT * FROM expert_profiles WHERE user_id = ANY($1::uuid[])`,
          [expertIds]
        )
      : [];

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        companyName: u.company_name,
        role: u.role,
        categories: (u.user_categories ?? []).map((uc) => uc.categories),
        createdAt: u.created_at,
        profile: toExpertProfile(profileMap[u.id]),
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/experts/:id/score ── set expert score (superadmin only) ────
router.put("/experts/:id/score", ...isSuperadmin, async (req, res) => {
  const score = parseFloat(req.body?.score);
  if (isNaN(score) || score < 0 || score > 10) {
    return res.status(400).json({ error: "score must be a number between 0 and 10" });
  }
  const { scoreNotes } = req.body ?? {};
  try {
    const data = await queryOne(
      `INSERT INTO expert_profiles (user_id, score, score_notes, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         score = EXCLUDED.score,
         score_notes = EXCLUDED.score_notes,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [req.params.id, score, scoreNotes?.trim() || null]
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/users ── list all users with role filter ───────────────────
router.get("/users", async (req, res) => {
  try {
    const { role } = req.query;
    const params = [];
    let where = "";
    if (role) {
      params.push(role);
      where = "WHERE u.role = $1";
    }
    const data = await query(
      `SELECT u.*, ${USER_CATEGORIES_JSON} AS user_categories
       FROM users u
       ${where}
       ORDER BY u.created_at DESC`,
      params
    );
    res.json(
      data.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        companyName: u.company_name,
        role: u.role,
        categories: (u.user_categories ?? []).map((uc) => uc.categories),
        createdAt: u.created_at,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/inquiries/:id/notes ── list team notes ────────────────────
router.get("/inquiries/:id/notes", async (req, res) => {
  try {
    const data = await query(
      `SELECT n.*, json_build_object(
         'id', u.id, 'email', u.email, 'first_name', u.first_name,
         'last_name', u.last_name, 'role', u.role
       ) AS users
       FROM inquiry_notes n
       JOIN users u ON u.id = n.author_id
       WHERE n.inquiry_id = $1
       ORDER BY n.created_at ASC`,
      [req.params.id]
    );
    res.json((data ?? []).map(mapNote));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/inquiries/:id/notes ── add a note ─────────────────────────
router.post("/inquiries/:id/notes", async (req, res) => {
  const { content } = req.body ?? {};
  if (!content?.trim()) return res.status(400).json({ error: "content is required" });
  try {
    const data = await queryOne(
      `INSERT INTO inquiry_notes (inquiry_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, req.dbUser.id, content.trim()]
    );
    const author = await queryOne(
      `SELECT id, email, first_name, last_name, role FROM users WHERE id = $1`,
      [req.dbUser.id]
    );
    res.status(201).json(mapNote({ ...data, users: author }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/inquiries/:id/notes/:noteId ── delete a note ────────────
router.delete("/inquiries/:id/notes/:noteId", ...isSuperadmin.slice(1), async (req, res) => {
  try {
    await execute(
      `DELETE FROM inquiry_notes WHERE id = $1 AND inquiry_id = $2`,
      [req.params.noteId, req.params.id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/inquiries/:id/assign ── assign expert ─────────────────────
router.put("/inquiries/:id/assign", async (req, res) => {
  const { expertId } = req.body ?? {};
  try {
    const fields = {
      assigned_expert_id: expertId || null,
      updated_at: new Date().toISOString(),
    };
    if (expertId) fields.status = "matching";
    const { set, values, next } = buildSet(fields);
    await execute(`UPDATE inquiries SET ${set} WHERE id = $${next}`, [...values, req.params.id]);
    const data = await fetchInquiryWithClient(req.params.id);
    if (!data) throw new Error("Inquiry not found");
    res.json(toInquiry(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/inquiries/:id/offer ── create expert_offer + project_offer ─
router.post("/inquiries/:id/offer", async (req, res) => {
  const { expertId, proposedPrice, clientPrice, leadTimeDays, notes, validUntil } = req.body ?? {};
  if (!expertId) return res.status(400).json({ error: "expertId is required" });
  if (!proposedPrice || isNaN(Number(proposedPrice))) return res.status(400).json({ error: "proposedPrice is required" });
  if (!clientPrice || isNaN(Number(clientPrice))) return res.status(400).json({ error: "clientPrice is required" });

  try {
    const eo = await upsertExpertOffer({
      inquiryId: req.params.id,
      expertId,
      proposedPrice: Number(proposedPrice),
      leadTimeDays: leadTimeDays ? Number(leadTimeDays) : null,
      notes: notes?.trim() || null,
    });

    const po = await queryOne(
      `INSERT INTO project_offers (
         inquiry_id, total_client_price, valid_until, notes, lead_time_days, status
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.params.id,
        Number(clientPrice),
        validUntil || null,
        notes?.trim() || null,
        leadTimeDays ? Number(leadTimeDays) : null,
        req.body?.send === true ? "sent" : "draft",
      ]
    );

    await execute(
      `INSERT INTO project_offer_items (project_offer_id, expert_offer_id) VALUES ($1, $2)`,
      [po.id, eo.id]
    );

    if (po.status === "sent") {
      await execute(
        `UPDATE inquiries SET status = 'offered', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
    }

    res.status(201).json(toProjectOffer({
      ...po,
      project_offer_items: [{ expert_offers: { ...eo, users: null } }],
    }, { includePartners: true }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/inquiries/:id/offers/:offerId ── update an offer ───────────
router.put("/inquiries/:id/offers/:offerId", async (req, res) => {
  const { expertId, proposedPrice, clientPrice, leadTimeDays, notes, validUntil, send } = req.body ?? {};

  try {
    const offer = await queryOne(
      `SELECT po.*,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', poi.id,
             'expert_offer_id', poi.expert_offer_id,
             'expert_offers', json_build_object(
               'id', eo.id, 'expert_id', eo.expert_id, 'inquiry_id', eo.inquiry_id
             )
           ))
           FROM project_offer_items poi
           LEFT JOIN expert_offers eo ON eo.id = poi.expert_offer_id
           WHERE poi.project_offer_id = po.id
         ), '[]'::json) AS project_offer_items
       FROM project_offers po
       WHERE po.id = $1 AND po.inquiry_id = $2`,
      [req.params.offerId, req.params.id]
    );
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    if (offer.status === "accepted") {
      return res.status(400).json({ error: "Accepted offers cannot be edited" });
    }

    const poUpdates = {};
    if (clientPrice != null && !isNaN(Number(clientPrice))) poUpdates.total_client_price = Number(clientPrice);
    if (notes !== undefined) poUpdates.notes = notes?.trim() || null;
    if (leadTimeDays !== undefined) poUpdates.lead_time_days = leadTimeDays ? Number(leadTimeDays) : null;
    if (validUntil !== undefined) poUpdates.valid_until = validUntil || null;
    if (send === true && ["draft", "declined"].includes(offer.status)) poUpdates.status = "sent";

    if (Object.keys(poUpdates).length > 0) {
      const { set, values, next } = buildSet(poUpdates);
      await execute(`UPDATE project_offers SET ${set} WHERE id = $${next}`, [...values, offer.id]);
    }

    const item = offer.project_offer_items?.[0];
    const linkedExpertOffer = item?.expert_offers;

    if (expertId && proposedPrice != null && !isNaN(Number(proposedPrice))) {
      const eo = await upsertExpertOffer({
        inquiryId: req.params.id,
        expertId,
        proposedPrice: Number(proposedPrice),
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : null,
        notes: notes?.trim() || null,
      });

      if (item && item.expert_offer_id !== eo.id) {
        await execute(`UPDATE project_offer_items SET expert_offer_id = $1 WHERE id = $2`, [eo.id, item.id]);
      } else if (!item) {
        await execute(
          `INSERT INTO project_offer_items (project_offer_id, expert_offer_id) VALUES ($1, $2)`,
          [offer.id, eo.id]
        );
      }
    } else if (linkedExpertOffer && (leadTimeDays !== undefined || notes !== undefined)) {
      const eoUpdates = {};
      if (leadTimeDays !== undefined) eoUpdates.estimated_lead_time_days = leadTimeDays ? Number(leadTimeDays) : null;
      if (notes !== undefined) eoUpdates.notes = notes?.trim() || null;
      if (Object.keys(eoUpdates).length > 0) {
        const { set, values, next } = buildSet(eoUpdates);
        await execute(`UPDATE expert_offers SET ${set} WHERE id = $${next}`, [...values, linkedExpertOffer.id]);
      }
    }

    if (send === true) {
      await execute(
        `UPDATE inquiries SET status = 'offered', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
    }

    const refreshed = await fetchProjectOfferForMapper(offer.id);
    if (!refreshed) throw new Error("Offer not found");

    res.json(toProjectOffer(refreshed, { includePartners: true }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/inquiries/:id/offers/:offerId/send ── publish draft offer ──
router.post("/inquiries/:id/offers/:offerId/send", async (req, res) => {
  try {
    const offer = await queryOne(
      `SELECT id, status FROM project_offers WHERE id = $1 AND inquiry_id = $2`,
      [req.params.offerId, req.params.id]
    );
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    if (offer.status === "accepted") return res.status(400).json({ error: "Offer already accepted" });
    if (!["draft", "declined"].includes(offer.status)) {
      return res.status(400).json({ error: "Only draft or declined offers can be sent" });
    }

    await execute(`UPDATE project_offers SET status = 'sent' WHERE id = $1`, [offer.id]);
    await execute(
      `UPDATE inquiries SET status = 'offered', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/experts/:id ── get single expert detail ───────────────────
router.get("/experts/:id", async (req, res) => {
  try {
    const data = await queryOne(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.company_name, u.role,
              u.created_at, u.phone, u.contact_pref,
              (
                SELECT json_build_object(
                  'bio', ep.bio, 'location_city', ep.location_city,
                  'capacity_notes', ep.capacity_notes, 'is_available', ep.is_available,
                  'score', ep.score, 'score_notes', ep.score_notes, 'updated_at', ep.updated_at
                )
                FROM expert_profiles ep WHERE ep.user_id = u.id
              ) AS expert_profiles,
              COALESCE((
                SELECT json_agg(json_build_object(
                  'categories', json_build_object('id', cat.id, 'name', cat.name, 'type', cat.type)
                ))
                FROM user_categories uc
                JOIN categories cat ON cat.id = uc.category_id
                WHERE uc.user_id = u.id
              ), '[]'::json) AS user_categories
       FROM users u
       WHERE u.id = $1 AND u.role = 'expert'`,
      [req.params.id]
    );
    if (!data) throw new Error("Expert not found");

    const [services, documents] = await Promise.all([
      query(
        `SELECT * FROM partner_services
         WHERE partner_id = $1
         ORDER BY sort_order ASC, created_at ASC`,
        [req.params.id]
      ),
      query(
        `SELECT * FROM partner_documents
         WHERE partner_id = $1 AND confirmed = TRUE
         ORDER BY created_at DESC`,
        [req.params.id]
      ),
    ]);

    res.json({
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      companyName: data.company_name,
      phone: data.phone ?? null,
      contactPref: data.contact_pref ?? "email",
      role: data.role,
      createdAt: data.created_at,
      profile: toExpertProfile(normalizeEmbeddedProfile(data.expert_profiles)),
      categories: (data.user_categories ?? []).map((uc) => uc.categories),
      services: (services ?? []).map(toPartnerService),
      documents: (documents ?? []).map(toPartnerDocument),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function normalizeEmbeddedProfile(embed) {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

function toPartnerService(s) {
  return {
    id: s.id,
    partnerId: s.partner_id,
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

function toPartnerDocument(d) {
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

function toInquiry(row) {
  const client = row.users ?? {};
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    urgency: row.urgency,
    status: row.status,
    estimatedQuantity: row.estimated_quantity,
    targetStartDate: row.target_start_date,
    targetEndDate: row.target_end_date,
    assignedExpertId: row.assigned_expert_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.categories ?? null,
    projectOffers: row.project_offers
      ? row.project_offers.map((po) => toProjectOffer(po, { includePartners: true }))
      : [],
    client: {
      id: client.id,
      email: client.email,
      firstName: client.first_name,
      lastName: client.last_name,
      companyName: client.company_name,
    },
  };
}

export default router;
