import { api, publicGet } from "../lib/api"

export const submitContact = (data: {
  name: string
  email: string
  company?: string
  subject?: string
  message: string
}) => api.post<{ success: boolean }>("/api/public/contact", data)

export const getPublicStatus = () =>
  publicGet<{ status: string; checks: Record<string, string> }>("/api/public/health-status")
