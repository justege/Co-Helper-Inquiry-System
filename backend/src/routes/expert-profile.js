import { Router } from "express";
import supabase from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole, requireRole } from "../middleware/requireRole.js";
import { toExpertProfile } from "../lib/expertProfile.js";

const router = Router();

router.use(requireAuth, attachRole, ...requireRole("expert"));

// ── GET /api/expert-profile/me ───────────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("expert_profiles")
      .select("*")
      .eq("user_id", req.dbUser.id)
      .maybeSingle();
    if (error) throw error;
    res.json(toExpertProfile(data) ?? {
      bio: null,
      locationCity: "Istanbul",
      capacityNotes: null,
      isAvailable: true,
      score: null,
      scoreNotes: null,
      updatedAt: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/expert-profile/me ───────────────────────────────────────────────
router.put("/me", async (req, res) => {
  const { bio, locationCity, capacityNotes, isAvailable } = req.body ?? {};
  const updates = { user_id: req.dbUser.id, updated_at: new Date().toISOString() };

  if (bio !== undefined) updates.bio = bio?.trim() || null;
  if (locationCity !== undefined) updates.location_city = locationCity?.trim() || "Istanbul";
  if (capacityNotes !== undefined) updates.capacity_notes = capacityNotes?.trim() || null;
  if (isAvailable !== undefined) updates.is_available = Boolean(isAvailable);

  try {
    const { data, error } = await supabase
      .from("expert_profiles")
      .upsert(updates, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    res.json(toExpertProfile(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
