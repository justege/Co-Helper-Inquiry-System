import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { query, queryOne } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import { checkInquiryAccess, logActivity } from "../lib/workspace.js";

const router = Router();

const TARGETS = new Set(["requirement", "message", "todo"]);
const MAX_TEXT_LENGTH = 10000;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server");
  return new GoogleGenerativeAI(apiKey);
}

function targetLabel(target) {
  if (target === "requirement") return "job requirement / brief";
  if (target === "message") return "chat message";
  return "to-do item";
}

async function loadJobContext(inquiryId) {
  const inquiry = await queryOne(
    `SELECT i.title, i.description, i.status,
            CASE WHEN c.id IS NULL THEN NULL
                 ELSE json_build_object('name', c.name)
            END AS categories
     FROM inquiries i
     LEFT JOIN categories c ON c.id = i.category_id
     WHERE i.id = $1`,
    [inquiryId]
  );

  const [messages, todos, agreements] = await Promise.all([
    query(
      `SELECT body, created_at FROM inquiry_messages
       WHERE inquiry_id = $1
       ORDER BY created_at DESC
       LIMIT 8`,
      [inquiryId]
    ),
    query(
      `SELECT title, status FROM inquiry_todos
       WHERE inquiry_id = $1
       ORDER BY sort_order
       LIMIT 12`,
      [inquiryId]
    ),
    query(
      `SELECT billing_type, hourly_rate, project_price, currency, status, notes
       FROM price_agreements
       WHERE inquiry_id = $1
       ORDER BY created_at DESC
       LIMIT 3`,
      [inquiryId]
    ),
  ]);

  return {
    inquiry: inquiry ?? null,
    recentMessages: messages.reverse(),
    todos,
    agreements,
  };
}

function buildPrompt({ target, text, instruction, context }) {
  const { inquiry, recentMessages, todos, agreements } = context;
  const lines = [
    `You are Co-Helper's in-job writing assistant. You help a freelancer and their client communicate`,
    `clearly inside a shared job workspace. You are NOT a project manager and you do not staff or match`,
    `anyone — you only help rewrite text that belongs to this specific job.`,
    ``,
    `JOB CONTEXT:`,
    `- Title: ${inquiry?.title ?? "Unknown"}`,
    `- Category: ${inquiry?.categories?.name ?? "Unknown"}`,
    `- Status: ${inquiry?.status ?? "Unknown"}`,
    `- Current brief/description: ${inquiry?.description ?? "(none)"}`,
  ];

  if (agreements.length > 0) {
    lines.push(`- Rate agreements:`);
    for (const a of agreements) {
      const price = a.billing_type === "hourly"
        ? `${a.hourly_rate} ${a.currency}/hr`
        : `${a.project_price} ${a.currency} fixed`;
      lines.push(`  · ${a.status} ${a.billing_type} — ${price}${a.notes ? ` (${a.notes})` : ""}`);
    }
  }

  if (todos.length > 0) {
    lines.push(`- To-dos:`);
    for (const t of todos) lines.push(`  · [${t.status}] ${t.title}`);
  }

  if (recentMessages.length > 0) {
    lines.push(`- Recent chat messages (oldest first):`);
    for (const m of recentMessages) lines.push(`  · ${m.body}`);
  }

  lines.push(
    ``,
    `TASK: Rewrite the following ${targetLabel(target)} so it is clear, professional, and unambiguous`,
    `for the other party in this job, while preserving the original meaning and every factual detail`,
    `(numbers, dates, names, prices). Do not invent new requirements or commitments.`,
    instruction ? `Extra instruction from the user: ${instruction}` : null,
    ``,
    `TEXT TO REWRITE:`,
    `"""${text}"""`,
    ``,
    `Respond with ONLY a single valid JSON object (no markdown fences) with exactly these keys:`,
    `{"rewritten": "the rewritten text", "summary": "one short sentence describing what changed"}`,
  );

  return lines.filter(Boolean).join("\n");
}

