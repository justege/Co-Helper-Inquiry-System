import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";

const router = Router();

function toProjectOffer(po) {
  return {
    id: po.id,
    inquiryId: po.inquiry_id,
    totalClientPrice: Number(po.total_client_price),
    validUntil: po.valid_until ?? null,
    status: po.status,
    notes: po.notes ?? null,
    leadTimeDays: po.lead_time_days ?? null,
    createdAt: po.created_at,
    itemCount: Number(po.item_count ?? 0),
  };
}

router.get("/mine", requireAuth, attachRole, async (req, res) => {
  const { status } = req.query;
  try {
    const params = [req.dbUser.id];
    let sql = `
      SELECT po.*, (SELECT COUNT(*) FROM project_offer_items poi WHERE poi.project_offer_id = po.id) AS item_count
      FROM project_offers po
      JOIN inquiries i ON i.id = po.inquiry_id
      WHERE i.client_id = $1`;
    if (status) {
      params.push(status);
      sql += ` AND po.status = $2`;
    }
    sql += " ORDER BY po.created_at DESC";
    const data = await query(sql, params);
    res.json(data.map(toProjectOffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireAuth, attachRole, async (req, res) => {
  const isAdmin = ["admin", "superadmin"].includes(req.userRole);
  try {
    const data = await queryOne(
      `SELECT po.*, i.client_id,
         (SELECT COUNT(*) FROM project_offer_items poi WHERE poi.project_offer_id = po.id) AS item_count
       FROM project_offers po
       JOIN inquiries i ON i.id = po.inquiry_id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (!data) return res.status(404).json({ error: "Project offer not found" });
    if (data.client_id !== req.dbUser.id && !isAdmin) return res.status(403).json({ error: "Access denied" });
    res.json(toProjectOffer(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/accept", requireAuth, attachRole, async (req, res) => {
  const offer = await queryOne(
    `SELECT po.*, i.id AS inquiry_id, i.client_id
     FROM project_offers po JOIN inquiries i ON i.id = po.inquiry_id
     WHERE po.id = $1`,
    [req.params.id]
  );
  if (!offer) return res.status(404).json({ error: "Project offer not found" });
  if (offer.client_id !== req.dbUser.id) return res.status(403).json({ error: "Access denied" });
  if (offer.status === "accepted") return res.json({ success: true });
  if (offer.status !== "sent") return res.status(400).json({ error: "Only offers with status 'sent' can be accepted" });
  await execute("UPDATE project_offers SET status = 'accepted' WHERE id = $1", [offer.id]);
  await execute("UPDATE inquiries SET status = 'in_progress', updated_at = NOW() WHERE id = $1", [offer.inquiry_id]);
  res.json({ success: true });
});

router.post("/:id/decline", requireAuth, attachRole, async (req, res) => {
  const offer = await queryOne(
    `SELECT po.*, i.id AS inquiry_id, i.client_id
     FROM project_offers po JOIN inquiries i ON i.id = po.inquiry_id
     WHERE po.id = $1`,
    [req.params.id]
  );
  if (!offer) return res.status(404).json({ error: "Project offer not found" });
  if (offer.client_id !== req.dbUser.id) return res.status(403).json({ error: "Access denied" });
  if (offer.status !== "sent") return res.status(400).json({ error: "Only offers with status 'sent' can be declined" });
  await execute("UPDATE project_offers SET status = 'declined' WHERE id = $1", [offer.id]);
  await execute("UPDATE inquiries SET status = 'matching', updated_at = NOW() WHERE id = $1", [offer.inquiry_id]);
  res.json({ success: true });
});

router.post("/:id/escalate", requireAuth, attachRole, async (req, res) => {
  const { reason } = req.body ?? {};
  const offer = await queryOne(
    `SELECT po.*, i.id AS inquiry_id, i.client_id
     FROM project_offers po JOIN inquiries i ON i.id = po.inquiry_id
     WHERE po.id = $1`,
    [req.params.id]
  );
  if (!offer) return res.status(404).json({ error: "Project offer not found" });
  if (offer.client_id !== req.dbUser.id) return res.status(403).json({ error: "Access denied" });
  if (offer.status !== "sent") return res.status(400).json({ error: "Only sent offers can be escalated" });
  await execute("UPDATE project_offers SET status = 'declined' WHERE id = $1", [offer.id]);
  await execute("UPDATE inquiries SET status = 'escalated', updated_at = NOW() WHERE id = $1", [offer.inquiry_id]);
  if (reason?.trim()) {
    await execute(
      "INSERT INTO inquiry_notes (inquiry_id, author_id, content) VALUES ($1, $2, $3)",
      [offer.inquiry_id, req.dbUser.id, `[Escalation] ${reason.trim()}`]
    );
  }
  res.json({ success: true });
});

export default router;
