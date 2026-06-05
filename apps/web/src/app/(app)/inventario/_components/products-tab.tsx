"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  inventoryApi,
  categoryLabel,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_OPTIONS,
  type ProductCategory,
} from "@/lib/inventory-api";
import { formatCurrencyPEN } from "@/lib/format";

export function ProductsTab() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [page, setPage] = useState(1);

  const productsQ = useQuery({
    queryKey: ["inventory", "products", q, category, page],
    queryFn: () =>
      inventoryApi.listProducts({
        q: q || undefined,
        category: category || undefined,
        page,
        page_size: 20,
        with_qty: true,
      }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar SKU, nombre, ingrediente activo…"
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as ProductCategory | "");
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todas las categorías</option>
            {PRODUCT_CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {PRODUCT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Reorden</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsQ.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : productsQ.data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No hay productos. Creá uno con "Nuevo producto".
                </TableCell>
              </TableRow>
            ) : (
              productsQ.data?.items.map((p) => {
                const qty = Number(p.available_qty ?? 0);
                const reorder = p.reorder_point ? Number(p.reorder_point) : null;
                const low = reorder !== null && qty <= reorder;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.presentation && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          · {p.presentation}
                        </span>
                      )}
                      {p.is_controlled && (
                        <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-700 dark:text-amber-300">
                          Controlado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{categoryLabel(p.category)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={low ? "font-semibold text-destructive" : ""}>
                        {qty} {p.unit}
                      </span>
                      {low && (
                        <AlertTriangle className="ml-1 inline size-3.5 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrencyPEN(p.sale_price)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {reorder !== null ? `${reorder} ${p.unit}` : "—"}
                    </TableCell>
                    <TableCell>
                      {p.active ? (
                        <Badge variant="secondary">Activo</Badge>
                      ) : (
                        <Badge variant="outline">Inactivo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {productsQ.data && productsQ.data.total > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {productsQ.data.total} productos · página {page}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-input px-3 py-1 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= productsQ.data.total}
              className="rounded-md border border-input px-3 py-1 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
