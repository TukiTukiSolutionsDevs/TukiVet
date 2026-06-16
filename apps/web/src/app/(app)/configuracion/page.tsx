"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  FileCheck,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { organizationsApi } from "@/lib/organizations-api";
import { usersApi } from "@/lib/users-api";
import { BranchesCard } from "./_components/branches-card";

type SafeRecipientRead = { id: string; phone_number: string; label: string | null };

export default function ConfiguracionPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  if (auth.status === "loading") {
    return <Skeleton className="h-64 w-full" />;
  }
  if (auth.status !== "authenticated") {
    return null;
  }

  const { user } = auth;
  const org = user.organization;

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

      <OrgCard org={org} onSaved={auth.refreshUser} />
      <BranchesCard />
      <ProfileCard user={user} onSaved={auth.refreshUser} />
      <WhatsAppCard queryClient={queryClient} />
      <IntegrationsCard />
    </div>
  );
}

/* ── Org card ─────────────────────────────────────────────────────────── */

type OrgCardProps = {
  org: {
    legal_name: string;
    trade_name: string;
    ruc: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | undefined;
  onSaved: () => Promise<void>;
};

function OrgCard({ org, onSaved }: OrgCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    legal_name: org?.legal_name ?? "",
    trade_name: org?.trade_name ?? "",
    address: org?.address ?? "",
    phone: org?.phone ?? "",
    email: org?.email ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      organizationsApi.updateMe({
        legal_name: form.legal_name || undefined,
        trade_name: form.trade_name || undefined,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
      }),
    onSuccess: () => {
      toast.success("Organización actualizada");
      onSaved();
      setEditing(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      toast.error(msg);
    },
  });

  const upd = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const cancelEdit = () => {
    setForm({
      legal_name: org?.legal_name ?? "",
      trade_name: org?.trade_name ?? "",
      address: org?.address ?? "",
      phone: org?.phone ?? "",
      email: org?.email ?? "",
    });
    setEditing(false);
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Organización</h2>
        </div>
        {!editing ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={cancelEdit}
          >
            <X className="size-3.5" /> Cancelar
          </Button>
        )}
      </div>

      {!editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Razón social" value={org?.legal_name ?? "—"} />
          <Field label="Nombre comercial" value={org?.trade_name ?? "—"} />
          <Field label="RUC" value={org?.ruc ?? "—"} mono />
          <Field label="Email" value={org?.email ?? "—"} />
          <Field label="Teléfono" value={org?.phone ?? "—"} />
          <Field label="Dirección" value={org?.address ?? "—"} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Razón social"
            value={form.legal_name}
            onChange={(v) => upd("legal_name", v)}
          />
          <FormField
            label="Nombre comercial"
            value={form.trade_name}
            onChange={(v) => upd("trade_name", v)}
          />
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              RUC
            </Label>
            <Input
              className="mt-1 font-mono"
              value={org?.ruc ?? ""}
              disabled
            />
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              El RUC no puede modificarse
            </p>
          </div>
          <FormField
            label="Email"
            value={form.email}
            type="email"
            onChange={(v) => upd("email", v)}
          />
          <FormField
            label="Teléfono"
            value={form.phone}
            onChange={(v) => upd("phone", v)}
          />
          <FormField
            label="Dirección"
            value={form.address}
            onChange={(v) => upd("address", v)}
          />
          <div className="sm:col-span-2">
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="w-full sm:w-auto"
            >
              {mutation.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Profile card ─────────────────────────────────────────────────────── */

type ProfileCardProps = {
  user: {
    full_name: string;
    email: string;
    phone?: string | null;
    professional_id?: string | null;
    role_codes: string[];
    permissions: string[];
  };
  onSaved: () => Promise<void>;
};

function ProfileCard({ user, onSaved }: ProfileCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: user.full_name,
    phone: user.phone ?? "",
    professional_id: user.professional_id ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        full_name: form.full_name || undefined,
        phone: form.phone || null,
        professional_id: form.professional_id || null,
      }),
    onSuccess: () => {
      toast.success("Perfil actualizado");
      onSaved();
      setEditing(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      toast.error(msg);
    },
  });

  const upd = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const cancelEdit = () => {
    setForm({
      full_name: user.full_name,
      phone: user.phone ?? "",
      professional_id: user.professional_id ?? "",
    });
    setEditing(false);
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserIcon className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Tu cuenta</h2>
        </div>
        {!editing ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={cancelEdit}
          >
            <X className="size-3.5" /> Cancelar
          </Button>
        )}
      </div>

      {!editing ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" value={user.full_name} />
            <Field label="Email" value={user.email} mono />
            <Field label="Teléfono" value={user.phone ?? "—"} />
            <Field label="CMVP" value={user.professional_id ?? "—"} mono />
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
              Roles
            </p>
            <div className="flex flex-wrap gap-1">
              {user.role_codes.map((r) => (
                <Badge key={r} variant="outline">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tu sesión tiene <strong>{user.permissions.length}</strong>{" "}
            permisos asignados.
          </p>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Nombre completo"
            value={form.full_name}
            onChange={(v) => upd("full_name", v)}
          />
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Email
            </Label>
            <Input className="mt-1" value={user.email} disabled />
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              El email no puede modificarse aquí
            </p>
          </div>
          <FormField
            label="Teléfono"
            value={form.phone}
            onChange={(v) => upd("phone", v)}
          />
          <FormField
            label="N° colegiatura (CMVP)"
            value={form.professional_id}
            mono
            onChange={(v) => upd("professional_id", v)}
          />
          <div className="sm:col-span-2">
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="w-full sm:w-auto"
            >
              {mutation.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── WhatsApp safe recipients card ───────────────────────────────────── */

function WhatsAppCard({
  queryClient,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");

  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ["safe-recipients"],
    queryFn: () =>
      api.get<SafeRecipientRead[]>("/api/v1/notifications/safe-recipients"),
    staleTime: 30_000,
  });

  const addM = useMutation({
    mutationFn: () =>
      api.post<SafeRecipientRead>("/api/v1/notifications/safe-recipients", {
        phone_number: phone.trim(),
        label: label.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Número agregado");
      queryClient.invalidateQueries({ queryKey: ["safe-recipients"] });
      setPhone("");
      setLabel("");
    },
    onError: () => toast.error("Error al agregar número"),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/api/v1/notifications/safe-recipients/${id}`),
    onSuccess: () => {
      toast.success("Número eliminado");
      queryClient.invalidateQueries({ queryKey: ["safe-recipients"] });
    },
    onError: () => toast.error("Error al eliminar"),
  });

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-primary" />
        <h2 className="text-base font-semibold">Lista blanca WhatsApp</h2>
        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 ml-auto">
          Safe mode activo
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        En modo sandbox, sólo se envían mensajes a estos números. Agrega los
        teléfonos de prueba con el prefijo del país (ej: +51912345678).
      </p>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : recipients.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Sin números en la lista blanca.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {recipients.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-mono text-sm">{r.phone_number}</p>
                {r.label && (
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                )}
              </div>
              <button
                onClick={() => deleteM.mutate(r.id)}
                disabled={deleteM.isPending}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                title="Eliminar"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Input
          className="w-44 font-mono"
          placeholder="+51912345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && phone && addM.mutate()}
        />
        <Input
          className="flex-1 min-w-32"
          placeholder="Etiqueta (opcional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button
          size="sm"
          className="gap-1"
          disabled={!phone.trim() || addM.isPending}
          onClick={() => addM.mutate()}
        >
          <Plus className="size-3.5" />
          Agregar
        </Button>
      </div>
    </Card>
  );
}

/* ── Integrations card ────────────────────────────────────────────────── */

function IntegrationsCard() {
  return (
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
  );
}

/* ── Shared helpers ───────────────────────────────────────────────────── */

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

function FormField({
  label,
  value,
  onChange,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        className={"mt-1" + (mono ? " font-mono" : "")}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
      <Badge
        variant="outline"
        className="border-amber-500/40 text-amber-700 dark:text-amber-300"
      >
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
