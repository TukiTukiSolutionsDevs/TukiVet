"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  authApi,
  type LoginPayload,
  type RegisterOrgPayload,
  type UserMe,
} from "@/lib/auth-api";
import { tokenStore } from "@/lib/storage";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "unauthenticated"; user: null }
  | { status: "authenticated"; user: UserMe };

type AuthContextValue = AuthState & {
  login: (payload: LoginPayload) => Promise<void>;
  registerOrg: (payload: RegisterOrgPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  const refreshUser = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setState({ status: "unauthenticated", user: null });
      return;
    }
    try {
      const user = await authApi.me();
      setState({ status: "authenticated", user });
    } catch {
      tokenStore.clear();
      setState({ status: "unauthenticated", user: null });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const tokens = await authApi.login(payload);
      tokenStore.set(tokens.access_token, tokens.refresh_token);
      const user = await authApi.me();
      setState({ status: "authenticated", user });
      router.replace("/dashboard");
    },
    [router],
  );

  const registerOrg = useCallback(
    async (payload: RegisterOrgPayload) => {
      const res = await authApi.registerOrg(payload);
      tokenStore.set(res.tokens.access_token, res.tokens.refresh_token);
      const user = await authApi.me();
      setState({ status: "authenticated", user });
      router.replace("/dashboard");
    },
    [router],
  );

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        /* ignore — local cleanup is what matters */
      }
    }
    tokenStore.clear();
    setState({ status: "unauthenticated", user: null });
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ ...state, login, registerOrg, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
