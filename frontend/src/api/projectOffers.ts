import { api } from "../lib/api";

export const acceptOffer = (id: string) =>
  api.post<{ success: boolean }>(`/api/project-offers/${id}/accept`, {});
export const declineOffer = (id: string) =>
  api.post<{ success: boolean }>(`/api/project-offers/${id}/decline`, {});
export const escalateOffer = (id: string, reason?: string) =>
  api.post<{ success: boolean }>(`/api/project-offers/${id}/escalate`, { reason });
