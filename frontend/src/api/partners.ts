import { publicGet, postWithToken } from "../lib/api";

export interface PartnerRegistrationPayload {
  username: string;
  companyName?: string;
}

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

export const getPublicHealth = () => publicGet<{ status: string }>("/api/public/health-status");
