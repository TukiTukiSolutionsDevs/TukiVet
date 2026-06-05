"use client";

import {
  Bell,
  Building2,
  FileCheck,
  Link2,
  MessageSquare,
  User as UserIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";

export default function ConfiguracionPage() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <Skeleton className="h-64 w-full" />;
  }
  if (auth.status !== "authenticated") {
    return null;
  }

  const org = auth.user.organization;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos de la organización, integraciones y preferencias.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Organización</h2>
        </div>
        {!org ? (
          <p className="text-sm text-muted-foreground">
            Sin datos de organización.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Razón social" value={org.legal_name} />
            <Field label="Nombre comercial" value={org.trade_name} />
            <Field label="RUC" value={org.ruc} mono />
            <Field label="Email" value={org.email ?? "—"} />
            <Field label="Teléfono" value={org.phone ?? "—"} />
            <Field label="Dirección" value={org.address ?? "—"} />
          </div>
        )}
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          La edición de datos de la organización aún no está disponible desde
          la UI. Modifícalos vía API si es necesario.
        </p>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <UserIcon className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Tu cuenta</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" value={auth.user.full_name} />
          <Field label="Email" value={auth.user.email} mono />
          <Field label="Teléfono" value={auth.user.phone ?? "—"} />
          <Field
            label="CMVP"
            value={auth.user.professional_id ?? "—"}
            mono
          />
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
            Roles
          </p>
          <div className="flex flex-wrap gap-1">
            {auth.user.role_codes.map((r) => (
              <Badge key={r} variant="outline">
                {r}
              </Badge>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Tu sesión tiene <strong>{auth.user.permissions.length}</strong>{" "}
          permisos asignados.
        </p>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Link2 className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Integraciones</h2>
        </div>
        <ul className="divide-y divide-border">
          <Integration
            icon={<FileCheck className="size-5 text-emerald-500" />}
            name="TukiFact (SUNAT)"
            description="Emisión de boletas y facturas electrónicas. Configurado en sandbox."
            status="connected"
          />
          <Integration
            icon={<MessageSquare className="size-5 text-emerald-500" />}
            name="Twilio WhatsApp"
            description="Recordatorios de cita y vacuna. En modo safe-mode hasta aprobar trámite Meta."
            status="sandbox"
          />
          <Integration
            icon={<Bell className="size-5 text-muted-foreground" />}
            name="Email transaccional"
            description="Notificaciones por email para tutores opt-in."
            status="pending"
          />
        </ul>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={"mt-0.5 text-sm " + (mono ? "font-mono" : "font-medium")}>
        {value}
      </p>
    </div>
  );
}

function Integration({
  icon,
  name,
  description,
  status,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: "connected" | "sandbox" | "pending";
}) {
  const badge =
    status === "connected" ? (
      <Badge variant="secondary">Conectado</Badge>
    ) : status === "sandbox" ? (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
        Sandbox
      </Badge>
    ) : (
      <Badge variant="outline">Pendiente</Badge>
    );

  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="font-medium">{name}</p>
          {badge}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}
