import { Router } from "express";
import { query, queryOne, execute, buildSet } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";

const router = Router();
router.use(requireAuth, attachRole);

router.get("/", async (req, res) => {
  try {
    if (!req.dbUser.company_name) return res.json([]);
    const data = await query(
      `SELECT id, email, first_name, last_name, role, created_at
       FROM users
       WHERE company_name = $1 AND id <> $2
       ORDER BY created_at`,
      [req.dbUser.company_name, req.dbUser.id]
    );
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

router.get("/invitations", async (req, res) => {
  try {
    const data = await query(
      `SELECT * FROM team_invitations
       WHERE inviter_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [req.dbUser.id]
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/invitations", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email?.trim()) return res.status(400).json({ error: "email is required" });
  if (!req.dbUser.company_name) {
    return res.status(400).json({ error: "Set your company name before inviting team members" });
  }
  try {
    const data = await queryOne(
      `INSERT INTO team_invitations (inviter_id, invited_email, company_name)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.dbUser.id, email.trim().toLowerCase(), req.dbUser.company_name]
    );
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/invitations/:id", async (req, res) => {
  try {
    await execute(
      `UPDATE team_invitations SET status = 'revoked' WHERE id = $1 AND inviter_id = $2`,
      [req.params.id, req.dbUser.id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/contact", async (req, res) => {
  try {
    const data = await queryOne("SELECT phone, contact_pref FROM users WHERE id = $1", [req.dbUser.id]);
    res.json({ phone: data?.phone ?? null, contactPref: data?.contact_pref ?? "email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/contact", async (req, res) => {
  const { phone, contactPref } = req.body ?? {};
  const VALID = ["email", "phone", "both"];
  const fields = {};
  if (phone !== undefined) fields.phone = phone?.trim() || null;
  if (contactPref && VALID.includes(contactPref)) fields.contact_pref = contactPref;
  const { set, values, next } = buildSet(fields);
  if (!set) return res.status(400).json({ error: "Nothing to update" });
  try {
    const data = await queryOne(
      `UPDATE users SET ${set} WHERE id = $${next} RETURNING phone, contact_pref`,
      [...values, req.dbUser.id]
    );
    res.json({ phone: data.phone, contactPref: data.contact_pref });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
