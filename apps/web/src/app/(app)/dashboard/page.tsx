"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CalendarX,
  CheckCircle2,
  ChevronRight,
  Clock,
  PackageOpen,
  PawPrint,
  Stethoscope,
  Syringe,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  appointmentsApi,
  appointmentStatusLabel,
  appointmentTypeLabel,
  type AppointmentRead,
} from "@/lib/appointments-api";
import { reportsApi, type KPIs } from "@/lib/reports-api";
import {
  formatCurrencyPEN,
  formatLongDate,
  formatNumber,
  formatPercent,
  greetingByHour,
} from "@/lib/format";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

type KPIDef = {
  label: string;
  value: (k: KPIs) => string;
  sub?: (k: KPIs) => string;
  icon: LucideIcon;
  tint: "primary" | "accent" | "info" | "warning" | "success" | "destructive";
};

const KPI_DEFS: KPIDef[] = [
  {
    label: "Ingresos · últimos 30 días",
    value: (k) => formatCurrencyPEN(k.revenue_last_30d),
    sub: (k) => `Ticket prom. ${formatCurrencyPEN(k.average_transaction_charge)}`,
    icon: Wallet,
    tint: "primary",
  },
  {
    label: "Encuentros · últimos 30 días",
    value: (k) => formatNumber(k.total_encounters_last_30d),
    sub: (k) => `${formatNumber(k.appointments_last_30d)} citas agendadas`,
    icon: Stethoscope,
    tint: "info",
  },
  {
    label: "Pacientes activos",
    value: (k) => formatNumber(k.active_patients),
    sub: (k) => `${formatNumber(k.active_clients)} tutores activos`,
    icon: PawPrint,
    tint: "primary",
  },
  {
    label: "Tutores activos",
    value: (k) => formatNumber(k.active_clients),
    icon: Users,
    tint: "info",
  },
  {
    label: "Cumplimiento de vacunas",
    value: (k) => formatPercent(k.vaccines_compliance_pct),
    icon: Syringe,
    tint: "success",
  },
  {
    label: "Tasa de no-show",
    value: (k) => formatPercent(k.no_show_rate_pct),
    icon: CalendarX,
    tint: "warning",
  },
  {
    label: "Lotes por vencer",
    value: (k) => formatNumber(k.expiring_lots_count),
    sub: () => "Próximos 30 días",
    icon: AlertTriangle,
    tint: "warning",
  },
  {
    label: "Productos con stock bajo",
    value: (k) => formatNumber(k.low_stock_count),
    icon: PackageOpen,
    tint: "destructive",
  },
];

const TINT_STYLES: Record<KPIDef["tint"], { bg: string; fg: string }> = {
  primary: {
    bg: "bg-[var(--primary-50)] dark:bg-[var(--primary-50)]",
    fg: "text-[var(--primary-700)] dark:text-primary",
  },
  accent: {
    bg: "bg-[var(--accent-50,#FEF4EA)]",
    fg: "text-[var(--accent-600,#E2843E)]",
  },
  info: { bg: "bg-[var(--info-bg)]", fg: "text-info" },
  warning: { bg: "bg-[var(--warning-bg)]", fg: "text-warning" },
  success: { bg: "bg-[var(--success-bg)]", fg: "text-success" },
  destructive: { bg: "bg-[var(--error-bg)]", fg: "text-destructive" },
};

function KPICard({ def, k }: { def: KPIDef; k: KPIs }) {
  const Icon = def.icon;
  const tint = TINT_STYLES[def.tint];
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            tint.bg,
          )}
        >
          <Icon className={cn("size-[19px]", tint.fg)} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-[12.5px] font-medium text-muted-foreground">
          {def.label}
        </div>
        <div className="tnum text-2xl font-bold tracking-tight text-foreground">
          {def.value(k)}
        </div>
        {def.sub && (
          <div className="text-xs text-muted-foreground">{def.sub(k)}</div>
        )}
      </div>
    </Card>
  );
}

