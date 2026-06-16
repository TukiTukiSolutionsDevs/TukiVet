"use client";

import { Bell, Building2, Check, ChevronDown, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranches } from "@/contexts/branch-context";
import { cn } from "@/lib/utils";

export function Topbar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setMounted(true), []);
  const isDark = theme === "dark";

  // ⌘K / Ctrl+K → focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submitSearch() {
    const term = q.trim();
    const url = term ? `/pacientes?q=${encodeURIComponent(term)}` : "/pacientes";
    router.push(url);
  }

  return (
    <header className="relative z-30 flex h-16 flex-shrink-0 items-center gap-4 border-b border-border bg-card px-6">
      {/* Global search → navega a /pacientes con el query */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        className="flex h-10 w-[380px] max-w-[36vw] items-center gap-2.5 rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring/40 hover:bg-secondary"
      >
        <Search className="size-[18px] shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente, mascota, chip, teléfono…"
          className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded-sm border border-border bg-card px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </form>

      <div className="flex-1" />

      {/* Caja status — wiring real en POS sprint */}
      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-semibold text-success transition-colors hover:bg-muted"
      >
        <span className="size-1.5 rounded-full bg-success" />
        Caja abierta
      </button>

      {/* Sede switcher */}
      <BranchSwitcher />

      {/* Theme toggle */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        title="Cambiar tema"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="size-9"
      >
        {mounted ? (
          isDark ? (
            <Sun className="size-[18px]" />
          ) : (
            <Moon className="size-[18px]" />
          )
        ) : (
          <Moon className="size-[18px] opacity-0" />
        )}
      </Button>

      {/* Notifications (placeholder) */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        title="Notificaciones"
        className="relative size-9"
      >
        <Bell className="size-[18px]" />
        <span
          className={cn(
            "absolute right-2 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-card",
          )}
        />
      </Button>
    </header>
  );
}

function BranchSwitcher() {
  const { branches, activeBranch, setActiveBranch } = useBranches();
  const label = activeBranch?.name ?? "Sede";
  const hasOptions = branches.length > 1;

  if (!hasOptions) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-semibold text-foreground">
        <Building2 className="size-4" />
        {label}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Building2 className="size-4" />
            {label}
            <ChevronDown className="size-3.5" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-48">
        {branches.map((b) => (
          <DropdownMenuItem
            key={b.id}
            onClick={() => setActiveBranch(b.id)}
            className="gap-2"
          >
            <Check
              className={cn(
                "size-4",
                b.id === activeBranch?.id ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="flex-1">{b.name}</span>
            {b.is_main && (
              <span className="text-[10px] uppercase text-muted-foreground">
                principal
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
