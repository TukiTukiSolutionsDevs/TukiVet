"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Loader2,
  PawPrint,
  Phone,
  Plus,
  Scale,
  Stethoscope,
  Syringe,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DocumentsTab } from "../_components/documents-tab";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import {
  petsApi,
  sexLabel,
  speciesLabel,
  statusLabel,
  type PetRead,
} from "@/lib/pets-api";
import { customersApi, customerFullName } from "@/lib/customers-api";
import {
  formatDateShort,
  formatDateTime,
  formatPetAge,
} from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { WeightChart } from "../_components/weight-chart";
import { NewEncounterDialog } from "../../encuentros/_components/new-encounter-dialog";
import { RecordVaccineDialog } from "../../vacunas/_components/record-vaccine-dialog";
import { buttonVariants } from "@/components/ui/button";

export default function PetDetailPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = use(params);

  const petQ = useQuery({
    queryKey: ["pets", petId],
    queryFn: () => petsApi.get(petId),
  });

  if (petQ.isLoading) {
    return <PetSkeleton />;
  }

  if (petQ.isError || !petQ.data) {
    return (
      <div className="space-y-4">
        <Link
          href="/pacientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <Card className="border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
          No pude cargar la mascota.
        </Card>
      </div>
    );
  }

  return <PetDetail pet={petQ.data} />;
}

