import { api } from "../lib/api";

export type BusinessType = "service" | "tool_sourcing";
export type Urgency = "low" | "medium" | "high" | "critical";
export type InquiryStatus =
  | "pending"
  | "matching"
  | "offered"
  | "accepted"
  | "in_progress"
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

export interface Inquiry {
  id: string;
  clientId: string;
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
  description: string;
  categoryId: string;
  type: BusinessType;
  urgency: Urgency;
  targetStartDate?: string | null;
  targetEndDate?: string | null;
  estimatedQuantity?: number | null;
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
