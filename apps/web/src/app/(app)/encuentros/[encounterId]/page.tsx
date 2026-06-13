"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Lock,
  PawPrint,
  Phone,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  encountersApi,
  encounterStatusLabel,
  encounterTypeLabel,
  type EncounterRead,
} from "@/lib/encounters-api";
import { petsApi, sexLabel, speciesLabel, type PetRead } from "@/lib/pets-api";
import { customersApi, customerFullName, type CustomerRead } from "@/lib/customers-api";
import { formatDateTime, formatPetAge } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SoapEditor } from "../_components/soap-editor";
import { VitalSignsForm } from "../_components/vital-signs-form";
import { ProblemsList } from "../_components/problems-list";
import { AmendDialog } from "../_components/amend-dialog";
import { HospitalizationPanel } from "../_components/hospitalization-panel";
import { OphthalmicPanel } from "../_components/ophthalmic-panel";
import { DermatologyPanel } from "../_components/dermatology-panel";
import { AiAssistant } from "../_components/ai-assistant";
import { DocumentsGallery } from "../_components/documents-gallery";

export default function EncounterDetailPage({
  params,
}: {
  params: Promise<{ encounterId: string }>;
}) {
  const { encounterId } = use(params);

  const encQ = useQuery({
    queryKey: ["encounters", encounterId],
    queryFn: () => encountersApi.get(encounterId),
  });

  if (encQ.isLoading) {
    return <DetailSkeleton />;
  }

  if (encQ.isError || !encQ.data) {
    return (
      <div className="space-y-4">
        <Link
          href="/encuentros"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <Card className="border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
          No pude cargar el encuentro.
        </Card>
      </div>
    );
  }

  return <EncounterDetail encounter={encQ.data} />;
}