function KPISkeleton() {
  return (
    <Card className="gap-3 p-5">
      <Skeleton className="size-10 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
    </Card>
  );
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  scheduled: { label: "Agendada", class: "border-blue-500/40 text-blue-700 dark:text-blue-300" },
  confirmed: { label: "Confirmada", class: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300" },
  in_progress: { label: "En curso", class: "border-primary/40 text-primary" },
  completed: { label: "Completada", class: "text-muted-foreground" },
  no_show: { label: "No asistió", class: "border-amber-500/40 text-amber-700 dark:text-amber-300" },
  cancelled: { label: "Cancelada", class: "border-destructive/40 text-destructive" },
};

function AppointmentRow({ apt }: { apt: AppointmentRead }) {
  const time = new Date(apt.starts_at).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const badge = STATUS_BADGE[apt.status] ?? { label: apt.status, class: "" };
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex w-12 shrink-0 items-center gap-1 text-xs font-mono font-medium text-muted-foreground">
        <Clock className="size-3" />
        {time}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {appointmentTypeLabel(apt.type)}
        </p>
      </div>
      <Badge variant="outline" className={cn("shrink-0 text-[11px]", badge.class)}>
        {badge.label}
      </Badge>
    </div>
  );
}

function AgendaWidget() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: () =>
      appointmentsApi.list({
        starts_at_from: todayStart,
        starts_at_to: todayEnd,
        page_size: 8,
      }),
    staleTime: 2 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Agenda del día</h2>
        </div>
        <Link
          href="/citas"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 gap-1 text-xs" })}
        >
          Ver todas <ChevronRight className="size-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-success" />
          Sin citas para hoy
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((apt) => (
            <AppointmentRow key={apt.id} apt={apt} />
          ))}
          {total > 8 && (
            <p className="pt-2 text-xs text-muted-foreground">
              +{total - 8} citas más hoy
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function AlertasWidget({ kpis }: { kpis: KPIs }) {
  const alerts: { label: string; detail: string; tint: string; href: string }[] = [];

  if (kpis.low_stock_count > 0) {
    alerts.push({
      label: `${kpis.low_stock_count} producto${kpis.low_stock_count > 1 ? "s" : ""} con stock bajo`,
      detail: "Revisar inventario",
      tint: "text-destructive",
      href: "/inventario",
    });
  }
  if (kpis.expiring_lots_count > 0) {
    alerts.push({
      label: `${kpis.expiring_lots_count} lote${kpis.expiring_lots_count > 1 ? "s" : ""} por vencer`,
      detail: "Próximos 30 días",
      tint: "text-warning",
      href: "/inventario",
    });
  }
  const complianceNum = parseFloat(String(kpis.vaccines_compliance_pct));
  if (!isNaN(complianceNum) && complianceNum < 80) {
    alerts.push({
      label: `Cumplimiento de vacunas: ${formatPercent(kpis.vaccines_compliance_pct)}`,
      detail: "Por debajo del 80 %",
      tint: "text-warning",
      href: "/pacientes",
    });
  }
  const noShowNum = parseFloat(String(kpis.no_show_rate_pct));
  if (!isNaN(noShowNum) && noShowNum > 20) {
    alerts.push({
      label: `Tasa de no-show: ${formatPercent(kpis.no_show_rate_pct)}`,
      detail: "Por encima del 20 %",
      tint: "text-amber-600 dark:text-amber-400",
      href: "/citas",
    });
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="size-4 text-warning" />
        <h2 className="text-sm font-semibold">Alertas activas</h2>
        {alerts.length > 0 && (
          <Badge variant="destructive" className="ml-auto text-[11px]">
            {alerts.length}
          </Badge>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-success" />
          Sin alertas activas
        </div>
      ) : (
        <div className="divide-y divide-border">
          {alerts.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex items-center justify-between py-2.5 hover:opacity-80"
            >
              <div>
                <p className={cn("text-sm font-medium", a.tint)}>{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reports", "kpis"],
    queryFn: () => reportsApi.kpis(),
  });

  const firstName = user?.full_name.split(" ")[0] ?? "";
  const greeting = greetingByHour(new Date().getHours());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          {greeting}
          {firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatLongDate(new Date())} ·{" "}
          {user?.organization?.trade_name ?? "—"}
        </p>
      </div>

      {isError && (
        <Card className="border-destructive/50 bg-destructive/5 p-5">
          <CardContent className="p-0 text-sm text-destructive">
            No pude cargar los KPIs:{" "}
            {error instanceof Error ? error.message : "error desconocido"}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <KPISkeleton key={i} />)
          : data
            ? KPI_DEFS.map((def) => (
                <KPICard key={def.label} def={def} k={data} />
              ))
            : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgendaWidget />
        {data ? (
          <AlertasWidget kpis={data} />
        ) : (
          <Card className="p-5">
            <Skeleton className="h-4 w-32" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
