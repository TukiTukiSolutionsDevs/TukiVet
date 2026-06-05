"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  Calendar,
  CalendarX,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  Stethoscope,
  Syringe,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { reportsApi } from "@/lib/reports-api";
import { formatCurrencyPEN, formatNumber, formatPercent } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/orders-api";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ReportesPage() {
  const [start, setStart] = useState(daysAgoIso(30));
  const [end, setEnd] = useState(todayIso());

  const kpiQ = useQuery({
    queryKey: ["reports", "kpis"],
    queryFn: () => reportsApi.kpis({ window_days: 30 }),
  });

  const finQ = useQuery({
    queryKey: ["reports", "financial", start, end],
    queryFn: () => reportsApi.financial({ start, end }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Reportes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KPIs operativos y reporte financiero. El rango de fechas aplica al
          reporte financiero.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          KPIs últimos 30 días
        </h2>
        {kpiQ.isLoading || !kpiQ.data ? (
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <Kpi
              icon={<Users className="size-5" />}
              label="Pacientes activos"
              value={formatNumber(kpiQ.data.active_patients)}
            />
            <Kpi
              icon={<Stethoscope className="size-5" />}
              label="Clientes activos"
              value={formatNumber(kpiQ.data.active_clients)}
            />
            <Kpi
              icon={<Activity className="size-5" />}
              label="Encuentros 30d"
              value={formatNumber(kpiQ.data.total_encounters_last_30d)}
            />
            <Kpi
              icon={<Calendar className="size-5" />}
              label="Citas 30d"
              value={formatNumber(kpiQ.data.appointments_last_30d)}
            />
            <Kpi
              icon={<DollarSign className="size-5" />}
              label="Ingresos 30d"
              value={formatCurrencyPEN(kpiQ.data.revenue_last_30d)}
            />
            <Kpi
              icon={<TrendingUp className="size-5" />}
              label="ATC promedio"
              value={formatCurrencyPEN(kpiQ.data.average_transaction_charge)}
            />
            <Kpi
              icon={<CalendarX className="size-5" />}
              label="No-show"
              value={formatPercent(kpiQ.data.no_show_rate_pct)}
            />
            <Kpi
              icon={<Syringe className="size-5" />}
              label="Cumplim. vacunas"
              value={formatPercent(kpiQ.data.vaccines_compliance_pct)}
            />
            <Kpi
              icon={<Package className="size-5" />}
              label="Valor inventario"
              value={formatCurrencyPEN(kpiQ.data.inventory_value)}
            />
            <Kpi
              icon={<Clock className="size-5" />}
              label="Lotes por vencer"
              value={formatNumber(kpiQ.data.expiring_lots_count)}
              warn={kpiQ.data.expiring_lots_count > 0}
            />
            <Kpi
              icon={<AlertCircle className="size-5" />}
              label="Stock bajo"
              value={formatNumber(kpiQ.data.low_stock_count)}
              warn={kpiQ.data.low_stock_count > 0}
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reporte financiero
        </h2>
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Desde</Label>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {finQ.isLoading || !finQ.data ? (
          <Skeleton className="mt-3 h-64 w-full" />
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <Card className="space-y-3 p-5 lg:col-span-1">
              <h3 className="text-sm font-semibold">Resumen</h3>
              <Row
                label="Ingreso bruto"
                value={formatCurrencyPEN(finQ.data.gross_revenue)}
                strong
              />
              <Row
                label="IGV recaudado"
                value={formatCurrencyPEN(finQ.data.igv_collected)}
                muted
              />
              <Row
                label="Ingreso neto"
                value={formatCurrencyPEN(finQ.data.net_revenue)}
                strong
              />
              <div className="border-t border-border pt-3">
                <Row
                  label="Facturas"
                  value={formatNumber(finQ.data.invoices_emitted)}
                />
                <Row
                  label="Boletas"
                  value={formatNumber(finQ.data.boletas_emitted)}
                />
                <Row
                  label="Comprobantes anulados"
                  value={formatNumber(finQ.data.cancelled_documents)}
                  warn={finQ.data.cancelled_documents > 0}
                />
              </div>
            </Card>

            <Card className="p-5 lg:col-span-1">
              <h3 className="mb-3 text-sm font-semibold">Pagos por método</h3>
              <PaymentMethodBars data={finQ.data.payments_by_method} />
            </Card>

            <Card className="overflow-hidden p-0 lg:col-span-1">
              <div className="p-5 pb-2">
                <h3 className="text-sm font-semibold">Ingresos por categoría</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finQ.data.revenue_by_category.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        Sin ingresos en el rango.
                      </TableCell>
                    </TableRow>
                  ) : (
                    finQ.data.revenue_by_category.map((r) => (
                      <TableRow key={r.category}>
                        <TableCell className="font-medium">
                          {r.category}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(r.count)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatCurrencyPEN(r.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <span
          className={
            "rounded-md p-2 " +
            (warn
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary")
          }
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
  warn,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span
        className={
          "tabular-nums " +
          (strong ? "font-semibold " : "") +
          (warn ? "text-destructive" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}

function PaymentMethodBars({ data }: { data: Record<string, string> }) {
  const entries = Object.entries(data)
    .map(([k, v]) => [k, Number(v)] as const)
    .sort((a, b) => b[1] - a[1]);
  const max = entries.reduce((m, [, v]) => Math.max(m, v), 0);

  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Sin pagos en el rango.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map(([method, amount]) => (
        <li key={method}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CreditCard className="size-3.5" />
              {paymentMethodLabel(method)}
            </span>
            <span className="tabular-nums font-medium text-foreground">
              {formatCurrencyPEN(amount)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${max ? (amount / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
