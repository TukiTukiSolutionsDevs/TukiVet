"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search, Syringe } from "lucide-react";
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
import {
  petsApi,
  speciesLabel,
  type PetRead,
} from "@/lib/pets-api";
import {
  vaccinesApi,
  type VaccineAdministrationCreate,
  type VaccineCatalogRead,
} from "@/lib/vaccines-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export function RecordVaccineDialog({
  trigger,
  defaultPet,
  defaultVaccineId,
  encounterId,
  onSuccess,
}: {
  trigger?: React.ReactNode;
  defaultPet?: PetRead;
  defaultVaccineId?: string;
  encounterId?: string;
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1>(defaultPet ? 1 : 0);
  const [pet, setPet] = useState<PetRead | null>(defaultPet ?? null);
  const [search, setSearch] = useState("");
  const [vaccineId, setVaccineId] = useState(defaultVaccineId ?? "");
  const [lotNumber, setLotNumber] = useState("");
  const [siteOfApplication, setSiteOfApplication] = useState("");
  const [doseNumber, setDoseNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && defaultPet) {
      setPet(defaultPet);
      setStep(1);
    }
    if (open && defaultVaccineId) setVaccineId(defaultVaccineId);
  }, [open, defaultPet, defaultVaccineId]);

  const petsQ = useQuery({
    queryKey: ["pets", "search-vaccine", search],
    queryFn: () => petsApi.list({ q: search || undefined, page_size: 6 }),
    enabled: open && step === 0,
  });

  const catalogQ = useQuery({
    queryKey: ["vaccines", "catalog", pet?.species ?? ""],
    queryFn: () =>
      vaccinesApi.listCatalog({
        species: pet?.species,
        active_only: true,
      }),
    enabled: open && step === 1,
  });

  const recordM = useMutation({
    mutationFn: () => {
      if (!pet) throw new Error("Sin mascota");
      if (!vaccineId) throw new Error("Sin vacuna");
      const payload: VaccineAdministrationCreate = {
        pet_id: pet.id,
        vaccine_id: vaccineId,
        lot_number: lotNumber || null,
        site_of_application: siteOfApplication || null,
        dose_number: doseNumber ? Number(doseNumber) : null,
        notes: notes || null,
        encounter_id: encounterId || null,
      };
      return vaccinesApi.recordAdministration(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vaccines"] });
      qc.invalidateQueries({ queryKey: ["pets", pet?.id] });
      toast.success("Vacuna registrada");
      onSuccess?.();
      close();
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : (e as Error).message;
      toast.error(msg);
    },
  });

  function reset() {
    setStep(defaultPet ? 1 : 0);
    setPet(defaultPet ?? null);
    setSearch("");
    setVaccineId(defaultVaccineId ?? "");
    setLotNumber("");
    setSiteOfApplication("");
    setDoseNumber("");
    setNotes("");
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
                <Syringe className="size-4" />
                Registrar aplicación
              </Button>
            )
        }
      >
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar aplicación de vacuna</DialogTitle>
          <DialogDescription>
            {step === 0 ? "Selecciona la mascota." : "Vacuna aplicada y detalles del lote."}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar mascota…"
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
                  const isSel = pet?.id === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setPet(p)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                        isSel ? "bg-primary/10" : "hover:bg-muted",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{p.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {speciesLabel(p.species)}
                          {p.breed_name ? ` · ${p.breed_name}` : ""}
                        </div>
                      </div>
                      {isSel && <Check className="size-4 text-primary" />}
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">Sin resultados.</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                Cancelar
              </Button>
              <Button disabled={!pet} onClick={() => setStep(1)}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 1 && pet && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
              <div className="text-sm">
                <div className="font-medium">{pet.name}</div>
                <div className="text-xs text-muted-foreground">
                  {speciesLabel(pet.species)}
                  {pet.breed_name ? ` · ${pet.breed_name}` : ""}
                </div>
              </div>
              {!defaultPet && (
                <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                  Cambiar
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Vacuna</Label>
                <select
                  value={vaccineId}
                  onChange={(e) => setVaccineId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Seleccionar —</option>
                  {catalogQ.data?.map((v: VaccineCatalogRead) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.manufacturer ? ` (${v.manufacturer})` : ""}
                    </option>
                  ))}
                </select>
                {catalogQ.data?.length === 0 && (
                  <p className="text-[11px] text-warning">
                    No hay vacunas para esta especie. Crea una en el catálogo.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Lote</Label>
                <Input
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="ABC123"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dosis Nº</Label>
                <Input
                  inputMode="numeric"
                  value={doseNumber}
                  onChange={(e) => setDoseNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="1"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Sitio de aplicación</Label>
                <Input
                  value={siteOfApplication}
                  onChange={(e) => setSiteOfApplication(e.target.value)}
                  placeholder="Subcutáneo dorsal derecho"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notas (opc.)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sin reacción adversa"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close} disabled={recordM.isPending}>
                Cancelar
              </Button>
              <Button onClick={() => recordM.mutate()} disabled={!vaccineId || recordM.isPending}>
                {recordM.isPending && <Loader2 className="size-4 animate-spin" />}
                Registrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
