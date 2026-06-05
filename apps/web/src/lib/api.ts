import { API_URL } from "./env";
import { tokenStore } from "./storage";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const refresh = tokenStore.getRefresh();
  if (!refresh) return false;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) {
        tokenStore.clear();
        return false;
      }
      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
      };
      tokenStore.set(data.access_token, data.refresh_token);
      return true;
    } catch {
      tokenStore.clear();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function rawFetch(path: string, opts: FetchOptions): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (!opts.skipAuth) {
    const access = tokenStore.getAccess();
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }
  let body: BodyInit | undefined;
  if (opts.body !== undefined && opts.body !== null) {
    if (opts.body instanceof FormData) {
      body = opts.body;
    } else {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(opts.body);
    }
  }
  return fetch(`${API_URL}${path}`, { ...opts, headers, body });
}

export async function apiFetch<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  let res = await rawFetch(path, opts);

  if (res.status === 401 && !opts.skipAuth && tokenStore.getRefresh()) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await rawFetch(path, opts);
    }
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
      typeof detail === "string"
        ? detail
        : `Error ${res.status} en ${path}`;
    throw new ApiError(res.status, detail, message);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, opts: FetchOptions = {}) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts: FetchOptions = {}) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts: FetchOptions = {}) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts: FetchOptions = {}) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts: FetchOptions = {}) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};
