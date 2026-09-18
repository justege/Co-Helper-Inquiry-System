import { sendInquiryChat, type AiInquiryDraft } from "@/api/ai"
import type { CreateInquiryInput } from "@/api/inquiries"

export type { AiInquiryDraft }

export type GeminiRole = "user" | "model"

export interface GeminiMessage {
  role: GeminiRole
  text: string
}

export interface GeminiChatResult {
  text: string
  draft?: AiInquiryDraft
}

/** Brief-builder chat — runs on the backend so the Gemini key never ships to the browser. */
export async function sendGeminiMessage(
  history: GeminiMessage[],
  userMessage: string,
  categoriesHint: string,
): Promise<GeminiChatResult> {
  return sendInquiryChat({ history, userMessage, categoriesHint })
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
