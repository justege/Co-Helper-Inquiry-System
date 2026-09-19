import { api } from "../lib/api";

export type Role = "superadmin" | "admin" | "client" | "expert";

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone?: string | null;
  contactPref?: string;
  role: Role;
  createdAt: string;
}

export const getMe = () => api.get<User>("/api/users/me");
export const updateMe = (data: {
  username?: string
  avatarUrl?: string
  firstName?: string
  lastName?: string
  companyName?: string
  phone?: string | null
  contactPref?: string
}) => api.put<User>("/api/users/me", data)
export const getUsers = () => api.get<User[]>("/api/users");
export const updateUserRole = (userId: string, role: Role) =>
  api.put<User>(`/api/users/${userId}/role`, { role });
