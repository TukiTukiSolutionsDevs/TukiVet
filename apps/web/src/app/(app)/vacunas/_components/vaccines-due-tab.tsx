"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  MessageCircle,
  Syringe,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  vaccinesApi,
  type VaccineDueRow,
} from "@/lib/vaccines-api";
import { notificationsApi } from "@/lib/notifications-api";
import { formatDateShort } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { RecordVaccineDialog } from "./record-vaccine-dialog";
import { petsApi } from "@/lib/pets-api";

const WINDOW_OPTIONS = [
  { v: 0, label: "Vencidas" },
  { v: 30, label: "Próximas 30 días" },
  { v: 60, label: "Próximas 60 días" },
  { v: 90, label: "Próximas 90 días" },
];

export function VaccinesDueTab() {
  const [daysWindow, setDaysWindow] = useState(30);

  const q = useQuery({
    queryKey: ["vaccines", "due", daysWindow],
    queryFn: () => vaccinesApi.listDue(daysWindow),
  });

  const overdue = (q.data ?? []).filter((r) => r.days_overdue >= 0);
  const upcoming = (q.data ?? []).filter((r) => r.days_overdue < 0);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {WINDOW_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.v}
                label={opt.label}
                active={daysWindow === opt.v}
                onClick={() => setDaysWindow(opt.v)}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            {q.data ? `${q.data.length} resultado(s)` : ""}
          </div>
        </div>
      </Card>

      {q.isLoading ? (
        <Card className="p-6">
          <Skeleton className="h-32 w-full" />
        </Card>
      ) : !q.data || q.data.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarClock className="mx-auto size-8 text-muted-foreground" />
          <div className="mt-2 text-sm font-medium">Sin vacunas pendientes</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuando un paciente necesite refuerzo aparecerá acá.
          </p>
        </Card>
      ) : (
        <>
          {overdue.length > 0 && (
            <DueTable rows={overdue} title="Vencidas" overdue />
          )}
          {upcoming.length > 0 && (
            <DueTable rows={upcoming} title="Próximas" />
          )}
        </>
      )}
    </div>
  );
}

function DueTable({
  rows,
  title,
  overdue,
}: {
  rows: VaccineDueRow[];
  title: string;
  overdue?: boolean;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
        {overdue ? (
          <AlertTriangle className="size-4 text-destructive" />
        ) : (
          <CalendarClock className="size-4 text-info" />
        )}
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <Badge variant="outline" className="text-[10px]">
          {rows.length}
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mascota</TableHead>
            <TableHead>Tutor</TableHead>
            <TableHead>Vacuna</TableHead>
            <TableHead>Vence</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <DueRow key={`${row.pet_id}-${row.vaccine_id}`} row={row} />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function DueRow({ row }: { row: VaccineDueRow }) {
  const sendM = useMutation({
    mutationFn: () =>
      notificationsApi.send({
        channel: "whatsapp",
        recipient: row.customer_phone,
        template_code: "vet_vaccine_due",
        customer_id: row.customer_id,
        variables: {
          customer_name: row.customer_name,
          pet_name: row.pet_name,
          vaccine_name: row.vaccine_name,
          due_date: formatDateShort(row.next_dose_due_date),
        },
      }),
    onSuccess: (res) => {
      if (res.status === "failed") {
        toast.error(`Falló: ${res.error_message ?? "error desconocido"}`);
      } else {
        toast.success(`WhatsApp enviado a ${row.customer_name}`);
      }
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude enviar.";
      toast.error(msg);
    },
  });

  // Necesitamos un PetRead para el dialog de aplicar; lo derivamos on-demand.
  const petQ = useQuery({
    queryKey: ["pets", row.pet_id],
    queryFn: () => petsApi.get(row.pet_id),
    enabled: false, // solo cuando se abra el dialog
  });

  return (
    <TableRow>
      <TableCell>
        <Link href={`/pacientes/${row.pet_id}`} className="text-sm font-medium hover:underline">
          {row.pet_name}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.customer_name}</TableCell>
      <TableCell className="text-sm">{row.vaccine_name}</TableCell>
      <TableCell className="text-sm">{formatDateShort(row.next_dose_due_date)}</TableCell>
      <TableCell>
        {row.days_overdue >= 0 ? (
          <Badge className={cn("bg-destructive/15 text-destructive")}>
            Vencida {row.days_overdue}d
          </Badge>
        ) : (
          <Badge className={cn("bg-info/15 text-info")}>
            En {Math.abs(row.days_overdue)}d
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            onClick={() => sendM.mutate()}
            disabled={sendM.isPending}
            title="Enviar recordatorio por WhatsApp"
          >
            {sendM.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <MessageCircle className="size-3" />
            )}
            WhatsApp
          </Button>
          <RecordVaccineDialog
            defaultPet={petQ.data ?? undefined}
            defaultVaccineId={row.vaccine_id}
            trigger={
              <Button
                size="xs"
                onMouseEnter={() => petQ.refetch()}
                onFocus={() => petQ.refetch()}
                title="Registrar aplicación"
              >
                <Syringe className="size-3" />
                Aplicar
              </Button>
            }
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
