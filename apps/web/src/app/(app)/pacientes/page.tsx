"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  PawPrint,
  Search,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  petsApi,
  SPECIES_LABELS,
  SPECIES_OPTIONS,
  sexLabel,
  speciesLabel,
  statusLabel,
  type Species,
} from "@/lib/pets-api";
import { formatPetAge } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewPatientDialog } from "./_components/new-patient-dialog";

const PAGE_SIZE = 20;

export default function PacientesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";

  const [q, setQ] = useState(initialQ);
  const [species, setSpecies] = useState<Species | "">("");
  const [microchip, setMicrochip] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);

  // Sincroniza q en la URL para enlace compartible y back-button
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
      const url = new URL(window.location.href);
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      router.replace(url.pathname + url.search, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [q, router]);

  // Reset page cuando cambia filtros
  useEffect(() => {
    setPage(1);
  }, [species, microchip]);

  const queryParams = useMemo(
    () => ({
      q: debouncedQ || undefined,
      species: species || undefined,
      microchip: microchip || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedQ, species, microchip, page],
  );

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["pets", "list", queryParams],
    queryFn: () => petsApi.list(queryParams),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Pacientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tutores y mascotas. Busca por nombre, microchip o teléfono.
          </p>
        </div>
        <NewPatientDialog />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, raza, color, alertas…"
              className="pl-9 pr-9"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Limpiar"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value as Species | "")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todas las especies</option>
            {SPECIES_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SPECIES_LABELS[s]}
              </option>
            ))}
          </select>
          <Input
            value={microchip}
            onChange={(e) => setMicrochip(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Microchip"
            inputMode="numeric"
          />
          {(species || microchip) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSpecies("");
                setMicrochip("");
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mascota</TableHead>
              <TableHead>Especie / Raza</TableHead>
              <TableHead>Sexo</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Microchip</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-destructive">
                  No pude cargar pacientes:{" "}
                  {error instanceof Error ? error.message : "error desconocido"}
                </TableCell>
              </TableRow>
            ) : data && data.items.length > 0 ? (
              data.items.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/pacientes/${p.id}`)}
                >
                  <TableCell>
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="flex items-center gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <PawPrint className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground hover:underline">
                          {p.name}
                        </div>
                        {p.color && (
                          <div className="text-xs text-muted-foreground">{p.color}</div>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">{speciesLabel(p.species)}</div>
                    {p.breed_name && (
                      <div className="text-xs text-muted-foreground">{p.breed_name}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{sexLabel(p.sex)}</TableCell>
                  <TableCell className="text-sm">
                    {formatPetAge(p.birth_date, p.birth_date_estimated)}
                  </TableCell>
                  <TableCell className="tnum text-sm">
                    {p.current_weight_kg ? `${p.current_weight_kg} kg` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.microchip ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-muted-foreground">
                    <PawPrint className="size-8" />
                    <div className="text-sm font-medium">Sin pacientes aún</div>
                    <p className="text-xs">
                      {debouncedQ || species || microchip
                        ? "Probá con otros filtros o crea un paciente nuevo."
                        : "Crea el primero con el botón “Nuevo paciente”."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data && data.items.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="text-muted-foreground">
              Mostrando <span className="text-foreground">{showingFrom}</span>–
              <span className="text-foreground">{showingTo}</span> de{" "}
              <span className="text-foreground">{total}</span>
              {isFetching && <span className="ml-2 text-xs">actualizando…</span>}
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

function StatusBadge({ status }: { status: string }) {
  const variant = status === "active" ? "default" : status === "deceased" ? "destructive" : "secondary";
  return (
    <Badge
      className={cn(
        variant === "default" && "bg-success/15 text-success hover:bg-success/20",
        variant === "destructive" && "bg-destructive/15 text-destructive hover:bg-destructive/20",
        variant === "secondary" && "bg-muted text-muted-foreground",
      )}
    >
      {statusLabel(status)}
    </Badge>
  );
}
