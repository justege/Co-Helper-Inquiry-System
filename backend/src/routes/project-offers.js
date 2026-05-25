import { Router } from "express";
import supabase from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";

const router = Router();

function toProjectOffer(po, { includePartners = false } = {}) {
  const base = {
    id: po.id,
    inquiryId: po.inquiry_id,
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

const RICH_SELECT = `
  *, project_offer_items(
    id,
    expert_offers(
      id, proposed_price, estimated_lead_time_days, notes,
      users!expert_offers_expert_id_fkey(id, first_name, last_name, company_name)
    )
  ),
  inquiries!inner(id, client_id, title, urgency, status)
`;

// GET /api/project-offers/mine
router.get("/mine", requireAuth, attachRole, async (req, res) => {
  const { status } = req.query;

  let query = supabase
    .from("project_offers")
    .select(`*, project_offer_items(id), inquiries!inner(client_id)`)
    .eq("inquiries.client_id", req.dbUser.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map((po) => toProjectOffer(po)));
});

// GET /api/project-offers/:id  (rich detail)
router.get("/:id", requireAuth, attachRole, async (req, res) => {
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);
  const select = isAdmin
    ? RICH_SELECT
    : `*, project_offer_items(id), inquiries!inner(id, client_id, title, urgency, status)`;

  const { data, error } = await supabase
    .from("project_offers")
    .select(select)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Project offer not found" });

  const isOwner = data.inquiries.client_id === req.dbUser.id;
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Access denied" });

  res.json(toProjectOffer(data, { includePartners: isAdmin }));
});

// POST /api/project-offers/:id/accept
router.post("/:id/accept", requireAuth, attachRole, async (req, res) => {
  const { data: offer, error: offerErr } = await supabase
    .from("project_offers")
    .select("*, inquiries!inner(id, client_id, title, urgency, status)")
    .eq("id", req.params.id)
    .single();

  if (offerErr) return res.status(404).json({ error: "Project offer not found" });
  if (offer.inquiries.client_id !== req.dbUser.id)
    return res.status(403).json({ error: "Access denied" });

  if (offer.status === "accepted") {
    return res.json({ success: true });
  }
  if (offer.status !== "sent") {
    return res.status(400).json({ error: "Only offers with status 'sent' can be accepted" });
  }

  const { error: e1 } = await supabase
    .from("project_offers")
    .update({ status: "accepted" })
    .eq("id", offer.id);
  if (e1) return res.status(500).json({ error: e1.message });

  const { error: e2 } = await supabase
    .from("inquiries")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", offer.inquiries.id);
  if (e2) return res.status(500).json({ error: e2.message });

  res.json({ success: true });
});

// POST /api/project-offers/:id/decline
router.post("/:id/decline", requireAuth, attachRole, async (req, res) => {
  const { data: offer, error: offerErr } = await supabase
    .from("project_offers")
    .select("*, inquiries!inner(id, client_id)")
    .eq("id", req.params.id)
    .single();

  if (offerErr) return res.status(404).json({ error: "Project offer not found" });
  if (offer.inquiries.client_id !== req.dbUser.id)
    return res.status(403).json({ error: "Access denied" });
  if (offer.status !== "sent")
    return res.status(400).json({ error: "Only offers with status 'sent' can be declined" });

  const { error: e1 } = await supabase
    .from("project_offers")
    .update({ status: "declined" })
    .eq("id", offer.id);
  if (e1) return res.status(500).json({ error: e1.message });

  // Roll inquiry back to matching so admin can create a new offer
  const { error: e2 } = await supabase
    .from("inquiries")
    .update({ status: "matching", updated_at: new Date().toISOString() })
    .eq("id", offer.inquiries.id);
  if (e2) return res.status(500).json({ error: e2.message });

  res.json({ success: true });
});

// POST /api/project-offers/:id/escalate
// Client escalates (flags for review) — offer marked declined, inquiry → escalated
router.post("/:id/escalate", requireAuth, attachRole, async (req, res) => {
  const { reason } = req.body ?? {};
  const { data: offer, error: offerErr } = await supabase
    .from("project_offers")
    .select("*, inquiries!inner(id, client_id)")
    .eq("id", req.params.id)
    .single();

  if (offerErr) return res.status(404).json({ error: "Project offer not found" });
  if (offer.inquiries.client_id !== req.dbUser.id)
    return res.status(403).json({ error: "Access denied" });
  if (offer.status !== "sent")
    return res.status(400).json({ error: "Only sent offers can be escalated" });

  const { error: e1 } = await supabase
    .from("project_offers")
    .update({ status: "declined" })
    .eq("id", offer.id);
  if (e1) return res.status(500).json({ error: e1.message });

  // Set inquiry to escalated and record the reason in a note if provided
  const { error: e2 } = await supabase
    .from("inquiries")
    .update({ status: "escalated", updated_at: new Date().toISOString() })
    .eq("id", offer.inquiries.id);
  if (e2) return res.status(500).json({ error: e2.message });

  // If reason provided, attach it as an inquiry note
  if (reason?.trim()) {
    await supabase.from("inquiry_notes").insert({
      inquiry_id: offer.inquiries.id,
      author_id: req.dbUser.id,
      content: `[Escalation] ${reason.trim()}`,
    });
  }

  res.json({ success: true });
});

export default router;
