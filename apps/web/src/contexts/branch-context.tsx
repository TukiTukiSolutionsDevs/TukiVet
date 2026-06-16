"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { branchesApi, type BranchRead } from "@/lib/branches-api";
import { useAuth } from "./auth-context";

const STORAGE_KEY = "razas:active-branch-id";

type BranchContextValue = {
  branches: BranchRead[];
  activeBranch: BranchRead | null;
  setActiveBranch: (id: string) => void;
  isLoading: boolean;
  refresh: () => void;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const isAuthed = auth.status === "authenticated";
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list(),
    enabled: isAuthed,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveId(stored);
  }, []);

  useEffect(() => {
    if (!q.data || q.data.length === 0) return;
    const stillExists = activeId && q.data.some((b) => b.id === activeId);
    if (!stillExists) {
      const main = q.data.find((b) => b.is_main) ?? q.data[0];
      setActiveId(main.id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, main.id);
      }
    }
  }, [q.data, activeId]);

  const setActiveBranch = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["branches"] });
  }, [qc]);

  const value = useMemo<BranchContextValue>(() => {
    const branches = q.data ?? [];
    const activeBranch = branches.find((b) => b.id === activeId) ?? null;
    return {
      branches,
      activeBranch,
      setActiveBranch,
      isLoading: q.isLoading,
      refresh,
    };
  }, [q.data, q.isLoading, activeId, setActiveBranch, refresh]);

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranches() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranches must be used inside BranchProvider");
  return ctx;
}
