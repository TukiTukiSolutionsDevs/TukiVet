"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  Calendar,
  CalendarCheck,
  LogIn,
  LogOut,
  PawPrint,
  Plus,
  Search,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { encountersApi, encounterStatusLabel, type EncounterRead } from "@/lib/encounters-api";
import { petsApi, speciesLabel, type PetRead } from "@/lib/pets-api";
import { customersApi, customerFullName, type CustomerRead } from "@/lib/customers-api";
import { formatDateTime, formatDateShort } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- New boarding dialog */

interface NewBoardingDialogProps {
  onClose: () => void;
}

function NewBoardingDialog({ onClose }: NewBoardingDialogProps) {
  const qc = useQueryClient();
  const router = useRouter();

  const [petSearch, setPetSearch] = useState("");
  const [selectedPet, setSelectedPet] = useState<PetRead | null>(null);
  const [cageNumber, setCageNumber] = useState("");
  const [checkInAt, setCheckInAt] = useState("");
  const [expectedCheckOut, setExpectedCheckOut] = useState("");
  const [feedingInstructions, setFeedingInstructions] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  const petsQ = useQuery({
    queryKey: ["pets", "search", petSearch],
    queryFn: () => petsApi.list({ q: petSearch, page_size: 8 }),
    enabled: petSearch.length >= 2,
  });

  const createM = useMutation({
    mutationFn: async () => {
      if (!selectedPet) throw new Error("Selecciona una mascota");
      const enc = await encountersApi.create({
        pet_id: selectedPet.id,
        customer_id: selectedPet.customer_id ?? "",
        type: "boarding",
        chief_complaint: `Hospedaje${cageNumber ? ` · Jaula ${cageNumber}` : ""}`,
        started_at: checkInAt || null,
      });
      const soap = await encountersApi.getSoap(enc.id);
      await encountersApi.updateSoap(enc.id, {
        subjective: soap.subjective,
        objective: {
          ...soap.objective,
          boarding_details: {
            cage_number: cageNumber,
            expected_checkout: expectedCheckOut,
            feeding_instructions: feedingInstructions,
            special_notes: specialNotes,
          },
        },
        assessment: soap.assessment,
        plan: soap.plan,
      });
      return enc;
    },
    onSuccess: (enc) => {
      qc.invalidateQueries({ queryKey: ["encounters", "list"] });
      toast.success("Hospedaje registrado");
      onClose();
      router.push(`/encuentros/${enc.id}`);
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude registrar";
      toast.error(msg);
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="size-5 text-primary" />
            Nuevo ingreso de hospedaje
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Pet search */}
          <div className="space-y-2">
            <Label>Mascota</Label>
            {selectedPet ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <PawPrint className="size-4 text-primary" />
                  <span className="text-sm font-medium">{selectedPet.name}</span>
                  <span className="text-xs text-muted-foreground">{speciesLabel(selectedPet.species)}</span>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setSelectedPet(null); setPetSearch(""); }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nombre o tutor…"
                    value={petSearch}
                    onChange={(e) => setPetSearch(e.target.value)}
                  />
                </div>
                {petsQ.data && petsQ.data.items.length > 0 && (
                  <div className="rounded-lg border border-border bg-popover shadow-sm">
                    {petsQ.data.items.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60 first:rounded-t-lg last:rounded-b-lg"
                        onClick={() => { setSelectedPet(p); setPetSearch(""); }}
                      >
                        <PawPrint className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">{speciesLabel(p.species)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {petSearch.length >= 2 && petsQ.data?.items.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                )}
              </div>
            )}
          </div>

          {/* Cage number */}
          <div className="space-y-2">
            <Label>Jaula / Habitación</Label>
            <Input
              placeholder="Ej: A-03"
              value={cageNumber}
              onChange={(e) => setCageNumber(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha y hora de ingreso</Label>
              <Input
                type="datetime-local"
                value={checkInAt}
                onChange={(e) => setCheckInAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Salida estimada</Label>
              <Input
                type="datetime-local"
                value={expectedCheckOut}
                onChange={(e) => setExpectedCheckOut(e.target.value)}
              />
            </div>
          </div>

          {/* Feeding */}
          <div className="space-y-2">
            <Label>Instrucciones de alimentación</Label>
            <Textarea
              className="min-h-[70px] resize-none"
              placeholder="Cantidad, horario, tipo de alimento…"
              value={feedingInstructions}
              onChange={(e) => setFeedingInstructions(e.target.value)}
            />
          </div>

          {/* Special notes */}
          <div className="space-y-2">
            <Label>Notas especiales</Label>
            <Textarea
              className="min-h-[60px] resize-none"
              placeholder="Medicamentos, condiciones de salud, comportamiento…"
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => createM.mutate()} disabled={createM.isPending || !selectedPet}>
            {createM.isPending ? "Registrando…" : "Registrar ingreso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Boarder card */

function PetInfoCell({ petId }: { petId: string }) {
  const q = useQuery({ queryKey: ["pets", petId], queryFn: () => petsApi.get(petId), staleTime: 60_000 });
  if (q.isLoading) return <Skeleton className="h-4 w-24" />;
  if (!q.data) return null;
  return (
    <div>
      <div className="font-semibold text-foreground">{q.data.name}</div>
      <div className="text-xs text-muted-foreground">{speciesLabel(q.data.species)}{q.data.breed_name ? ` · ${q.data.breed_name}` : ""}</div>
    </div>
  );
}

function OwnerCell({ customerId }: { customerId: string }) {
  const q = useQuery({ queryKey: ["customers", customerId], queryFn: () => customersApi.get(customerId), staleTime: 60_000 });
  if (q.isLoading) return <Skeleton className="h-4 w-20" />;
  if (!q.data) return null;
  return (
    <div className="text-sm text-muted-foreground">
      <div>{customerFullName(q.data)}</div>
      {q.data.phone_primary && <div className="text-xs">{q.data.phone_primary}</div>}
    </div>
  );
}

function BoarderCard({ enc, onClick }: { enc: EncounterRead; onClick: () => void }) {
  const isActive = enc.status !== "closed" && enc.status !== "amended";
  const cageMatch = enc.chief_complaint?.match(/Jaula\s+(\S+)/);
  const cage = cageMatch ? cageMatch[1] : "—";

  return (
    <Card
      className={cn(
        "cursor-pointer p-5 space-y-3 hover:border-primary/50 transition-colors",
        !isActive && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <PawPrint className="size-5" />
          </div>
          <PetInfoCell petId={enc.pet_id} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            isActive
              ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          )}>
            {isActive ? "Alojado" : "Check-out"}
          </span>
          <span className="text-xs font-mono text-muted-foreground">🏠 {cage}</span>
        </div>
      </div>

      {enc.customer_id && <OwnerCell customerId={enc.customer_id} />}

      <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <LogIn className="size-3.5" />
          {formatDateShort(enc.started_at)}
        </span>
        {enc.closed_at && (
          <span className="flex items-center gap-1">
            <LogOut className="size-3.5" />
            {formatDateShort(enc.closed_at)}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- Main page */

export default function HospedajePage() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const listQ = useQuery({
    queryKey: ["encounters", "list", { type: "boarding", showAll }],
    queryFn: () =>
      encountersApi.list({
        ...(showAll ? {} : { status: "in_progress" }),
        page_size: 50,
      }),
    refetchInterval: 60_000,
  });

  const encounters: EncounterRead[] = (listQ.data?.items ?? []).filter(
    (e) => e.type === "boarding"
  );

  const active = encounters.filter((e) => e.status !== "closed" && e.status !== "amended");
  const past = encounters.filter((e) => e.status === "closed" || e.status === "amended");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BedDouble className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">Hotel / Hospedaje</h1>
            <p className="text-xs text-muted-foreground">
              {active.length} mascota{active.length !== 1 ? "s" : ""} alojada{active.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Solo activos" : "Ver historial"}
          </Button>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="size-4" />
            Nuevo ingreso
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<BedDouble className="size-5" />} label="Alojados" value={active.length} color="text-primary" />
        <StatCard icon={<LogIn className="size-5" />} label="Total registrados" value={encounters.length} color="text-muted-foreground" />
        <StatCard icon={<LogOut className="size-5" />} label="Check-out hoy" value={0} color="text-amber-600" />
        <StatCard icon={<CalendarCheck className="size-5" />} label="Ingresos hoy" value={0} color="text-green-600" />
      </div>

      {/* Loading */}
      {listQ.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))}
        </div>
      )}

      {/* Active boarders */}
      {!listQ.isLoading && active.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Actualmente alojados
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((enc) => (
              <BoarderCard
                key={enc.id}
                enc={enc}
                onClick={() => router.push(`/encuentros/${enc.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past boarders */}
      {showAll && past.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Historial
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((enc) => (
              <BoarderCard
                key={enc.id}
                enc={enc}
                onClick={() => router.push(`/encuentros/${enc.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty */}
      {!listQ.isLoading && encounters.length === 0 && (
        <Card className="py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <BedDouble className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No hay mascotas alojadas actualmente.
            </p>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="size-4" /> Registrar primer ingreso
            </Button>
          </div>
        </Card>
      )}

      {showNew && <NewBoardingDialog onClose={() => setShowNew(false)} />}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("shrink-0", color)}>{icon}</div>
      <div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
