"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Heart, LogOut, PawPrint, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portalTokenStore } from "@/lib/portal-api";

const PUBLIC_PATHS = ["/portal/login"];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (!isPublic && !portalTokenStore.getAccess()) {
      router.replace("/portal/login");
    }
  }, [isPublic, pathname, router]);

  const logout = () => {
    portalTokenStore.clear();
    router.replace("/portal/login");
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/portal"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Heart className="size-5 text-primary" />
            Portal Razas
          </Link>
          {!isPublic && (
            <nav className="flex items-center gap-1">
              <Link
                href="/portal"
                className={navClass(pathname === "/portal")}
              >
                <PawPrint className="size-4" />
                <span className="hidden sm:inline">Mascotas</span>
              </Link>
              <Link
                href="/portal/account"
                className={navClass(pathname?.startsWith("/portal/account"))}
              >
                <ShieldCheck className="size-4" />
                <span className="hidden sm:inline">Mi cuenta</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                aria-label="Salir"
              >
                <LogOut className="size-4" />
              </Button>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}

function navClass(active: boolean | undefined): string {
  return (
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
    (active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted")
  );
}
