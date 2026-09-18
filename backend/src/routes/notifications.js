import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  mapNotification,
} from "../lib/notifications.js";

const router = Router();
router.use(requireAuth, attachRole);

router.get("/", async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "1";
    const rows = await listNotifications(req.dbUser.id, { unreadOnly });
    const unread = await unreadCount(req.dbUser.id);
    res.json({ notifications: rows.map(mapNotification), unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/read-all", async (req, res) => {
  try {
    await markAllRead(req.dbUser.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/read", async (req, res) => {
  try {
    await markRead(req.dbUser.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
