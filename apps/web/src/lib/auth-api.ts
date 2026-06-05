import { api } from "./api";

export type Tokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type Organization = {
  id: string;
  legal_name: string;
  trade_name: string;
  ruc: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type UserMe = {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  professional_id?: string | null;
  status: string;
  role_codes: string[];
  permissions: string[];
  organization?: Organization;
};

export type LoginPayload = { email: string; password: string };

export type RegisterOrgPayload = {
  organization: {
    legal_name: string;
    trade_name: string;
    ruc: string;
    address: string;
    phone: string;
    email: string;
  };
  branch: {
    name: string;
    address: string;
    phone: string;
    timezone: string;
  };
  owner: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    professional_id?: string;
    role_codes?: string[];
  };
};

export type RegisterOrgResponse = {
  tokens: Tokens;
  organization: Organization;
  owner: UserMe;
};

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<Tokens>("/api/v1/auth/login", payload, { skipAuth: true }),
  registerOrg: (payload: RegisterOrgPayload) =>
    api.post<RegisterOrgResponse>("/api/v1/auth/register-org", payload, {
      skipAuth: true,
    }),
  me: () => api.get<UserMe>("/api/v1/auth/me"),
  logout: (refresh_token: string) =>
    api.post<void>("/api/v1/auth/logout", { refresh_token }),
};
