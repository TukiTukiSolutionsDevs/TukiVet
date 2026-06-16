import { api } from "./api";

export type UserRead = {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  professional_id: string | null;
  status: string;
  role_codes: string[];
};

export type UserCreate = {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  professional_id?: string | null;
  role_codes: string[];
};

export type RoleCode = "owner" | "vet" | "technician" | "receptionist" | "accountant";

export const ROLE_OPTIONS: RoleCode[] = [
  "owner",
  "vet",
  "technician",
  "receptionist",
  "accountant",
];

export const ROLE_LABELS: Record<RoleCode, string> = {
  owner: "Owner",
  vet: "Veterinario",
  technician: "Técnico",
  receptionist: "Recepción",
  accountant: "Contador",
};

export type UserProfileUpdate = {
  full_name?: string | null;
  phone?: string | null;
  professional_id?: string | null;
};

export type UserAdminUpdate = {
  full_name?: string | null;
  phone?: string | null;
  professional_id?: string | null;
  status?: "active" | "disabled" | null;
  role_codes?: string[] | null;
};

export type ForgotPasswordResponse = {
  message: string;
  reset_link: string | null;
};

export const usersApi = {
  list: () => api.get<UserRead[]>("/api/v1/users"),
  get: (id: string) => api.get<UserRead>(`/api/v1/users/${id}`),
  create: (payload: UserCreate) =>
    api.post<UserRead>("/api/v1/users", payload),
  updateMe: (payload: UserProfileUpdate) =>
    api.patch<UserRead>("/api/v1/users/me", payload),
  update: (id: string, payload: UserAdminUpdate) =>
    api.patch<UserRead>(`/api/v1/users/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/api/v1/users/${id}`),
  forgotPassword: (email: string) =>
    api.post<ForgotPasswordResponse>("/api/v1/auth/forgot-password", { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post<void>("/api/v1/auth/reset-password", { token, new_password }),
};

export function isVeterinarian(u: UserRead): boolean {
  return u.role_codes.includes("vet") || u.role_codes.includes("owner");
}

export function roleLabel(r: string): string {
  return ROLE_LABELS[r as RoleCode] ?? r;
}
