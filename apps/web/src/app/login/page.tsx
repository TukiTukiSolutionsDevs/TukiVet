"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") {
    router.replace("/dashboard");
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      const msg =
        err instanceof ApiError && typeof err.detail === "string"
          ? err.detail
          : "Credenciales inválidas";
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-white via-background to-[var(--primary-50)] p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-24 size-[520px] rounded-full bg-primary/15 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 size-[420px] rounded-full bg-[var(--primary-100)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='%23F26522'%3E%3Cellipse cx='30' cy='40' rx='7' ry='9'/%3E%3Cellipse cx='46' cy='32' rx='6' ry='8'/%3E%3Cellipse cx='14' cy='32' rx='6' ry='8'/%3E%3Cpath d='M30 48c8 0 14 6 14 13 0 5-6 7-14 7s-14-2-14-7c0-7 6-13 14-13z'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <Card className="relative w-full max-w-md border-primary/10 shadow-[0_30px_60px_-15px_rgba(242,101,34,0.18)]">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-[0_8px_24px_rgba(242,101,34,0.25)] ring-1 ring-primary/10">
            <Image
              src="/brand/logo-color.png"
              alt="Centro Veterinario Razas"
              width={80}
              height={80}
              priority
              className="size-full object-contain"
            />
          </div>
          <CardTitle className="font-heading text-2xl text-foreground">
            Veterinaria{" "}
            <span className="font-script text-3xl font-bold text-primary leading-none">Razas</span>
          </CardTitle>
          <CardDescription>Bienvenido al sistema clínico</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@veterinaria.pe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Ingresando…
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>
          <div className="mt-3 text-center">
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Aún no tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Registra tu veterinaria
            </Link>
          </p>
          <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary/70" />
            <span>Tahuaycani 32 · Sachaca, Arequipa</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
