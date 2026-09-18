import { api } from "../lib/api";

export type RewriteTarget = "requirement" | "message" | "todo";

export interface RewriteResult {
  rewritten: string;
  summary: string | null;
}

export const rewriteText = (
  inquiryId: string,
  target: RewriteTarget,
  text: string,
  instruction?: string
) =>
  api.post<RewriteResult>("/api/ai/rewrite", { inquiryId, target, text, instruction });

export interface AiInquiryDraft {
  title: string;
  description: string;
  type: "service" | "tool_sourcing";
  urgency: "low" | "medium" | "high" | "critical";
  categoryName: string;
  targetStartDate?: string | null;
  targetEndDate?: string | null;
  estimatedQuantity?: number | null;
}

export interface InquiryChatResult {
  text: string;
  draft?: AiInquiryDraft;
}

export const sendInquiryChat = (body: {
  history: { role: "user" | "model"; text: string }[];
  userMessage: string;
  categoriesHint: string;
}) => api.post<InquiryChatResult>("/api/ai/inquiry-chat", body);
