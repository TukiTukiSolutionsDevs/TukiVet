"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { appointmentsApi, type AppointmentRead } from "@/lib/appointments-api";
import { usersApi, isVeterinarian, type UserRead } from "@/lib/users-api";
import { WeekView } from "./_components/week-view";
import { NewAppointmentDialog } from "./_components/new-appointment-dialog";
import { AppointmentDetailDialog } from "./_components/appointment-detail-dialog";

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function formatRange(start: Date): string {
  const end = addDays(start, 6);
  const fmt = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}, ${end.getFullYear()}`;
}

export default function AgendaPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [selectedVet, setSelectedVet] = useState<string>("");
  const [newOpenSlot, setNewOpenSlot] = useState<Date | null>(null);
  const [openAppt, setOpenAppt] = useState<string | null>(null);

  const weekEnd = addDays(weekStart, 7);

  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
  });

  const vets = useMemo<UserRead[]>(
    () => (usersQ.data ?? []).filter(isVeterinarian),
    [usersQ.data],
  );

  const apptQ = useQuery({
    queryKey: [
      "appointments",
      weekStart.toISOString(),
      weekEnd.toISOString(),
      selectedVet,
    ],
    queryFn: () =>
      appointmentsApi.list({
        starts_at_from: weekStart.toISOString(),
        starts_at_to: weekEnd.toISOString(),
        veterinarian_id: selectedVet || undefined,
        page_size: 200,
      }),
  });

  const appointments: AppointmentRead[] = apptQ.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Agenda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calendario semanal por veterinario. Clic en un hueco crea una cita.
          </p>
        </div>
        <Button onClick={() => setNewOpenSlot(new Date())}>
          <Plus className="size-4" />
          Nueva cita
        </Button>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-md border border-input p-1.5 hover:bg-muted"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-md border border-input px-3 py-1 text-sm hover:bg-muted"
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-md border border-input p-1.5 hover:bg-muted"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="ml-3 text-sm font-medium">
            {formatRange(weekStart)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedVet("")}
            className={
              "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
              (selectedVet === ""
                ? "bg-primary text-primary-foreground"
                : "border border-input text-muted-foreground hover:bg-muted")
            }
          >
            Todos
          </button>
          {vets.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVet(v.id)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                (selectedVet === v.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-input text-muted-foreground hover:bg-muted")
              }
            >
              {v.full_name}
            </button>
          ))}
        </div>
      </Card>

      {apptQ.isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : (
        <WeekView
          weekStart={weekStart}
          appointments={appointments}
          onPickSlot={(date) => setNewOpenSlot(date)}
          onPickAppointment={(id) => setOpenAppt(id)}
        />
      )}

      {newOpenSlot && (
        <NewAppointmentDialog
          defaultDate={newOpenSlot}
          vets={vets}
          defaultVetId={selectedVet || vets[0]?.id || ""}
          onClose={() => setNewOpenSlot(null)}
        />
      )}

      {openAppt && (
        <AppointmentDetailDialog
          appointmentId={openAppt}
          onClose={() => setOpenAppt(null)}
        />
      )}
    </div>
  );
}
