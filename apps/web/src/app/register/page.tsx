"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, User } from "lucide-react";
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
import { PublicHeader } from "@/components/marketing/public-header";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import type { RegisterOrgPayload } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

type FormState = {
  legal_name: string;
  trade_name: string;
  ruc: string;
  address: string;
  phone: string;
  email: string;

  branch_name: string;
  branch_address: string;
  branch_phone: string;
  timezone: string;

  full_name: string;
  owner_email: string;
  professional_id: string;
  owner_phone: string;
  password: string;
  confirm_password: string;
};

const initial: FormState = {
  legal_name: "",
  trade_name: "",
  ruc: "",
  address: "",
  phone: "",
  email: "",
  branch_name: "Sede principal",
  branch_address: "",
  branch_phone: "",
  timezone: "America/Lima",
  full_name: "",
  owner_email: "",
  professional_id: "",
  owner_phone: "",
  password: "",
  confirm_password: "",
};

const STEPS = [
  { label: "Veterinaria", icon: Building2 },
  { label: "Sede", icon: Building2 },
  { label: "Tu cuenta", icon: User },
];

function validateStep(step: number, f: FormState): string | null {
  if (step === 0) {
    if (f.legal_name.trim().length < 3)
      return "La razón social es obligatoria.";
    if (f.trade_name.trim().length < 2)
      return "El nombre comercial es obligatorio.";
    if (!/^\d{11}$/.test(f.ruc))
      return "El RUC debe tener 11 dígitos numéricos.";
    if (f.address.trim().length < 5)
      return "Ingresa la dirección fiscal.";
    if (f.phone.trim().length < 6) return "Teléfono no válido.";
    if (!/\S+@\S+\.\S+/.test(f.email)) return "Correo no válido.";
  }
  if (step === 1) {
    if (f.branch_name.trim().length < 2)
      return "El nombre de la sede es obligatorio.";
    if (f.branch_address.trim().length < 5)
      return "La dirección de la sede es obligatoria.";
    if (f.branch_phone.trim().length < 6)
      return "Teléfono de la sede no válido.";
  }
  if (step === 2) {
    if (f.full_name.trim().length < 3)
      return "Tu nombre completo es obligatorio.";
    if (!/\S+@\S+\.\S+/.test(f.owner_email))
      return "Tu correo no es válido.";
    if (f.password.length < 12)
      return "La contraseña debe tener al menos 12 caracteres.";
    if (f.password !== f.confirm_password)
      return "Las contraseñas no coinciden.";
  }
  return null;
}

function buildPayload(f: FormState): RegisterOrgPayload {
  return {
    organization: {
      legal_name: f.legal_name.trim(),
      trade_name: f.trade_name.trim(),
      ruc: f.ruc.trim(),
      address: f.address.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
    },
    branch: {
      name: f.branch_name.trim(),
      address: f.branch_address.trim(),
      phone: f.branch_phone.trim(),
      timezone: f.timezone,
    },
    owner: {
      email: f.owner_email.trim(),
      password: f.password,
      full_name: f.full_name.trim(),
      phone: f.owner_phone.trim() || undefined,
      professional_id: f.professional_id.trim() || undefined,
      role_codes: [],
    },
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const { registerOrg, status } = useAuth();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") {
    router.replace("/dashboard");
    return null;
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const goNext = () => {
    const err = validateStep(step, f);
    if (err) return toast.error(err);
    setStep((s) => {
      const next = s + 1;
      if (next === 1) {
        // Prefill sede with org data when entering step 2 the first time
        setF((prev) => ({
          ...prev,
          branch_address: prev.branch_address || prev.address,
          branch_phone: prev.branch_phone || prev.phone,
        }));
      }
      return next;
    });
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    const err = validateStep(step, f);
    if (err) return toast.error(err);
    setSubmitting(true);
    try {
      await registerOrg(buildPayload(f));
      toast.success("¡Veterinaria creada! Bienvenido.");
    } catch (e) {
      const msg =
        e instanceof ApiError && typeof e.detail === "string"
          ? e.detail
          : "No pude crear la veterinaria. Revisa los datos.";
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />

      <main className="flex flex-1 items-start justify-center px-6 py-12">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Registra tu veterinaria</CardTitle>
            <CardDescription>
              3 pasos rápidos. Después podrás invitar a tu equipo.
            </CardDescription>

            <div className="mt-6 flex items-center gap-2">
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex flex-1 items-center gap-2">
                    <div
                      className={cn(
                        "flex size-9 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                        done && "border-primary bg-primary text-primary-foreground",
                        active &&
                          "border-primary bg-primary/10 text-primary",
                        !done &&
                          !active &&
                          "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </div>
                    <div
                      className={cn(
                        "text-xs font-medium",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "ml-2 h-px flex-1",
                          done ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardHeader>

          <CardContent>
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="legal_name">Razón social</Label>
                  <Input
                    id="legal_name"
                    value={f.legal_name}
                    onChange={(e) => update("legal_name", e.target.value)}
                    placeholder="Clínica Veterinaria San Borja SAC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_name">Nombre comercial</Label>
                  <Input
                    id="trade_name"
                    value={f.trade_name}
                    onChange={(e) => update("trade_name", e.target.value)}
                    placeholder="Patitas Felices"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ruc">RUC</Label>
                  <Input
                    id="ruc"
                    inputMode="numeric"
                    maxLength={11}
                    value={f.ruc}
                    onChange={(e) =>
                      update("ruc", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="20612345678"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Dirección fiscal</Label>
                  <Input
                    id="address"
                    value={f.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Av. Larco 123, San Borja, Lima"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={f.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+5119991234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    value={f.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="contacto@patitas.pe"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="branch_name">Nombre de la sede</Label>
                  <Input
                    id="branch_name"
                    value={f.branch_name}
                    onChange={(e) => update("branch_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="branch_address">Dirección de la sede</Label>
                  <Input
                    id="branch_address"
                    value={f.branch_address}
                    onChange={(e) =>
                      update("branch_address", e.target.value)
                    }
                    placeholder={f.address || "Av. Larco 123"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_phone">Teléfono</Label>
                  <Input
                    id="branch_phone"
                    value={f.branch_phone}
                    onChange={(e) => update("branch_phone", e.target.value)}
                    placeholder={f.phone || "+5119991234"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona horaria</Label>
                  <Input
                    id="timezone"
                    value={f.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="full_name">Tu nombre completo</Label>
                  <Input
                    id="full_name"
                    value={f.full_name}
                    onChange={(e) => update("full_name", e.target.value)}
                    placeholder="Dra. María Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_email">Tu correo</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={f.owner_email}
                    onChange={(e) => update("owner_email", e.target.value)}
                    placeholder="maria@patitas.pe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="professional_id">CMVP (opcional)</Label>
                  <Input
                    id="professional_id"
                    value={f.professional_id}
                    onChange={(e) =>
                      update("professional_id", e.target.value)
                    }
                    placeholder="CMVP-12345"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="owner_phone">Tu teléfono (opcional)</Label>
                  <Input
                    id="owner_phone"
                    value={f.owner_phone}
                    onChange={(e) => update("owner_phone", e.target.value)}
                    placeholder="+51999111222"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={f.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Mínimo 12 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirma</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={f.confirm_password}
                    onChange={(e) =>
                      update("confirm_password", e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={step === 0 || submitting}
              >
                <ArrowLeft className="size-4" />
                Atrás
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext} size="lg">
                  Continuar
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creando…
                    </>
                  ) : (
                    "Crear veterinaria"
                  )}
                </Button>
              )}
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
