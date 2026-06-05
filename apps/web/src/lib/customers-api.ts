import { api } from "./api";
import type { Page } from "./pagination";
import type { PetRead } from "./pets-api";

export type DocumentType = "DNI" | "RUC" | "CE" | "PASSPORT";

export const DOCUMENT_TYPES: DocumentType[] = [
  "DNI",
  "RUC",
  "CE",
  "PASSPORT",
];

export type CustomerRead = {
  id: string;
  organization_id: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  business_name: string | null;
  email: string | null;
  phone_primary: string;
  phone_secondary: string | null;
  whatsapp_opted_in: boolean;
  email_opted_in: boolean;
  address: string | null;
  district: string | null;
  city: string;
  birth_date: string | null;
  notes: string | null;
};

export type CustomerCreate = {
  document_type: DocumentType;
  document_number: string;
  first_name: string;
  last_name: string;
  business_name?: string | null;
  email?: string | null;
  phone_primary: string;
  phone_secondary?: string | null;
  whatsapp_opted_in?: boolean;
  email_opted_in?: boolean;
  address?: string | null;
  district?: string | null;
  city?: string;
  birth_date?: string | null;
  referral_source?: string | null;
  notes?: string | null;
};

export type DocumentValidationResponse = {
  document_type: DocumentType;
  document_number: string;
  valid: boolean;
  detected_type: string | null;
};

export type CustomerListParams = {
  q?: string;
  document_number?: string;
  page?: number;
  page_size?: number;
};

function qs(params: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export const customersApi = {
  list: (params: CustomerListParams = {}) =>
    api.get<Page<CustomerRead>>(`/api/v1/customers${qs(params)}`),
  get: (id: string) => api.get<CustomerRead>(`/api/v1/customers/${id}`),
  create: (payload: CustomerCreate) =>
    api.post<CustomerRead>("/api/v1/customers", payload),
  validateDoc: (document_type: DocumentType, document_number: string) =>
    api.post<DocumentValidationResponse>("/api/v1/customers/validate-doc", {
      document_type,
      document_number,
    }),
  listPets: (customerId: string) =>
    api.get<PetRead[]>(`/api/v1/customers/${customerId}/pets`),
};

export function customerFullName(c: Pick<CustomerRead, "first_name" | "last_name" | "business_name">): string {
  if (c.business_name) return c.business_name;
  return `${c.first_name} ${c.last_name}`.trim();
}
