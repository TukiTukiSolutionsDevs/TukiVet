"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { encountersApi, type VitalSignRead } from "@/lib/encounters-api";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type VitalForm = {
  temperature_c: string;
  heart_rate_bpm: string;
  respiratory_rate: string;
  weight_kg: string;
  mucous_membranes: string;
  capillary_refill_seconds: string;
  hydration_status: string;
  pain_score: string;
  notes: string;
};

const blank: VitalForm = {
  temperature_c: "",
  heart_rate_bpm: "",
  respiratory_rate: "",
  weight_kg: "",
  mucous_membranes: "",
  capillary_refill_seconds: "",
  hydration_status: "",
  pain_score: "",
  notes: "",
};

export function VitalSignsForm({
  encounterId,
  readOnly,
}: {
  encounterId: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState<VitalForm>(blank);

  const q = useQuery({
    queryKey: ["encounters", encounterId, "vitals"],
    queryFn: () => encountersApi.listVitals(encounterId),
  });

  const addM = useMutation({
    mutationFn: () => {
      const payload = {
        temperature_c: f.temperature_c || null,
        heart_rate_bpm: f.heart_rate_bpm ? Number(f.heart_rate_bpm) : null,
        respiratory_rate: f.respiratory_rate ? Number(f.respiratory_rate) : null,
        weight_kg: f.weight_kg || null,
        mucous_membranes: f.mucous_membranes || null,
        capillary_refill_seconds: f.capillary_refill_seconds || null,
        hydration_status: f.hydration_status || null,
        pain_score: f.pain_score ? Number(f.pain_score) : null,
        notes: f.notes || null,
      };
      const hasData = Object.values(payload).some((v) => v !== null && v !== "");
      if (!hasData) throw new Error("Nada que registrar");
      return encountersApi.addVital(encounterId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters", encounterId, "vitals"] });
      setF(blank);
      setAdding(false);
      toast.success("Signos vitales registrados");
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : (e as Error).message;
      toast.error(msg);
    },
  });

  const upd = <K extends keyof VitalForm>(k: K, v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const items = q.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="size-4" /> Signos vitales
        </div>
        {!readOnly && !adding && (
          <Button variant="ghost" size="xs" onClick={() => setAdding(true)}>
            <Plus className="size-3" /> Registrar
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="T° (°C)">
              <Input
                inputMode="decimal"
                placeholder="38.5"
                value={f.temperature_c}
                onChange={(e) => upd("temperature_c", e.target.value.replace(",", "."))}
              />
            </Field>
            <Field label="FC (lpm)">
              <Input
                inputMode="numeric"
                placeholder="120"
                value={f.heart_rate_bpm}
                onChange={(e) => upd("heart_rate_bpm", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <Field label="FR (rpm)">
              <Input
                inputMode="numeric"
                placeholder="24"
                value={f.respiratory_rate}
                onChange={(e) => upd("respiratory_rate", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <Field label="Peso (kg)">
              <Input
                inputMode="decimal"
                placeholder="25.4"
                value={f.weight_kg}
                onChange={(e) => upd("weight_kg", e.target.value.replace(",", "."))}
              />
            </Field>
            <Field label="Mucosas">
              <Input
                placeholder="rosadas / pálidas"
                value={f.mucous_membranes}
                onChange={(e) => upd("mucous_membranes", e.target.value)}
              />
            </Field>
            <Field label="TRC (s)">
              <Input
                inputMode="decimal"
                placeholder="1.5"
                value={f.capillary_refill_seconds}
                onChange={(e) => upd("capillary_refill_seconds", e.target.value.replace(",", "."))}
              />
            </Field>
            <Field label="Hidratación">
              <Input
                placeholder="normal / 5% / 8%"
                value={f.hydration_status}
                onChange={(e) => upd("hydration_status", e.target.value)}
              />
            </Field>
            <Field label="Dolor (0–10)">
              <Input
                inputMode="numeric"
                placeholder="0"
                value={f.pain_score}
                onChange={(e) => upd("pain_score", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
          </div>
          <Field label="Notas">
            <Input
              placeholder="Apariencia, comportamiento…"
              value={f.notes}
              onChange={(e) => upd("notes", e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setF(blank);
              }}
              disabled={addM.isPending}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={() => addM.mutate()} disabled={addM.isPending}>
              {addM.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      )}

      {q.isLoading ? (
        <div className="text-xs text-muted-foreground">Cargando…</div>
      ) : items.length === 0 && !adding ? (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Sin signos vitales registrados.
        </div>
      ) : (
        <div className="space-y-1.5">
          {items
            .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())
            .map((v) => (
              <VitalCard key={v.id} vital={v} />
            ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function VitalCard({ vital }: { vital: VitalSignRead }) {
  const items: { k: string; v: string | null }[] = [
    { k: "T°", v: vital.temperature_c ? `${vital.temperature_c} °C` : null },
    { k: "FC", v: vital.heart_rate_bpm != null ? `${vital.heart_rate_bpm}` : null },
    { k: "FR", v: vital.respiratory_rate != null ? `${vital.respiratory_rate}` : null },
    { k: "Peso", v: vital.weight_kg ? `${vital.weight_kg} kg` : null },
    { k: "Muc.", v: vital.mucous_membranes },
    { k: "TRC", v: vital.capillary_refill_seconds ? `${vital.capillary_refill_seconds}s` : null },
    { k: "Hidr.", v: vital.hydration_status },
    { k: "Dolor", v: vital.pain_score != null ? `${vital.pain_score}/10` : null },
  ].filter((i) => i.v);

  return (
    <div className="rounded-md border border-border bg-card p-2.5 text-sm">
      <div className="mb-1 text-[11px] text-muted-foreground">
        {formatDateTime(vital.measured_at)}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {items.map((i) => (
          <div key={i.k} className="flex items-baseline gap-1">
            <span className="text-muted-foreground">{i.k}</span>
            <span className="font-medium">{i.v}</span>
          </div>
        ))}
      </div>
      {vital.notes && (
        <div className="mt-1 text-xs text-muted-foreground">{vital.notes}</div>
      )}
    </div>
  );
}
