"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackagePlus, Search } from "lucide-react";
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
  type LotCreate,
  type ProductRead,
} from "@/lib/inventory-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ReceiveLotDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<ProductRead | null>(null);
  const [lotNumber, setLotNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [supplier, setSupplier] = useState("");
  const [unitCost, setUnitCost] = useState("0.0000");
  const [qty, setQty] = useState("0");

  const productsQ = useQuery({
    queryKey: ["inventory", "products", "picker", search],
    queryFn: () =>
      inventoryApi.listProducts({
        q: search || undefined,
        page_size: 6,
        with_qty: false,
      }),
    enabled: open && !product,
  });

  const suppliersQ = useQuery({
    queryKey: ["inventory", "suppliers", true],
    queryFn: () => inventoryApi.listSuppliers(true),
    enabled: open,
  });

  const reset = () => {
    setSearch("");
    setProduct(null);
    setLotNumber("");
    setExpiry("");
    setSupplier("");
    setUnitCost("0.0000");
    setQty("0");
  };

  const receiveM = useMutation({
    mutationFn: () => {
      if (!product) throw new Error("Sin producto");
      const payload: LotCreate = {
        product_id: product.id,
        lot_number: lotNumber,
        expiry_date: expiry || null,
        supplier_id: supplier || null,
        unit_cost: unitCost,
        initial_qty: qty,
      };
      return inventoryApi.receiveLot(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Lote recibido y stock actualizado");
      reset();
      setOpen(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude recibir el lote.")),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PackagePlus className="size-4" />
            Recibir lote
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recibir lote (compra)</DialogTitle>
          <DialogDescription>
            Suma stock al producto y queda registrado como movimiento de compra.
          </DialogDescription>
        </DialogHeader>

        {!product ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar producto por SKU o nombre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {productsQ.data?.items.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setProduct(p)}
                    className={cn(
                      "w-full rounded-md border border-input p-3 text-left text-sm hover:bg-muted",
                    )}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.sku} · {p.unit}
                    </div>
                  </button>
                </li>
              ))}
              {productsQ.data?.items.length === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">
                  Sin coincidencias.
                </li>
              )}
            </ul>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              receiveM.mutate();
            }}
          >
            <div className="rounded-md border border-input bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.sku} · {product.unit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProduct(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Cambiar
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Número de lote *</Label>
                <Input
                  required
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha de vencimiento</Label>
                <Input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Proveedor</Label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— sin proveedor —</option>
                  {suppliersQ.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Costo unitario (S/)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Cantidad inicial *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  receiveM.isPending ||
                  !lotNumber.trim() ||
                  Number(qty) <= 0
                }
              >
                {receiveM.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        )}
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
