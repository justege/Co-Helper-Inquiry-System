import { publicGet, postWithToken } from "../lib/api";
import type { Category } from "./categories";

export interface CategoryService {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  isLive: boolean;
  sortOrder: number;
}

export interface PartnerServiceInput {
  categoryId: string;
  title: string;
  description?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  priceUnit?: string;
  currency?: string;
}

export interface PartnerRegistrationPayload {
  username: string;
  companyName?: string;
  bio?: string;
  locationCity?: string;
  categoryIds: string[];
  services?: PartnerServiceInput[];
}

export const getPublicCategoryServices = (opts?: { categoryId?: string }) => {
  const path = opts?.categoryId
    ? `/api/public/category-services?categoryId=${opts.categoryId}`
    : "/api/public/category-services";
  return publicGet<CategoryService[]>(path);
};

export async function submitPartnerRegistration(
  payload: PartnerRegistrationPayload,
  token: string
) {
  return postWithToken<{ success: boolean }>(
    "/api/public/partner-registration",
    payload,
    token
  );
}

export type { Category };
