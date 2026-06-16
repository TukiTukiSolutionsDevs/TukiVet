"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorClosed, DoorOpen, History, Loader2, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const [openModal, setOpenModal] = useState<null | "open" | "close" | "history">(null);

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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpenModal("history")}
          >
            <History className="size-4" />
            Historial
          </Button>
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

      {openModal === "history" && (
        <CashHistoryDialog onClose={() => setOpenModal(null)} />
      )}

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

function CashHistoryDialog({ onClose }: { onClose: () => void }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const q = useQuery({
    queryKey: ["cash", "history", fromDate, toDate],
    queryFn: () =>
      cashApi.list({
        closed_only: true,
        date_from: fromDate ? `${fromDate}T00:00:00Z` : undefined,
        date_to: toDate ? `${toDate}T23:59:59Z` : undefined,
        limit: 100,
      }),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Historial de cierres de caja</DialogTitle>
          <DialogDescription>
            Sólo sesiones cerradas. Filtrá por fecha de apertura.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="from">Desde</Label>
            <Input
              id="from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">Hasta</Label>
            <Input
              id="to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {q.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (q.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay sesiones cerradas en el rango.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apertura</TableHead>
                  <TableHead>Cierre</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead className="text-right">Calculado</TableHead>
                  <TableHead className="text-right">Declarado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data!.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{formatDateTime(s.opened_at)}</TableCell>
                    <TableCell className="text-sm">
                      {s.closed_at ? formatDateTime(s.closed_at) : "—"}
                    </TableCell>
                    <TableCell className="tnum text-right text-sm">
                      {formatCurrencyPEN(s.opening_balance)}
                    </TableCell>
                    <TableCell className="tnum text-right text-sm">
                      {s.closing_balance_calculated
                        ? formatCurrencyPEN(s.closing_balance_calculated)
                        : "—"}
                    </TableCell>
                    <TableCell className="tnum text-right text-sm">
                      {s.closing_balance_declared
                        ? formatCurrencyPEN(s.closing_balance_declared)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={
                        "tnum text-right text-sm " +
                        (s.difference && Number(s.difference) !== 0
                          ? "text-destructive"
                          : "")
                      }
                    >
                      {s.difference ? formatCurrencyPEN(s.difference) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
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
