import { api } from "../lib/api";
import type { Category } from "./categories";

export type Role = "superadmin" | "admin" | "member";

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  role: Role;
  categories: Category[];
  createdAt: string;
}

export const getMe = () => api.get<User>("/api/users/me");
export const updateMe = (data: { username?: string; avatarUrl?: string }) =>
  api.put<User>("/api/users/me", data);
export const getUsers = () => api.get<User[]>("/api/users");
export const updateUserRole = (userId: string, role: Role) =>
  api.put<User>(`/api/users/${userId}/role`, { role });
export const updateUserCategories = (userId: string, categoryIds: string[]) =>
  api.put<User>(`/api/users/${userId}/categories`, { categoryIds });
