import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { registerPartner } from "../lib/partnerRegistration.js";
import { sendEmail } from "../lib/email.js";

const router = Router();
const VALID_TYPES = ["service", "tool_sourcing"];

function toCategoryService(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    isLive: row.is_live,
    sortOrder: row.sort_order,
  };
}

router.get("/categories", async (req, res) => {
  const { type } = req.query;
  try {
    const data = type && VALID_TYPES.includes(type)
      ? await query("SELECT id, name, slug, type, description FROM categories WHERE type = $1 ORDER BY name", [type])
      : await query("SELECT id, name, slug, type, description FROM categories ORDER BY name");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/category-services", async (req, res) => {
  const { categoryId } = req.query;
  try {
    const data = categoryId
      ? await query(
          `SELECT id, category_id, name, slug, description, is_live, sort_order
           FROM category_services WHERE category_id = $1 ORDER BY sort_order`,
          [categoryId]
        )
      : await query(
          `SELECT id, category_id, name, slug, description, is_live, sort_order
           FROM category_services ORDER BY sort_order`
        );
    res.json(data.map(toCategoryService));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/partner-registration", requireAuth, async (req, res) => {
  const { username, companyName, bio, locationCity, categoryIds = [] } = req.body ?? {};
  try {
    const result = await registerPartner({
      firebaseUid: req.uid,
      email: req.firebaseUser.email ?? "",
      username,
      companyName,
      bio,
      locationCity,
      categoryIds,
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
      checks: {
        api: "operational",
        database: "operational",
      },
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
    const inbox = process.env.CONTACT_INBOX || "hello@co-helper.com";
    await sendEmail({
      to: inbox,
      subject: `[Co-Helper] ${subject}`,
      text: `${name} <${email}> ${company}\n\n${message}`,
      html: `<p><strong>${name}</strong> &lt;${email}&gt;<br>${company}</p><p>${message.replace(/\n/g, "<br>")}</p>`,
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("[contact]", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
