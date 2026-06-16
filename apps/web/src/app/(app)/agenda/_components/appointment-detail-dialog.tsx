"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  MessageCircle,
  PlayCircle,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  appointmentsApi,
  appointmentStatusLabel,
  appointmentTypeLabel,
} from "@/lib/appointments-api";
import { notificationsApi } from "@/lib/notifications-api";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}
function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusBadgeVariant(s: string) {
  if (s === "completed") return "secondary" as const;
  if (s === "cancelled" || s === "no_show") return "destructive" as const;
  if (s === "confirmed" || s === "in_progress") return "default" as const;
  return "outline" as const;
}

export function AppointmentDetailDialog({
  appointmentId,
  onClose,
}: {
  appointmentId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const [newStart, setNewStart] = useState("");
  const [duration, setDuration] = useState(30);
  const [cancelReason, setCancelReason] = useState("");

  const q = useQuery({
    queryKey: ["appointments", appointmentId],
    queryFn: () => appointmentsApi.get(appointmentId),
  });

  useEffect(() => {
    if (q.data) {
      const start = new Date(q.data.starts_at);
      const end = new Date(q.data.ends_at);
      setNewStart(toLocalInputValue(start));
      setDuration(
        Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000)),
      );
    }
  }, [q.data]);

  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ["appointments"] });
  };

  const confirmM = useMutation({
    mutationFn: () => appointmentsApi.confirm(appointmentId),
    onSuccess: () => {
      toast.success("Cita confirmada");
      onSuccess();
    },
    onError: (e) => toast.error(humanError(e, "No pude confirmar.")),
  });

  const remindM = useMutation({
    mutationFn: () => notificationsApi.sendAppointmentReminder(appointmentId),
    onSuccess: (res) => {
      if (res.status === "failed") {
        toast.error(`Falló: ${res.error_message ?? "error"}`);
      } else {
        toast.success("Recordatorio enviado");
      }
    },
    onError: (e) => toast.error(humanError(e, "No pude enviar el recordatorio.")),
  });

  const startM = useMutation({
    mutationFn: () => appointmentsApi.start(appointmentId),
    onSuccess: () => {
      toast.success("Cita en curso");
      onSuccess();
    },
    onError: (e) => toast.error(humanError(e, "No pude iniciar la cita.")),
  });

  const completeM = useMutation({
    mutationFn: () => appointmentsApi.complete(appointmentId),
    onSuccess: () => {
      toast.success("Cita completada");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(humanError(e, "No pude completar.")),
  });

  const noShowM = useMutation({
    mutationFn: () => appointmentsApi.noShow(appointmentId),
    onSuccess: () => {
      toast.success("Marcada como no-show");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(humanError(e, "No pude marcar no-show.")),
  });

  const cancelM = useMutation({
    mutationFn: () => appointmentsApi.cancel(appointmentId, cancelReason || null),
    onSuccess: () => {
      toast.success("Cita cancelada");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(humanError(e, "No pude cancelar.")),
  });

  const rescheduleM = useMutation({
    mutationFn: () => {
      const start = new Date(newStart);
      const end = new Date(start.getTime() + duration * 60_000);
      return appointmentsApi.update(appointmentId, {
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Cita reagendada");
      onSuccess();
      setMode("view");
    },
    onError: (e) => toast.error(humanError(e, "No pude reagendar.")),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle de cita</DialogTitle>
          <DialogDescription>
            Cambios de estado y reagendamiento.
          </DialogDescription>
        </DialogHeader>

        {q.isLoading || !q.data ? (
          <Skeleton className="h-48 w-full" />
        ) : mode === "reschedule" ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              rescheduleM.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nuevo inicio *</Label>
                <Input
                  type="datetime-local"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Duración (min)</Label>
                <Input
                  type="number"
                  min={15}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("view")}
              >
                Volver
              </Button>
              <Button type="submit" disabled={rescheduleM.isPending}>
                {rescheduleM.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Confirmar reagendado
              </Button>
            </DialogFooter>
          </form>
        ) : mode === "cancel" ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              cancelM.mutate();
            }}
          >
            <div className="space-y-1">
              <Label>Motivo de cancelación</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Opcional"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("view")}
              >
                Volver
              </Button>
              <Button
                type="submit"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                disabled={cancelM.isPending}
              >
                {cancelM.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Confirmar cancelación
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={statusBadgeVariant(q.data.status)}>
                {appointmentStatusLabel(q.data.status)}
              </Badge>
              <Badge variant="outline">{appointmentTypeLabel(q.data.type)}</Badge>
            </div>

            <div className="rounded-md border border-input bg-muted/30 p-3 text-sm">
              <p>
                <strong>Inicio:</strong> {formatDateTime(q.data.starts_at)}
              </p>
              <p>
                <strong>Fin:</strong> {formatDateTime(q.data.ends_at)}
              </p>
              {q.data.notes && (
                <>
                  <Separator className="my-2" />
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {q.data.notes}
                  </p>
                </>
              )}
              {q.data.cancel_reason && (
                <>
                  <Separator className="my-2" />
                  <p className="text-destructive">
                    Motivo cancelación: {q.data.cancel_reason}
                  </p>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {q.data.status === "scheduled" && (
                <Button
                  variant="outline"
                  onClick={() => confirmM.mutate()}
                  disabled={confirmM.isPending}
                >
                  <CheckCircle2 className="size-4" />
                  Confirmar
                </Button>
              )}
              {(q.data.status === "scheduled" ||
                q.data.status === "confirmed") && (
                <Button
                  variant="outline"
                  onClick={() => startM.mutate()}
                  disabled={startM.isPending}
                >
                  <PlayCircle className="size-4" />
                  Iniciar
                </Button>
              )}
              {(q.data.status === "scheduled" ||
                q.data.status === "confirmed") && (
                <Button
                  variant="outline"
                  onClick={() => remindM.mutate()}
                  disabled={remindM.isPending}
                  className="col-span-2"
                >
                  {remindM.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MessageCircle className="size-4" />
                  )}
                  Enviar recordatorio ahora
                </Button>
              )}
              {q.data.status === "in_progress" && (
                <Button
                  onClick={() => completeM.mutate()}
                  disabled={completeM.isPending}
                  className="col-span-2"
                >
                  <Stethoscope className="size-4" />
                  Completar
                </Button>
              )}
              {(q.data.status === "scheduled" ||
                q.data.status === "confirmed") && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setMode("reschedule")}
                  >
                    <CalendarClock className="size-4" />
                    Reagendar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => noShowM.mutate()}
                    disabled={noShowM.isPending}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    No asistió
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setMode("cancel")}
                    className="col-span-2 text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="size-4" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
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
