"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
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
import {
  appointmentsApi,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_OPTIONS,
  type AppointmentType,
} from "@/lib/appointments-api";
import { customersApi, customerFullName, type CustomerRead } from "@/lib/customers-api";
import { type UserRead } from "@/lib/users-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const DURATIONS = [15, 20, 30, 45, 60, 90];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(s: string): Date {
  return new Date(s);
}

export function NewAppointmentDialog({
  defaultDate,
  vets,
  defaultVetId,
  onClose,
}: {
  defaultDate: Date;
  vets: UserRead[];
  defaultVetId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState<CustomerRead | null>(null);
  const [petId, setPetId] = useState<string>("");
  const [vetId, setVetId] = useState(defaultVetId);
  const [type, setType] = useState<AppointmentType>("consultation");
  const [startsAt, setStartsAt] = useState(toLocalInputValue(defaultDate));
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setVetId(defaultVetId);
  }, [defaultVetId]);

  const customersQ = useQuery({
    queryKey: ["customers", "agenda-picker", search],
    queryFn: () =>
      customersApi.list({ q: search || undefined, page_size: 6 }),
    enabled: !customer && search.length >= 2,
  });

  const petsQ = useQuery({
    queryKey: ["customers", customer?.id ?? "", "pets"],
    queryFn: () => customersApi.listPets(customer!.id),
    enabled: !!customer,
  });

  const createM = useMutation({
    mutationFn: () => {
      if (!customer) throw new Error("Sin cliente");
      const start = fromLocalInputValue(startsAt);
      const end = new Date(start.getTime() + duration * 60_000);
      return appointmentsApi.create({
        customer_id: customer.id,
        pet_id: petId || null,
        veterinarian_id: vetId,
        type,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        notes: notes || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Cita agendada");
      onClose();
    },
    onError: (e) => toast.error(humanError(e, "No pude agendar la cita.")),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          <DialogDescription>
            Buscá al cliente, elegí mascota, vet y horario.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createM.mutate();
          }}
        >
          {!customer ? (
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Buscar por nombre, DNI o teléfono…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {search.length >= 2 && (
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {customersQ.data?.items.length === 0 ? (
                    <li className="py-3 text-center text-sm text-muted-foreground">
                      Sin resultados.
                    </li>
                  ) : (
                    customersQ.data?.items.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomer(c);
                            setSearch("");
                          }}
                          className={cn(
                            "w-full rounded-md border border-input p-2.5 text-left text-sm hover:bg-muted",
                          )}
                        >
                          <div className="font-medium">{customerFullName(c)}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.document_type} {c.document_number} ·{" "}
                            {c.phone_primary}
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-input bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{customerFullName(customer)}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.document_type} {customer.document_number}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomer(null);
                      setPetId("");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Cambiar
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Mascota</Label>
                <select
                  value={petId}
                  onChange={(e) => setPetId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— sin mascota específica —</option>
                  {petsQ.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Veterinario *</Label>
              <select
                value={vetId}
                onChange={(e) => setVetId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">— elegí —</option>
                {vets.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AppointmentType)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {APPOINTMENT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {APPOINTMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Inicio *</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Duración (min)</Label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de la consulta, instrucciones…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createM.isPending || !customer || !vetId}
            >
              {createM.isPending && <Loader2 className="size-4 animate-spin" />}
              Agendar
            </Button>
          </DialogFooter>
        </form>
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
