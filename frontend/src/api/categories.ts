import { api } from "../lib/api";
import type { BusinessType } from "./inquiries";

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  description: string | null;
  createdAt: string;
  createdBy: string | null;
}

export const getCategories = (opts?: { type?: BusinessType }) => {
  const path = opts?.type
    ? `/api/categories?type=${opts.type}`
    : "/api/categories";
  return api.get<Category[]>(path);
};
export const getCategory = (id: string) => api.get<Category>(`/api/categories/${id}`);
export const createCategory = (payload: {
  name: string;
  type: BusinessType;
  description?: string;
}) => api.post<Category>("/api/categories", payload);

export const updateCategory = (
  id: string,
  payload: { name?: string; type?: BusinessType; description?: string }
) => api.put<Category>(`/api/categories/${id}`, payload);
export const deleteCategory = (id: string) =>
  api.delete<void>(`/api/categories/${id}`);
