import { Router } from "express";
import supabase from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";

const router = Router();
router.use(requireAuth, attachRole);

// ── GET /api/team ── list company team members ──────────────────────────────
router.get("/", async (req, res) => {
  try {
    if (!req.dbUser.company_name) return res.json([]);
    const { data, error } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, role, created_at")
      .eq("company_name", req.dbUser.company_name)
      .neq("id", req.dbUser.id)
      .order("created_at");
    if (error) throw error;
    res.json(data.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      createdAt: u.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/team/invitations ── list pending invitations sent by me ─────────
router.get("/invitations", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("inviter_id", req.dbUser.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/team/invitations ── invite someone by email ────────────────────
router.post("/invitations", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email?.trim()) return res.status(400).json({ error: "email is required" });
  if (!req.dbUser.company_name) {
    return res.status(400).json({ error: "Set your company name before inviting team members" });
  }
  try {
    const { data, error } = await supabase
      .from("team_invitations")
      .insert({
        inviter_id:    req.dbUser.id,
        invited_email: email.trim().toLowerCase(),
        company_name:  req.dbUser.company_name,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/team/invitations/:id ── revoke invitation ───────────────────
router.delete("/invitations/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("team_invitations")
      .update({ status: "revoked" })
      .eq("id", req.params.id)
      .eq("inviter_id", req.dbUser.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/team/contact ── read contact preferences + phone ────────────────
router.get("/contact", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("phone, contact_pref")
      .eq("id", req.dbUser.id)
      .single();
    if (error) throw error;
    res.json({ phone: data.phone ?? null, contactPref: data.contact_pref ?? "email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/team/contact ── update contact preferences + phone ──────────────
router.put("/contact", async (req, res) => {
  const { phone, contactPref } = req.body ?? {};
  const VALID = ["email", "phone", "both"];
  const updates = {};
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (contactPref && VALID.includes(contactPref)) updates.contact_pref = contactPref;

  try {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", req.dbUser.id)
      .select("id, phone, contact_pref")
      .single();
    if (error) throw error;
    res.json({ phone: data.phone, contactPref: data.contact_pref });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
