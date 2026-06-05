"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { buttonVariants } from "@/components/ui/button";

export function PublicHeader() {
  const { status } = useAuth();
  const isAuthed = status === "authenticated";

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(45,179,154,0.4)] text-lg">
            🐾
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            TukiVet
          </span>
        </Link>

        <nav className="ml-4 hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link href="#servicios" className="hover:text-foreground">
            Servicios
          </Link>
          <Link href="#equipo" className="hover:text-foreground">
            Equipo
          </Link>
          <Link href="#ubicacion" className="hover:text-foreground">
            Ubicación
          </Link>
          <Link href="#testimonios" className="hover:text-foreground">
            Testimonios
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAuthed ? (
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Ir a la app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ size: "sm" })}
              >
                Registra tu veterinaria
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
