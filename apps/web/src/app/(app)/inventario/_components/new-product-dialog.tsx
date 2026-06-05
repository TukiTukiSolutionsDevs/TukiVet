"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inventoryApi,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_OPTIONS,
  type ProductCategory,
  type ProductCreate,
} from "@/lib/inventory-api";
import { ApiError } from "@/lib/api";

const EMPTY: ProductCreate = {
  sku: "",
  name: "",
  category: "medication",
  unit: "unidad",
  sale_price: "0.00",
  sale_price_includes_igv: true,
  igv_affected: true,
  is_controlled: false,
  active: true,
};

export function NewProductDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductCreate>({ ...EMPTY });

  const createM = useMutation({
    mutationFn: () =>
      inventoryApi.createProduct({
        ...form,
        subcategory: form.subcategory || null,
        presentation: form.presentation || null,
        active_ingredient: form.active_ingredient || null,
        manufacturer: form.manufacturer || null,
        barcode: form.barcode || null,
        reorder_point: form.reorder_point || null,
        reorder_qty: form.reorder_qty || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "products"] });
      toast.success("Producto creado");
      setForm({ ...EMPTY });
      setOpen(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude crear el producto.")),
  });

  const set = <K extends keyof ProductCreate>(k: K, v: ProductCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
          <DialogDescription>
            El stock arranca en 0. Recibí un lote después para comenzar a venderlo.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createM.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>SKU *</Label>
              <Input
                required
                value={form.sku}
                onChange={(e) => set("sku", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1">
              <Label>Categoría *</Label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value as ProductCategory)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PRODUCT_CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {PRODUCT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nombre comercial *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Presentación</Label>
              <Input
                placeholder="Caja x 10 tabletas"
                value={form.presentation ?? ""}
                onChange={(e) => set("presentation", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Ingrediente activo</Label>
              <Input
                value={form.active_ingredient ?? ""}
                onChange={(e) => set("active_ingredient", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Fabricante</Label>
              <Input
                value={form.manufacturer ?? ""}
                onChange={(e) => set("manufacturer", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Unidad</Label>
              <Input
                value={form.unit ?? "unidad"}
                onChange={(e) => set("unit", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Precio venta (S/) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.sale_price ?? "0.00"}
                onChange={(e) => set("sale_price", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Punto de reorden</Label>
              <Input
                type="number"
                step="1"
                min="0"
                value={form.reorder_point ?? ""}
                onChange={(e) => set("reorder_point", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Cantidad a reordenar</Label>
              <Input
                type="number"
                step="1"
                min="0"
                value={form.reorder_qty ?? ""}
                onChange={(e) => set("reorder_qty", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_controlled ?? false}
                onChange={(e) => set("is_controlled", e.target.checked)}
                className="size-4 rounded border-input"
              />
              Sustancia controlada
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.igv_affected ?? true}
                onChange={(e) => set("igv_affected", e.target.checked)}
                className="size-4 rounded border-input"
              />
              Afecto a IGV
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.sale_price_includes_igv ?? true}
                onChange={(e) =>
                  set("sale_price_includes_igv", e.target.checked)
                }
                className="size-4 rounded border-input"
              />
              Precio incluye IGV
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                createM.isPending || !form.sku.trim() || !form.name.trim()
              }
            >
              {createM.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear producto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function humanError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (typeof e.detail === "string") return e.detail;
    if (Array.isArray(e.detail)) {
      const first = e.detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
  }
  return fallback;
}
