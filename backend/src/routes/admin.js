import { Router } from "express";
import supabase from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isAdminOrAbove, isSuperadmin } from "../middleware/requireRole.js";
import { toExpertProfile } from "../lib/expertProfile.js";
import { toProjectOffer } from "../lib/projectOffer.js";

const router = Router();

// All admin routes require admin or above
router.use(requireAuth, ...isAdminOrAbove);

// ── GET /api/admin/inquiries ── list all inquiries with client + category info ──
router.get("/inquiries", async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = supabase
      .from("inquiries")
      .select(`
        *,
        users!inquiries_client_id_fkey(id, email, first_name, last_name, company_name),
        categories(id, name, type)
      `)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data.map(toInquiry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/inquiries/:id ── get single inquiry ───────────────────────
router.get("/inquiries/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("inquiries")
      .select(`
        *,
        users!inquiries_client_id_fkey(id, email, first_name, last_name, company_name),
        categories(id, name, type),
        project_offers(
          id, inquiry_id, total_client_price, valid_until, status, created_at, notes, lead_time_days,
          project_offer_items(
            id,
            expert_offers(
              id, expert_id, proposed_price, estimated_lead_time_days, notes,
              users!expert_offers_expert_id_fkey(id, email, first_name, last_name, company_name)
            )
          )
        )
      `)
      .eq("id", req.params.id)
      .single();
    if (error) throw error;
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
  const VALID = ["pending", "matching", "offered", "accepted", "in_progress", "delivered", "escalated", "cancelled"];
  const { status } = req.body ?? {};
  if (!VALID.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID.join(", ")}` });
  }
  try {
    const { data, error } = await supabase
      .from("inquiries")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select(`
        *,
        users!inquiries_client_id_fkey(id, email, first_name, last_name, company_name),
        categories(id, name, type)
      `)
      .single();
    if (error) throw error;
    res.json(toInquiry(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/experts ── list all expert users with profiles ─────────────
router.get("/experts", async (req, res) => {
  try {
    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("*, user_categories(category_id, categories(*))")
      .eq("role", "expert")
      .order("created_at", { ascending: false });
    if (uErr) throw uErr;

    const expertIds = users.map((u) => u.id);
    const { data: profiles, error: pErr } = expertIds.length
      ? await supabase
          .from("expert_profiles")
          .select("*")
          .in("user_id", expertIds)
      : { data: [], error: null };
    if (pErr) throw pErr;

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
    const { data, error } = await supabase
      .from("expert_profiles")
      .upsert(
        {
          user_id: req.params.id,
          score,
          score_notes: scoreNotes?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();
    if (error) throw error;
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
    let query = supabase
      .from("users")
      .select("*, user_categories(category_id, categories(*))")
      .order("created_at", { ascending: false });
    if (role) query = query.eq("role", role);
    const { data, error } = await query;
    if (error) throw error;
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
    const { data, error } = await supabase
      .from("inquiry_notes")
      .select("*, users!inquiry_notes_author_id_fkey(id, email, first_name, last_name, role)")
      .eq("inquiry_id", req.params.id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    res.json((data ?? []).map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.created_at,
      author: {
        id: n.users.id,
        email: n.users.email,
        firstName: n.users.first_name,
        lastName: n.users.last_name,
        role: n.users.role,
      },
    })));
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
    const { data, error } = await supabase
      .from("inquiry_notes")
      .insert({ inquiry_id: req.params.id, author_id: req.dbUser.id, content: content.trim() })
      .select("*, users!inquiry_notes_author_id_fkey(id, email, first_name, last_name, role)")
      .single();
    if (error) throw error;
    res.status(201).json({
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      author: {
        id: data.users.id,
        email: data.users.email,
        firstName: data.users.first_name,
        lastName: data.users.last_name,
        role: data.users.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/inquiries/:id/notes/:noteId ── delete a note ────────────
router.delete("/inquiries/:id/notes/:noteId", ...isSuperadmin.slice(1), async (req, res) => {
  try {
    const { error } = await supabase
      .from("inquiry_notes")
      .delete()
      .eq("id", req.params.noteId)
      .eq("inquiry_id", req.params.id);
    if (error) throw error;
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
    const updates = {
      assigned_expert_id: expertId || null,
      updated_at: new Date().toISOString(),
    };
    if (expertId) updates.status = "matching";
    const { data, error } = await supabase
      .from("inquiries")
      .update(updates)
      .eq("id", req.params.id)
      .select(`*, users!inquiries_client_id_fkey(id, email, first_name, last_name, company_name), categories(id, name, type)`)
      .single();
    if (error) throw error;
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
    // 1. Create expert_offer
    const { data: eo, error: eoErr } = await supabase
      .from("expert_offers")
      .upsert({
        inquiry_id: req.params.id,
        expert_id: expertId,
        proposed_price: Number(proposedPrice),
        estimated_lead_time_days: leadTimeDays ? Number(leadTimeDays) : null,
        notes: notes?.trim() || null,
        status: "submitted",
      }, { onConflict: "inquiry_id,expert_id" })
      .select()
      .single();
    if (eoErr) throw eoErr;

    // 2. Create project_offer (draft until explicitly sent)
    const { data: po, error: poErr } = await supabase
      .from("project_offers")
      .insert({
        inquiry_id: req.params.id,
        total_client_price: Number(clientPrice),
        valid_until: validUntil || null,
        notes: notes?.trim() || null,
        lead_time_days: leadTimeDays ? Number(leadTimeDays) : null,
        status: req.body?.send === true ? "sent" : "draft",
      })
      .select()
      .single();
    if (poErr) throw poErr;

    // 3. Link them
    const { error: piErr } = await supabase
      .from("project_offer_items")
      .insert({ project_offer_id: po.id, expert_offer_id: eo.id });
    if (piErr) throw piErr;

    // 4. Update inquiry status when sent
    if (po.status === "sent") {
      await supabase
        .from("inquiries")
        .update({ status: "offered", updated_at: new Date().toISOString() })
        .eq("id", req.params.id);
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
    const { data: offer, error: offerErr } = await supabase
      .from("project_offers")
      .select(`
        *,
        project_offer_items(
          id, expert_offer_id,
          expert_offers(id, expert_id, inquiry_id)
        )
      `)
      .eq("id", req.params.offerId)
      .eq("inquiry_id", req.params.id)
      .single();
    if (offerErr || !offer) return res.status(404).json({ error: "Offer not found" });
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
      const { error: poErr } = await supabase
        .from("project_offers")
        .update(poUpdates)
        .eq("id", offer.id);
      if (poErr) throw poErr;
    }

    const item = offer.project_offer_items?.[0];
    const linkedExpertOffer = item?.expert_offers;

    if (expertId && proposedPrice != null && !isNaN(Number(proposedPrice))) {
      const { data: eo, error: eoErr } = await supabase
        .from("expert_offers")
        .upsert({
          inquiry_id: req.params.id,
          expert_id: expertId,
          proposed_price: Number(proposedPrice),
          estimated_lead_time_days: leadTimeDays ? Number(leadTimeDays) : null,
          notes: notes?.trim() || null,
          status: "submitted",
        }, { onConflict: "inquiry_id,expert_id" })
        .select()
        .single();
      if (eoErr) throw eoErr;

      if (item && item.expert_offer_id !== eo.id) {
        await supabase
          .from("project_offer_items")
          .update({ expert_offer_id: eo.id })
          .eq("id", item.id);
      } else if (!item) {
        await supabase
          .from("project_offer_items")
          .insert({ project_offer_id: offer.id, expert_offer_id: eo.id });
      }
    } else if (linkedExpertOffer && (leadTimeDays !== undefined || notes !== undefined)) {
      const eoUpdates = {};
      if (leadTimeDays !== undefined) eoUpdates.estimated_lead_time_days = leadTimeDays ? Number(leadTimeDays) : null;
      if (notes !== undefined) eoUpdates.notes = notes?.trim() || null;
      if (Object.keys(eoUpdates).length > 0) {
        await supabase.from("expert_offers").update(eoUpdates).eq("id", linkedExpertOffer.id);
      }
    }

    if (send === true) {
      await supabase
        .from("inquiries")
        .update({ status: "offered", updated_at: new Date().toISOString() })
        .eq("id", req.params.id);
    }

    const { data: refreshed, error: refErr } = await supabase
      .from("project_offers")
      .select(`
        *,
        project_offer_items(
          id,
          expert_offers(
            id, expert_id, proposed_price, estimated_lead_time_days, notes,
            users!expert_offers_expert_id_fkey(id, email, first_name, last_name, company_name)
          )
        )
      `)
      .eq("id", offer.id)
      .single();
    if (refErr) throw refErr;

    res.json(toProjectOffer(refreshed, { includePartners: true }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/inquiries/:id/offers/:offerId/send ── publish draft offer ──
router.post("/inquiries/:id/offers/:offerId/send", async (req, res) => {
  try {
    const { data: offer, error: offerErr } = await supabase
      .from("project_offers")
      .select("id, status")
      .eq("id", req.params.offerId)
      .eq("inquiry_id", req.params.id)
      .single();
    if (offerErr || !offer) return res.status(404).json({ error: "Offer not found" });
    if (offer.status === "accepted") return res.status(400).json({ error: "Offer already accepted" });
    if (!["draft", "declined"].includes(offer.status)) {
      return res.status(400).json({ error: "Only draft or declined offers can be sent" });
    }

    const { error: updErr } = await supabase
      .from("project_offers")
      .update({ status: "sent" })
      .eq("id", offer.id);
    if (updErr) throw updErr;

    await supabase
      .from("inquiries")
      .update({ status: "offered", updated_at: new Date().toISOString() })
      .eq("id", req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/experts/:id ── get single expert detail ───────────────────
router.get("/experts/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id, email, first_name, last_name, company_name, role, created_at, phone, contact_pref,
        expert_profiles(bio, location_city, capacity_notes, is_available, score, score_notes, updated_at),
        user_categories(categories(id, name, type))
      `)
      .eq("id", req.params.id)
      .eq("role", "expert")
      .single();
    if (error) throw error;

    const [{ data: services }, { data: documents }] = await Promise.all([
      supabase
        .from("partner_services")
        .select("*")
        .eq("partner_id", req.params.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("partner_documents")
        .select("*")
        .eq("partner_id", req.params.id)
        .eq("confirmed", true)
        .order("created_at", { ascending: false }),
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
