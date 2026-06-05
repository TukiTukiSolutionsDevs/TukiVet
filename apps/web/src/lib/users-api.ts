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

export const usersApi = {
  list: () => api.get<UserRead[]>("/api/v1/users"),
};

export function isVeterinarian(u: UserRead): boolean {
  return u.role_codes.includes("vet") || u.role_codes.includes("owner");
}
