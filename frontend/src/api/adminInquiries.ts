import { api } from "../lib/api";
import type { ProjectOfferSummary } from "./inquiries";

export type AdminOfferPayload = {
  expertId: string;
  proposedPrice: number;
  clientPrice: number;
  leadTimeDays?: number | null;
  notes?: string | null;
  validUntil?: string | null;
  send?: boolean;
};

export const createAdminOffer = (inquiryId: string, data: AdminOfferPayload) =>
  api.post<ProjectOfferSummary>(`/api/admin/inquiries/${inquiryId}/offer`, data);

export const updateAdminOffer = (
  inquiryId: string,
  offerId: string,
  data: Partial<AdminOfferPayload>
) => api.put<ProjectOfferSummary>(`/api/admin/inquiries/${inquiryId}/offers/${offerId}`, data);

export const sendAdminOffer = (inquiryId: string, offerId: string) =>
  api.post<{ success: boolean }>(`/api/admin/inquiries/${inquiryId}/offers/${offerId}/send`, {});
