"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ARCO_LABELS,
  portalApi,
  type ARCOType,
  type CustomerSelfRead,
} from "@/lib/portal-api";
import { ApiError } from "@/lib/api";

const ARCO_OPTIONS: ARCOType[] = [
  "access",
  "rectification",
  "cancellation",
  "opposition",
];

export default function PortalAccountPage() {
  const meQ = useQuery({
    queryKey: ["portal", "me"],
    queryFn: () => portalApi.me(),
  });

  const [arcoType, setArcoType] = useState<ARCOType>("access");
  const [arcoDesc, setArcoDesc] = useState("");

  const exportM = useMutation({
    mutationFn: () => portalApi.exportData(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tukivet-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Descarga iniciada");
    },
    onError: (e) =>
      toast.error(humanError(e, "No pude exportar tus datos.")),
  });

  const arcoM = useMutation({
    mutationFn: () => portalApi.submitArco(arcoType, arcoDesc || null),
    onSuccess: () => {
      toast.success("Solicitud enviada. Te contactamos en hasta 15 días.");
      setArcoDesc("");
    },
    onError: (e) =>
      toast.error(humanError(e, "No pude enviar la solicitud.")),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tus datos, privacidad y solicitudes ARCO (Ley 29733).
        </p>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-semibold">Datos personales</h2>
        {meQ.isLoading || !meQ.data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Nombre">
              {meQ.data.first_name} {meQ.data.last_name}
            </Field>
            <Field label="Documento">
              {meQ.data.document_type} {meQ.data.document_number}
            </Field>
            <Field label="Teléfono">{meQ.data.phone_primary}</Field>
            <Field label="Email">{meQ.data.email ?? "—"}</Field>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Para corregir tus datos enviá una solicitud ARCO de
          "rectificación" más abajo.
        </p>
      </Card>

      <PreferencesCard me={meQ.data} loading={meQ.isLoading} />

      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Download className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Descargar mis datos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Recibí un archivo JSON con todos tus datos personales y los de
          tus mascotas (encuentros, vacunas, recetas, órdenes,
          consentimientos). Ejercicio del derecho de acceso.
        </p>
        <Button
          onClick={() => exportM.mutate()}
          disabled={exportM.isPending}
          variant="outline"
        >
          {exportM.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Descargar JSON
        </Button>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Solicitud ARCO</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Solicitudes de acceso, rectificación, cancelación u oposición.
          Respondemos en hasta 15 días hábiles.
        </p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            arcoM.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Tipo</Label>
            <select
              value={arcoType}
              onChange={(e) => setArcoType(e.target.value as ARCOType)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ARCO_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {ARCO_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Detalles</Label>
            <Input
              value={arcoDesc}
              onChange={(e) => setArcoDesc(e.target.value)}
              placeholder="Describí brevemente tu solicitud (opcional)"
            />
          </div>
          <Button type="submit" disabled={arcoM.isPending}>
            {arcoM.isPending && <Loader2 className="size-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5">{children}</p>
    </div>
  );
}

function humanError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (typeof e.detail === "string") return e.detail;
    if (Array.isArray(e.detail)) {
      const first = e.detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
  }
  return fallback;
}

function PreferencesCard({
  me,
  loading,
}: {
  me: CustomerSelfRead | undefined;
  loading: boolean;
}) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (payload: { whatsapp_opted_in?: boolean; email_opted_in?: boolean }) =>
      portalApi.updatePreferences(payload),
    onSuccess: (updated) => {
      qc.setQueryData(["portal", "me"], updated);
      toast.success("Preferencia guardada");
    },
    onError: (e) => toast.error(humanError(e, "No pude actualizar.")),
  });

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-primary" />
        <h2 className="text-base font-semibold">Notificaciones</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Elegí por qué canales podemos contactarte para recordatorios de citas
        y vacunas. Podés cambiarlos cuando quieras.
      </p>
      {loading || !me ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="space-y-2">
          <ToggleRow
            label="WhatsApp"
            description="Recordatorios de cita y vacuna por WhatsApp."
            value={me.whatsapp_opted_in}
            disabled={m.isPending}
            onChange={(v) => m.mutate({ whatsapp_opted_in: v })}
          />
          <ToggleRow
            label="Email"
            description="Avisos por correo electrónico (requiere tener email registrado)."
            value={me.email_opted_in}
            disabled={m.isPending || !me.email}
            onChange={(v) => m.mutate({ email_opted_in: v })}
          />
        </div>
      )}
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
          (value ? "bg-primary" : "bg-muted")
        }
      >
        <span
          className={
            "inline-block size-4 transform rounded-full bg-white shadow transition-transform " +
            (value ? "translate-x-6" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}
