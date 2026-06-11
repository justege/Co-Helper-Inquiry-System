import type { CreateInquiryInput } from "@/api/inquiries"
import { getApiBaseUrl } from "@/lib/apiBase"

// ─── Structured inquiry output from AI ───────────────────────────────────────

export interface AiInquiryDraft {
  title: string
  description: string
  type: "service" | "tool_sourcing"
  urgency: "low" | "medium" | "high" | "critical"
  categoryName: string
  targetStartDate?: string | null
  targetEndDate?: string | null
  estimatedQuantity?: number | null
}

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
  const res = await fetch(`${getApiBaseUrl()}/api/public/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history, message: userMessage, categoriesHint }),
  })

  const body = (await res.json().catch(() => ({}))) as { error?: string } & GeminiChatResult

  if (!res.ok) {
    throw new Error(body.error ?? `AI chat failed (${res.status})`)
  }

  return body
}

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
