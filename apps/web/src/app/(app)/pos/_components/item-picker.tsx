"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Search, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { inventoryApi, type ProductRead } from "@/lib/inventory-api";
import { ordersApi, serviceCategoryLabel, type ServiceCatalogRead } from "@/lib/orders-api";
import { formatCurrencyPEN } from "@/lib/format";
import { cn } from "@/lib/utils";

type Mode = "service" | "product";

export function ItemPicker({
  onAddProduct,
  onAddService,
}: {
  onAddProduct: (p: ProductRead) => void;
  onAddService: (s: ServiceCatalogRead) => void;
}) {
  const [mode, setMode] = useState<Mode>("service");
  const [search, setSearch] = useState("");

  const servicesQ = useQuery({
    queryKey: ["orders", "services"],
    queryFn: () => ordersApi.listServices(true),
    enabled: mode === "service",
  });

  const productsQ = useQuery({
    queryKey: ["inventory", "products", "pos", search],
    queryFn: () =>
      inventoryApi.listProducts({
        q: search || undefined,
        page_size: 8,
        with_qty: true,
      }),
    enabled: mode === "product",
  });

  const filteredServices = (servicesQ.data ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  });

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("service");
            setSearch("");
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "service"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Stethoscope className="size-4" />
          Servicios
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("product");
            setSearch("");
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "product"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Package className="size-4" />
          Productos
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={
            mode === "service"
              ? "Buscar servicio…"
              : "Buscar producto por SKU o nombre…"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {mode === "service"
          ? filteredServices.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onAddService(s)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-input p-3 text-left text-sm hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.code} · {serviceCategoryLabel(s.category)}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {formatCurrencyPEN(s.base_price)}
                  </span>
                </button>
              </li>
            ))
          : productsQ.data?.items.map((p) => {
              const qty = Number(p.available_qty ?? 0);
              const noStock = qty <= 0;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onAddProduct(p)}
                    disabled={noStock}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-input p-3 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sku} · Stock {qty} {p.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold tabular-nums">
                        {formatCurrencyPEN(p.sale_price)}
                      </span>
                      {noStock && (
                        <Badge variant="destructive" className="ml-2">
                          Sin stock
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}

        {mode === "service" && filteredServices.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            Sin servicios. Creá tu catálogo desde Configuración.
          </li>
        )}
        {mode === "product" && productsQ.data?.items.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            Sin productos.
          </li>
        )}
      </ul>
    </Card>
  );
}
