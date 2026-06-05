"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Scale, Search } from "lucide-react";
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
  type MovementType,
  type ProductRead,
} from "@/lib/inventory-api";
import { ApiError } from "@/lib/api";

const TYPE_OPTIONS: { value: MovementType; label: string; help: string }[] = [
  {
    value: "adjustment",
    label: "Ajuste de stock",
    help: "Diferencia hallada al conteo físico. Cantidad +/-.",
  },
  {
    value: "waste",
    label: "Merma",
    help: "Producto perdido, dañado o vencido. Usá cantidad negativa.",
  },
  {
    value: "transfer",
    label: "Transferencia",
    help: "Movimiento entre sedes. Usá cantidad negativa para egreso.",
  },
];

export function AdjustmentDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<ProductRead | null>(null);
  const [type, setType] = useState<MovementType>("adjustment");
  const [qty, setQty] = useState("0");
  const [reason, setReason] = useState("");

  const productsQ = useQuery({
    queryKey: ["inventory", "products", "picker", search],
    queryFn: () =>
      inventoryApi.listProducts({
        q: search || undefined,
        page_size: 6,
        with_qty: true,
      }),
    enabled: open && !product,
  });

  const reset = () => {
    setSearch("");
    setProduct(null);
    setType("adjustment");
    setQty("0");
    setReason("");
  };

  const recordM = useMutation({
    mutationFn: () => {
      if (!product) throw new Error("Sin producto");
      return inventoryApi.recordMovement({
        product_id: product.id,
        type,
        quantity: qty,
        reason: reason || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Movimiento registrado");
      reset();
      setOpen(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude registrar el movimiento.")),
  });

  const help = TYPE_OPTIONS.find((t) => t.value === type)?.help ?? "";

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
            <Scale className="size-4" />
            Ajuste / merma
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Movimiento manual</DialogTitle>
          <DialogDescription>
            Ajusta el stock y queda registrado en el audit log con tu usuario.
          </DialogDescription>
        </DialogHeader>

        {!product ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar producto…"
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
                    className="w-full rounded-md border border-input p-3 text-left text-sm hover:bg-muted"
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.sku} · Stock: {p.available_qty ?? 0} {p.unit}
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
              recordM.mutate();
            }}
          >
            <div className="rounded-md border border-input bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Stock actual: {product.available_qty ?? 0} {product.unit}
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

            <div className="space-y-1">
              <Label>Tipo de movimiento *</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MovementType)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{help}</p>
            </div>

            <div className="space-y-1">
              <Label>Cantidad (con signo) *</Label>
              <Input
                type="number"
                step="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Positivo suma stock, negativo descuenta.
              </p>
            </div>

            <div className="space-y-1">
              <Label>Motivo *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: conteo físico, merma por vencimiento, transferencia a sede norte"
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
                  recordM.isPending ||
                  Number(qty) === 0 ||
                  !reason.trim()
                }
              >
                {recordM.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Registrar
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
