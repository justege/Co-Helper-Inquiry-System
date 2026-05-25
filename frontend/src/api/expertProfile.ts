import { api } from "../lib/api";

export interface ExpertProfile {
  bio: string | null;
  locationCity: string;
  capacityNotes: string | null;
  isAvailable: boolean;
  score: number | null;
  scoreNotes: string | null;
  updatedAt: string | null;
}

export type ExpertProfileUpdate = {
  bio?: string;
  locationCity?: string;
  capacityNotes?: string;
  isAvailable?: boolean;
};

export const getMyExpertProfile = () =>
  api.get<ExpertProfile>("/api/expert-profile/me");

export const updateMyExpertProfile = (data: ExpertProfileUpdate) =>
  api.put<ExpertProfile>("/api/expert-profile/me", data);
