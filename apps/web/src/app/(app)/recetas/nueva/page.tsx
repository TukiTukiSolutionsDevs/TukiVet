"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calculator,
  Check,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { petsApi, speciesLabel, type PetRead } from "@/lib/pets-api";
import {
  prescriptionsApi,
  ROUTE_LABELS,
  ROUTE_OPTIONS,
  type PrescriptionItemInput,
  type Route,
} from "@/lib/prescriptions-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type ItemForm = PrescriptionItemInput & { localId: string };

const blankItem = (): ItemForm => ({
  localId: `it-${Math.random().toString(36).slice(2, 8)}`,
  medication_name: "",
  active_ingredient: "",
  dose_mg_per_kg: "",
  total_dose_mg: "",
  presentation: "",
  quantity: "1",
  frequency: "",
  duration_days: null,
  route: "oral",
  instructions: "",
  is_controlled: false,
});

export default function NuevaRecetaPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <NuevaRecetaInner />
    </Suspense>
  );
}

function NuevaRecetaInner() {
  const router = useRouter();
  const params = useSearchParams();
  const petIdParam = params.get("pet_id") ?? "";
  const encounterId = params.get("encounter_id") ?? undefined;

  const [petId, setPetId] = useState(petIdParam);
  const [pet, setPet] = useState<PetRead | null>(null);
  const [search, setSearch] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemForm[]>([blankItem()]);

  // Auto-load pet from query param
  const petQ = useQuery({
    queryKey: ["pets", petId],
    queryFn: () => petsApi.get(petId),
    enabled: !!petId,
  });
  useEffect(() => {
    if (petQ.data) setPet(petQ.data);
  }, [petQ.data]);

  // Search box for picking a pet
  const petsListQ = useQuery({
    queryKey: ["pets", "search-recetas-new", search],
    queryFn: () => petsApi.list({ q: search || undefined, page_size: 6 }),
    enabled: !pet && !!search,
  });

  const createM = useMutation({
    mutationFn: () => {
      if (!pet) throw new Error("Selecciona una mascota");
      const cleanedItems: PrescriptionItemInput[] = items.map((it) => ({
        medication_name: it.medication_name.trim(),
        active_ingredient: it.active_ingredient?.trim() || null,
        dose_mg_per_kg: it.dose_mg_per_kg || null,
        total_dose_mg: it.total_dose_mg || null,
        presentation: it.presentation?.trim() || null,
        quantity: it.quantity,
        frequency: it.frequency?.trim() || null,
        duration_days: it.duration_days || null,
        route: it.route ?? null,
        instructions: it.instructions?.trim() || null,
        is_controlled: !!it.is_controlled,
      }));
      return prescriptionsApi.create({
        pet_id: pet.id,
        encounter_id: encounterId || null,
        diagnosis: diagnosis.trim() || null,
        notes: notes.trim() || null,
        items: cleanedItems,
      });
    },
    onSuccess: (res) => {
      toast.success("Receta emitida");
      router.push(`/recetas/${res.id}`);
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : (e as Error).message;
      toast.error(msg);
    },
  });

  function isValid(): boolean {
    if (!pet) return false;
    if (items.length === 0) return false;
    return items.every(
      (it) => it.medication_name.trim().length >= 1 && Number(it.quantity) > 0,
    );
  }

  function updateItem(idx: number, patch: Partial<ItemForm>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((p) => [...p, blankItem()]);
  }

  function removeItem(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      <Link
        href="/recetas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Nueva receta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos clínicos + ítems con cálculo de dosis embebido.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        {!pet ? (
          <div className="space-y-3">
            <Label>Mascota</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar mascota…"
                className="pl-9"
              />
            </div>
            {search && (
              <div className="max-h-60 space-y-1 overflow-auto rounded-md border border-border bg-card">
                {petsListQ.isLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
                ) : petsListQ.data?.items.length ? (
                  petsListQ.data.items.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setPet(p);
                        setPetId(p.id);
                        setSearch("");
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {speciesLabel(p.species)}
                          {p.breed_name ? ` · ${p.breed_name}` : ""}
                          {p.current_weight_kg ? ` · ${p.current_weight_kg} kg` : ""}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">Sin resultados.</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="text-sm">
              <div className="font-medium">{pet.name}</div>
              <div className="text-xs text-muted-foreground">
                {speciesLabel(pet.species)}
                {pet.breed_name ? ` · ${pet.breed_name}` : ""}
                {pet.current_weight_kg ? ` · ${pet.current_weight_kg} kg` : " · sin peso"}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPet(null)}>
              Cambiar
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Diagnóstico (opc.)</Label>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Otitis externa bilateral"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notas internas (opc.)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Control en 7 días"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Ítems</h2>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-3.5" />
            Agregar ítem
          </Button>
        </div>

        {items.map((it, i) => (
          <PrescriptionItemRow
            key={it.localId}
            item={it}
            index={i}
            petWeightKg={pet?.current_weight_kg ?? null}
            onChange={(patch) => updateItem(i, patch)}
            onRemove={items.length > 1 ? () => removeItem(i) : undefined}
          />
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Link
          href="/recetas"
          className={cn(
            "inline-flex h-8 items-center rounded-lg border border-transparent px-2.5 text-sm font-medium hover:bg-muted",
          )}
        >
          Cancelar
        </Link>
        <Button onClick={() => createM.mutate()} disabled={!isValid() || createM.isPending}>
          {createM.isPending && <Loader2 className="size-4 animate-spin" />}
          <Check className="size-4" />
          Emitir receta
        </Button>
      </div>
    </div>
  );
}

function PrescriptionItemRow({
  item,
  index,
  petWeightKg,
  onChange,
  onRemove,
}: {
  item: ItemForm;
  index: number;
  petWeightKg: string | null;
  onChange: (patch: Partial<ItemForm>) => void;
  onRemove?: () => void;
}) {
  const [showCalc, setShowCalc] = useState(false);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="tnum text-muted-foreground">#{index + 1}</span>
          <Input
            value={item.medication_name}
            onChange={(e) => onChange({ medication_name: e.target.value })}
            placeholder="Cefalexina suspensión 250 mg/5 ml"
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={showCalc ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowCalc((s) => !s)}
            title="Calculadora de dosis"
          >
            <Calculator className="size-3.5" />
            Dosis
          </Button>
          {onRemove && (
            <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} title="Quitar">
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {showCalc && (
        <DoseCalculator
          weightKg={petWeightKg}
          doseMgPerKg={item.dose_mg_per_kg ?? ""}
          totalDoseMg={item.total_dose_mg ?? ""}
          onApply={(out) => onChange(out)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Cantidad</Label>
          <Input
            inputMode="decimal"
            value={item.quantity}
            onChange={(e) => onChange({ quantity: e.target.value.replace(",", ".") })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Frecuencia</Label>
          <Input
            value={item.frequency ?? ""}
            onChange={(e) => onChange({ frequency: e.target.value })}
            placeholder="cada 8h"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Duración (días)</Label>
          <Input
            inputMode="numeric"
            value={item.duration_days?.toString() ?? ""}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              onChange({ duration_days: v ? Number(v) : null });
            }}
            placeholder="7"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Vía</Label>
          <select
            value={item.route ?? ""}
            onChange={(e) => onChange({ route: (e.target.value || null) as Route })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">—</option>
            {ROUTE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROUTE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Presentación</Label>
          <Input
            value={item.presentation ?? ""}
            onChange={(e) => onChange({ presentation: e.target.value })}
            placeholder="Suspensión 250 mg/5 ml"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Principio activo</Label>
          <Input
            value={item.active_ingredient ?? ""}
            onChange={(e) => onChange({ active_ingredient: e.target.value })}
            placeholder="Cefalexina"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Instrucciones para el tutor</Label>
        <Input
          value={item.instructions ?? ""}
          onChange={(e) => onChange({ instructions: e.target.value })}
          placeholder="Administrar con alimentos. No saltar dosis."
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={!!item.is_controlled}
            onChange={(e) => onChange({ is_controlled: e.target.checked })}
            className="size-4 rounded border-input"
          />
          Controlado (requiere testigo al dispensar)
        </label>
      </div>
    </Card>
  );
}

function DoseCalculator({
  weightKg,
  doseMgPerKg,
  totalDoseMg,
  onApply,
}: {
  weightKg: string | null;
  doseMgPerKg: string;
  totalDoseMg: string;
  onApply: (out: { dose_mg_per_kg: string; total_dose_mg: string; quantity?: string }) => void;
}) {
  const [w, setW] = useState(weightKg ?? "");
  const [dose, setDose] = useState(doseMgPerKg);
  const [presMg, setPresMg] = useState("");

  const calc = useMutation({
    mutationFn: () =>
      prescriptionsApi.calculateDose({
        weight_kg: w,
        dose_mg_per_kg: dose,
        presentation_mg_per_unit: presMg,
      }),
    onSuccess: (res) => {
      onApply({
        dose_mg_per_kg: res.dose_mg_per_kg,
        total_dose_mg: res.total_dose_mg,
        quantity: res.units_per_dose,
      });
      toast.success(
        `${res.total_dose_mg} mg total · ${res.units_per_dose} unidades por dosis`,
      );
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude calcular.";
      toast.error(msg);
    },
  });

  function isValid(): boolean {
    return Number(w) > 0 && Number(dose) > 0 && Number(presMg) > 0;
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Calculator className="size-3" />
        Calculadora de dosis
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-[11px]">Peso (kg)</Label>
          <Input
            value={w}
            onChange={(e) => setW(e.target.value.replace(",", "."))}
            placeholder="25.4"
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Dosis mg/kg</Label>
          <Input
            value={dose}
            onChange={(e) => setDose(e.target.value.replace(",", "."))}
            placeholder="22"
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Presentación mg/unidad</Label>
          <Input
            value={presMg}
            onChange={(e) => setPresMg(e.target.value.replace(",", "."))}
            placeholder="50"
            className="h-8"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          {totalDoseMg ? `Total actual: ${totalDoseMg} mg` : "Aplicar autocompletará dosis total + cantidad."}
        </p>
        <Button size="xs" onClick={() => calc.mutate()} disabled={!isValid() || calc.isPending}>
          {calc.isPending && <Loader2 className="size-3 animate-spin" />}
          Calcular
        </Button>
      </div>
      <Separator />
    </div>
  );
}
