"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  invoicesApi,
  invoiceStatusLabel,
  invoiceTypeLabel,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_OPTIONS,
  type ElectronicDocumentRead,
  type InvoiceStatus,
} from "@/lib/invoices-api";
import { formatCurrencyPEN, formatDateTime } from "@/lib/format";
import { InvoiceDetailDialog } from "./_components/invoice-detail-dialog";

function statusVariant(s: string) {
  if (s === "accepted") return "secondary" as const;
  if (s === "rejected") return "destructive" as const;
  if (s === "cancelled") return "outline" as const;
  return "default" as const;
}

export default function ComprobantesPage() {
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [page, setPage] = useState(1);
  const [openDoc, setOpenDoc] = useState<ElectronicDocumentRead | null>(null);

  const q = useQuery({
    queryKey: ["invoices", status, page],
    queryFn: () =>
      invoicesApi.list({
        status: status || undefined,
        page,
        page_size: 20,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Comprobantes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Boletas y facturas electrónicas emitidas vía TukiFact. Los comprobantes
          se generan desde el POS al cobrar una orden.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as InvoiceStatus | "");
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos los estados</option>
            {INVOICE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {INVOICE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Serie-Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ) : q.data?.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No hay comprobantes con el filtro actual. Emití uno desde POS.
                </TableCell>
              </TableRow>
            ) : (
              q.data?.items.map((doc) => (
                <TableRow
                  key={doc.id}
                  onClick={() => setOpenDoc(doc)}
                  className="cursor-pointer transition-colors hover:bg-muted/60"
                >
                  <TableCell>
                    <Badge variant="outline">
                      {invoiceTypeLabel(doc.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {doc.series}-{String(doc.number).padStart(8, "0")}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{doc.customer_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {doc.customer_document_type} {doc.customer_document_number}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatCurrencyPEN(doc.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(doc.status)}>
                      {invoiceStatusLabel(doc.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(doc.issued_at)}
                  </TableCell>
                  <TableCell className="w-32 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(doc.status === "rejected" || doc.status === "pending") && (
                        <ResubmitButton doc={doc} />
                      )}
                      {doc.pdf_url && (
                        <a
                          href={doc.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <FileText className="size-3.5" />
                          PDF
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {q.data && q.data.total > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {q.data.total} comprobantes · página {page}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-input px-3 py-1 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= q.data.total}
              className="rounded-md border border-input px-3 py-1 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {openDoc && (
        <InvoiceDetailDialog
          docId={openDoc.id}
          onClose={() => setOpenDoc(null)}
        />
      )}
    </div>
  );
}

function ResubmitButton({ doc }: { doc: ElectronicDocumentRead }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => invoicesApi.resubmit(doc.id),
    onSuccess: (newDoc) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(
        `Reenviado: ${newDoc.series}-${String(newDoc.number).padStart(8, "0")}`,
      );
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && typeof e.detail === "string"
          ? e.detail
          : "No pude reenviar.";
      toast.error(msg);
    },
  });
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={m.isPending}
      onClick={(e) => {
        e.stopPropagation();
        m.mutate();
      }}
      title="Reintentar envío a SUNAT"
    >
      {m.isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <RotateCw className="size-3" />
      )}
      Reintentar
    </Button>
  );
}
