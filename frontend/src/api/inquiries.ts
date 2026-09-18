import { api, postWithToken } from "../lib/api";

export type BusinessType = "service" | "tool_sourcing";
export type Urgency = "low" | "medium" | "high" | "critical";
export type InquiryStatus =
  | "pending"
  | "matching"
  | "offered"
  | "accepted"
  | "in_progress"
  | "waiting"
  | "delivered"
  | "escalated"
  | "cancelled";

export interface OfferExpert {
  id: string;
  proposedPrice: number;
  leadTimeDays: number | null;
  notes: string | null;
  expert: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
  } | null;
}

export interface ProjectOfferSummary {
  id: string;
  totalClientPrice: number;
  validUntil: string | null;
  status: "draft" | "sent" | "accepted" | "declined";
  notes: string | null;
  leadTimeDays: number | null;
  createdAt: string;
  itemCount: number;
  experts?: OfferExpert[];
}

export interface InquiryClientBrief {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
}

export interface Inquiry {
  id: string;
  clientId: string;
  client?: InquiryClientBrief;
  workspaceId: string | null;
  projectId: string | null;
  trelloCardId?: string | null;
  project?: { id: string; name: string };
  categoryId: string;
  category?: { id: string; name: string; type: BusinessType };
  title: string;
  description: string;
  type: BusinessType;
  urgency: Urgency;
  targetStartDate: string | null;
  targetEndDate: string | null;
  estimatedQuantity: number | null;
  status: InquiryStatus;
  projectOffers?: ProjectOfferSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInquiryInput {
  title: string;
  description?: string;
  categoryId?: string;
  type?: BusinessType;
  urgency?: Urgency;
  targetStartDate?: string | null;
  targetEndDate?: string | null;
  estimatedQuantity?: number | null;
  /** Freelancers opening a job on behalf of one of their workspace clients. */
  clientId?: string;
  /** Clients opening a job inside a specific freelancer's workspace. */
  workspaceId?: string;
  /** Title-only create from the shared board. */
  quickAdd?: boolean;
}

export interface InquiryDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  uploadedBy: { firstName: string; lastName: string } | null;
}

export const getMyInquiries = () => api.get<Inquiry[]>("/api/inquiries/mine");
export const getInquiry = (id: string) => api.get<Inquiry>(`/api/inquiries/${id}`);
export const createInquiry = (data: CreateInquiryInput) =>
  api.post<Inquiry>("/api/inquiries", data);
export const updateInquiry = (id: string, data: { title?: string; description?: string }) =>
  api.patch<Inquiry>(`/api/inquiries/${id}`, data);
export const updateInquiryStatus = (id: string, status: InquiryStatus) =>
  api.patch<Inquiry>(`/api/inquiries/${id}/status`, { status });

export interface LandingInquirySubmissionInput extends CreateInquiryInput {
  username: string;
  email: string;
  password: string;
}

export const submitLandingInquiry = (
  data: Omit<LandingInquirySubmissionInput, "email" | "password">,
  token: string
) =>
  postWithToken<{ inquiry: Inquiry }>(
    "/api/public/inquiry-submission",
    data,
    token
  );

// ── Documents ──────────────────────────────────────────────────────────────────

export const listDocuments = (inquiryId: string) =>
  api.get<InquiryDocument[]>(`/api/inquiries/${inquiryId}/documents`);

export const initUpload = (
  inquiryId: string,
  body: { fileName: string; fileSize?: number; mimeType?: string }
) =>
  api.post<{ documentId: string; uploadUrl: string; filePath: string }>(
    `/api/inquiries/${inquiryId}/documents/init-upload`,
    body
  );

export const confirmUpload = (inquiryId: string, documentId: string) =>
  api.post<{ success: boolean }>(
    `/api/inquiries/${inquiryId}/documents/${documentId}/confirm`,
    {}
  );

export const getDownloadUrl = (inquiryId: string, documentId: string) =>
  api.get<{ url: string; fileName: string }>(
    `/api/inquiries/${inquiryId}/documents/${documentId}/url`
  );

export const deleteDocument = (inquiryId: string, documentId: string) =>
  api.delete<void>(`/api/inquiries/${inquiryId}/documents/${documentId}`);

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface InquiryMessageAuthor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string;
}

export interface InquiryMessage {
  id: string;
  body: string;
  originalBody: string | null;
  createdAt: string;
  authorId: string;
  author: InquiryMessageAuthor | null;
}

export const listMessages = (inquiryId: string) =>
  api.get<InquiryMessage[]>(`/api/inquiries/${inquiryId}/messages`);

export const sendMessage = (inquiryId: string, body: string) =>
  api.post<InquiryMessage>(`/api/inquiries/${inquiryId}/messages`, { body });

// ── Activity log ──────────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  actorId: string | null;
  actor: InquiryMessageAuthor | null;
}

export const listActivity = (inquiryId: string) =>
  api.get<ActivityEvent[]>(`/api/inquiries/${inquiryId}/activity`);
