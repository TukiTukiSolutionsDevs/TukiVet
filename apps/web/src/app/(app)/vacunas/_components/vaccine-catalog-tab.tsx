"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Edit, Loader2, Plus, XCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  vaccinesApi,
  speciesLabel,
  VACCINE_SPECIES_LABELS,
  VACCINE_SPECIES_OPTIONS,
  type VaccineCatalogCreate,
  type VaccineCatalogRead,
  type VaccineSpecies,
} from "@/lib/vaccines-api";
import { ApiError } from "@/lib/api";

export function VaccineCatalogTab() {
  const qc = useQueryClient();
  const [species, setSpecies] = useState<VaccineSpecies | "">("");
  const [activeOnly, setActiveOnly] = useState(true);

  const q = useQuery({
    queryKey: ["vaccines", "catalog", species, activeOnly],
    queryFn: () =>
      vaccinesApi.listCatalog({
        species: species || undefined,
        active_only: activeOnly,
      }),
  });

  const toggleActiveM = useMutation({
    mutationFn: (v: VaccineCatalogRead) =>
      vaccinesApi.updateCatalog(v.id, { active: !v.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vaccines", "catalog"] }),
    onError: (e) => toast.error(humanError(e, "No pude actualizar.")),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value as VaccineSpecies | "")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas las especies</option>
              {VACCINE_SPECIES_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {VACCINE_SPECIES_LABELS[s]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Solo activas
            </label>
          </div>
          <NewVaccineDialog />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Especie</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead>Protege contra</TableHead>
              <TableHead>Refuerzo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : q.data && q.data.length > 0 ? (
              q.data.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {v.name}
                      {v.is_rabies && (
                        <Badge variant="outline" className="text-[10px]">
                          Antirrábica
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{speciesLabel(v.species)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.manufacturer ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {v.protects_against ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {v.default_booster_interval_days
                      ? `${v.default_booster_interval_days} días`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {v.active ? (
                      <Badge className="bg-success/15 text-success">Activa</Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={v.active ? "Desactivar" : "Activar"}
                      onClick={() => toggleActiveM.mutate(v)}
                    >
                      {v.active ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                    </Button>
                    <EditVaccineDialog vaccine={v} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Sin vacunas en el catálogo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function NewVaccineDialog() {
  return <VaccineFormDialog mode="create" />;
}

function EditVaccineDialog({ vaccine }: { vaccine: VaccineCatalogRead }) {
  return <VaccineFormDialog mode="edit" vaccine={vaccine} />;
}

function VaccineFormDialog({
  mode,
  vaccine,
}: {
  mode: "create" | "edit";
  vaccine?: VaccineCatalogRead;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(vaccine?.name ?? "");
  const [species, setSpecies] = useState<VaccineSpecies>(
    (vaccine?.species as VaccineSpecies) ?? "dog",
  );
  const [manufacturer, setManufacturer] = useState(vaccine?.manufacturer ?? "");
  const [protectsAgainst, setProtectsAgainst] = useState(
    vaccine?.protects_against ?? "",
  );
  const [boosterDays, setBoosterDays] = useState(
    vaccine?.default_booster_interval_days?.toString() ?? "",
  );
  const [isRabies, setIsRabies] = useState(vaccine?.is_rabies ?? false);

  const mutate = useMutation({
    mutationFn: () => {
      const payload: VaccineCatalogCreate = {
        name: name.trim(),
        species,
        manufacturer: manufacturer.trim() || null,
        protects_against: protectsAgainst.trim() || null,
        default_booster_interval_days: boosterDays ? Number(boosterDays) : null,
        is_rabies: isRabies,
        active: true,
      };
      if (mode === "edit" && vaccine) {
        return vaccinesApi.updateCatalog(vaccine.id, payload);
      }
      return vaccinesApi.createCatalog(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vaccines", "catalog"] });
      toast.success(mode === "edit" ? "Vacuna actualizada" : "Vacuna creada");
      setOpen(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude guardar.")),
  });

  function isValid(): boolean {
    return name.trim().length >= 2;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button>
              <Plus className="size-4" />
              Nueva vacuna
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" title="Editar">
              <Edit className="size-3.5" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar vacuna" : "Nueva vacuna del catálogo"}
          </DialogTitle>
          <DialogDescription>
            Define la vacuna, especie objetivo y refuerzo por defecto.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Séxtuple Nobivac DHPPi+L"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Especie</Label>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value as VaccineSpecies)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={mode === "edit"}
            >
              {VACCINE_SPECIES_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {VACCINE_SPECIES_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Fabricante</Label>
            <Input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="MSD Animal Health"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Protege contra (opc.)</Label>
            <Input
              value={protectsAgainst}
              onChange={(e) => setProtectsAgainst(e.target.value)}
              placeholder="Distemper, Hepatitis, Parvo, Parainfluenza, Lepto"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Refuerzo por defecto (días)</Label>
            <Input
              inputMode="numeric"
              value={boosterDays}
              onChange={(e) => setBoosterDays(e.target.value.replace(/\D/g, ""))}
              placeholder="365"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isRabies}
                onChange={(e) => setIsRabies(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Antirrábica
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={mutate.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutate.mutate()} disabled={!isValid() || mutate.isPending}>
            {mutate.isPending && <Loader2 className="size-4 animate-spin" />}
            {mode === "edit" ? "Guardar" : "Crear"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function humanError(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.detail === "string") return e.detail;
  return fallback;
}
