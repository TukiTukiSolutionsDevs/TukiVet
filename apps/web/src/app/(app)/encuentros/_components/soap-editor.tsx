"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Check,
  CircleDot,
  CloudOff,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import {
  encountersApi,
  type SoapNoteRead,
  type SoapNoteUpdate,
} from "@/lib/encounters-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type AssessmentItem = {
  description: string;
  status?: "differential" | "rule_out" | "confirmed";
  code?: string;
};

type SoapShape = {
  subjective: {
    summary: string;
    history: string;
    medications: string;
    diet: string;
  };
  objective: {
    physical_exam: string;
    lab_results: string;
    imaging: string;
  };
  assessment: AssessmentItem[];
  plan: {
    treatment: string;
    follow_up: string;
    owner_instructions: string;
  };
};

const blank: SoapShape = {
  subjective: { summary: "", history: "", medications: "", diet: "" },
  objective: { physical_exam: "", lab_results: "", imaging: "" },
  assessment: [],
  plan: { treatment: "", follow_up: "", owner_instructions: "" },
};

function hydrateSoap(remote: SoapNoteRead): SoapShape {
  const s = remote.subjective as Partial<SoapShape["subjective"]> | null;
  const o = remote.objective as Partial<SoapShape["objective"]> | null;
  const a = (remote.assessment ?? []) as AssessmentItem[];
  const p = remote.plan as Partial<SoapShape["plan"]> | null;
  return {
    subjective: {
      summary: s?.summary ?? "",
      history: s?.history ?? "",
      medications: s?.medications ?? "",
      diet: s?.diet ?? "",
    },
    objective: {
      physical_exam: o?.physical_exam ?? "",
      lab_results: o?.lab_results ?? "",
      imaging: o?.imaging ?? "",
    },
    assessment: a.map((it) => ({
      description: it?.description ?? "",
      status: it?.status,
      code: it?.code,
    })),
    plan: {
      treatment: p?.treatment ?? "",
      follow_up: p?.follow_up ?? "",
      owner_instructions: p?.owner_instructions ?? "",
    },
  };
}

function toUpdate(s: SoapShape): SoapNoteUpdate {
  return {
    subjective: s.subjective as Record<string, unknown>,
    objective: s.objective as Record<string, unknown>,
    assessment: s.assessment,
    plan: s.plan as Record<string, unknown>,
  };
}