// POST /api/ai/rewrite — { inquiryId, target: "requirement"|"message"|"todo", text, instruction? }
router.post("/rewrite", requireAuth, attachRole, async (req, res) => {
  const { inquiryId, target, text, instruction } = req.body ?? {};

  if (!inquiryId) return res.status(400).json({ error: "inquiryId is required" });
  if (!TARGETS.has(target)) return res.status(400).json({ error: "target must be requirement, message, or todo" });
  if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "text is required" });
  if (text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: "text is too long" });

  const { ok, inquiry } = await checkInquiryAccess(inquiryId, req.dbUser.id, req.userRole);
  if (!ok) return res.status(403).json({ error: "Access denied" });

  try {
    const context = await loadJobContext(inquiryId);
    const prompt = buildPrompt({ target, text: text.trim(), instruction: instruction?.trim() || null, context });

    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    const jsonStr = raw.startsWith("```")
      ? raw.replace(/^```(json)?/, "").replace(/```$/, "").trim()
      : raw;

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { rewritten: raw, summary: "Rewritten for clarity" };
    }

    if (inquiry?.workspace_id) {
      await logActivity({
        workspaceId: inquiry.workspace_id,
        inquiryId,
        actorId: req.dbUser.id,
        type: "ai.rewrite",
        payload: { target },
      }).catch(() => null);
    }

    res.json({
      rewritten: String(parsed.rewritten ?? raw).trim(),
      summary: parsed.summary ? String(parsed.summary) : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "AI rewrite failed" });
  }
});

function inquiryChatSystemPrompt(categoriesHint) {
  return `You are the Co-Helper AI assistant, helping a freelancer and their client turn a rough
idea into a clear, well-scoped job inside their shared workspace.
You are NOT a project manager and you do not match or staff anyone — you only help write the job brief.

You need to collect:
1. **Job title** — short, descriptive (≤ 120 chars)
2. **Detailed description** — goals, scope, deliverables, constraints (≥ 80 chars)
3. **Engagement type** — "service" (ongoing, retainer-style) or "tool_sourcing" (fixed-scope job)
4. **Category** — choose the best match from: ${categoriesHint}
5. **Urgency** — low | medium | high | critical
6. **Target start date** (optional, YYYY-MM-DD or null)
7. **Target end date** (optional, YYYY-MM-DD or null)
8. **Estimated scope** (optional, only relevant for fixed projects — hours or units)

CONVERSATION RULES:
- Be warm, professional, and concise. Never use bullet-point menus or numbered lists in your messages.
- Ask 1–2 questions at a time, naturally woven into sentences.
- Do NOT ask for more info once you have enough — wrap up gracefully.
- When you have all required information (1–5), add a line at the END of your message starting with exactly:
  INQUIRY_JSON:
  followed immediately by a single valid JSON object on one line containing keys:
  title, description, type, urgency, categoryName, targetStartDate, targetEndDate, estimatedQuantity
- Only output INQUIRY_JSON once — when confident the data is complete.
- Today's date: ${new Date().toISOString().slice(0, 10)}`;
}

// POST /api/ai/inquiry-chat — brief builder for opening a job (no marketplace matching)
router.post("/inquiry-chat", requireAuth, attachRole, async (req, res) => {
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const userMessage = req.body?.userMessage?.trim();
  const categoriesHint = req.body?.categoriesHint?.trim() || "Software Development, Design, Marketing";

  if (!userMessage) return res.status(400).json({ error: "userMessage is required" });
  if (userMessage.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: "userMessage is too long" });

  const safeHistory = history
    .filter((m) => m && (m.role === "user" || m.role === "model") && typeof m.text === "string")
    .slice(-20)
    .map((m) => ({
      role: m.role,
      parts: [{ text: String(m.text).slice(0, MAX_TEXT_LENGTH) }],
    }));

  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: inquiryChatSystemPrompt(categoriesHint),
    });
    const chat = model.startChat({ history: safeHistory });
    const result = await chat.sendMessage(userMessage);
    const rawText = result.response.text();

    const jsonMarker = "INQUIRY_JSON:";
    const markerIdx = rawText.indexOf(jsonMarker);
    if (markerIdx !== -1) {
      const jsonStr = rawText.slice(markerIdx + jsonMarker.length).trim().split("\n")[0];
      try {
        const draft = JSON.parse(jsonStr);
        return res.json({
          text: rawText.slice(0, markerIdx).trim(),
          draft,
        });
      } catch {
        // fall through
      }
    }

    res.json({ text: rawText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "AI chat failed" });
  }
});

export default router;
