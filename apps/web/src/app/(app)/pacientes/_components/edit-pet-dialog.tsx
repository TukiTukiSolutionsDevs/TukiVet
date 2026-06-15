"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api";
import {
  petsApi,
  SPECIES_LABELS,
  type PetRead,
  type PetSex,
  type PetUpdate,
} from "@/lib/pets-api";
import { documentsApi } from "@/lib/documents-api";

type Form = {
  name: string;
  breed_name: string;
  sex: PetSex;
  birth_date: string;
  birth_date_estimated: boolean;
  color: string;
  microchip: string;
  distinguishing_marks: string;
  sterilized: boolean;
  sterilization_date: string;
  alerts: string[];
  chronic_conditions: string[];
  photo_url: string;
};

function petToForm(pet: PetRead): Form {
  return {
    name: pet.name,
    breed_name: pet.breed_name ?? "",
    sex: (pet.sex as PetSex) ?? "unknown",
    birth_date: pet.birth_date ?? "",
    birth_date_estimated: pet.birth_date_estimated,
    color: pet.color ?? "",
    microchip: pet.microchip ?? "",
    distinguishing_marks: pet.distinguishing_marks ?? "",
    sterilized: pet.sterilized,
    sterilization_date: pet.sterilization_date ?? "",
    alerts: pet.alerts ?? [],
    chronic_conditions: pet.chronic_conditions ?? [],
    photo_url: pet.photo_url ?? "",
  };
}

function formToPayload(f: Form): PetUpdate {
  return {
    name: f.name.trim(),
    breed_name: f.breed_name.trim() || null,
    sex: f.sex,
    birth_date: f.birth_date || null,
    birth_date_estimated: f.birth_date ? f.birth_date_estimated : false,
    color: f.color.trim() || null,
    microchip: f.microchip.trim() || null,
    distinguishing_marks: f.distinguishing_marks.trim() || null,
    sterilized: f.sterilized,
    sterilization_date: f.sterilization_date || null,
    alerts: f.alerts.length ? f.alerts : null,
    chronic_conditions: f.chronic_conditions.length ? f.chronic_conditions : null,
    photo_url: f.photo_url || null,
  };
}

