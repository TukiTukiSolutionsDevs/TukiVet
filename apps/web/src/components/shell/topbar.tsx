"use client";

import { Bell, Building2, ChevronDown, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme === "dark";

  return (
    <header className="relative z-30 flex h-16 flex-shrink-0 items-center gap-4 border-b border-border bg-card px-6">
      {/* Global search (placeholder; ⌘K wiring vendrá en F-search sprint) */}
      <button
        type="button"
        className="flex h-10 w-[380px] max-w-[36vw] cursor-text items-center gap-2.5 rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary"
      >
        <Search className="size-[18px]" />
        <span className="flex-1 text-left">
          Buscar cliente, mascota, chip, teléfono…
        </span>
        <kbd className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* Caja status — wiring real en POS sprint */}
      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-semibold text-success transition-colors hover:bg-muted"
      >
        <span className="size-1.5 rounded-full bg-success" />
        Caja abierta
      </button>

      {/* Sede */}
      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <Building2 className="size-4" />
        Sede principal
        <ChevronDown className="size-3.5" />
      </button>

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