export function SoapEditor({
  encounterId,
  readOnly,
}: {
  encounterId: string;
  readOnly?: boolean;
}) {
  const soapQ = useQuery({
    queryKey: ["encounters", encounterId, "soap"],
    queryFn: () => encountersApi.getSoap(encounterId),
  });

  const [data, setData] = useState<SoapShape>(blank);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastRemoteRef = useRef<SoapShape | null>(null);

  useEffect(() => {
    if (soapQ.data) {
      const hydrated = hydrateSoap(soapQ.data);
      lastRemoteRef.current = hydrated;
      setData(hydrated);
      setDirty(false);
      setLastSavedAt(null);
    }
  }, [soapQ.data]);

  const saveM = useMutation({
    mutationFn: (payload: SoapShape) =>
      encountersApi.updateSoap(encounterId, toUpdate(payload)),
    onSuccess: (res) => {
      lastRemoteRef.current = hydrateSoap(res);
      setDirty(false);
      setLastSavedAt(new Date());
      // Nota: no llamamos setQueryData porque dispararía la rehidratación
      // del effect inicial y borraría lastSavedAt. El cache se refresca
      // naturalmente cuando el usuario sale y vuelve.
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude guardar.";
      toast.error(msg);
    },
  });

  const doSave = useCallback(() => {
    if (readOnly) return;
    if (!dirty) return;
    saveM.mutate(data);
  }, [data, dirty, readOnly, saveM]);

  // Autosave cada 30s si hay cambios
  useEffect(() => {
    if (readOnly) return;
    const id = setInterval(() => {
      if (dirty && !saveM.isPending) saveM.mutate(data);
    }, 30000);
    return () => clearInterval(id);
  }, [readOnly, dirty, data, saveM]);

  // Atajo ⌘S / Ctrl+S
  useEffect(() => {
    if (readOnly) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        doSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, doSave]);

  // Warn al cerrar la pestaña con cambios pendientes
  useEffect(() => {
    function onBefore(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  function update<K extends keyof SoapShape>(section: K, partial: Partial<SoapShape[K]>) {
    setData((prev) => ({ ...prev, [section]: { ...prev[section], ...partial } }));
    setDirty(true);
  }

  function updateAssessment(next: AssessmentItem[]) {
    setData((prev) => ({ ...prev, assessment: next }));
    setDirty(true);
  }

  if (soapQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (soapQ.isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        No pude cargar el SOAP.
      </div>
    );
  }

  const statusBadge = readOnly ? (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="size-3.5" />
      Solo lectura
    </div>
  ) : saveM.isPending ? (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" />
      Guardando…
    </div>
  ) : dirty ? (
    <div className="flex items-center gap-1.5 text-xs text-warning">
      <CircleDot className="size-3.5" />
      Cambios sin guardar
    </div>
  ) : lastSavedAt ? (
    <div className="flex items-center gap-1.5 text-xs text-success">
      <Check className="size-3.5" />
      Guardado {lastSavedAt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CloudOff className="size-3.5" />
      Sin cambios
    </div>
  );

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        {statusBadge}
        {!readOnly && (
          <Button size="sm" onClick={doSave} disabled={!dirty || saveM.isPending}>
            {saveM.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar (⌘S)
          </Button>
        )}
      </div>

      <Tabs defaultValue="S">
        <TabsList>
          <TabsTab value="S">S — Subjetivo</TabsTab>
          <TabsTab value="O">O — Objetivo</TabsTab>
          <TabsTab value="A">A — Apreciación</TabsTab>
          <TabsTab value="P">P — Plan</TabsTab>
        </TabsList>

        <TabsPanel value="S">
          <div className="space-y-4">
            <TA
              label="Resumen del motivo"
              hint="Lo que dice el tutor."
              value={data.subjective.summary}
              readOnly={readOnly}
              onChange={(v) => update("subjective", { summary: v })}
              rows={3}
            />
            <TA
              label="Historia clínica relevante"
              value={data.subjective.history}
              readOnly={readOnly}
              onChange={(v) => update("subjective", { history: v })}
              rows={4}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TA
                label="Medicaciones actuales"
                value={data.subjective.medications}
                readOnly={readOnly}
                onChange={(v) => update("subjective", { medications: v })}
              />
              <TA
                label="Dieta"
                value={data.subjective.diet}
                readOnly={readOnly}
                onChange={(v) => update("subjective", { diet: v })}
              />
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="O">
          <div className="space-y-4">
            <TA
              label="Examen físico"
              hint="Postura, comportamiento, hallazgos por sistema."
              value={data.objective.physical_exam}
              readOnly={readOnly}
              onChange={(v) => update("objective", { physical_exam: v })}
              rows={6}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TA
                label="Resultados de laboratorio"
                value={data.objective.lab_results}
                readOnly={readOnly}
                onChange={(v) => update("objective", { lab_results: v })}
              />
              <TA
                label="Imágenes"
                value={data.objective.imaging}
                readOnly={readOnly}
                onChange={(v) => update("objective", { imaging: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Los signos vitales se registran en el panel izquierdo.
            </p>
          </div>
        </TabsPanel>

        <TabsPanel value="A">
          <AssessmentEditor
            items={data.assessment}
            readOnly={readOnly}
            onChange={updateAssessment}
          />
        </TabsPanel>

        <TabsPanel value="P">
          <div className="space-y-4">
            <TA
              label="Tratamiento prescrito"
              value={data.plan.treatment}
              readOnly={readOnly}
              onChange={(v) => update("plan", { treatment: v })}
              rows={4}
            />
            <TA
              label="Seguimiento"
              hint="Cuándo regresa, qué controlar."
              value={data.plan.follow_up}
              readOnly={readOnly}
              onChange={(v) => update("plan", { follow_up: v })}
              rows={3}
            />
            <TA
              label="Instrucciones para el tutor"
              value={data.plan.owner_instructions}
              readOnly={readOnly}
              onChange={(v) => update("plan", { owner_instructions: v })}
              rows={4}
            />
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  );
}

function TA({
  label,
  hint,
  value,
  onChange,
  rows = 3,
  readOnly,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        readOnly={readOnly}
        disabled={readOnly}
        className={cn(
          "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring/40",
          readOnly && "cursor-default bg-muted/40 opacity-80",
        )}
        placeholder={hint}
      />
      {hint && !readOnly && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

const STATUS_OPTIONS: { value: AssessmentItem["status"]; label: string; tint: string }[] = [
  { value: "differential", label: "Diferencial", tint: "bg-muted text-muted-foreground" },
  { value: "rule_out", label: "Descartar", tint: "bg-warning/15 text-warning" },
  { value: "confirmed", label: "Confirmado", tint: "bg-success/15 text-success" },
];

function AssessmentEditor({
  items,
  onChange,
  readOnly,
}: {
  items: AssessmentItem[];
  onChange: (next: AssessmentItem[]) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    if (!draft.trim()) return;
    onChange([...items, { description: draft.trim(), status: "differential" }]);
    setDraft("");
  }

  function update(i: number, patch: Partial<AssessmentItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Diagnósticos y diferenciales. El orden refleja prioridad.
      </p>
      <div className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Sin diagnósticos aún.
          </div>
        )}
        {items.map((it, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md border border-border bg-card p-2"
          >
            <span className="tnum w-6 text-center text-xs text-muted-foreground">
              {i + 1}
            </span>
            <Input
              value={it.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Pancreatitis aguda"
              disabled={readOnly}
              className="h-8 flex-1"
            />
            <select
              value={it.status ?? "differential"}
              onChange={(e) =>
                update(i, { status: e.target.value as AssessmentItem["status"] })
              }
              disabled={readOnly}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value!}>
                  {s.label}
                </option>
              ))}
            </select>
            <Input
              value={it.code ?? ""}
              onChange={(e) => update(i, { code: e.target.value })}
              placeholder="K85.0"
              disabled={readOnly}
              className="h-8 w-24 font-mono text-xs"
            />
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(i)}
                title="Quitar"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Agregar diagnóstico…"
          />
          <Button onClick={add} disabled={!draft.trim()}>
            Añadir
          </Button>
        </div>
      )}
    </div>
  );
}
