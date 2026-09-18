import { Router } from "express";
import { queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole, requireRole } from "../middleware/requireRole.js";
import { toExpertProfile } from "../lib/expertProfile.js";

const router = Router();
router.use(requireAuth, attachRole, ...requireRole("expert"));

router.get("/me", async (req, res) => {
  try {
    const data = await queryOne("SELECT * FROM expert_profiles WHERE user_id = $1", [req.dbUser.id]);
    res.json(toExpertProfile(data) ?? {
      bio: null,
      locationCity: "Remote",
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

router.put("/me", async (req, res) => {
  const { bio, locationCity, capacityNotes, isAvailable } = req.body ?? {};
  try {
    const data = await queryOne(
      `INSERT INTO expert_profiles (user_id, bio, location_city, capacity_notes, is_available, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         bio = COALESCE(EXCLUDED.bio, expert_profiles.bio),
         location_city = COALESCE(EXCLUDED.location_city, expert_profiles.location_city),
         capacity_notes = COALESCE(EXCLUDED.capacity_notes, expert_profiles.capacity_notes),
         is_available = EXCLUDED.is_available,
         updated_at = NOW()
       RETURNING *`,
      [
        req.dbUser.id,
        bio !== undefined ? (bio?.trim() || null) : null,
        locationCity !== undefined ? (locationCity?.trim() || "Remote") : "Remote",
        capacityNotes !== undefined ? (capacityNotes?.trim() || null) : null,
        isAvailable !== undefined ? Boolean(isAvailable) : true,
      ]
    );
    res.json(toExpertProfile(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
