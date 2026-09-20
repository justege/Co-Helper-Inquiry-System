import { api } from "../lib/api"
import { auth } from "../lib/firebase"
import { getApiBaseUrl } from "../lib/apiBase"
import type { WorkspaceClient } from "./workspace"

export type PersonBrief = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  username: string | null
  companyName: string | null
  role?: string
}
export type TodoStatus = "backlog" | "in_progress" | "waiting_on_client" | "done" | "invoiced"
export type BillingType = "hourly" | "fixed" | "hybrid"

export interface WorkTodo {
  id: string
  workspaceId: string
  projectId: string
  title: string
  body: string | null
  internal?: boolean
  status: TodoStatus
  estimatedHours: number | null
  loggedHours: number
  remainingHours: number | null
  sortOrder: number
  milestoneId?: string | null
  commentCount?: number
    itemCount?: number
    itemDoneCount?: number
    attachmentCount?: number
    acceptanceCount?: number
    acceptanceTestedCount?: number
    acceptedAt?: string | null
    acceptedBy?: string | null
    assigneeId?: string | null
    assignee?: PersonBrief | null
    assignees?: PersonBrief[]
    startAt?: string | null
    dueAt?: string | null
    color?: string | null
    priority?: "low" | "medium" | "high"
    tags?: string[]
    dependsOnIds?: string[]
    createdAt: string
    updatedAt: string
  projectName?: string
  clientName?: string
  clientId?: string
  belongsToYou?: boolean
}

export interface TimeEntry {
  id: string
  workspaceId: string
  projectId: string
  todoId: string | null
  userId: string
  hours: number
  note: string | null
  billable: boolean
  invoiceId: string | null
  entryDate: string
  createdAt: string
  todoTitle?: string | null
}

export interface WorkProject {
  id: string
  workspaceId: string
  clientId: string
  name: string
  description: string | null
  status?: "backlog" | "in_progress" | "waiting_on_client" | "done"
  priority?: "low" | "medium" | "high"
  startAt?: string | null
  dueAt?: string | null
  currentMilestoneId?: string | null
  createdAt: string
  updatedAt?: string | null
  billingType: BillingType
  hourlyRate: number | null
  fixedPrice: number | null
  estimatedHours: number | null
  weeklyHoursTarget: number | null
  client: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    companyName: string | null
  } | null
  loggedHours: number
  remainingHours: number | null
  thisWeekHours: number
  weeklyPace: number | null
  etaWeeks: number | null
  waitingOnClient: boolean
  isNow: boolean
  nowTodo?: WorkTodo | null
  openCount?: number
  waitingCount?: number
  commentCount?: number
  currentMilestoneTitle?: string | null
  collaboratorCount?: number
  finished: boolean
  lastWorkedAt: string | null
  unbilledHours?: number
  weeklyHours: number
  canWork?: boolean
  todos: WorkTodo[]
}

export interface WorkDiscussion {
  id: string
  source: "todo" | "project"
  body: string
  createdAt: string
  author: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    username: string | null
    companyName: string | null
  } | null
  projectId: string
  projectName: string
  todoId: string | null
  todoTitle: string | null
}

export interface Workbench {
  role: "owner" | "client" | "collaborator"
  meId?: string
  workspace: {
    id: string
    name: string
    currency: string
    timezone: string
    weeklyHours: number
  } | null
  now: WorkTodo | null
  nowElsewhere: boolean
  lastWorkedAt: string | null
  lastWorkedProjectId: string | null
  suggested: (WorkTodo & { projectName?: string; clientName?: string }) | null
  thisWeekHours: number
  weeklyHours: number
  unbilledHours?: number
  myTodos: WorkTodo[]
  waitingOnYou: WorkTodo[]
  discussions: WorkDiscussion[]
  projects: WorkProject[]
  projectCount: number
}

