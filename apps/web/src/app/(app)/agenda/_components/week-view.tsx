"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  appointmentTypeLabel,
  type AppointmentRead,
} from "@/lib/appointments-api";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_HEIGHT = 56; // px per hour

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "scheduled":
      return "border-l-primary bg-primary/10 text-primary";
    case "confirmed":
      return "border-l-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "in_progress":
      return "border-l-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300";
    case "completed":
      return "border-l-slate-400 bg-slate-200/60 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";
    case "cancelled":
      return "border-l-rose-500 bg-rose-500/10 text-rose-700 line-through dark:text-rose-300";
    case "no_show":
      return "border-l-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    default:
      return "border-l-muted-foreground bg-muted text-foreground";
  }
}

function formatHm(d: Date): string {
  return d.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WeekView({
  weekStart,
  appointments,
  onPickSlot,
  onPickAppointment,
}: {
  weekStart: Date;
  appointments: AppointmentRead[];
  onPickSlot: (d: Date) => void;
  onPickAppointment: (id: string) => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const hours = useMemo(
    () =>
      Array.from(
        { length: HOUR_END - HOUR_START },
        (_, i) => HOUR_START + i,
      ),
    [],
  );

  const colHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

  const today = new Date();

  const handleSlotClick = (
    day: Date,
    evt: React.MouseEvent<HTMLDivElement>,
  ) => {
    const target = evt.currentTarget;
    const rect = target.getBoundingClientRect();
    const offsetY = evt.clientY - rect.top;
    const minutesFromStart = Math.max(0, Math.round(offsetY / HOUR_HEIGHT * 60 / 30) * 30);
    const clicked = new Date(day);
    clicked.setHours(HOUR_START, 0, 0, 0);
    clicked.setMinutes(clicked.getMinutes() + minutesFromStart);
    onPickSlot(clicked);
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="border-b border-r border-border bg-muted/40" />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r border-border bg-muted/40 px-2 py-2 text-center text-xs",
                isToday && "bg-primary/10 font-semibold text-primary",
              )}
            >
              <div className="uppercase tracking-wide">
                {DAY_NAMES[(day.getDay() + 6) % 7]}
              </div>
              <div className="text-base font-bold">{day.getDate()}</div>
            </div>
          );
        })}

        <div className="relative border-r border-border bg-muted/20" style={{ height: colHeight }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute right-1 text-[10px] text-muted-foreground"
              style={{ top: i * HOUR_HEIGHT - 6 }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayAppts = appointments.filter((a) =>
            isSameDay(new Date(a.starts_at), day),
          );

          return (
            <div
              key={day.toISOString()}
              className="relative border-r border-border"
              style={{ height: colHeight }}
              onClick={(e) => handleSlotClick(day, e)}
              role="button"
              tabIndex={0}
            >
              {hours.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute left-0 right-0 border-t border-border/60",
                    i === 0 && "border-t-0",
                  )}
                  style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}

              {dayAppts.map((a) => {
                const start = new Date(a.starts_at);
                const end = new Date(a.ends_at);
                const startMin = Math.max(
                  0,
                  (start.getHours() - HOUR_START) * 60 + start.getMinutes(),
                );
                const endMin = Math.min(
                  (HOUR_END - HOUR_START) * 60,
                  (end.getHours() - HOUR_START) * 60 + end.getMinutes(),
                );
                const top = (startMin / 60) * HOUR_HEIGHT;
                const height = Math.max(
                  24,
                  ((endMin - startMin) / 60) * HOUR_HEIGHT,
                );
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickAppointment(a.id);
                    }}
                    className={cn(
                      "absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-[11px] shadow-sm transition-all hover:shadow-md",
                      statusColor(a.status),
                    )}
                    style={{ top, height }}
                  >
                    <div className="truncate font-semibold">
                      {formatHm(start)} · {appointmentTypeLabel(a.type)}
                    </div>
                    {a.notes && (
                      <div className="truncate opacity-80">{a.notes}</div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
