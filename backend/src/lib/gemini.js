import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

function buildSystemPrompt(categoriesHint) {
  return `You are the AI Project Manager for Co-Helper — a managed software-delivery platform.
Your job is to gather everything needed to post a project inquiry via a natural, professional conversation.

You need to collect:
1. **Project title** — short, descriptive (≤ 120 chars)
2. **Detailed description** — goals, tech stack, deliverables, constraints (≥ 80 chars)
3. **Engagement type** — "service" (ongoing, retainer-style) or "tool_sourcing" (fixed project)
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

export async function sendGeminiMessage(history, userMessage, categoriesHint) {
  if (!API_KEY?.trim()) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    systemInstruction: buildSystemPrompt(categoriesHint),
  });

  const chat = model.startChat({
    history: (history ?? []).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  });

  const result = await chat.sendMessage(userMessage);
  const rawText = result.response.text();

  const jsonMarker = "INQUIRY_JSON:";
  const markerIdx = rawText.indexOf(jsonMarker);
  if (markerIdx !== -1) {
    const jsonStr = rawText.slice(markerIdx + jsonMarker.length).trim().split("\n")[0];
    try {
      const draft = JSON.parse(jsonStr);
      const text = rawText.slice(0, markerIdx).trim();
      return { text, draft };
    } catch {
      // fall through
    }
  }

  return { text: rawText };
}