export interface ProjectWork {
  role: "owner" | "client" | "collaborator" | "admin"
  nowElsewhere: boolean
  now: WorkTodo | null
  project: WorkProject
  timeEntries: TimeEntry[]
  weeklyHours: number
  currency: string
}

export interface Invoice {
  id: string
  workspaceId: string
  projectId: string
  clientId: string
  number: string
  status: "draft" | "sent" | "paid" | "cancelled"
  currency: string
  subtotal: number
  taxPercent: number
  total: number
  dueAt: string | null
  sentAt: string | null
  paidAt: string | null
  note: string | null
  createdAt: string
  projectName?: string
  clientName?: string
}

export interface InvoiceLine {
  id: string
  invoiceId: string
  todoId: string | null
  timeEntryId: string | null
  description: string
  hours: number
  rate: number
  amount: number
  sortOrder: number
}

export const getWorkbench = () => api.get<Workbench>("/api/workspace/workbench")

export const getProjectWork = (id: string) =>
  api.get<ProjectWork>(`/api/workspace/projects/${id}/work`)

export const createTodo = (
  projectId: string,
  data: {
    title: string
    body?: string
    estimatedHours?: number | null
    internal?: boolean
    startNow?: boolean
    milestoneId?: string | null
    assigneeId?: string | null
    assigneeIds?: string[]
    startAt?: string | null
    dueAt?: string | null
    color?: string | null
    priority?: "low" | "medium" | "high"
    tags?: string[]
    dependsOnIds?: string[]
    acceptanceCriteria?: string[]
  }
) => api.post<WorkTodo>(`/api/workspace/projects/${projectId}/todos`, data)

export const updateTodo = (
  id: string,
  data: Partial<{
    title: string
    body: string | null
    estimatedHours: number | null
    status: TodoStatus
    internal: boolean
    sortOrder: number
    milestoneId: string | null
    assigneeId: string | null
    assigneeIds: string[]
    startAt: string | null
    dueAt: string | null
    color: string | null
    priority: "low" | "medium" | "high"
    tags: string[]
    dependsOnIds: string[]
  }>
) => api.patch<WorkTodo>(`/api/workspace/todos/${id}`, data)

export const reorderTodos = (
  projectId: string,
  items: { id: string; status: TodoStatus; sortOrder: number }[]
) => api.post<{ ok: boolean }>(`/api/workspace/projects/${projectId}/todos/reorder`, { items })

export const startTodo = (id: string) => api.post<WorkTodo>(`/api/workspace/todos/${id}/start`, {})
export const readyTodo = (id: string) => api.post<WorkTodo>(`/api/workspace/todos/${id}/ready`, {})
export const acceptTodo = (id: string) => api.post<WorkTodo>(`/api/workspace/todos/${id}/accept`, {})

export const deleteTodo = (id: string) => api.delete<void>(`/api/workspace/todos/${id}`)

export const logTime = (
  todoId: string,
  data: { hours: number; note?: string; billable?: boolean; entryDate?: string }
) => api.post<TimeEntry>(`/api/workspace/todos/${todoId}/time`, data)

export const deleteTimeEntry = (id: string) => api.delete<void>(`/api/workspace/time-entries/${id}`)

export interface TodoComment {
  id: string
  todoId: string
  body: string
  createdAt: string
  author: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    username: string | null
    companyName: string | null
  } | null
}

export interface TodoChecklistItem {
  id: string
  todoId: string
  title: string
  kind?: "work" | "acceptance"
  done: boolean
  sortOrder: number
  createdAt: string
  testedAt?: string | null
  testedBy?: string | null
}

export interface TodoAttachment {
  id: string
  todoId: string
  fileName: string
  contentType: string | null
  byteSize: number | null
  createdAt: string
  uploadedBy: string | null
  downloadUrl: string | null
}

