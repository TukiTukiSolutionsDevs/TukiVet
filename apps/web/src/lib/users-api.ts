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

export const usersApi = {
  list: () => api.get<UserRead[]>("/api/v1/users"),
  get: (id: string) => api.get<UserRead>(`/api/v1/users/${id}`),
  create: (payload: UserCreate) =>
    api.post<UserRead>("/api/v1/users", payload),
};

export function isVeterinarian(u: UserRead): boolean {
  return u.role_codes.includes("vet") || u.role_codes.includes("owner");
}

export function roleLabel(r: string): string {
  return ROLE_LABELS[r as RoleCode] ?? r;
}
