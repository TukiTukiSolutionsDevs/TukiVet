import { api } from "./api";

export type OrganizationRead = {
  id: string;
  legal_name: string;
  trade_name: string;
  ruc: string;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export type OrganizationUpdate = {
  legal_name?: string | null;
  trade_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

export const organizationsApi = {
  getMe: () => api.get<OrganizationRead>("/api/v1/organizations/me"),
  updateMe: (payload: OrganizationUpdate) =>
    api.patch<OrganizationRead>("/api/v1/organizations/me", payload),
};
