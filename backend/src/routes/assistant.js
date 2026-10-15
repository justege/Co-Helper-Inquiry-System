import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import { chatCopy, draftCopy, polishCopy } from "../lib/assistant.js";
import { applyProjectPlan, proposeProjectPlan } from "../lib/projectPlan.js";
import { allowRequest, sendAssistantError } from "../lib/gemini.js";

const router = Router();

function limited(req, res) {
  if (allowRequest(`user:${req.uid}`, 30, 10 * 60 * 1000)) return false;
  res.status(429).json({ error: "Too many assistant requests. Try again in a few minutes." });
  return true;
}

router.post("/polish", requireAuth, attachRole, async (req, res) => {
  if (limited(req, res)) return;
  try {
    res.json(await polishCopy({
      user: req.dbUser,
      kind: req.body?.kind,
      text: req.body?.text,
      instruction: req.body?.instruction,
      hint: req.body?.hint,
      context: req.body?.context,
    }));
  } catch (err) {
    sendAssistantError(res, err);
  }
});

router.post("/draft", requireAuth, attachRole, async (req, res) => {
  if (limited(req, res)) return;
  try {
    res.json(await draftCopy(req.dbUser, req.body));
  } catch (err) {
    sendAssistantError(res, err);
  }
});

router.post("/chat", requireAuth, attachRole, async (req, res) => {
  if (limited(req, res)) return;
  try {
    res.json(await chatCopy(req.dbUser, req.body));
  } catch (err) {
    sendAssistantError(res, err);
  }
});

router.post("/plan", requireAuth, attachRole, async (req, res) => {
  if (limited(req, res)) return;
  try {
    res.json(await proposeProjectPlan(req.dbUser, req.body));
  } catch (err) {
    sendAssistantError(res, err);
  }
});

router.post("/plan/apply", requireAuth, attachRole, async (req, res) => {
  try {
    res.json(await applyProjectPlan(req.dbUser, req.body));
  } catch (err) {
    sendAssistantError(res, err);
  }
});

export default router;
