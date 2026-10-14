import { Router } from "express";
import { queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { registerPartner } from "../lib/partnerRegistration.js";
import { sendEmail, contactEmail, projectRequestEmail } from "../lib/email.js";

const router = Router();

router.post("/partner-registration", requireAuth, async (req, res) => {
  const { username, companyName } = req.body ?? {};
  try {
    const result = await registerPartner({
      firebaseUid: req.uid,
      email: req.firebaseUser.email ?? "",
      username,
      companyName,
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("[partner-registration]", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/health-status", async (_req, res) => {
  try {
    await queryOne("SELECT 1 AS ok");
    res.json({
      status: "operational",
      checks: { api: "operational", database: "operational" },
    });
  } catch {
    res.status(503).json({
      status: "degraded",
      checks: { api: "operational", database: "down" },
    });
  }
});

router.post("/contact", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const company = typeof req.body?.company === "string" ? req.body.company.trim() : "";
  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "Workspace question";
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (name.length < 2) return res.status(400).json({ error: "Name is required" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "A valid email is required" });
  if (message.length < 10) return res.status(400).json({ error: "Message must be at least 10 characters" });
  try {
    await execute(
      `INSERT INTO contact_messages (name, email, company, subject, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, company || null, subject, message]
    );
    const inbox = process.env.CONTACT_INBOX || "info@egemenokur.com";
    await sendEmail({
      to: inbox,
      replyTo: email,
      ...contactEmail({ name, email, company, subject, message }),
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("[contact]", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/project-request", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const company = typeof req.body?.company === "string" ? req.body.company.trim() : "";
  const role = typeof req.body?.role === "string" ? req.body.role.trim() : "";
  const projectName = typeof req.body?.projectName === "string" ? req.body.projectName.trim() : "";
  const projectType = typeof req.body?.projectType === "string" ? req.body.projectType.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  const timeline = typeof req.body?.timeline === "string" ? req.body.timeline.trim() : "";
  const budget = typeof req.body?.budget === "string" ? req.body.budget.trim() : "";
  const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
  if (name.length < 2) return res.status(400).json({ error: "Name is required" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "A valid email is required" });
  if (projectName.length < 2) return res.status(400).json({ error: "Project name is required" });
  if (description.length < 20) return res.status(400).json({ error: "Tell me a bit more about the project" });

  const message = [
    `Project: ${projectName}`,
    projectType ? `Type: ${projectType}` : null,
    company ? `Company: ${company}` : null,
    role ? `Role: ${role}` : null,
    timeline ? `Timeline: ${timeline}` : null,
    budget ? `Budget: ${budget}` : null,
    "",
    description,
    notes ? `\nNotes: ${notes}` : null,
  ].filter((line) => line !== null).join("\n");

  try {
    await execute(
      `INSERT INTO contact_messages (name, email, company, subject, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, company || null, `New project request — ${projectName}`, message]
    );
    const inbox = process.env.PROJECT_INBOX || process.env.CONTACT_INBOX || "info@egemenokur.com";
    const delivery = await sendEmail({
      to: inbox,
      replyTo: email,
      ...projectRequestEmail({ name, email, company, role, projectName, projectType, description, timeline, budget, notes }),
    });
    if (delivery?.error) {
      return res.status(502).json({ error: "The request was saved, but the email could not be sent." });
    }
    res.status(201).json({ success: true, delivered: !delivery?.skipped });
  } catch (err) {
    console.error("[project-request]", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
