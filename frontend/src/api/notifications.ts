import { api } from "../lib/api"

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string | null
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export const getNotifications = () =>
  api.get<{ notifications: AppNotification[]; unread: number }>("/api/notifications")

export const markNotificationRead = (id: string) =>
  api.post<{ success: boolean }>(`/api/notifications/${id}/read`, {})

export const markAllNotificationsRead = () =>
  api.post<{ success: boolean }>("/api/notifications/read-all", {})
