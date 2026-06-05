"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  Package,
  Pill,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  prescriptionsApi,
  routeLabel,
  statusLabel,
  type PrescriptionItemRead,
  type PrescriptionRead,
} from "@/lib/prescriptions-api";
import { petsApi, type PetRead } from "@/lib/pets-api";
import { formatDateShort, formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const q = useQuery({
    queryKey: ["prescriptions", id],
    queryFn: () => prescriptionsApi.get(id),
  });

  if (q.isLoading) return <Skeleton className="h-96 w-full" />;

  if (q.isError || !q.data) {
    return (
      <Card className="border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
        No pude cargar la receta.
      </Card>
    );
  }

  return <PrescriptionDetail prescription={q.data} />;
}

function PrescriptionDetail({ prescription }: { prescription: PrescriptionRead }) {
  const qc = useQueryClient();
  const petQ = useQuery({
    queryKey: ["pets", prescription.pet_id],
    queryFn: () => petsApi.get(prescription.pet_id),
  });

  const voidM = useMutation({
    mutationFn: () => prescriptionsApi.void(prescription.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prescriptions", prescription.id] });
      qc.invalidateQueries({ queryKey: ["prescriptions", "by-pet", prescription.pet_id] });
      toast.success("Receta anulada");
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude anular.";
      toast.error(msg);
    },
  });

  const isVoid = prescription.status === "void";
  const isFullyDispensed = prescription.status === "dispensed_full";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/recetas" className="hover:text-foreground">
          Recetas
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">
          {formatDateShort(prescription.issued_at)}
        </span>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">
                  Receta {prescription.id.slice(0, 8)}…
                </h1>
                <StatusBadge status={prescription.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                Emitida {formatDateTime(prescription.issued_at)}
              </div>
              {prescription.diagnosis && (
                <div className="mt-1 text-sm">
                  <span className="font-medium">Diagnóstico:</span>{" "}
                  <span className="text-muted-foreground">{prescription.diagnosis}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isVoid && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("¿Anular esta receta?")) voidM.mutate();
                }}
                disabled={voidM.isPending}
              >
                {voidM.isPending ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                Anular
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <PetCard pet={petQ.data} loading={petQ.isLoading} />

        <div className="space-y-3">
          {prescription.items.map((item, i) => (
            <PrescriptionItemCard
              key={item.id}
              item={item}
              index={i}
              prescriptionId={prescription.id}
              readOnly={isVoid || isFullyDispensed}
            />
          ))}
          {prescription.notes && (
            <Card className="p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notas internas
              </div>
              <div className="mt-1">{prescription.notes}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PetCard({ pet, loading }: { pet?: PetRead; loading: boolean }) {
  if (loading) return <Skeleton className="h-24" />;
  if (!pet) return null;
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Paciente
      </div>
      <Link
        href={`/pacientes/${pet.id}`}
        className="mt-1 block text-base font-semibold hover:underline"
      >
        {pet.name}
      </Link>
      <div className="text-xs text-muted-foreground">
        {pet.breed_name ?? pet.species}
        {pet.current_weight_kg ? ` · ${pet.current_weight_kg} kg` : ""}
      </div>
      {pet.alerts && pet.alerts.length > 0 && (
        <>
          <Separator className="my-3" />
          <div className="flex flex-wrap gap-1.5">
            {pet.alerts.map((a) => (
              <Badge key={a} className="bg-warning/15 text-warning">
                ⚠ {a}
              </Badge>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function PrescriptionItemCard({
  item,
  index,
  prescriptionId,
  readOnly,
}: {
  item: PrescriptionItemRead;
  index: number;
  prescriptionId: string;
  readOnly: boolean;
}) {
  const remaining = Number(item.quantity) - Number(item.dispensed_qty);
  const isFullyDispensed = remaining <= 0;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="tnum w-6 text-center text-sm text-muted-foreground">#{index + 1}</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill className="size-3.5 text-primary" />
              <div className="text-sm font-semibold">{item.medication_name}</div>
              {item.is_controlled && (
                <Badge className="bg-warning/15 text-warning">
                  <ShieldAlert className="size-3" />
                  Controlado
                </Badge>
              )}
              {isFullyDispensed && (
                <Badge className="bg-success/15 text-success">
                  <Check className="size-3" />
                  Dispensada
                </Badge>
              )}
            </div>
            {item.active_ingredient && (
              <div className="text-xs text-muted-foreground">{item.active_ingredient}</div>
            )}
            {item.presentation && (
              <div className="text-xs text-muted-foreground">{item.presentation}</div>
            )}
            <div className="mt-2 grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-4">
              <Stat label="Cantidad" value={`${item.quantity}`} />
              {item.frequency && <Stat label="Frecuencia" value={item.frequency} />}
              {item.duration_days && (
                <Stat label="Duración" value={`${item.duration_days} días`} />
              )}
              {item.route && <Stat label="Vía" value={routeLabel(item.route)} />}
              {item.dose_mg_per_kg && (
                <Stat label="Dosis" value={`${item.dose_mg_per_kg} mg/kg`} />
              )}
              {item.total_dose_mg && (
                <Stat label="Total" value={`${item.total_dose_mg} mg`} />
              )}
            </div>
            {item.instructions && (
              <div className="mt-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs">
                <span className="font-semibold">Para el tutor: </span>
                {item.instructions}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="size-3" />
              Dispensado: {item.dispensed_qty} / {item.quantity}
              {item.dispensed_at && (
                <> · último {formatDateTime(item.dispensed_at)}</>
              )}
            </div>
          </div>
        </div>
        {!readOnly && !isFullyDispensed && (
          <DispenseDialog
            prescriptionId={prescriptionId}
            item={item}
            remaining={remaining}
          />
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    issued: "bg-info/15 text-info",
    dispensed_partial: "bg-warning/15 text-warning",
    dispensed_full: "bg-success/15 text-success",
    void: "bg-destructive/15 text-destructive",
  };
  return <Badge className={cn(map[status] ?? "bg-muted text-muted-foreground")}>{statusLabel(status)}</Badge>;
}

function DispenseDialog({
  prescriptionId,
  item,
  remaining,
}: {
  prescriptionId: string;
  item: PrescriptionItemRead;
  remaining: number;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(remaining.toString());
  const [witness, setWitness] = useState("");

  const dispenseM = useMutation({
    mutationFn: () =>
      prescriptionsApi.dispense(prescriptionId, item.id, {
        quantity,
        witness_user_id: item.is_controlled ? witness.trim() || null : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prescriptions", prescriptionId] });
      toast.success("Dispensado");
      setOpen(false);
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude dispensar.";
      toast.error(msg);
    },
  });

  function isValid(): boolean {
    const n = Number(quantity);
    if (!Number.isFinite(n) || n <= 0 || n > remaining) return false;
    if (item.is_controlled && witness.trim().length < 5) return false;
    return true;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Package className="size-3.5" />
            Dispensar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispensar {item.medication_name}</DialogTitle>
          <DialogDescription>
            Pendiente {remaining}. {item.is_controlled ? "Requiere testigo (controlado)." : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cantidad a dispensar</Label>
            <Input
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(",", "."))}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Máximo {remaining}
            </p>
          </div>
          {item.is_controlled && (
            <div className="space-y-1.5">
              <Label>ID de usuario testigo</Label>
              <Input
                value={witness}
                onChange={(e) => setWitness(e.target.value)}
                placeholder="ULID del usuario que atestigua"
              />
              <p className="text-[11px] text-muted-foreground">
                Producto controlado: el testigo queda en auditoría.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={dispenseM.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => dispenseM.mutate()} disabled={!isValid() || dispenseM.isPending}>
            {dispenseM.isPending && <Loader2 className="size-4 animate-spin" />}
            Dispensar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

