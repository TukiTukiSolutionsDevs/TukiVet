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
  Download,
  Package,
  Stethoscope,
  Syringe,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
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
import { reportsApi, type FinancialReport } from "@/lib/reports-api";
import { formatCurrencyPEN, formatNumber, formatPercent } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/orders-api";

function exportFinancialCsv(data: FinancialReport, start: string, end: string) {
  const rows: string[][] = [];
  rows.push(["Reporte financiero Razas"]);
  rows.push([`Período: ${start} al ${end}`]);
  rows.push([]);
  rows.push(["RESUMEN"]);
  rows.push(["Ingreso bruto", String(data.gross_revenue)]);
  rows.push(["IGV recaudado", String(data.igv_collected)]);
  rows.push(["Ingreso neto", String(data.net_revenue)]);
  rows.push(["Facturas emitidas", String(data.invoices_emitted)]);
  rows.push(["Boletas emitidas", String(data.boletas_emitted)]);
  rows.push(["Comprobantes anulados", String(data.cancelled_documents)]);
  rows.push([]);
  rows.push(["PAGOS POR MÉTODO"]);
  rows.push(["Método", "Total S/"]);
  for (const [method, total] of Object.entries(data.payments_by_method)) {
    rows.push([method, String(total)]);
  }
  rows.push([]);
  rows.push(["INGRESOS POR CATEGORÍA"]);
  rows.push(["Categoría", "Items", "Total S/"]);
  for (const r of data.revenue_by_category) {
    rows.push([r.category, String(r.count), String(r.total)]);
  }
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte_financiero_${start}_${end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
            {finQ.data && (
              <Button
                variant="outline"
                size="sm"
                className="mb-0.5 gap-1.5"
                onClick={() => exportFinancialCsv(finQ.data!, start, end)}
              >
                <Download className="size-4" />
                Exportar CSV
              </Button>
            )}
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

      {/* Charts section */}
      {(finQ.data || kpiQ.data) && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Gráficos
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {finQ.data && finQ.data.revenue_by_category.length > 0 && (
              <Card className="p-5">
                <h3 className="mb-4 text-sm font-semibold">Ingresos por categoría</h3>
                <RevenueByCategoryChart data={finQ.data.revenue_by_category} />
              </Card>
            )}
            {finQ.data && Object.keys(finQ.data.payments_by_method).length > 0 && (
              <Card className="p-5">
                <h3 className="mb-4 text-sm font-semibold">Distribución métodos de pago</h3>
                <PaymentMethodPieChart data={finQ.data.payments_by_method} />
              </Card>
            )}
            {kpiQ.data && Object.keys(kpiQ.data.revenue_per_vet_last_30d).length > 0 && (
              <Card className="p-5 lg:col-span-2">
                <h3 className="mb-4 text-sm font-semibold">Ingresos por veterinario (30d)</h3>
                <RevenuePerVetChart data={kpiQ.data.revenue_per_vet_last_30d} />
              </Card>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

const CHART_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
];

function RevenueByCategoryChart({ data }: { data: { category: string; count: number; total: string }[] }) {
  const chartData = data.map((r) => ({ name: r.category, total: Number(r.total) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `S/ ${v.toLocaleString()}`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
        <Tooltip formatter={(v) => [`S/ ${Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, "Total"]} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PaymentMethodPieChart({ data }: { data: Record<string, string> }) {
  const pieData = Object.entries(data).map(([name, value]) => ({ name, value: Number(value) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={false}
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => `S/ ${Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function RevenuePerVetChart({ data }: { data: Record<string, string> }) {
  const chartData = Object.entries(data).map(([vet, total]) => ({ name: vet, total: Number(total) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: 8, right: 24 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/ ${v.toLocaleString()}`} />
        <Tooltip formatter={(v) => [`S/ ${Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, "Ingresos"]} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