export interface TodoCard {
  role: "owner" | "client" | "collaborator" | "admin"
  meId: string
  canWork: boolean
  canSetNow: boolean
  canEditMeta: boolean
  canTest?: boolean
  canAccept?: boolean
  locked: boolean
  todo: WorkTodo
  comments: TodoComment[]
  items: TodoChecklistItem[]
  criteria?: TodoChecklistItem[]
  attachments: TodoAttachment[]
  timeEntries: TimeEntry[]
  milestones?: { id: string; title: string; done: boolean }[]
  currentMilestoneId?: string | null
  people?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    username: string | null
    companyName: string | null
    role?: string
  }[]
  siblings?: { id: string; title: string }[]
}

export const getTodoCard = (id: string) => api.get<TodoCard>(`/api/workspace/todos/${id}`)

export const addTodoComment = (todoId: string, body: string) =>
  api.post<TodoComment>(`/api/workspace/todos/${todoId}/comments`, { body })

export const deleteTodoComment = (todoId: string, commentId: string) =>
  api.delete<void>(`/api/workspace/todos/${todoId}/comments/${commentId}`)

export const addTodoItem = (todoId: string, title: string, kind?: "work" | "acceptance") =>
  api.post<TodoChecklistItem>(`/api/workspace/todos/${todoId}/items`, { title, kind })

export const updateTodoItem = (
  todoId: string,
  itemId: string,
  data: { title?: string; done?: boolean; tested?: boolean }
) => api.patch<TodoChecklistItem>(`/api/workspace/todos/${todoId}/items/${itemId}`, data)

export const deleteTodoItem = (todoId: string, itemId: string) =>
  api.delete<void>(`/api/workspace/todos/${todoId}/items/${itemId}`)

export const deleteTodoAttachment = (todoId: string, attachmentId: string) =>
  api.delete<void>(`/api/workspace/todos/${todoId}/attachments/${attachmentId}`)

export async function uploadTodoAttachment(todoId: string, file: File): Promise<TodoAttachment> {
  const signed = await api.post<{ uploadUrl: string; filePath: string; fileName: string }>(
    `/api/workspace/todos/${todoId}/attachments/sign`,
    {
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    }
  )
  const headers: HeadersInit = {}
  if (file.type) headers["Content-Type"] = file.type
  const put = await fetch(signed.uploadUrl, { method: "PUT", body: file, headers })
  if (!put.ok) throw new Error("Could not upload the file")
  return api.post<TodoAttachment>(`/api/workspace/todos/${todoId}/attachments`, {
    filePath: signed.filePath,
    fileName: signed.fileName,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  })
}

export const getInvoices = () => api.get<{ invoices: Invoice[] }>("/api/workspace/invoices")

export const getUnbilled = (projectId: string) =>
  api.get<{ entries: TimeEntry[]; hourlyRate: number | null }>(`/api/workspace/projects/${projectId}/unbilled`)

export const createInvoice = (
  projectId: string,
  data?: { timeEntryIds?: string[]; note?: string; taxPercent?: number; dueAt?: string; send?: boolean }
) => api.post<{ invoice: Invoice; lines: InvoiceLine[] }>(`/api/workspace/projects/${projectId}/invoices`, data ?? {})

export const getInvoice = (id: string) =>
  api.get<{
    invoice: Invoice
    lines: InvoiceLine[]
    role: "owner" | "client" | "admin"
    projectName: string
    client: WorkspaceClient
  }>(`/api/workspace/invoices/${id}`)

export const sendInvoice = (id: string) => api.post<Invoice>(`/api/workspace/invoices/${id}/send`, {})
export const markInvoicePaid = (id: string) => api.post<Invoice>(`/api/workspace/invoices/${id}/paid`, {})
export const cancelInvoice = (id: string) => api.post<Invoice>(`/api/workspace/invoices/${id}/cancel`, {})

export async function downloadInvoicePdf(id: string, number: string) {
  const user = auth?.currentUser
  const token = user ? await user.getIdToken() : null
  const res = await fetch(`${getApiBaseUrl()}/api/workspace/invoices/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error("Could not download PDF")
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${number}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