export function EditPetDialog({
  pet,
  open,
  onOpenChange,
}: {
  pet: PetRead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(() => petToForm(pet));
  const [alertDraft, setAlertDraft] = useState("");
  const [chronicDraft, setChronicDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) setForm(petToForm(pet));
  }, [open, pet]);

  const updateM = useMutation({
    mutationFn: (payload: PetUpdate) => petsApi.update(pet.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets", pet.id] });
      qc.invalidateQueries({ queryKey: ["pets"] });
      toast.success("Mascota actualizada");
      onOpenChange(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude actualizar.")),
  });

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  function addTag(field: "alerts" | "chronic_conditions", value: string) {
    const v = value.trim();
    if (!v) return;
    setForm((p) => {
      if (p[field].includes(v)) return p;
      return { ...p, [field]: [...p[field], v] };
    });
  }

  function removeTag(field: "alerts" | "chronic_conditions", value: string) {
    setForm((p) => ({ ...p, [field]: p[field].filter((x) => x !== value) }));
  }

  async function handlePhoto(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo imágenes (jpg/png).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5MB.");
      return;
    }
    setUploading(true);
    try {
      const doc = await documentsApi.upload(pet.id, file, "other", "Foto de la mascota");
      upd("photo_url", doc.download_url);
      toast.success("Foto cargada");
    } catch (e) {
      toast.error(humanError(e, "No pude subir la foto."));
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (form.name.trim().length < 1) {
      toast.error("Nombre obligatorio.");
      return;
    }
    if (form.microchip) {
      const clean = form.microchip.replace(/[\s-]/g, "");
      if (!/^\d+$/.test(clean) || (clean.length !== 10 && clean.length !== 15)) {
        toast.error("Microchip debe tener 10 o 15 dígitos.");
        return;
      }
    }
    updateM.mutate(formToPayload(form));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar mascota</DialogTitle>
          <DialogDescription>
            {SPECIES_LABELS[pet.species as keyof typeof SPECIES_LABELS] ?? pet.species}
            {" — "}
            {pet.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-20 overflow-hidden rounded-xl bg-muted">
              {form.photo_url ? (
                <img
                  src={form.photo_url}
                  alt={form.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  Sin foto
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="pet_photo"
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Subir foto
              </Label>
              <input
                id="pet_photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
              />
              {form.photo_url && (
                <button
                  type="button"
                  onClick={() => upd("photo_url", "")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => upd("name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="breed">Raza</Label>
              <Input
                id="breed"
                value={form.breed_name}
                onChange={(e) => upd("breed_name", e.target.value)}
                placeholder="Mestizo, Labrador…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.sex}
                onChange={(e) => upd("sex", e.target.value as PetSex)}
              >
                <option value="unknown">Desconocido</option>
                <option value="male">Macho</option>
                <option value="female">Hembra</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={form.birth_date}
                onChange={(e) => upd("birth_date", e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.birth_date_estimated}
                  onChange={(e) => upd("birth_date_estimated", e.target.checked)}
                  disabled={!form.birth_date}
                  className="size-4 rounded border-input"
                />
                Fecha aproximada
              </label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={form.color}
                onChange={(e) => upd("color", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="microchip">Microchip</Label>
              <Input
                id="microchip"
                value={form.microchip}
                onChange={(e) => upd("microchip", e.target.value)}
                placeholder="10 o 15 dígitos"
              />
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.sterilized}
                  onChange={(e) => upd("sterilized", e.target.checked)}
                  className="size-4 rounded border-input"
                />
                Esterilizado
              </label>
              {form.sterilized && (
                <div className="flex flex-1 items-center gap-2">
                  <Label htmlFor="sterilization_date" className="text-xs">
                    Fecha
                  </Label>
                  <Input
                    id="sterilization_date"
                    type="date"
                    value={form.sterilization_date}
                    onChange={(e) => upd("sterilization_date", e.target.value)}
                    className="h-8 max-w-44"
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="distinguishing_marks">Marcas distintivas</Label>
              <Textarea
                id="distinguishing_marks"
                rows={2}
                value={form.distinguishing_marks}
                onChange={(e) => upd("distinguishing_marks", e.target.value)}
                placeholder="Mancha blanca en la pata izquierda…"
              />
            </div>
          </div>

          <TagsField
            label="Alertas (rojo)"
            placeholder="Agresivo, alergia a penicilina…"
            tone="alert"
            values={form.alerts}
            draft={alertDraft}
            setDraft={setAlertDraft}
            onAdd={(v) => {
              addTag("alerts", v);
              setAlertDraft("");
            }}
            onRemove={(v) => removeTag("alerts", v)}
          />

          <TagsField
            label="Condiciones crónicas (ámbar)"
            placeholder="Diabetes, insuficiencia renal…"
            tone="chronic"
            values={form.chronic_conditions}
            draft={chronicDraft}
            setDraft={setChronicDraft}
            onAdd={(v) => {
              addTag("chronic_conditions", v);
              setChronicDraft("");
            }}
            onRemove={(v) => removeTag("chronic_conditions", v)}
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={updateM.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateM.isPending || uploading}>
            {updateM.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TagsField({
  label,
  placeholder,
  tone,
  values,
  draft,
  setDraft,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  tone: "alert" | "chronic";
  values: string[];
  draft: string;
  setDraft: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd(draft);
            }
          }}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => onAdd(draft)}
          disabled={!draft.trim()}
        >
          Añadir
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((v) => (
            <Badge
              key={v}
              className={
                tone === "alert"
                  ? "bg-destructive/15 text-destructive hover:bg-destructive/20"
                  : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
              }
            >
              {v}
              <button
                type="button"
                onClick={() => onRemove(v)}
                className="ml-1 -mr-0.5 rounded hover:bg-background/30"
                aria-label={`Quitar ${v}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function humanError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (typeof e.detail === "string") return e.detail;
    if (Array.isArray(e.detail)) {
      const first = e.detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
  }
  return fallback;
}
