"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { encountersApi } from "@/lib/encounters-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AmendDialog({ encounterId }: { encounterId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const amendM = useMutation({
    mutationFn: () =>
      encountersApi.amend(encounterId, {
        reason: reason.trim(),
        // El SOAP enmendado se asume previamente actualizado; aquí solo
        // marcamos la enmienda sin tocar el contenido.
        soap_update: {},
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters", encounterId] });
      qc.invalidateQueries({ queryKey: ["encounters", "list"] });
      qc.invalidateQueries({ queryKey: ["encounters", encounterId, "soap"] });
      toast.success("Encuentro enmendado");
      setOpen(false);
      setReason("");
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude enmendar.";
      toast.error(msg);
    },
  });

  const tooShort = reason.trim().length < 10;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <History className="size-4" />
            Enmendar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enmendar encuentro</DialogTitle>
          <DialogDescription>
            Las enmiendas quedan auditadas. Explica brevemente el motivo
            (mínimo 10 caracteres).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Motivo de la enmienda</Label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className={cn(
              "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring/40",
            )}
            placeholder="Se corrige dosis indicada por error de tipeo en el plan…"
          />
          <p className="text-[11px] text-muted-foreground">
            {reason.trim().length} / 2000 caracteres
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={amendM.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => amendM.mutate()}
            disabled={tooShort || amendM.isPending}
          >
            {amendM.isPending && <Loader2 className="size-4 animate-spin" />}
            Confirmar enmienda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
