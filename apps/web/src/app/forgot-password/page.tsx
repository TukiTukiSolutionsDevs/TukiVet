"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { ApiError } from "@/lib/api";
import { usersApi } from "@/lib/users-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await usersApi.forgotPassword(email);
      setMessage(res.message);
      setDevLink(res.reset_link);
    } catch (err) {
      const msg =
        err instanceof ApiError && typeof err.detail === "string"
          ? err.detail
          : "No pude enviar el correo.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-background to-[var(--primary-50)] p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Restablecer contraseña</CardTitle>
          <CardDescription>
            Ingresá tu correo y te enviaremos un enlace para crear una nueva
            contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">{message}</p>
              {devLink && (
                <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-semibold">Entorno de desarrollo:</p>
                  <p className="mt-1 break-all">
                    <Link
                      href={new URL(devLink).pathname + new URL(devLink).search}
                      className="text-primary underline"
                    >
                      {devLink}
                    </Link>
                  </p>
                </div>
              )}
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="size-4" /> Volver al inicio
              </Link>
            </div>
          ) : (
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
              <Button type="submit" className="w-full" disabled={busy} size="lg">
                {busy && <Loader2 className="size-4 animate-spin" />}
                Enviar enlace
              </Button>
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="size-4" /> Cancelar
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
