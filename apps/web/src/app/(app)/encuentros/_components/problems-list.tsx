"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListChecks, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  problemsApi,
  PROBLEM_STATUS_LABELS,
  problemStatusLabel,
  type ProblemRead,
  type ProblemStatus,
} from "@/lib/encounters-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ProblemsList({
  petId,
  encounterId,
  readOnly,
}: {
  petId: string;
  encounterId?: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const q = useQuery({
    queryKey: ["problems", petId],
    queryFn: () => problemsApi.listForPet(petId),
  });

  const createM = useMutation({
    mutationFn: () =>
      problemsApi.createForPet(petId, { description: draft.trim() }, encounterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["problems", petId] });
      setDraft("");
      setAdding(false);
      toast.success("Problema agregado");
    },
    onError: (e) => toast.error(humanError(e, "No pude agregar.")),
  });

  const updateM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProblemStatus }) =>
      problemsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["problems", petId] }),
    onError: (e) => toast.error(humanError(e, "No pude actualizar.")),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => problemsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["problems", petId] }),
    onError: (e) => toast.error(humanError(e, "No pude eliminar.")),
  });

  const items = q.data ?? [];
  const active = items.filter((p) => p.status === "active" || p.status === "chronic");
  const past = items.filter((p) => p.status === "resolved" || p.status === "inactive");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListChecks className="size-4" /> Problemas (POMR)
        </div>
        {!readOnly && !adding && (
          <Button variant="ghost" size="xs" onClick={() => setAdding(true)}>
            <Plus className="size-3" /> Añadir
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-2 rounded-md border border-border bg-card p-2">
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Otitis externa bilateral…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) createM.mutate();
              if (e.key === "Escape") {
                setAdding(false);
                setDraft("");
              }
            }}
          />
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
              disabled={createM.isPending}
            >
              Cancelar
            </Button>
            <Button
              size="xs"
              onClick={() => createM.mutate()}
              disabled={!draft.trim() || createM.isPending}
            >
              {createM.isPending && <Loader2 className="size-3 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      )}

      {q.isLoading ? (
        <div className="text-xs text-muted-foreground">Cargando…</div>
      ) : items.length === 0 && !adding ? (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Sin problemas registrados.
        </div>
      ) : (
        <div className="space-y-1.5">
          {active.map((p) => (
            <ProblemRow
              key={p.id}
              problem={p}
              readOnly={readOnly}
              onResolve={() => updateM.mutate({ id: p.id, status: "resolved" })}
              onChronic={() => updateM.mutate({ id: p.id, status: "chronic" })}
              onDelete={() => deleteM.mutate(p.id)}
            />
          ))}
          {past.length > 0 && (
            <details className="mt-2 group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Resueltos ({past.length})
              </summary>
              <div className="mt-2 space-y-1.5">
                {past.map((p) => (
                  <ProblemRow
                    key={p.id}
                    problem={p}
                    readOnly={readOnly}
                    onResolve={() => updateM.mutate({ id: p.id, status: "active" })}
                    onChronic={() => updateM.mutate({ id: p.id, status: "chronic" })}
                    onDelete={() => deleteM.mutate(p.id)}
                    isPast
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function ProblemRow({
  problem,
  readOnly,
  onResolve,
  onChronic,
  onDelete,
  isPast,
}: {
  problem: ProblemRead;
  readOnly?: boolean;
  onResolve: () => void;
  onChronic: () => void;
  onDelete: () => void;
  isPast?: boolean;
}) {
  void PROBLEM_STATUS_LABELS;
  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm",
        isPast && "opacity-70",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="truncate">{problem.description}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
            {problemStatusLabel(problem.status)}
          </Badge>
          {problem.code && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {problem.code}
            </span>
          )}
        </div>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {problem.status === "active" && (
            <>
              <Button variant="ghost" size="icon-xs" title="Crónico" onClick={onChronic}>
                <span className="text-[10px]">C</span>
              </Button>
              <Button variant="ghost" size="icon-xs" title="Resolver" onClick={onResolve}>
                <CheckCircle2 className="size-3" />
              </Button>
            </>
          )}
          {problem.status === "resolved" && (
            <Button variant="ghost" size="icon-xs" title="Reactivar" onClick={onResolve}>
              <CheckCircle2 className="size-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" title="Eliminar" onClick={onDelete}>
            <X className="size-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function humanError(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.detail === "string") return e.detail;
  return fallback;
}
