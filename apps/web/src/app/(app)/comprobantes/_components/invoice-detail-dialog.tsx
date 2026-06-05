"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  invoicesApi,
  invoiceStatusLabel,
  invoiceTypeLabel,
  type ElectronicDocumentRead,
} from "@/lib/invoices-api";
import { ApiError } from "@/lib/api";
import { formatCurrencyPEN, formatDateTime } from "@/lib/format";

export function InvoiceDetailDialog({
  docId,
  onClose,
}: {
  docId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [askVoid, setAskVoid] = useState(false);
  const [reason, setReason] = useState("");

  const q = useQuery({
    queryKey: ["invoices", docId],
    queryFn: () => invoicesApi.get(docId),
  });

  const voidM = useMutation({
    mutationFn: () => invoicesApi.void(docId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Comprobante anulado");
      setAskVoid(false);
      onClose();
    },
    onError: (e) => toast.error(humanError(e, "No pude anular el comprobante.")),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {q.data ? (
              <>
                {invoiceTypeLabel(q.data.type)} {q.data.series}-
                {String(q.data.number).padStart(8, "0")}
              </>
            ) : (
              "Comprobante"
            )}
          </DialogTitle>
          <DialogDescription>
            Detalles del comprobante electrónico y eventos de TukiFact / SUNAT.
          </DialogDescription>
        </DialogHeader>

        {q.isLoading || !q.data ? (
          <Skeleton className="h-72 w-full" />
        ) : askVoid ? (
          <VoidPanel
            reason={reason}
            setReason={setReason}
            onCancel={() => setAskVoid(false)}
            onConfirm={() => voidM.mutate()}
            pending={voidM.isPending}
          />
        ) : (
          <DocBody doc={q.data} onAskVoid={() => setAskVoid(true)} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocBody({
  doc,
  onAskVoid,
  onClose,
}: {
  doc: ElectronicDocumentRead;
  onAskVoid: () => void;
  onClose: () => void;
}) {
  const isCancelled = doc.status === "cancelled";
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-input bg-muted/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Cliente
        </p>
        <p className="mt-1 font-medium">{doc.customer_name}</p>
        <p className="text-sm text-muted-foreground">
          {doc.customer_document_type} {doc.customer_document_number}
        </p>
        {doc.customer_address && (
          <p className="text-xs text-muted-foreground">{doc.customer_address}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Emitido">{formatDateTime(doc.issued_at)}</Field>
        <Field label="Moneda">{doc.currency}</Field>
        <Field label="Subtotal">
          {formatCurrencyPEN(doc.subtotal)}
        </Field>
        <Field label="IGV">{formatCurrencyPEN(doc.igv_amount)}</Field>
        <Field label="Total" strong>
          {formatCurrencyPEN(doc.total)}
        </Field>
        <Field label="Estado">
          <Badge variant={isCancelled ? "outline" : "secondary"}>
            {invoiceStatusLabel(doc.status)}
          </Badge>
        </Field>
      </div>

      <Separator />

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Timeline TukiFact / SUNAT
        </p>
        <ol className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Emitido localmente</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(doc.issued_at)}
              </p>
            </div>
          </li>
          {doc.tukifact_id && (
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium">Recibido por TukiFact</p>
                <p className="text-xs text-muted-foreground">
                  ID: <span className="font-mono">{doc.tukifact_id}</span>
                  {doc.tukifact_status && ` · ${doc.tukifact_status}`}
                </p>
              </div>
            </li>
          )}
          {doc.sunat_code && (
            <li className="flex items-start gap-2">
              {doc.status === "accepted" ? (
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
              ) : doc.status === "rejected" ? (
                <AlertCircle className="mt-0.5 size-4 text-destructive" />
              ) : (
                <Clock className="mt-0.5 size-4 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  SUNAT · código {doc.sunat_code}
                </p>
                {doc.sunat_message && (
                  <p className="text-xs text-muted-foreground">
                    {doc.sunat_message}
                  </p>
                )}
              </div>
            </li>
          )}
          {isCancelled && (
            <li className="flex items-start gap-2">
              <XCircle className="mt-0.5 size-4 text-destructive" />
              <div>
                <p className="font-medium">Anulado</p>
                {doc.cancellation_reason && (
                  <p className="text-xs text-muted-foreground">
                    Motivo: {doc.cancellation_reason}
                  </p>
                )}
              </div>
            </li>
          )}
        </ol>
      </div>

      <DialogFooter>
        {doc.pdf_url && (
          <a
            href={doc.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-input px-3 text-sm hover:bg-muted"
          >
            <FileText className="size-4" />
            PDF
            <ExternalLink className="size-3" />
          </a>
        )}
        {doc.xml_url && (
          <a
            href={doc.xml_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-input px-3 text-sm hover:bg-muted"
          >
            <FileCode className="size-4" />
            XML
            <ExternalLink className="size-3" />
          </a>
        )}
        {!isCancelled && (
          <Button
            variant="ghost"
            onClick={onAskVoid}
            className="text-destructive hover:bg-destructive/10"
          >
            <XCircle className="size-4" />
            Anular
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </DialogFooter>
    </div>
  );
}

function Field({
  label,
  children,
  strong,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "mt-0.5 text-sm " + (strong ? "font-bold tabular-nums" : "")
        }
      >
        {children}
      </p>
    </div>
  );
}

function VoidPanel({
  reason,
  setReason,
  onCancel,
  onConfirm,
  pending,
}: {
  reason: string;
  setReason: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const ok = reason.trim().length >= 10;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onConfirm();
      }}
    >
      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <AlertCircle className="mt-0.5 size-5 text-destructive" />
        <div className="text-sm">
          <p className="font-medium text-destructive">Anular comprobante</p>
          <p className="text-xs text-muted-foreground">
            Se notifica a TukiFact y luego a SUNAT. La acción es irreversible.
          </p>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Motivo (mínimo 10 caracteres) *</Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: cliente desistió de la compra, error en el monto"
          autoFocus
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Volver
        </Button>
        <Button
          type="submit"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          disabled={!ok || pending}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Confirmar anulación
        </Button>
      </DialogFooter>
    </form>
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
