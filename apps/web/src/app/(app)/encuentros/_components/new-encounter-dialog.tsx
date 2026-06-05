"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, Search, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { petsApi, type PetRead, speciesLabel } from "@/lib/pets-api";
import {
  encountersApi,
  ENCOUNTER_TYPE_LABELS,
  ENCOUNTER_TYPE_OPTIONS,
  type EncounterType,
} from "@/lib/encounters-api";
import { cn } from "@/lib/utils";

type Mode = "pick" | "form";

export function NewEncounterDialog({
  trigger,
  defaultPet,
}: {
  trigger?: React.ReactNode;
  defaultPet?: PetRead;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultPet ? "form" : "pick");
  const [selected, setSelected] = useState<PetRead | null>(defaultPet ?? null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<EncounterType>("consultation");
  const [chiefComplaint, setChiefComplaint] = useState("");

  useEffect(() => {
    if (open && defaultPet) {
      setSelected(defaultPet);
      setMode("form");
    }
  }, [open, defaultPet]);

  const petsQ = useQuery({
    queryKey: ["pets", "search-for-encounter", search],
    queryFn: () => petsApi.list({ q: search || undefined, page_size: 6 }),
    enabled: open && mode === "pick",
  });

  const createM = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Mascota no seleccionada");
      if (!selected.customer_id) throw new Error("Mascota sin tutor primario");
      return encountersApi.create({
        pet_id: selected.id,
        customer_id: selected.customer_id,
        type,
        chief_complaint: chiefComplaint.trim() || null,
      });
    },
    onSuccess: (enc) => {
      qc.invalidateQueries({ queryKey: ["encounters"] });
      toast.success("Encuentro creado");
      close();
      router.push(`/encuentros/${enc.id}`);
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : (e as Error).message;
      toast.error(msg);
    },
  });

  function reset() {
    setMode(defaultPet ? "form" : "pick");
    setSelected(defaultPet ?? null);
    setSearch("");
    setType("consultation");
    setChiefComplaint("");
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(reset, 200);
      }}
    >
      <DialogTrigger
        render={
          trigger
            ? undefined
            : (
              <Button>
                <Plus className="size-4" />
                Nuevo encuentro
              </Button>
            )
        }
      >
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo encuentro clínico</DialogTitle>
          <DialogDescription>
            {mode === "pick"
              ? "Selecciona la mascota."
              : "Tipo de visita y motivo de consulta."}
          </DialogDescription>
        </DialogHeader>

        {mode === "pick" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar mascota por nombre o microchip…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-auto rounded-md border border-border bg-card">
              {petsQ.isLoading ? (
                <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Cargando…
                </div>
              ) : petsQ.data?.items.length ? (
                petsQ.data.items.map((p) => {
                  const isSel = selected?.id === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                        isSel ? "bg-primary/10" : "hover:bg-muted",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {p.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {speciesLabel(p.species)}
                          {p.breed_name ? ` · ${p.breed_name}` : ""}
                          {p.microchip ? ` · ${p.microchip}` : ""}
                        </div>
                      </div>
                      {isSel && <Check className="size-4 text-primary" />}
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Sin resultados.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                Cancelar
              </Button>
              <Button
                disabled={!selected}
                onClick={() => setMode("form")}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {mode === "form" && selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Stethoscope className="size-4" />
              </div>
              <div className="flex-1 text-sm">
                <div className="font-medium">{selected.name}</div>
                <div className="text-xs text-muted-foreground">
                  {speciesLabel(selected.species)}
                  {selected.breed_name ? ` · ${selected.breed_name}` : ""}
                </div>
              </div>
              {!defaultPet && (
                <Button variant="ghost" size="sm" onClick={() => setMode("pick")}>
                  Cambiar
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EncounterType)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ENCOUNTER_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {ENCOUNTER_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Motivo de consulta (opc.)</Label>
              <Input
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Vómitos hace 2 días, decaimiento…"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close} disabled={createM.isPending}>
                Cancelar
              </Button>
              <Button onClick={() => createM.mutate()} disabled={createM.isPending}>
                {createM.isPending && <Loader2 className="size-4 animate-spin" />}
                Crear y abrir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
