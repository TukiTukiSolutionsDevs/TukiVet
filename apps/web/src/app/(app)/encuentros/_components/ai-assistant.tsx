"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ChevronDown, ChevronUp, Sparkles, AlertTriangle, FlaskConical, Check } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { encountersApi, type SoapNoteUpdate } from "@/lib/encounters-api";
import { petsApi } from "@/lib/pets-api";
import { problemsApi } from "@/lib/encounters-api";
import { aiApi, type SoapSuggestionResponse } from "@/lib/ai-api";

interface AiAssistantProps {
  encounterId: string;
  petId: string;
  readOnly: boolean;
}

export function AiAssistant({ encounterId, petId, readOnly }: AiAssistantProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<SoapSuggestionResponse | null>(null);
  const [applied, setApplied] = useState(false);

  const encQ = useQuery({ queryKey: ["encounters", encounterId], queryFn: () => encountersApi.get(encounterId) });
  const petQ = useQuery({ queryKey: ["pets", petId], queryFn: () => petsApi.get(petId) });
  const problemsQ = useQuery({
    queryKey: ["problems", petId],
    queryFn: () => problemsApi.listForPet(petId, "active"),
  });
  const soapQ = useQuery({
    queryKey: ["soap", encounterId],
    queryFn: () => encountersApi.getSoap(encounterId),
  });

  const generateM = useMutation({
    mutationFn: async () => {
      const enc = encQ.data;
      const pet = petQ.data;
      const problems = problemsQ.data ?? [];
      const soap = soapQ.data;

      const ageYears = pet?.birth_date
        ? (Date.now() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
        : null;

      return aiApi.suggestSoap({
        chief_complaint: enc?.chief_complaint ?? "",
        species: pet?.species ?? "canine",
        breed: pet?.breed_name ?? null,
        age_years: ageYears,
        weight_kg: pet?.current_weight_kg ?? null,
        problems: problems.map((p) => p.description),
        existing_soap: soap ? { subjective: soap.subjective, objective: soap.objective } : {},
      });
    },
    onSuccess: (data) => {
      setSuggestion(data);
      setApplied(false);
    },
    onError: () => toast.error("No pude generar sugerencias. ¿Está habilitado el módulo AI?"),
  });

  const applyM = useMutation({
    mutationFn: async () => {
      if (!suggestion) return;
      const soap = soapQ.data;
      const update: SoapNoteUpdate = {
        subjective: {
          ...(soap?.subjective ?? {}),
          summary: suggestion.subjective.summary ?? "",
          history: suggestion.subjective.history ?? "",
        },
        objective: {
          ...(soap?.objective ?? {}),
          physical_exam: suggestion.objective.physical_exam ?? "",
        },
        assessment: soap?.assessment ?? [],
        plan: {
          ...(soap?.plan ?? {}),
          treatment: suggestion.plan.treatment ?? "",
          follow_up: suggestion.plan.follow_up ?? "",
          owner_instructions: suggestion.plan.owner_instructions ?? "",
        },
      };
      return encountersApi.updateSoap(encounterId, update);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["soap", encounterId] });
      qc.invalidateQueries({ queryKey: ["encounters", encounterId] });
      setApplied(true);
      toast.success("Sugerencias aplicadas al SOAP");
    },
    onError: () => toast.error("No pude aplicar las sugerencias"),
  });

  const loading = !encQ.data || !petQ.data;

  return (
    <Card className="overflow-hidden border-primary/30">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <span className="font-semibold text-sm">Asistente IA</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">BETA</Badge>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Genera sugerencias SOAP basadas en el motivo de consulta, vitales y problemas activos del paciente.
          </p>

          {!suggestion && (
            <Button
              size="sm"
              onClick={() => generateM.mutate()}
              disabled={generateM.isPending || loading || readOnly}
            >
              <Sparkles className="size-4" />
              {generateM.isPending ? "Generando…" : "Generar sugerencias"}
            </Button>
          )}

          {generateM.isPending && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}

          {suggestion && !generateM.isPending && (
            <div className="space-y-4">
              {suggestion.mock && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  Modo demo — configura <code>OPENAI_API_KEY</code> en el servidor para sugerencias reales.
                </div>
              )}

              <SuggestionSection title="Subjetivo" icon="S">
                {suggestion.subjective.summary && <SuggItem label="Anamnesis" value={suggestion.subjective.summary} />}
                {suggestion.subjective.history && <SuggItem label="Historia" value={suggestion.subjective.history} />}
              </SuggestionSection>

              <SuggestionSection title="Objetivo" icon="O">
                {suggestion.objective.physical_exam && (
                  <SuggItem label="Examen físico" value={suggestion.objective.physical_exam} />
                )}
              </SuggestionSection>

              <SuggestionSection title="Diagnósticos diferenciales" icon="A">
                <ul className="space-y-1">
                  {suggestion.assessment.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {a}
                    </li>
                  ))}
                </ul>
              </SuggestionSection>

              <SuggestionSection title="Plan" icon="P">
                {suggestion.plan.treatment && <SuggItem label="Tratamiento" value={suggestion.plan.treatment} />}
                {suggestion.plan.follow_up && <SuggItem label="Seguimiento" value={suggestion.plan.follow_up} />}
                {suggestion.plan.owner_instructions && (
                  <SuggItem label="Instrucciones propietario" value={suggestion.plan.owner_instructions} />
                )}
              </SuggestionSection>

              {suggestion.diagnostic_suggestions.length > 0 && (
                <SuggestionSection title="Exámenes sugeridos" icon={<FlaskConical className="size-3" />}>
                  <ul className="space-y-1">
                    {suggestion.diagnostic_suggestions.map((d, i) => (
                      <li key={i} className="text-xs text-muted-foreground">· {d}</li>
                    ))}
                  </ul>
                </SuggestionSection>
              )}

              {suggestion.red_flags.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <AlertTriangle className="size-3.5" /> Señales de alarma
                  </div>
                  {suggestion.red_flags.map((r, i) => (
                    <p key={i} className="text-xs text-destructive/80">· {r}</p>
                  ))}
                </div>
              )}

              {!readOnly && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => applyM.mutate()}
                    disabled={applyM.isPending || applied}
                    className={cn(applied && "border-green-500 text-green-600")}
                    variant={applied ? "outline" : "default"}
                  >
                    {applied ? (
                      <><Check className="size-4" /> Aplicado</>
                    ) : (
                      <><Sparkles className="size-4" /> {applyM.isPending ? "Aplicando…" : "Aplicar al SOAP"}</>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setSuggestion(null); setApplied(false); }}>
                    Nueva sugerencia
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SuggestionSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">
          {icon}
        </span>
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function SuggItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <p className="text-xs text-foreground leading-relaxed">{value}</p>
    </div>
  );
}
