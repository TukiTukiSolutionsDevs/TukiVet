"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { ApiError } from "@/lib/api";
import { petsApi, type PetRead } from "@/lib/pets-api";

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

export function MarkDeceasedDialog({
  pet,
  open,
  onOpenChange,
}: {
  pet: PetRead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");

  const m = useMutation({
    mutationFn: () =>
      petsApi.update(pet.id, {
        status: "deceased",
        deceased_date: date || today,
        deceased_reason: reason.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets", pet.id] });
      qc.invalidateQueries({ queryKey: ["pets"] });
      toast.success("Mascota marcada como fallecida");
      onOpenChange(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude marcar.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como fallecida</DialogTitle>
          <DialogDescription>
            {pet.name} se marcará con estado “fallecida”. Esta acción cierra el
            historial activo, pero los registros se conservan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="deceased_date">Fecha de fallecimiento</Label>
            <Input
              id="deceased_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deceased_reason">Motivo (opcional)</Label>
            <Textarea
              id="deceased_reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Causa, observaciones…"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={m.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {m.isPending && <Loader2 className="size-4 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ArchivePetDialog({
  pet,
  open,
  onOpenChange,
}: {
  pet: PetRead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const [confirm, setConfirm] = useState("");

  const m = useMutation({
    mutationFn: () => petsApi.softDelete(pet.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets"] });
      qc.removeQueries({ queryKey: ["pets", pet.id] });
      toast.success(`${pet.name} archivada`);
      onOpenChange(false);
      router.push("/pacientes");
    },
    onError: (e) => toast.error(humanError(e, "No pude archivar.")),
  });

  const canSubmit = confirm.trim().toLowerCase() === pet.name.trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archivar mascota</DialogTitle>
          <DialogDescription>
            La mascota dejará de aparecer en listados. Esta acción es reversible
            desde la base de datos pero no desde el UI.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Escribe <span className="font-semibold text-foreground">{pet.name}</span>{" "}
            para confirmar.
          </p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={pet.name}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={m.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => m.mutate()}
            disabled={!canSubmit || m.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {m.isPending && <Loader2 className="size-4 animate-spin" />}
            Archivar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