function EncounterDetail({ encounter }: { encounter: EncounterRead }) {
  const qc = useQueryClient();
  const petQ = useQuery({
    queryKey: ["pets", encounter.pet_id],
    queryFn: () => petsApi.get(encounter.pet_id),
  });
  const custQ = useQuery({
    queryKey: ["customers", encounter.customer_id],
    queryFn: () => customersApi.get(encounter.customer_id),
  });

  const closeM = useMutation({
    mutationFn: () => encountersApi.close(encounter.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters", encounter.id] });
      qc.invalidateQueries({ queryKey: ["encounters", "list"] });
      toast.success("Encuentro cerrado");
    },
    onError: (e) => {
      const msg = e instanceof ApiError && typeof e.detail === "string" ? e.detail : "No pude cerrar.";
      toast.error(msg);
    },
  });

  const isReadOnly = encounter.status === "closed" || encounter.status === "amended";

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/encuentros" className="hover:text-foreground">
          Encuentros
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">
          {formatDateTime(encounter.started_at)}
        </span>
      </div>

      {/* Top bar: estado + acciones */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  {encounterTypeLabel(encounter.type)}
                </h1>
                <StatusBadge status={encounter.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                Iniciado {formatDateTime(encounter.started_at)}
                {encounter.closed_at && (
                  <> · Cerrado {formatDateTime(encounter.closed_at)}</>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {encounter.status === "draft" || encounter.status === "in_progress" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => closeM.mutate()}
                disabled={closeM.isPending}
              >
                <Lock className="size-4" />
                Cerrar encuentro
              </Button>
            ) : null}
            {(encounter.status === "closed" || encounter.status === "amended") && (
              <AmendDialog encounterId={encounter.id} />
            )}
          </div>
        </div>
        {encounter.chief_complaint && (
          <div className="mt-3 border-t border-border pt-3 text-sm">
            <span className="font-medium text-foreground">Motivo: </span>
            <span className="text-muted-foreground">{encounter.chief_complaint}</span>
          </div>
        )}
      </Card>

      {/* Bipartite */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* LEFT — contexto */}
        <div className="space-y-4">
          <PetCard pet={petQ.data} loading={petQ.isLoading} />
          <CustomerCard customer={custQ.data} loading={custQ.isLoading} />
          {petQ.data && (
            <Card className="p-4">
              <ProblemsList
                petId={petQ.data.id}
                encounterId={encounter.id}
                readOnly={isReadOnly}
              />
            </Card>
          )}
          <Card className="p-4">
            <VitalSignsForm encounterId={encounter.id} readOnly={isReadOnly} />
          </Card>
        </div>

        {/* RIGHT — SOAP */}
        <Card className="p-5">
          <SoapEditor encounterId={encounter.id} readOnly={isReadOnly} />
        </Card>
      </div>

      {encounter.type === "hospitalization" && (
        <HospitalizationPanel
          encounterId={encounter.id}
          readOnly={isReadOnly}
        />
      )}

      {/* AI Assistant — available on all open encounters */}
      {!isReadOnly && (
        <AiAssistant encounterId={encounter.id} petId={encounter.pet_id} readOnly={isReadOnly} />
      )}

      {/* Specialty exam panels — always available on consultations */}
      {(encounter.type === "consultation" || encounter.type === "emergency" || encounter.type === "follow_up") && (
        <div className="space-y-3">
          <OphthalmicPanel encounterId={encounter.id} readOnly={isReadOnly} />
          <DermatologyPanel encounterId={encounter.id} readOnly={isReadOnly} />
        </div>
      )}

      {/* Documents & images gallery */}
      {encounter.pet_id && (
        <Card className="p-5">
          <DocumentsGallery
            petId={encounter.pet_id}
            encounterId={encounter.id}
            readOnly={isReadOnly}
          />
        </Card>
      )}
    </div>
  );
}

function PetCard({ pet, loading }: { pet?: PetRead; loading: boolean }) {
  if (loading) {
    return (
      <Card className="space-y-3 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </Card>
    );
  }
  if (!pet) return null;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PawPrint className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/pacientes/${pet.id}`}
            className="block truncate font-semibold text-foreground hover:underline"
          >
            {pet.name}
          </Link>
          <div className="truncate text-xs text-muted-foreground">
            {speciesLabel(pet.species)}
            {pet.breed_name ? ` · ${pet.breed_name}` : ""} · {sexLabel(pet.sex)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatPetAge(pet.birth_date, pet.birth_date_estimated)}
            {pet.current_weight_kg ? ` · ${pet.current_weight_kg} kg` : ""}
          </div>
        </div>
      </div>
      {(pet.alerts?.length || pet.chronic_conditions?.length) && (
        <>
          <Separator className="my-3" />
          <div className="flex flex-wrap gap-1.5">
            {pet.alerts?.map((a) => (
              <Badge key={a} className="bg-warning/15 text-warning hover:bg-warning/20">
                ⚠ {a}
              </Badge>
            ))}
            {pet.chronic_conditions?.map((c) => (
              <Badge key={c} className="bg-info/15 text-info hover:bg-info/20">
                ◌ {c}
              </Badge>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function CustomerCard({
  customer,
  loading,
}: {
  customer?: CustomerRead;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="space-y-3 p-4">
        <Skeleton className="h-4 w-32" />
      </Card>
    );
  }
  if (!customer) return null;
  return (
    <Card className="space-y-1 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tutor
      </div>
      <div className="text-sm font-medium text-foreground">
        {customerFullName(customer)}
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="font-mono">
          {customer.document_type} {customer.document_number}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <Phone className="size-3.5 text-muted-foreground" />
        {customer.phone_primary}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    in_progress: "bg-info/15 text-info hover:bg-info/20",
    closed: "bg-success/15 text-success hover:bg-success/20",
    amended: "bg-warning/15 text-warning hover:bg-warning/20",
  };
  if (status === "closed") {
    return (
      <Badge className={cn(map[status])}>
        <CheckCircle2 className="size-3" />
        {encounterStatusLabel(status)}
      </Badge>
    );
  }
  return (
    <Badge className={cn(map[status] ?? "bg-muted text-muted-foreground")}>
      {encounterStatusLabel(status)}
    </Badge>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-40" />
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
