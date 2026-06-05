"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CalendarX,
  PackageOpen,
  PawPrint,
  Stethoscope,
  Syringe,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

      <Card className="p-6">
        <div className="text-sm font-semibold">Próximos sprints</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Agenda del día, lista de tareas urgentes y log de WhatsApp se sumarán
          en los siguientes sprints F2–F4. Mientras, ya puedes navegar el shell
          completo.
        </p>
      </Card>
    </div>
  );
}
