"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  encountersApi,
  type VitalSignCreate,
  type VitalSignRead,
} from "@/lib/encounters-api";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export function HospitalizationPanel({
  encounterId,
  readOnly,
}: {
  encounterId: string;
  readOnly: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const vitalsQ = useQuery({
    queryKey: ["encounters", encounterId, "vitals"],
    queryFn: () => encountersApi.listVitals(encounterId),
    refetchInterval: 120_000,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Monitoreo hospitalización
        </h2>
        {vitalsQ.data && vitalsQ.data.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {vitalsQ.data.length} registros
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5">
          <span className="text-xs text-muted-foreground">
            Actualiza automáticamente cada 2 min.
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() =>
                vitalsQ.refetch()
              }
              disabled={vitalsQ.isFetching}
            >
              <RefreshCw
                className={cn("size-3.5", vitalsQ.isFetching && "animate-spin")}
              />
              Actualizar
            </Button>
            {!readOnly && (
              <Button
                size="sm"
                className="h-7"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-3.5" />
                Registro
              </Button>
            )}
          </div>
        </div>

        {vitalsQ.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando registros…
          </div>
        ) : !vitalsQ.data?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Sin registros de monitoreo. Agrega el primero para iniciar
            seguimiento.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  {[
                    "Hora",
                    "Temp (°C)",
                    "FC (bpm)",
                    "FR (rpm)",
                    "Peso (kg)",
                    "BCS",
                    "Mucosas",
                    "TRC (s)",
                    "Dolor /10",
                    "Notas",
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vitalsQ.data.map((v) => (
                  <VitalRow key={v.id} vital={v} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {addOpen && (
        <AddVitalDialog
          encounterId={encounterId}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

function VitalRow({ vital: v }: { vital: VitalSignRead }) {
  const temp = v.temperature_c ? Number(v.temperature_c) : null;
  const hr = v.heart_rate_bpm;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground">
        {formatDateTime(v.measured_at)}
      </td>
      <td className="px-3 py-2.5 text-center tabular-nums">
        {temp != null ? (
          <span
            className={cn(
              "font-medium",
              temp >= 39.5
                ? "text-destructive"
                : temp < 37.5
                  ? "text-sky-600 dark:text-sky-400"
                  : "",
            )}
          >
            {v.temperature_c}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center tabular-nums">
        {hr != null ? (
          <span
            className={cn(
              "font-medium",
              hr > 160
                ? "text-destructive"
                : hr < 60
                  ? "text-sky-600 dark:text-sky-400"
                  : "",
            )}
          >
            {hr}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center tabular-nums">
        {v.respiratory_rate ?? <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-2.5 text-center tabular-nums">
        {v.weight_kg ?? <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-2.5 text-center">
        {v.body_condition_score != null ? (
          <span
            className={cn(
              "font-semibold tabular-nums",
              v.body_condition_score <= 2
                ? "text-destructive"
                : v.body_condition_score >= 8
                  ? "text-warning"
                  : "text-success",
            )}
          >
            {v.body_condition_score}/9
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center text-xs">
        {v.mucous_membranes ?? <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-2.5 text-center tabular-nums text-xs">
        {v.capillary_refill_seconds ?? (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        {v.pain_score != null ? (
          <span
            className={cn(
              "font-semibold tabular-nums",
              v.pain_score >= 7
                ? "text-destructive"
                : v.pain_score >= 4
                  ? "text-warning"
                  : "text-success",
            )}
          >
            {v.pain_score}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="max-w-40 truncate px-3 py-2.5 text-xs text-muted-foreground">
        {v.notes ?? ""}
      </td>
    </tr>
  );
}

function AddVitalDialog({
  encounterId,
  onClose,
}: {
  encounterId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<VitalSignCreate>({
    temperature_c: "",
    heart_rate_bpm: null,
    respiratory_rate: null,
    weight_kg: "",
    body_condition_score: null,
    mucous_membranes: "",
    capillary_refill_seconds: "",
    hydration_status: "",
    pain_score: null,
    notes: "",
  });

  const addM = useMutation({
    mutationFn: () => {
      const payload: VitalSignCreate = {};
      if (form.temperature_c) payload.temperature_c = form.temperature_c;
      if (form.heart_rate_bpm != null) payload.heart_rate_bpm = form.heart_rate_bpm;
      if (form.respiratory_rate != null) payload.respiratory_rate = form.respiratory_rate;
      if (form.weight_kg) payload.weight_kg = form.weight_kg;
      if (form.body_condition_score != null) payload.body_condition_score = form.body_condition_score;
      if (form.mucous_membranes) payload.mucous_membranes = form.mucous_membranes;
      if (form.capillary_refill_seconds) payload.capillary_refill_seconds = form.capillary_refill_seconds;
      if (form.hydration_status) payload.hydration_status = form.hydration_status;
      if (form.pain_score != null) payload.pain_score = form.pain_score;
      if (form.notes) payload.notes = form.notes;
      return encountersApi.addVital(encounterId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["encounters", encounterId, "vitals"],
      });
      toast.success("Registro de signos vitales guardado");
      onClose();
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && typeof e.detail === "string"
          ? e.detail
          : "No pude guardar el registro.";
      toast.error(msg);
    },
  });

  function numOrNull(val: string): number | null {
    const n = parseFloat(val.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo registro — Signos vitales</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Temperatura (°C)</Label>
            <Input
              inputMode="decimal"
              value={form.temperature_c ?? ""}
              onChange={(e) =>
                setForm({ ...form, temperature_c: e.target.value.replace(",", ".") || "" })
              }
              placeholder="38.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Frec. cardíaca (bpm)</Label>
            <Input
              inputMode="numeric"
              value={form.heart_rate_bpm?.toString() ?? ""}
              onChange={(e) =>
                setForm({ ...form, heart_rate_bpm: numOrNull(e.target.value) })
              }
              placeholder="120"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Frec. respiratoria</Label>
            <Input
              inputMode="numeric"
              value={form.respiratory_rate?.toString() ?? ""}
              onChange={(e) =>
                setForm({ ...form, respiratory_rate: numOrNull(e.target.value) })
              }
              placeholder="24"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Peso (kg)</Label>
            <Input
              inputMode="decimal"
              value={form.weight_kg ?? ""}
              onChange={(e) =>
                setForm({ ...form, weight_kg: e.target.value.replace(",", ".") || "" })
              }
              placeholder="12.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">BCS (1-9)</Label>
            <Input
              inputMode="numeric"
              value={form.body_condition_score?.toString() ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value);
                setForm({
                  ...form,
                  body_condition_score:
                    Number.isFinite(n) && n >= 1 && n <= 9 ? n : null,
                });
              }}
              placeholder="4"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dolor (0-10)</Label>
            <Input
              inputMode="numeric"
              value={form.pain_score?.toString() ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value);
                setForm({
                  ...form,
                  pain_score:
                    Number.isFinite(n) && n >= 0 && n <= 10 ? n : null,
                });
              }}
              placeholder="2"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mucosas</Label>
            <Input
              value={form.mucous_membranes ?? ""}
              onChange={(e) =>
                setForm({ ...form, mucous_membranes: e.target.value })
              }
              placeholder="Rosadas y húmedas"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">TRC (segundos)</Label>
            <Input
              inputMode="decimal"
              value={form.capillary_refill_seconds ?? ""}
              onChange={(e) =>
                setForm({ ...form, capillary_refill_seconds: e.target.value })
              }
              placeholder="1.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hidratación</Label>
            <Input
              value={form.hydration_status ?? ""}
              onChange={(e) =>
                setForm({ ...form, hydration_status: e.target.value })
              }
              placeholder="Normal"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notas del registro</Label>
          <Input
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Observaciones adicionales…"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={addM.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => addM.mutate()} disabled={addM.isPending}>
            {addM.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar registro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
