"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, PawPrint, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { portalApi } from "@/lib/portal-api";
import { formatCurrencyPEN, formatDateShort, formatPetAge } from "@/lib/format";
import { speciesLabel, sexLabel } from "@/lib/pets-api";

export default function PortalHomePage() {
  const meQ = useQuery({
    queryKey: ["portal", "me"],
    queryFn: () => portalApi.me(),
  });

  const petsQ = useQuery({
    queryKey: ["portal", "pets"],
    queryFn: () => portalApi.myPets(),
  });

  const ordersQ = useQuery({
    queryKey: ["portal", "orders", "pending"],
    queryFn: () => portalApi.pendingOrders(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">
          {meQ.data
            ? `Hola, ${meQ.data.first_name} 👋`
            : meQ.isLoading
              ? "Cargando…"
              : "Hola 👋"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aquí ves a tus mascotas, su historial y saldos pendientes.
        </p>
      </div>

      {ordersQ.data && ordersQ.data.length > 0 && (
        <Card className="space-y-2 border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold">Tenés saldos pendientes</h2>
          </div>
          <ul className="space-y-1 text-sm">
            {ordersQ.data.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between"
              >
                <span className="text-muted-foreground">
                  {formatDateShort(o.issued_at)}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatCurrencyPEN(o.balance)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Acercate a recepción o paga con Yape/Plin al cobrar tu próxima
            consulta.
          </p>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mis mascotas
        </h2>
        {petsQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : petsQ.data?.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Aún no tenés mascotas registradas en TukiVet.
          </Card>
        ) : (
          <ul className="space-y-2">
            {petsQ.data?.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/portal/pets/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary/10 p-3 text-primary">
                      <PawPrint className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {speciesLabel(p.species)} · {sexLabel(p.sex)} ·{" "}
                        {formatPetAge(p.birth_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status !== "active" && (
                      <Badge variant="outline">{p.status}</Badge>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
