import { api } from "./api";

export type BranchRead = {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_main: boolean;
  timezone: string;
};

export type BranchCreate = {
  name: string;
  address?: string | null;
  phone?: string | null;
  timezone?: string;
};

export type BranchUpdate = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  timezone?: string | null;
};

export const branchesApi = {
  list: () => api.get<BranchRead[]>("/api/v1/branches"),
  get: (id: string) => api.get<BranchRead>(`/api/v1/branches/${id}`),
  create: (payload: BranchCreate) =>
    api.post<BranchRead>("/api/v1/branches", payload),
  update: (id: string, payload: BranchUpdate) =>
    api.patch<BranchRead>(`/api/v1/branches/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/api/v1/branches/${id}`),
};

export const COMMON_TIMEZONES = [
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/Santiago",
  "America/Buenos_Aires",
];
