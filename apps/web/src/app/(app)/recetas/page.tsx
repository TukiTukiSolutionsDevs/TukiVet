"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, PawPrint, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { petsApi, speciesLabel, type PetRead } from "@/lib/pets-api";
import { prescriptionsApi, statusLabel } from "@/lib/prescriptions-api";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function RecetasPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PetRead | null>(null);

  const petsQ = useQuery({
    queryKey: ["pets", "search-recetas", search],
    queryFn: () => petsApi.list({ q: search || undefined, page_size: 8 }),
    enabled: !!search && !selected,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Recetas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecciona un paciente para ver o emitir recetas.
        </p>
      </div>

      <Card className="space-y-3 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
            }}
            placeholder="Buscar mascota por nombre, raza o microchip…"
            className="pl-9"
            autoFocus
          />
        </div>

        {search && !selected && (
          <div className="max-h-72 space-y-1 overflow-auto rounded-md border border-border bg-card">
            {petsQ.isLoading ? (
              <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" /> Cargando…
              </div>
            ) : petsQ.data?.items.length ? (
              petsQ.data.items.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <PawPrint className="size-4" />
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {speciesLabel(p.species)}
                        {p.breed_name ? ` · ${p.breed_name}` : ""}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">Sin resultados.</div>
            )}
          </div>
        )}
      </Card>

      {selected && <PetPrescriptions pet={selected} />}
    </div>
  );
}

function PetPrescriptions({ pet }: { pet: PetRead }) {
  const q = useQuery({
    queryKey: ["prescriptions", "by-pet", pet.id],
    queryFn: () => prescriptionsApi.listForPet(pet.id),
  });

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PawPrint className="size-4" />
          </div>
          <div>
            <Link href={`/pacientes/${pet.id}`} className="text-sm font-semibold hover:underline">
              {pet.name}
            </Link>
            <div className="text-xs text-muted-foreground">
              {speciesLabel(pet.species)}
              {pet.breed_name ? ` · ${pet.breed_name}` : ""}
              {pet.current_weight_kg ? ` · ${pet.current_weight_kg} kg` : ""}
            </div>
          </div>
        </div>
        <Link
          href={`/recetas/nueva?pet_id=${pet.id}`}
          className={cn(buttonVariants({ size: "default" }))}
        >
          <FileText className="size-4" />
          Nueva receta
        </Link>
      </div>

      {q.isLoading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : q.data && q.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Diagnóstico</TableHead>
              <TableHead>Ítems</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => (window.location.href = `/recetas/${p.id}`)}
              >
                <TableCell className="text-sm">{formatDateShort(p.issued_at)}</TableCell>
                <TableCell className="text-sm">{p.diagnosis ?? "—"}</TableCell>
                <TableCell className="text-sm">{p.items.length}</TableCell>
                <TableCell>
                  <Badge variant="outline">{statusLabel(p.status)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="p-12 text-center text-sm text-muted-foreground">
          Sin recetas emitidas. Crea la primera con “Nueva receta”.
        </div>
      )}
    </Card>
  );
}