function PetDetail({ pet }: { pet: PetRead }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/pacientes" className="hover:text-foreground">
          Pacientes
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{pet.name}</span>
      </div>

      <PetHeader pet={pet} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTab value="overview">Resumen</TabsTab>
          <TabsTab value="encounters">Encuentros</TabsTab>
          <TabsTab value="vaccines">Vacunas</TabsTab>
          <TabsTab value="prescriptions">Recetas</TabsTab>
          <TabsTab value="weight">Peso</TabsTab>
          <TabsTab value="documents">Documentos</TabsTab>
        </TabsList>

        <TabsPanel value="overview">
          <OverviewTab pet={pet} />
        </TabsPanel>
        <TabsPanel value="encounters">
          <EncountersTab pet={pet} />
        </TabsPanel>
        <TabsPanel value="vaccines">
          <VaccinesTab pet={pet} />
        </TabsPanel>
        <TabsPanel value="prescriptions">
          <PrescriptionsTab pet={pet} />
        </TabsPanel>
        <TabsPanel value="weight">
          <WeightTab petId={pet.id} />
        </TabsPanel>
        <TabsPanel value="documents">
          <DocumentsTab petId={pet.id} />
        </TabsPanel>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ Header */

function PetHeader({ pet }: { pet: PetRead }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PawPrint className="size-9" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {pet.name}
            </h1>
            <StatusBadge status={pet.status} />
            {pet.sterilized && (
              <Badge variant="outline" className="font-normal">
                Esterilizado
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {speciesLabel(pet.species)}
            {pet.breed_name ? ` · ${pet.breed_name}` : ""} · {sexLabel(pet.sex)}{" "}
            · {formatPetAge(pet.birth_date, pet.birth_date_estimated)}
          </p>

          {(pet.alerts?.length || pet.chronic_conditions?.length) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pet.alerts?.map((a) => (
                <Badge
                  key={a}
                  className="bg-warning/15 text-warning hover:bg-warning/20"
                >
                  ⚠ {a}
                </Badge>
              ))}
              {pet.chronic_conditions?.map((c) => (
                <Badge
                  key={c}
                  className="bg-info/15 text-info hover:bg-info/20"
                >
                  ◌ {c}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 text-right text-sm">
          <Stat
            label="Peso actual"
            value={
              pet.current_weight_kg ? `${pet.current_weight_kg} kg` : "—"
            }
            sub={
              pet.current_weight_at
                ? formatDateShort(pet.current_weight_at)
                : undefined
            }
          />
        </div>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tnum text-lg font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return (
      <Badge className="bg-success/15 text-success hover:bg-success/20">
        {statusLabel(status)}
      </Badge>
    );
  if (status === "deceased")
    return (
      <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">
        {statusLabel(status)}
      </Badge>
    );
  return <Badge variant="secondary">{statusLabel(status)}</Badge>;
}

/* ------------------------------------------------------------------ Tabs */

function OverviewTab({ pet }: { pet: PetRead }) {
  const customerQ = useQuery({
    queryKey: ["customers", pet.customer_id],
    queryFn: () => customersApi.get(pet.customer_id as string),
    enabled: !!pet.customer_id,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="space-y-4 p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-foreground">Datos clínicos</h3>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label="Especie" value={speciesLabel(pet.species)} />
          <Field label="Raza" value={pet.breed_name ?? "—"} />
          <Field label="Sexo" value={sexLabel(pet.sex)} />
          <Field
            label="Fecha de nacimiento"
            value={
              pet.birth_date
                ? `${formatDateShort(pet.birth_date)}${pet.birth_date_estimated ? " (aprox.)" : ""}`
                : "—"
            }
          />
          <Field label="Color" value={pet.color ?? "—"} />
          <Field label="Microchip" value={pet.microchip ?? "—"} />
          <Field
            label="Esterilizado"
            value={pet.sterilized ? "Sí" : "No"}
          />
          <Field
            label="Fecha esterilización"
            value={formatDateShort(pet.sterilization_date)}
          />
          <Field label="Estado" value={statusLabel(pet.status)} />
        </div>
        {pet.distinguishing_marks && (
          <div>
            <div className="text-xs text-muted-foreground">Marcas distintivas</div>
            <p className="mt-1 text-sm">{pet.distinguishing_marks}</p>
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserIcon className="size-4" /> Tutor
        </div>
        {customerQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : customerQ.data ? (
          <div className="space-y-2 text-sm">
            <div className="font-medium">{customerFullName(customerQ.data)}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {customerQ.data.document_type} {customerQ.data.document_number}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Phone className="size-3.5 text-muted-foreground" />
              {customerQ.data.phone_primary}
            </div>
            {customerQ.data.email && (
              <div className="text-xs text-muted-foreground">
                {customerQ.data.email}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Tutor no encontrado.</p>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function EncountersTab({ pet }: { pet: PetRead }) {
  const router = useRouter();
  const q = useQuery({
    queryKey: ["encounters", "by-pet", pet.id],
    queryFn: () => petsApi.listEncounters(pet.id, 100),
  });

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Stethoscope className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Encuentros clínicos</div>
            <div className="text-xs text-muted-foreground">Histórico de visitas y consultas</div>
          </div>
        </div>
        <NewEncounterDialog defaultPet={pet} />
      </div>
      {q.isLoading ? (
        <RowSkeleton />
      ) : q.data && q.data.items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data.items.map((e) => (
              <TableRow
                key={e.id}
                className="cursor-pointer"
                onClick={() => router.push(`/encuentros/${e.id}`)}
              >
                <TableCell className="text-sm">{formatDateTime(e.started_at)}</TableCell>
                <TableCell className="capitalize text-sm">{e.type}</TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {e.chief_complaint ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{e.status}</Badge>
                </TableCell>
                <TableCell className="tnum text-right text-sm">
                  S/ {e.total_amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyTab
          icon={<Stethoscope className="size-7" />}
          title="Sin encuentros aún"
          sub="Crea el primero con el botón “Nuevo encuentro”."
        />
      )}
    </Card>
  );
}

function VaccinesTab({ pet }: { pet: PetRead }) {
  const q = useQuery({
    queryKey: ["vaccines", "by-pet", pet.id],
    queryFn: () => petsApi.listVaccines(pet.id),
  });

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Syringe className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Vacunas aplicadas</div>
            <div className="text-xs text-muted-foreground">Histórico + próximas dosis</div>
          </div>
        </div>
        <RecordVaccineDialog defaultPet={pet} />
      </div>
      {q.isLoading ? (
        <RowSkeleton />
      ) : q.data && q.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vacuna</TableHead>
              <TableHead>Aplicada</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Dosis</TableHead>
              <TableHead>Próxima</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="text-sm">{v.vaccine_name ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {formatDateShort(v.administered_at)}
                </TableCell>
                <TableCell className="font-mono text-xs">{v.lot_number ?? "—"}</TableCell>
                <TableCell className="text-sm">{v.dose_number ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {v.next_dose_due_date ? formatDateShort(v.next_dose_due_date) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyTab
          icon={<Syringe className="size-7" />}
          title="Sin vacunas registradas"
          sub="Usa “Registrar aplicación” para añadir la primera."
        />
      )}
    </Card>
  );
}

function PrescriptionsTab({ pet }: { pet: PetRead }) {
  const router = useRouter();
  const q = useQuery({
    queryKey: ["prescriptions", "by-pet", pet.id],
    queryFn: () => petsApi.listPrescriptions(pet.id),
  });

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Recetas emitidas</div>
            <div className="text-xs text-muted-foreground">Histórico de prescripciones</div>
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
        <RowSkeleton />
      ) : q.data && q.data.length > 0 ? (
        <div className="divide-y divide-border">
          {q.data.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => router.push(`/recetas/${p.id}`)}
              className="block w-full cursor-pointer px-5 py-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">
                    {formatDateShort(p.issued_at)}
                    {p.diagnosis ? ` · ${p.diagnosis}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.items.length} ítem(s)
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{p.status}</Badge>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {p.items.map((it) => (
                  <li key={it.id}>
                    <span className="text-foreground">{it.medication_name}</span>
                    {it.frequency ? ` · ${it.frequency}` : ""}
                    {it.duration_days ? ` × ${it.duration_days}d` : ""}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      ) : (
        <EmptyTab
          icon={<FileText className="size-7" />}
          title="Sin recetas emitidas"
          sub="Usa “Nueva receta” para emitir la primera."
        />
      )}
    </Card>
  );
}

function WeightTab({ petId }: { petId: string }) {
  const qc = useQueryClient();
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const q = useQuery({
    queryKey: ["pets", petId, "weights"],
    queryFn: () => petsApi.listWeights(petId),
  });

  const recordM = useMutation({
    mutationFn: () =>
      petsApi.recordWeight(petId, {
        weight_kg: weight,
        notes: notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets", petId, "weights"] });
      qc.invalidateQueries({ queryKey: ["pets", petId] });
      qc.invalidateQueries({ queryKey: ["pets", "list"] });
      setWeight("");
      setNotes("");
      toast.success("Peso registrado");
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude registrar.";
      toast.error(msg);
    },
  });

  const onSubmit = () => {
    const n = Number(weight);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Peso inválido");
      return;
    }
    recordM.mutate();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="space-y-4 p-5">
        <SectionHeader
          icon={<Scale className="size-4" />}
          title="Histórico de pesos"
          sub={q.data ? `${q.data.length} registro(s)` : undefined}
          flat
        />
        {q.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : q.data && q.data.length > 0 ? (
          <>
            <WeightChart weights={q.data} />
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...q.data]
                  .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())
                  .map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm">{formatDateTime(w.measured_at)}</TableCell>
                      <TableCell className="tnum text-sm">{w.weight_kg} kg</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{w.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Sin pesos registrados. Anota el primero para iniciar la curva.
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Plus className="size-4" /> Registrar nuevo peso
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight_kg">Peso (kg)</Label>
          <Input
            id="weight_kg"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(",", "."))}
            placeholder="12.4"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight_notes">Notas (opc.)</Label>
          <Input
            id="weight_notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Control mensual"
          />
        </div>
        <Button onClick={onSubmit} disabled={recordM.isPending} className="w-full">
          {recordM.isPending && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Atoms */

function SectionHeader({
  icon,
  title,
  sub,
  flat,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  flat?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 py-3",
        !flat && "border-b border-border bg-muted/30",
      )}
    >
      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function EmptyTab({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <p className="max-w-md text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="space-y-2 p-5">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function PetSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Skeleton className="size-20 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </Card>
      <Skeleton className="h-10 w-96 rounded-lg" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

