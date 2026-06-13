"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Eye, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { encountersApi } from "@/lib/encounters-api";

type PLR = "normal" | "lento" | "ausente" | "";
type Vision = "normal" | "reducida" | "ciego" | "";
type Stain = "negativo" | "positivo" | "";

interface EyeData {
  vision: Vision;
  plr_direct: PLR;
  plr_consensual: PLR;
  menace: "presente" | "ausente" | "";
  stt: string;
  iop: string;
  anterior: string;
  posterior: string;
  stain: Stain;
  stain_location: string;
  notes: string;
}

const EMPTY_EYE: EyeData = {
  vision: "",
  plr_direct: "",
  plr_consensual: "",
  menace: "",
  stt: "",
  iop: "",
  anterior: "",
  posterior: "",
  stain: "",
  stain_location: "",
  notes: "",
};


interface EyeFormProps {
  label: string;
  data: EyeData;
  onChange: (d: EyeData) => void;
  readOnly: boolean;
}

function EyeForm({ label, data: d, onChange, readOnly }: EyeFormProps) {
  const set = (k: keyof EyeData, v: string) => onChange({ ...d, [k]: v });

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm text-foreground">{label}</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Visión</Label>
          <Select value={d.vision} onValueChange={(v) => set("vision", v ?? "")} disabled={readOnly}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="reducida">Reducida</SelectItem>
              <SelectItem value="ciego">Ciego</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Resp. amenaza</Label>
          <Select value={d.menace} onValueChange={(v) => set("menace", v ?? "")} disabled={readOnly}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="presente">Presente</SelectItem>
              <SelectItem value="ausente">Ausente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">PLR directo</Label>
          <Select value={d.plr_direct} onValueChange={(v) => set("plr_direct", v ?? "")} disabled={readOnly}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="lento">Lento</SelectItem>
              <SelectItem value="ausente">Ausente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">PLR consensual</Label>
          <Select value={d.plr_consensual} onValueChange={(v) => set("plr_consensual", v ?? "")} disabled={readOnly}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="lento">Lento</SelectItem>
              <SelectItem value="ausente">Ausente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">STT (mm/min)</Label>
          <Input
            className="h-8 text-xs"
            placeholder="15"
            value={d.stt}
            onChange={(e) => set("stt", e.target.value)}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">PIO (mmHg)</Label>
          <Input
            className="h-8 text-xs"
            placeholder="15"
            value={d.iop}
            onChange={(e) => set("iop", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Segmento anterior</Label>
        <Input
          className="h-8 text-xs"
          placeholder="Cristalino limpio, cámara anterior normal…"
          value={d.anterior}
          onChange={(e) => set("anterior", e.target.value)}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Segmento posterior / fondo</Label>
        <Input
          className="h-8 text-xs"
          placeholder="Fondo tapetal normal, papila bien definida…"
          value={d.posterior}
          onChange={(e) => set("posterior", e.target.value)}
          disabled={readOnly}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Fluoresceína</Label>
          <Select value={d.stain} onValueChange={(v) => set("stain", v ?? "")} disabled={readOnly}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="negativo">Negativo</SelectItem>
              <SelectItem value="positivo">Positivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {d.stain === "positivo" && (
          <div className="space-y-1">
            <Label className="text-xs">Localización úlcera</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Cornea central…"
              value={d.stain_location}
              onChange={(e) => set("stain_location", e.target.value)}
              disabled={readOnly}
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Notas adicionales</Label>
        <Textarea
          className="text-xs min-h-[60px] resize-none"
          placeholder="Hallazgos adicionales…"
          value={d.notes}
          onChange={(e) => set("notes", e.target.value)}
          disabled={readOnly}
        />
      </div>
    </div>
  );
}

export function OphthalmicPanel({
  encounterId,
  readOnly,
}: {
  encounterId: string;
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [od, setOd] = useState<EyeData>(EMPTY_EYE);
  const [os, setOs] = useState<EyeData>(EMPTY_EYE);
  const [globalNotes, setGlobalNotes] = useState("");

  const copyM = useMutation({
    mutationFn: async () => {
      const soap = await encountersApi.getSoap(encounterId);
      const examData = { od, os, conclusion: globalNotes, recorded_at: new Date().toISOString() };
      return encountersApi.updateSoap(encounterId, {
        subjective: soap.subjective,
        objective: { ...soap.objective, ophthalmic_exam: examData },
        assessment: soap.assessment,
        plan: soap.plan,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters", encounterId] });
      toast.success("Hallazgos copiados a SOAP objetivo");
    },
    onError: () => toast.error("No pude guardar"),
  });

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-primary" />
          <span className="font-semibold text-sm">Examen Oftálmico</span>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-5 space-y-5">
          <div className="grid gap-6 md:grid-cols-2">
            <EyeForm label="OD — Ojo Derecho" data={od} onChange={setOd} readOnly={readOnly} />
            <Separator className="md:hidden" />
            <EyeForm label="OS — Ojo Izquierdo" data={os} onChange={setOs} readOnly={readOnly} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Conclusión / Diagnóstico</Label>
            <Textarea
              className="text-xs min-h-[60px] resize-none"
              placeholder="Diagnóstico presuntivo, plan de seguimiento…"
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
                onClick={() => copyM.mutate()}
                disabled={copyM.isPending}
              >
                <ClipboardCopy className="size-4" />
                Copiar a SOAP objetivo
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
