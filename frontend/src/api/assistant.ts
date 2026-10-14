import { api } from "../lib/api"
import { getApiBaseUrl } from "../lib/apiBase"

export type AssistantContextInput = {
  surface?: string
  projectId?: string
  todoId?: string
  clientId?: string
  invoiceId?: string
  hint?: string
}

export type AssistantDraft = {
  kind: string
  label: string
  name: string
  title: string
  description: string
  body: string
  acceptanceCriteria: string
  text: string
}

export type AssistantMessage = {
  role: "user" | "assistant"
  content: string
}

type PolishBody = {
  kind: string
  text: string
  instruction?: string
  hint?: string
  context?: AssistantContextInput
}

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error((payload as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function draftPlain(draft: AssistantDraft): string {
  if (draft.kind === "new_project") return [draft.name, draft.description || draft.text].filter(Boolean).join("\n\n")
  if (draft.kind === "new_todo") return [draft.title, draft.body || draft.description, draft.acceptanceCriteria && `Acceptance: ${draft.acceptanceCriteria}`].filter(Boolean).join("\n\n")
  return draft.text || draft.body || draft.description || draft.acceptanceCriteria || draft.title || draft.name
}

export const polishText = (body: PolishBody) =>
  api.post<{ text: string }>("/api/assistant/polish", body).then((result) => result.text)

export const polishPublicText = (body: PolishBody) =>
  publicPost<{ text: string }>("/api/public/assistant/polish", body).then((result) => result.text)

export const draftWithAssistant = (body: {
  kind: string
  prompt?: string
  text?: string
  context?: AssistantContextInput
}) => api.post<AssistantDraft>("/api/assistant/draft", body)

export const askAssistant = (body: {
  messages: AssistantMessage[]
  context?: AssistantContextInput
}) => api.post<{ reply: string; suggestion: AssistantDraft | null }>("/api/assistant/chat", body)
