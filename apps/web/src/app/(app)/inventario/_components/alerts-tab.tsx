"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { inventoryApi, categoryLabel } from "@/lib/inventory-api";
import { formatDateShort } from "@/lib/format";

export function AlertsTab() {
  const [days, setDays] = useState(30);

  const lowQ = useQuery({
    queryKey: ["inventory", "alerts", "low-stock"],
    queryFn: () => inventoryApi.lowStock(),
  });

  const expQ = useQuery({
    queryKey: ["inventory", "alerts", "expiring", days],
    queryFn: () => inventoryApi.expiring(days),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <h2 className="text-base font-semibold">Stock bajo</h2>
          </div>
          {lowQ.data && (
            <Badge variant="outline">{lowQ.data.length}</Badge>
          )}
        </div>
        {lowQ.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : lowQ.data?.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin productos por debajo del punto de reorden.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {lowQ.data?.map((row) => (
              <li key={row.product_id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.sku} · {categoryLabel(row.category)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">
                      {row.available_qty}
                    </p>
                    {row.reorder_point && (
                      <p className="text-xs text-muted-foreground">
                        Reorden: {row.reorder_point}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-amber-500" />
            <h2 className="text-base font-semibold">Lotes por vencer</h2>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
          </select>
        </div>
        {expQ.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : expQ.data?.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin lotes vencidos en los próximos {days} días.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {expQ.data?.map((row) => (
              <li key={row.lot_id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {row.product_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lote {row.lot_number} · Stock {row.current_qty}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        row.days_until_expiry <= 7
                          ? "font-semibold text-destructive"
                          : "font-semibold text-amber-600 dark:text-amber-400"
                      }
                    >
                      {row.days_until_expiry < 0
                        ? `Vencido hace ${Math.abs(row.days_until_expiry)}d`
                        : `${row.days_until_expiry}d`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateShort(row.expiry_date)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
