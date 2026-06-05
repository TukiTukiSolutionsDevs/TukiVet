"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  PawPrint,
  Stethoscope,
} from "lucide-react";
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
  encountersApi,
  encounterStatusLabel,
  encounterTypeLabel,
  ENCOUNTER_STATUS_LABELS,
  type EncounterRead,
  type EncounterStatus,
} from "@/lib/encounters-api";
import { petsApi, type PetRead } from "@/lib/pets-api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewEncounterDialog } from "./_components/new-encounter-dialog";

const PAGE_SIZE = 20;

export default function EncuentrosPage() {
  const router = useRouter();
  const [status, setStatus] = useState<EncounterStatus | "">("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const params = useMemo(
    () => ({
      status: status || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [status, page],
  );

  const listQ = useQuery({
    queryKey: ["encounters", "list", params],
    queryFn: () => encountersApi.list(params),
    placeholderData: keepPreviousData,
  });

  // Trae el pet de cada encuentro en paralelo para mostrar el nombre
  const petIds = Array.from(new Set((listQ.data?.items ?? []).map((e) => e.pet_id)));
  const petsQs = useQueries({
    queries: petIds.map((id) => ({
      queryKey: ["pets", id],
      queryFn: () => petsApi.get(id),
      enabled: !!id,
    })),
  });
  const petMap = new Map<string, PetRead>();
  petsQs.forEach((q, i) => {
    if (q.data) petMap.set(petIds[i], q.data);
  });

  const total = listQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Encuentros clínicos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visitas, consultas y SOAP por paciente.
          </p>
        </div>
        <NewEncounterDialog />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label="Todos" active={status === ""} onClick={() => setStatus("")} />
          {(Object.keys(ENCOUNTER_STATUS_LABELS) as EncounterStatus[]).map((s) => (
            <FilterChip
              key={s}
              label={ENCOUNTER_STATUS_LABELS[s]}
              active={status === s}
              onClick={() => setStatus(s)}
            />
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : listQ.isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                  Error al cargar encuentros.
                </TableCell>
              </TableRow>
            ) : listQ.data && listQ.data.items.length > 0 ? (
              listQ.data.items.map((e) => (
                <EncounterRow key={e.id} encounter={e} pet={petMap.get(e.pet_id)} onClick={() => router.push(`/encuentros/${e.id}`)} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-muted-foreground">
                    <Stethoscope className="size-8" />
                    <div className="text-sm font-medium">Sin encuentros aún</div>
                    <p className="text-xs">
                      {status
                        ? "Cambia el filtro o crea uno nuevo."
                        : "Crea el primero con el botón “Nuevo encuentro”."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {listQ.data && listQ.data.items.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="text-muted-foreground">
              <span className="text-foreground">{showingFrom}</span>–
              <span className="text-foreground">{showingTo}</span> de{" "}
              <span className="text-foreground">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
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

function EncounterRow({
  encounter,
  pet,
  onClick,
}: {
  encounter: EncounterRead;
  pet: PetRead | undefined;
  onClick: () => void;
}) {
  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell className="whitespace-nowrap text-sm">
        {formatDateTime(encounter.started_at)}
      </TableCell>
      <TableCell>
        {pet ? (
          <Link
            href={`/pacientes/${pet.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:underline"
          >
            <PawPrint className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{pet.name}</span>
          </Link>
        ) : (
          <Skeleton className="h-4 w-24" />
        )}
      </TableCell>
      <TableCell className="text-sm">
        {encounterTypeLabel(encounter.type)}
      </TableCell>
      <TableCell className="max-w-xs truncate text-sm">
        {encounter.chief_complaint ?? "—"}
      </TableCell>
      <TableCell>
        <StatusBadge status={encounter.status} />
      </TableCell>
      <TableCell className="tnum text-right text-sm">
        S/ {encounter.total_amount}
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    in_progress: "bg-info/15 text-info hover:bg-info/20",
    closed: "bg-success/15 text-success hover:bg-success/20",
    amended: "bg-warning/15 text-warning hover:bg-warning/20",
  };
  return (
    <Badge className={cn(map[status] ?? "bg-muted text-muted-foreground")}>
      {encounterStatusLabel(status)}
    </Badge>
  );
}
