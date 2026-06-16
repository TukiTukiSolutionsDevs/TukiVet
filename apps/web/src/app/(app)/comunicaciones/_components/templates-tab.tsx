"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreVertical, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  notificationsApi,
  channelLabel,
  type NotificationChannel,
  type TemplateCreate,
  type TemplateRead,
  type TemplateUpdate,
} from "@/lib/notifications-api";
import { ApiError } from "@/lib/api";

export function TemplatesTab() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications", "templates"],
    queryFn: () => notificationsApi.listTemplates(),
  });

  const seedM = useMutation({
    mutationFn: () => notificationsApi.seedDefaults(),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notifications", "templates"] });
      toast.success(`${data.created} plantillas creadas`);
    },
    onError: (e) =>
      toast.error(humanError(e, "No pude cargar plantillas por defecto.")),
  });

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          Las plantillas se renderizan con variables tipo{" "}
          <code className="rounded bg-muted px-1">{"{{nombre}}"}</code>.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedM.mutate()}
            disabled={seedM.isPending}
          >
            {seedM.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Cargar defaults
          </Button>
          <NewTemplateDialog />
        </div>
      </Card>

      {q.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : q.data?.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No hay plantillas. Tocá "Cargar defaults" para poblar las clásicas
          (recordatorios de cita, vacuna, gracias por la compra, etc.).
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {q.data?.map((tpl) => (
            <li key={tpl.id}>
              <TemplateCard tpl={tpl} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewTemplateDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TemplateCreate>({
    code: "",
    name: "",
    channel: "whatsapp",
    body: "",
    locale: "es_PE",
    variables: [],
  });
  const [varsRaw, setVarsRaw] = useState("");

  const createM = useMutation({
    mutationFn: () =>
      notificationsApi.createTemplate({
        ...form,
        variables: varsRaw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "templates"] });
      toast.success("Plantilla creada");
      setOpen(false);
      setForm({
        code: "",
        name: "",
        channel: "whatsapp",
        body: "",
        locale: "es_PE",
        variables: [],
      });
      setVarsRaw("");
    },
    onError: (e) => toast.error(humanError(e, "No pude crear la plantilla.")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Nueva plantilla
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva plantilla</DialogTitle>
          <DialogDescription>
            Usá <code>{"{{variable}}"}</code> en el body para placeholders.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createM.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="ej: vet_appointment_reminder_24h"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Canal *</Label>
              <select
                value={form.channel}
                onChange={(e) =>
                  setForm({
                    ...form,
                    channel: e.target.value as NotificationChannel,
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nombre legible *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Body * (mínimo 10 caracteres)</Label>
            <textarea
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Variables (separadas por coma)</Label>
            <Input
              value={varsRaw}
              onChange={(e) => setVarsRaw(e.target.value)}
              placeholder="ej: cliente_nombre, mascota, fecha"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createM.isPending}>
              {createM.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ tpl }: { tpl: TemplateRead }) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  const toggleM = useMutation({
    mutationFn: () =>
      notificationsApi.updateTemplate(tpl.id, {
        status: tpl.status === "approved" ? "disabled" : "approved",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "templates"] });
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error(humanError(e, "No pude actualizar.")),
  });

  return (
    <>
      <Card className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{tpl.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {tpl.code}
            </p>
          </div>
          <div className="flex items-start gap-1">
            <Badge variant="outline">{channelLabel(tpl.channel)}</Badge>
            <Badge variant={tpl.status === "approved" ? "secondary" : "outline"}>
              {tpl.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" variant="ghost" aria-label="Acciones">
                    <MoreVertical className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toggleM.mutate()}
                  disabled={toggleM.isPending}
                >
                  {tpl.status === "approved" ? "Desactivar" : "Activar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDelOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
          {tpl.body}
        </p>
        {tpl.variables && tpl.variables.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <strong>Variables:</strong> {tpl.variables.join(", ")}
          </p>
        )}
      </Card>
      <EditTemplateDialog
        tpl={tpl}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteTemplateDialog
        tpl={tpl}
        open={delOpen}
        onOpenChange={setDelOpen}
      />
    </>
  );
}

function EditTemplateDialog({
  tpl,
  open,
  onOpenChange,
}: {
  tpl: TemplateRead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(tpl.name);
  const [body, setBody] = useState(tpl.body);
  const [varsRaw, setVarsRaw] = useState((tpl.variables ?? []).join(", "));

  useEffect(() => {
    if (open) {
      setName(tpl.name);
      setBody(tpl.body);
      setVarsRaw((tpl.variables ?? []).join(", "));
    }
  }, [open, tpl]);

  const m = useMutation({
    mutationFn: () => {
      const payload: TemplateUpdate = {
        name: name.trim(),
        body,
        variables: varsRaw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      };
      return notificationsApi.updateTemplate(tpl.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "templates"] });
      toast.success("Plantilla actualizada");
      onOpenChange(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude actualizar.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar plantilla</DialogTitle>
          <DialogDescription>
            <code className="font-mono">{tpl.code}</code> · {channelLabel(tpl.channel)}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim().length < 10) {
              toast.error("Body mínimo 10 caracteres.");
              return;
            }
            m.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Body</Label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label>Variables (coma)</Label>
            <Input
              value={varsRaw}
              onChange={(e) => setVarsRaw(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={m.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTemplateDialog({
  tpl,
  open,
  onOpenChange,
}: {
  tpl: TemplateRead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => notificationsApi.deleteTemplate(tpl.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "templates"] });
      toast.success("Plantilla eliminada");
      onOpenChange(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude eliminar.")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar plantilla</DialogTitle>
          <DialogDescription>
            ¿Eliminar la plantilla <strong>{tpl.code}</strong>? Esta acción es
            definitiva.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={m.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {m.isPending && <Loader2 className="size-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
