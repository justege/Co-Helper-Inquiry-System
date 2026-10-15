import { api } from "../lib/api"

export type AssistantContextInput = {
  surface?: string
  projectId?: string
  todoId?: string
  clientId?: string
  invoiceId?: string
  view?: string
  hint?: string
}

export type PlanAction =
  | "update_project"
  | "create_goal"
  | "create_milestone"
  | "update_milestone"
  | "create_todo"
  | "update_todo"

export type PlanSurface = "overview" | "board" | "plan" | "timeline"

export type PlanChange = {
  key: string
  action: PlanAction
  surface: PlanSurface
  recommended: boolean
  reason: string
  label: string
  detail: string
  title: string
  body: string
  description: string
  acceptanceCriteria: string
  priority: string
  estimatedHours: number | null
  startAt: string
  dueAt: string
  status: string
  todoId: string
  milestoneId: string
  milestoneKey: string
  currentMilestoneId: string
  currentMilestoneKey: string
}

export type ProjectPlan = {
  summary: string
  changes: PlanChange[]
}

export type PlanApplyResult = {
  saved: { key: string; label: string }[]
  skipped: { key: string; error: string }[]
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

export function draftPlain(draft: AssistantDraft): string {
  if (draft.kind === "new_project") return [draft.name, draft.description || draft.text].filter(Boolean).join("\n\n")
  if (draft.kind === "new_todo") return [draft.title, draft.body || draft.description, draft.acceptanceCriteria && `Acceptance: ${draft.acceptanceCriteria}`].filter(Boolean).join("\n\n")
  return draft.text || draft.body || draft.description || draft.acceptanceCriteria || draft.title || draft.name
}

export const polishText = (body: PolishBody) =>
  api.post<{ text: string }>("/api/assistant/polish", body).then((result) => result.text)

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

export const askProjectPlan = (body: {
  messages: AssistantMessage[]
  context?: AssistantContextInput
  previousPlan?: ProjectPlan | null
}) => api.post<{ reply: string; suggestion: AssistantDraft | null; plan: ProjectPlan | null }>("/api/assistant/plan", body)

export const applyProjectPlan = (body: {
  projectId: string
  changes: PlanChange[]
}) => api.post<PlanApplyResult>("/api/assistant/plan/apply", body)
