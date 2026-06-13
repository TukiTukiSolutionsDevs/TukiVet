"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Scissors,
  Plus,
  Search,
  Calendar,
  PawPrint,
  User as UserIcon,
  Clock,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { encountersApi, encounterStatusLabel, type EncounterRead } from "@/lib/encounters-api";
import { petsApi, speciesLabel, type PetRead } from "@/lib/pets-api";
import { customersApi, customerFullName } from "@/lib/customers-api";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const GROOMING_SERVICES = [
  { value: "bath_brush", label: "Baño y cepillado" },
  { value: "bath_haircut", label: "Baño y corte" },
  { value: "full_groom", label: "Peluquería completa" },
  { value: "trim_only", label: "Recorte de puntas" },
  { value: "nail_trim", label: "Corte de uñas" },
  { value: "ear_cleaning", label: "Limpieza de oídos" },
  { value: "teeth_brushing", label: "Cepillado dental" },
  { value: "deshedding", label: "Deslanado / despelote" },
  { value: "medicated_bath", label: "Baño medicado" },
  { value: "flea_bath", label: "Baño antipulgas" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  closed: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  amended: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
};

function GroomingStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[status] ?? STATUS_COLORS.draft)}>
      {encounterStatusLabel(status)}
    </span>
  );
}

/* ---------------------------------------------------------------- New appointment dialog */

interface NewGroomingDialogProps {
  onClose: () => void;
}

function NewGroomingDialog({ onClose }: NewGroomingDialogProps) {
  const qc = useQueryClient();
  const router = useRouter();

  const [petSearch, setPetSearch] = useState("");
  const [selectedPet, setSelectedPet] = useState<PetRead | null>(null);
  const [service, setService] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

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
        type: "grooming",
        chief_complaint: service
          ? GROOMING_SERVICES.find((s) => s.value === service)?.label
          : "Peluquería",
        started_at: scheduledAt || null,
      });
      if (notes) {
        const soap = await encountersApi.getSoap(enc.id);
        await encountersApi.updateSoap(enc.id, {
          subjective: soap.subjective,
          objective: {
            ...soap.objective,
            grooming_details: { service, notes },
          },
          assessment: soap.assessment,
          plan: soap.plan,
        });
      }
      return enc;
    },
    onSuccess: (enc) => {
      qc.invalidateQueries({ queryKey: ["encounters", "list"] });
      toast.success("Cita de peluquería creada");
      onClose();
      router.push(`/encuentros/${enc.id}`);
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude crear la cita";
      toast.error(msg);
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="size-5 text-primary" />
            Nueva cita de peluquería
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

          {/* Service */}
          <div className="space-y-2">
            <Label>Servicio</Label>
            <Select value={service} onValueChange={(v) => setService(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Seleccionar servicio…" /></SelectTrigger>
              <SelectContent>
                {GROOMING_SERVICES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date/time */}
          <div className="space-y-2">
            <Label>Fecha y hora</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (instrucciones especiales)</Label>
            <Textarea
              placeholder="Pelo muy enredado, sensible en patas…"
              className="min-h-[80px] resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => createM.mutate()} disabled={createM.isPending || !selectedPet}>
            {createM.isPending ? "Creando…" : "Crear cita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Pet name cell helper */

function PetNameCell({ petId }: { petId: string }) {
  const q = useQuery({
    queryKey: ["pets", petId],
    queryFn: () => petsApi.get(petId),
    staleTime: 60_000,
  });
  if (q.isLoading) return <Skeleton className="h-4 w-20" />;
  if (!q.data) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <PawPrint className="size-3.5 text-muted-foreground" />
      {q.data.name}
      <span className="text-muted-foreground text-xs">({speciesLabel(q.data.species)})</span>
    </span>
  );
}

function CustomerNameCell({ customerId }: { customerId: string }) {
  const q = useQuery({
    queryKey: ["customers", customerId],
    queryFn: () => customersApi.get(customerId),
    staleTime: 60_000,
  });
  if (q.isLoading) return <Skeleton className="h-4 w-20" />;
  if (!q.data) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <UserIcon className="size-3.5 text-muted-foreground" />
      {customerFullName(q.data)}
    </span>
  );
}

/* ---------------------------------------------------------------- Main page */

export default function GroomingPage() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const listQ = useQuery({
    queryKey: ["encounters", "list", { type: "grooming", status: statusFilter, page }],
    queryFn: () =>
      encountersApi.list({
        ...(statusFilter ? { status: statusFilter as "draft" | "in_progress" | "closed" | "amended" } : {}),
        page,
        page_size: PAGE_SIZE,
      }),
  });

  // Filter client-side for grooming type since API may not support type filter
  const encounters: EncounterRead[] = (listQ.data?.items ?? []).filter(
    (e) => e.type === "grooming"
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scissors className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">Peluquería</h1>
            <p className="text-xs text-muted-foreground">Citas de baño, corte y estética</p>
          </div>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="size-4" />
          Nueva cita
        </Button>
      </div>

      {/* Filters */}
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" || !v ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mascota</TableHead>
              <TableHead>Tutor</TableHead>
              <TableHead>Servicio / Motivo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!listQ.isLoading && encounters.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Scissors className="size-8 text-muted-foreground/40" />
                    No hay citas de peluquería.
                  </div>
                </TableCell>
              </TableRow>
            )}
            {encounters.map((enc) => (
              <TableRow
                key={enc.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => router.push(`/encuentros/${enc.id}`)}
              >
                <TableCell className="font-medium">
                  <PetNameCell petId={enc.pet_id} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <CustomerNameCell customerId={enc.customer_id} />
                </TableCell>
                <TableCell className="text-sm">
                  {enc.chief_complaint ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {formatDateTime(enc.started_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <GroomingStatusBadge status={enc.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {listQ.data && listQ.data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              {listQ.data.total} citas · página {page}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page * PAGE_SIZE >= listQ.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showNew && <NewGroomingDialog onClose={() => setShowNew(false)} />}
    </div>
  );
}
