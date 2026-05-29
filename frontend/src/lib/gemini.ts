import { GoogleGenerativeAI } from "@google/generative-ai"
import type { CreateInquiryInput } from "@/api/inquiries"

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

// ─── Structured inquiry output from AI ───────────────────────────────────────

export interface AiInquiryDraft {
  title: string
  description: string
  type: "service" | "tool_sourcing"
  urgency: "low" | "medium" | "high" | "critical"
  categoryName: string   // human-readable, matched to a real category by caller
  targetStartDate?: string | null
  targetEndDate?: string | null
  estimatedQuantity?: number | null
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(categoriesHint: string): string {
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
- Today's date: ${new Date().toISOString().slice(0, 10)}`
}

// ─── Main chat function ───────────────────────────────────────────────────────

export type GeminiRole = "user" | "model"

export interface GeminiMessage {
  role: GeminiRole
  text: string
}

export interface GeminiChatResult {
  text: string
  draft?: AiInquiryDraft
}

export async function sendGeminiMessage(
  history: GeminiMessage[],
  userMessage: string,
  categoriesHint: string,
): Promise<GeminiChatResult> {
  if (!API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not set. Add it to your .env file.")
  }

  const genAI = new GoogleGenerativeAI(API_KEY)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildSystemPrompt(categoriesHint),
  })

  const chat = model.startChat({
    history: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  })

  const result = await chat.sendMessage(userMessage)
  const rawText = result.response.text()

  // Extract INQUIRY_JSON if present
  const jsonMarker = "INQUIRY_JSON:"
  const markerIdx = rawText.indexOf(jsonMarker)
  if (markerIdx !== -1) {
    const jsonStr = rawText.slice(markerIdx + jsonMarker.length).trim().split("\n")[0]
    try {
      const parsed = JSON.parse(jsonStr) as AiInquiryDraft
      const displayText = rawText.slice(0, markerIdx).trim()
      return { text: displayText, draft: parsed }
    } catch {
      // JSON parse failed — return full text as-is
    }
  }

  return { text: rawText }
}

// ─── Map AI draft to CreateInquiryInput ──────────────────────────────────────

export function draftToInquiryInput(
  draft: AiInquiryDraft,
  categoryId: string,
): CreateInquiryInput {
  return {
    title: draft.title,
    description: draft.description,
    categoryId,
    type: draft.type,
    urgency: draft.urgency,
    targetStartDate: draft.targetStartDate ?? null,
    targetEndDate: draft.targetEndDate ?? null,
    estimatedQuantity: draft.estimatedQuantity ?? null,
  }
}
