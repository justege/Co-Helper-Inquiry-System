import { api } from "../lib/api";

export interface PriceAgreement {
  id: string;
  inquiryId: string;
  proposedBy: string;
  billingType: "hourly" | "project";
  hourlyRate: number | null;
  estimatedHours: number | null;
  projectPrice: number | null;
  currency: string;
  status: "proposed" | "agreed" | "declined" | "superseded";
  notes: string | null;
  agreedAt: string | null;
  createdAt: string;
}

export interface InquiryTodo {
  id: string;
  inquiryId: string;
  title: string;
  body: string | null;
  status: "open" | "done";
  assigneeId: string | null;
  dueDate: string | null;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  hoursLogged: number;
}

export interface TimeEntry {
  id: string;
  inquiryId: string;
  todoId: string | null;
  todoTitle: string | null;
  userId: string;
  hours: number;
  note: string | null;
  billable: boolean;
  entryDate: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  inquiryId: string;
  recordedBy: string;
  amount: number;
  currency: string;
  status: "unpaid" | "partial" | "paid";
  note: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface JobFinance {
  billingType: "hourly" | "project" | null;
  currency: string;
  billableHours: number;
  totalHours: number;
  agreedValue: number;
  paid: number;
  outstanding: number;
  remaining: number;
}

export const listAgreements = (inquiryId: string) =>
  api.get<PriceAgreement[]>(`/api/inquiries/${inquiryId}/agreements`);

export const proposeAgreement = (
  inquiryId: string,
  body: {
    billingType: "hourly" | "project";
    hourlyRate?: number;
    estimatedHours?: number;
    projectPrice?: number;
    currency?: string;
    notes?: string;
  }
) => api.post<PriceAgreement>(`/api/inquiries/${inquiryId}/agreements`, body);

export const agreeAgreement = (inquiryId: string, agreementId: string) =>
  api.post<PriceAgreement>(`/api/inquiries/${inquiryId}/agreements/${agreementId}/agree`, {});

export const declineAgreement = (inquiryId: string, agreementId: string) =>
  api.post<PriceAgreement>(`/api/inquiries/${inquiryId}/agreements/${agreementId}/decline`, {});

export const listTodos = (inquiryId: string) =>
  api.get<InquiryTodo[]>(`/api/inquiries/${inquiryId}/todos`);

export const createTodo = (inquiryId: string, body: { title: string; body?: string; dueDate?: string }) =>
  api.post<InquiryTodo>(`/api/inquiries/${inquiryId}/todos`, body);

export const updateTodo = (
  inquiryId: string,
  todoId: string,
  body: { title?: string; body?: string; status?: "open" | "done" }
) => api.patch<InquiryTodo>(`/api/inquiries/${inquiryId}/todos/${todoId}`, body);

export const deleteTodo = (inquiryId: string, todoId: string) =>
  api.delete<void>(`/api/inquiries/${inquiryId}/todos/${todoId}`);

export const listTimeEntries = (inquiryId: string) =>
  api.get<TimeEntry[]>(`/api/inquiries/${inquiryId}/time-entries`);

export const logTime = (
  inquiryId: string,
  body: { hours: number; note?: string; billable?: boolean; entryDate?: string; todoId?: string }
) => api.post<TimeEntry>(`/api/inquiries/${inquiryId}/time-entries`, body);

export const deleteTimeEntry = (inquiryId: string, entryId: string) =>
  api.delete<void>(`/api/inquiries/${inquiryId}/time-entries/${entryId}`);

export const listPayments = (inquiryId: string) =>
  api.get<Payment[]>(`/api/inquiries/${inquiryId}/payments`);

export const recordPayment = (
  inquiryId: string,
  body: { amount: number; status?: "unpaid" | "partial" | "paid"; note?: string; currency?: string }
) => api.post<Payment>(`/api/inquiries/${inquiryId}/payments`, body);

export const updatePayment = (
  inquiryId: string,
  paymentId: string,
  body: { status?: "unpaid" | "partial" | "paid"; amount?: number; note?: string }
) => api.patch<Payment>(`/api/inquiries/${inquiryId}/payments/${paymentId}`, body);

export const getJobFinance = (inquiryId: string) =>
  api.get<JobFinance>(`/api/inquiries/${inquiryId}/finance`);
