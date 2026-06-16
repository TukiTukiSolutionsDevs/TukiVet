import { API_URL } from "./env";
import { ApiError } from "./api";

const ACCESS_KEY = "tukivet.portal.access";
const REFRESH_KEY = "tukivet.portal.refresh";

export const portalTokenStore = {
  getAccess: () =>
    typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY),
  getRefresh: () =>
    typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY),
  set: (a: string, r: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_KEY, a);
    localStorage.setItem(REFRESH_KEY, r);
  },
  clear: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export type PortalTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const refresh = portalTokenStore.getRefresh();
  if (!refresh) return false;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/portal/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) {
        portalTokenStore.clear();
        return false;
      }
      const data = (await res.json()) as PortalTokens;
      portalTokenStore.set(data.access_token, data.refresh_token);
      return true;
    } catch {
      portalTokenStore.clear();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

async function rawFetch(path: string, opts: FetchOptions): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (!opts.skipAuth) {
    const access = portalTokenStore.getAccess();
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }
  let body: BodyInit | undefined;
  if (opts.body !== undefined && opts.body !== null) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  }
  return fetch(`${API_URL}${path}`, { ...opts, headers, body });
}

async function portalFetch<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  let res = await rawFetch(path, opts);
  if (res.status === 401 && !opts.skipAuth && portalTokenStore.getRefresh()) {
    const refreshed = await refreshTokens();
    if (refreshed) res = await rawFetch(path, opts);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const detail =
      parsed && typeof parsed === "object" && "detail" in parsed
        ? (parsed as { detail: unknown }).detail
        : parsed;
    const message =
      typeof detail === "string" ? detail : `Error ${res.status} en ${path}`;
    throw new ApiError(res.status, detail, message);
  }
  return parsed as T;
}

export type DocType = "DNI" | "RUC" | "CE" | "PASSPORT";
export type ARCOType =
  | "access"
  | "rectification"
  | "cancellation"
  | "opposition";

export const ARCO_LABELS: Record<ARCOType, string> = {
  access: "Acceso a mis datos",
  rectification: "Rectificación",
  cancellation: "Cancelación / eliminación",
  opposition: "Oposición al tratamiento",
};

export type MagicLinkRequest = {
  document_type: DocType;
  document_number: string;
  channel?: "whatsapp" | "email";
};

export type MagicLinkResponse = {
  sent: string;
  dev_token?: string;
};

export type CustomerSelfRead = {
  id: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  business_name: string | null;
  email: string | null;
  phone_primary: string;
  whatsapp_opted_in: boolean;
  email_opted_in: boolean;
};

export type PreferencesUpdate = {
  whatsapp_opted_in?: boolean;
  email_opted_in?: boolean;
};

export type PetSelfRead = {
  id: string;
  name: string;
  species: string;
  sex: string;
  birth_date: string | null;
  microchip: string | null;
  status: string;
};

export type HistoryEncounter = {
  id: string;
  type: string;
  started_at: string;
  status: string;
  chief_complaint: string | null;
};

export type HistoryVaccine = {
  id: string;
  name: string;
  administered_at: string;
  next_dose_due_date: string | null;
};

export type PetHistoryRead = {
  encounters: HistoryEncounter[];
  vaccines: HistoryVaccine[];
};

export type PendingOrder = {
  id: string;
  total: string;
  paid_amount: string;
  balance: string;
  issued_at: string;
  status: string;
};

export type ARCORead = {
  id: string;
  organization_id: string;
  customer_id: string;
  type: string;
  description: string | null;
  status: string;
  requested_at: string;
  responded_at: string | null;
};

export type DataExportResponse = Record<string, unknown>;

export const portalApi = {
  requestMagic: (payload: MagicLinkRequest) =>
    portalFetch<MagicLinkResponse>("/api/v1/portal/auth/magic-link", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),
  consume: (token: string) =>
    portalFetch<PortalTokens>("/api/v1/portal/auth/consume", {
      method: "POST",
      body: { token },
      skipAuth: true,
    }),
  me: () => portalFetch<CustomerSelfRead>("/api/v1/portal/me"),
  myPets: () => portalFetch<PetSelfRead[]>("/api/v1/portal/pets"),
  petHistory: (petId: string) =>
    portalFetch<PetHistoryRead>(`/api/v1/portal/pets/${petId}/history`),
  pendingOrders: () =>
    portalFetch<PendingOrder[]>("/api/v1/portal/orders/pending"),
  exportData: () =>
    portalFetch<DataExportResponse>("/api/v1/portal/data-export"),
  submitArco: (type: ARCOType, description?: string | null) =>
    portalFetch<ARCORead>("/api/v1/portal/data-requests", {
      method: "POST",
      body: { type, description: description ?? null },
    }),
  updatePreferences: (payload: PreferencesUpdate) =>
    portalFetch<CustomerSelfRead>("/api/v1/portal/me/preferences", {
      method: "PATCH",
      body: payload,
    }),
};
