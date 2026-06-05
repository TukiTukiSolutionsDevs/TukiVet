"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_4px_12px_rgba(45,179,154,0.4)] text-lg">
          🐾
        </div>
        <div className="leading-tight">
          <div className="text-lg font-extrabold text-white tracking-tight">
            TukiVet
          </div>
          <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            {user?.organization?.trade_name ?? "Veterinaria"}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-2.5">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative my-px flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-bold text-white"
                  : "font-medium text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              {active && (
                <span className="absolute -left-2.5 top-2 bottom-2 w-[3px] rounded-full bg-sidebar-primary" />
              )}
              <Icon
                className={cn(
                  "size-[19px]",
                  active ? "text-sidebar-primary" : "text-sidebar-foreground/55",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 pt-3 pb-4">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <div className="flex size-[34px] items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            {user ? initials(user.full_name) : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold text-white">
              {user?.full_name ?? "—"}
            </div>
            <div className="text-[11px] text-sidebar-foreground/60">
              {user?.role_codes?.[0] ?? "Sin rol"}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
            className="flex items-center justify-center rounded p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
