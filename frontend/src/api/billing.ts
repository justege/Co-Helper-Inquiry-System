import { api } from "../lib/api"

export interface BillingState {
  plan: "intro" | "standard"
  status: string
  currentPeriodEnd: string | null
  stripeConfigured: boolean
  introUntil: string
}

export const getBilling = () => api.get<BillingState>("/api/billing/me")
export const startCheckout = () => api.post<{ url: string }>("/api/billing/checkout", {})
export const openBillingPortal = () => api.post<{ url: string }>("/api/billing/portal", {})
