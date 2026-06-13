"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Leaf, ClipboardCopy, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { encountersApi } from "@/lib/encounters-api";

const BODY_REGIONS = [
  { id: "head", label: "Cabeza" },
  { id: "neck", label: "Cuello" },
  { id: "thorax", label: "Tórax" },
  { id: "abdomen", label: "Abdomen" },
  { id: "back", label: "Lomo / Dorso" },
  { id: "perineum", label: "Periné / Cola" },
  { id: "fl_left", label: "MP Izq." },
  { id: "fl_right", label: "MP Der." },
  { id: "rl_left", label: "MT Izq." },
  { id: "rl_right", label: "MT Der." },
  { id: "paws", label: "Patas / Cojinetes" },
  { id: "interdigital", label: "Interdigital" },
  { id: "ear_left", label: "Oído Izq." },
  { id: "ear_right", label: "Oído Der." },
  { id: "inguinal", label: "Inguinal" },
  { id: "axillary", label: "Axilas" },
];

const PRIMARY_LESIONS = [
  "Mácula", "Pápula", "Placa", "Nódulo", "Vesícula",
  "Pústula", "Roncha", "Quiste", "Tumor",
];

const SECONDARY_LESIONS = [
  "Costra", "Escama", "Erosión", "Úlcera", "Fisura",
  "Cicatriz", "Comedón", "Hiperpigmentación", "Hipopigmentación", "Liquenificación",
];

const DISTRIBUTIONS = [
  "Focal", "Multifocal", "Difuso", "Simétrico bilateral", "Asimétrico",
  "Confluente", "Lineal", "Anular",
];

interface RegionFinding {
  region_id: string;
  primary_lesions: string[];
  secondary_lesions: string[];
  distribution: string;
  notes: string;
}

function RegionFindingForm({
  finding,
  onChange,
  onRemove,
  readOnly,
}: {
  finding: RegionFinding;
  onChange: (f: RegionFinding) => void;
  onRemove: () => void;
  readOnly: boolean;
}) {
  const regionLabel = BODY_REGIONS.find((r) => r.id === finding.region_id)?.label ?? finding.region_id;

  const toggleList = (
    key: "primary_lesions" | "secondary_lesions",
    val: string
  ) => {
    const current = finding[key];
    const next = current.includes(val)
      ? current.filter((x) => x !== val)
      : [...current, val];
    onChange({ ...finding, [key]: next });
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{regionLabel}</span>
        {!readOnly && (
          <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Lesiones primarias</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRIMARY_LESIONS.map((l) => (
            <button
              key={l}
              type="button"
              disabled={readOnly}
              onClick={() => toggleList("primary_lesions", l)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                finding.primary_lesions.includes(l)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Lesiones secundarias</Label>
        <div className="flex flex-wrap gap-1.5">
          {SECONDARY_LESIONS.map((l) => (
            <button
              key={l}
              type="button"
              disabled={readOnly}
              onClick={() => toggleList("secondary_lesions", l)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                finding.secondary_lesions.includes(l)
                  ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  : "border-border text-muted-foreground hover:border-amber-400/50"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Distribución</Label>
          <Select
            value={finding.distribution}
            onValueChange={(v) => onChange({ ...finding, distribution: v ?? "" })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {DISTRIBUTIONS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notas región</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Eritema, descamación…"
            value={finding.notes}
            onChange={(e) => onChange({ ...finding, notes: e.target.value })}
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
}

export function DermatologyPanel({
  encounterId,
  readOnly,
}: {
  encounterId: string;
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [findings, setFindings] = useState<RegionFinding[]>([]);
  const [pruritusScore, setPruritusScore] = useState("");
  const [addingRegion, setAddingRegion] = useState("");
  const [globalNotes, setGlobalNotes] = useState("");

  const addRegion = () => {
    if (!addingRegion || findings.some((f) => f.region_id === addingRegion)) return;
    setFindings((prev) => [
      ...prev,
      { region_id: addingRegion, primary_lesions: [], secondary_lesions: [], distribution: "", notes: "" },
    ]);
    setAddingRegion("");
  };

  const updateFinding = (idx: number, f: RegionFinding) =>
    setFindings((prev) => prev.map((x, i) => (i === idx ? f : x)));

  const removeFinding = (idx: number) =>
    setFindings((prev) => prev.filter((_, i) => i !== idx));

  const saveM = useMutation({
    mutationFn: async () => {
      const soap = await encountersApi.getSoap(encounterId);
      const examData = {
        pruritus_score: pruritusScore ? Number(pruritusScore) : null,
        findings,
        notes: globalNotes,
        recorded_at: new Date().toISOString(),
      };
      return encountersApi.updateSoap(encounterId, {
        subjective: soap.subjective,
        objective: { ...soap.objective, dermatology_exam: examData },
        assessment: soap.assessment,
        plan: soap.plan,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters", encounterId] });
      toast.success("Examen dermatológico guardado en SOAP objetivo");
    },
    onError: () => toast.error("No pude guardar"),
  });

  const usedRegionIds = findings.map((f) => f.region_id);
  const availableRegions = BODY_REGIONS.filter((r) => !usedRegionIds.includes(r.id));

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Leaf className="size-4 text-emerald-600" />
          <span className="font-semibold text-sm">Examen Dermatológico</span>
          {findings.length > 0 && (
            <Badge variant="secondary" className="text-xs">{findings.length} regiones</Badge>
          )}
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-5 space-y-5">
          {/* Pruritus + add region row */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Prurito (0–10 VAS)</Label>
              <Input
                className="h-8 w-24 text-xs"
                type="number"
                min={0}
                max={10}
                step={1}
                placeholder="0"
                value={pruritusScore}
                onChange={(e) => setPruritusScore(e.target.value)}
                disabled={readOnly}
              />
            </div>

            {!readOnly && (
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Añadir región</Label>
                  <Select value={addingRegion} onValueChange={(v) => setAddingRegion(v ?? "")}>
                    <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                    <SelectContent>
                      {availableRegions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" variant="outline" onClick={addRegion} disabled={!addingRegion} className="h-8">
                  <Plus className="size-4" />
                </Button>
              </div>
            )}
          </div>

          {findings.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Añade una región corporal para registrar hallazgos.
            </p>
          )}

          <div className="space-y-3">
            {findings.map((f, idx) => (
              <RegionFindingForm
                key={f.region_id}
                finding={f}
                onChange={(updated) => updateFinding(idx, updated)}
                onRemove={() => removeFinding(idx)}
                readOnly={readOnly}
              />
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Conclusión / Diagnóstico diferencial</Label>
            <Textarea
              className="text-xs min-h-[60px] resize-none"
              placeholder="Dermatitis alérgica, sarna, pioderma…"
              value={globalNotes}
              onChange={(e) => setGlobalNotes(e.target.value)}
              disabled={readOnly}
            />
          </div>

          {!readOnly && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveM.mutate()}
                disabled={saveM.isPending}
              >
                <ClipboardCopy className="size-4" />
                Guardar en SOAP objetivo
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
