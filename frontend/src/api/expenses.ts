import { api } from "../lib/api"
import type { Invoice, InvoiceLine } from "./work"

export type ExpenseVendorKind = "split" | "columns"

export interface ExpenseProject {
  id: string
  name: string
  clientId: string
  clientName: string | null
}

export interface ExpenseAllocation {
  id: string
  expenseId: string
  projectId: string
  amount: number
  invoiceId: string | null
  invoiceNumber: string | null
  invoiceStatus: "draft" | "sent" | "paid" | "cancelled" | null
}

export interface Expense {
  id: string
  vendorId: string
  incurredAt: string
  amount: number
  currency: string
  reference: string | null
  note: string | null
  createdAt: string
  allocations: ExpenseAllocation[]
}

export interface ExpenseVendorSplit {
  projectId: string
  percent: number | null
  sortOrder: number
  projectName: string
  clientName: string | null
}

export interface ExpenseVendor {
  id: string
  name: string
  note: string | null
  kind: ExpenseVendorKind
  sortOrder: number
  createdAt: string
  splits: ExpenseVendorSplit[]
  expenses: Expense[]
}

export interface ExpensesBoard {
  role: "owner"
  currency: string
  projects: ExpenseProject[]
  vendors: ExpenseVendor[]
}

export const getExpenses = () => api.get<ExpensesBoard>("/api/workspace/expenses")

export const createExpenseVendor = (data: {
  name: string
  note?: string
  kind: ExpenseVendorKind
  splits: { projectId: string; percent?: number | null }[]
}) => api.post<ExpenseVendor>("/api/workspace/expense-vendors", data)

export const updateExpenseVendor = (
  id: string,
  data: Partial<{
    name: string
    note: string | null
    kind: ExpenseVendorKind
    splits: { projectId: string; percent?: number | null }[]
  }>
) => api.patch<ExpenseVendor>(`/api/workspace/expense-vendors/${id}`, data)

export const deleteExpenseVendor = (id: string) =>
  api.delete<void>(`/api/workspace/expense-vendors/${id}`)

export const createExpense = (
  vendorId: string,
  data: {
    incurredAt: string
    amount?: number
    reference?: string
    note?: string
    allocations?: { projectId: string; amount: number }[]
  }
) => api.post<Expense>(`/api/workspace/expense-vendors/${vendorId}/expenses`, data)

export const updateExpense = (
  id: string,
  data: Partial<{
    incurredAt: string
    amount: number
    reference: string | null
    note: string | null
    allocations: { projectId: string; amount: number }[]
  }>
) => api.patch<Expense>(`/api/workspace/expenses/${id}`, data)

export const deleteExpense = (id: string) => api.delete<void>(`/api/workspace/expenses/${id}`)

export const createExpenseInvoice = (
  projectId: string,
  data?: { allocationIds?: string[]; note?: string; taxPercent?: number; dueAt?: string }
) =>
  api.post<{ invoice: Invoice; lines: InvoiceLine[] }>(
    `/api/workspace/projects/${projectId}/expense-invoices`,
    data ?? {}
  )
