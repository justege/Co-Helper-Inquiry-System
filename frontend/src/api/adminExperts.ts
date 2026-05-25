import { api } from "../lib/api";
import type { Category } from "./categories";
import type { ExpertProfile } from "./expertProfile";

export interface PartnerService {
  id: string;
  partnerId: string;
  title: string;
  description: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  priceUnit: string;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerDocument {
  id: string;
  partnerId: string;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  docType: string;
  isPublic: boolean;
  createdAt: string;
}

export interface AdminExpertDetail {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone: string | null;
  contactPref: string;
  role: string;
  createdAt: string;
  profile: ExpertProfile | null;
  categories: Category[];
  services: PartnerService[];
  documents: PartnerDocument[];
}

export const getAdminExpert = (id: string) =>
  api.get<AdminExpertDetail>(`/api/admin/experts/${id}`);

export const updateExpertScore = (id: string, score: number, scoreNotes?: string) =>
  api.put(`/api/admin/experts/${id}/score`, { score, scoreNotes });

export const getPartnerDocumentUrl = (partnerId: string, docId: string) =>
  api.get<{ url: string; fileName: string }>(`/api/partner-services/${partnerId}/documents/${docId}/url`);
