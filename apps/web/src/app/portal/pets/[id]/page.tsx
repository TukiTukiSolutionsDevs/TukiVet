"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Stethoscope, Syringe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { portalApi } from "@/lib/portal-api";
import { formatDateShort, formatDateTime } from "@/lib/format";

export default function PortalPetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const petsQ = useQuery({
    queryKey: ["portal", "pets"],
    queryFn: () => portalApi.myPets(),
  });
  const pet = petsQ.data?.find((p) => p.id === id) ?? null;

  const historyQ = useQuery({
    queryKey: ["portal", "pets", id, "history"],
    queryFn: () => portalApi.petHistory(id),
  });

  return (
    <div className="space-y-6">
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a mis mascotas
      </Link>

      {!pet && petsQ.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : pet ? (
        <Card className="p-5">
          <h1 className="text-2xl font-extrabold text-foreground">
            {pet.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pet.species} · {pet.sex}
            {pet.birth_date && ` · nacido ${formatDateShort(pet.birth_date)}`}
            {pet.microchip && ` · chip ${pet.microchip}`}
          </p>
        </Card>
      ) : null}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historial de encuentros
          </h2>
        </div>
        {historyQ.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : historyQ.data?.encounters.length === 0 ? (
          <Card className="p-5 text-center text-sm text-muted-foreground">
            Aún no hay consultas registradas.
          </Card>
        ) : (
          <ul className="space-y-2">
            {historyQ.data?.encounters.map((e) => (
              <li key={e.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize">{e.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(e.started_at)}
                      </p>
                      {e.chief_complaint && (
                        <p className="mt-1 text-sm">{e.chief_complaint}</p>
                      )}
                    </div>
                    <Badge variant="outline">{e.status}</Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Syringe className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vacunas aplicadas
          </h2>
        </div>
        {historyQ.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : historyQ.data?.vaccines.length === 0 ? (
          <Card className="p-5 text-center text-sm text-muted-foreground">
            Aún no hay vacunas registradas.
          </Card>
        ) : (
          <ul className="space-y-2">
            {historyQ.data?.vaccines.map((v) => {
              const overdue =
                v.next_dose_due_date &&
                new Date(v.next_dose_due_date) < new Date();
              return (
                <li key={v.id}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{v.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Aplicada: {formatDateShort(v.administered_at)}
                        </p>
                        {v.next_dose_due_date && (
                          <p className="mt-1 text-xs">
                            <span
                              className={
                                overdue
                                  ? "font-medium text-destructive"
                                  : "text-muted-foreground"
                              }
                            >
                              Próxima dosis:{" "}
                              {formatDateShort(v.next_dose_due_date)}
                              {overdue && " (vencida)"}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
