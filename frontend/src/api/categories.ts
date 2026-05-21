import { api } from "../lib/api";

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  createdBy: string | null;
}

export const getCategories = () => api.get<Category[]>("/api/categories");
export const getCategory = (id: string) => api.get<Category>(`/api/categories/${id}`);
export const createCategory = (name: string) =>
  api.post<Category>("/api/categories", { name });
export const updateCategory = (id: string, name: string) =>
  api.put<Category>(`/api/categories/${id}`, { name });
export const deleteCategory = (id: string) =>
  api.delete<void>(`/api/categories/${id}`);
