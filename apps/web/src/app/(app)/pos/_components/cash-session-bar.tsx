"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorClosed, DoorOpen, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cashApi, type CashSessionRead } from "@/lib/orders-api";
import { ApiError } from "@/lib/api";
import { formatCurrencyPEN, formatDateTime } from "@/lib/format";

export function CashSessionBar() {
  const qc = useQueryClient();
  const [openModal, setOpenModal] = useState<null | "open" | "close">(null);

  const sessionQ = useQuery({
    queryKey: ["cash", "active"],
    queryFn: () => cashApi.active(),
  });

  if (sessionQ.isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  const session = sessionQ.data;

  return (
    <>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Wallet className="size-5 text-primary" />
          {session ? (
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Caja abierta</Badge>
                <span className="text-sm text-muted-foreground">
                  desde {formatDateTime(session.opened_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Saldo inicial: {formatCurrencyPEN(session.opening_balance)}
              </p>
            </div>
          ) : (
            <div>
              <Badge variant="outline">Caja cerrada</Badge>
              <p className="text-xs text-muted-foreground">
                Abrí caja para cobrar.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {session ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpenModal("close")}
            >
              <DoorClosed className="size-4" />
              Cerrar caja
            </Button>
          ) : (
            <Button size="sm" onClick={() => setOpenModal("open")}>
              <DoorOpen className="size-4" />
              Abrir caja
            </Button>
          )}
        </div>
      </Card>

      {openModal === "open" && (
        <OpenCashDialog
          onClose={() => setOpenModal(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["cash"] });
            setOpenModal(null);
          }}
        />
      )}

      {openModal === "close" && session && (
        <CloseCashDialog
          session={session}
          onClose={() => setOpenModal(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["cash"] });
            setOpenModal(null);
          }}
        />
      )}
    </>
  );
}

function OpenCashDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [opening, setOpening] = useState("0");

  const openM = useMutation({
    mutationFn: () => cashApi.open({ opening_balance: opening }),
    onSuccess: () => {
      toast.success("Caja abierta");
      onSuccess();
    },
    onError: (e) => toast.error(humanError(e, "No pude abrir caja.")),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir caja</DialogTitle>
          <DialogDescription>
            Declará el saldo inicial en efectivo con el que abrís tu turno.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            openM.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Saldo inicial (S/)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={openM.isPending}>
              {openM.isPending && <Loader2 className="size-4 animate-spin" />}
              Abrir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CloseCashDialog({
  session,
  onClose,
  onSuccess,
}: {
  session: CashSessionRead;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [declared, setDeclared] = useState("0");
  const [notes, setNotes] = useState("");

  const closeM = useMutation({
    mutationFn: () =>
      cashApi.close(session.id, {
        closing_balance_declared: declared,
        notes: notes || null,
      }),
    onSuccess: (s) => {
      const diff = Number(s.difference ?? 0);
      if (Math.abs(diff) < 0.01) {
        toast.success("Caja cerrada sin diferencia");
      } else {
        toast.warning(
          `Caja cerrada con diferencia de ${formatCurrencyPEN(diff)}`,
        );
      }
      onSuccess();
    },
    onError: (e) => toast.error(humanError(e, "No pude cerrar caja.")),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>
            Contá el efectivo real y declarálo. Se calcula la diferencia contra
            el sistema.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            closeM.mutate();
          }}
        >
          <div className="rounded-md border border-input bg-muted/40 p-3 text-sm">
            <p>
              Saldo inicial:{" "}
              <strong>{formatCurrencyPEN(session.opening_balance)}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Abrió {formatDateTime(session.opened_at)}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Saldo declarado en caja (S/) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={declared}
              onChange={(e) => setDeclared(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del cierre"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={closeM.isPending}>
              {closeM.isPending && <Loader2 className="size-4 animate-spin" />}
              Cerrar caja
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
