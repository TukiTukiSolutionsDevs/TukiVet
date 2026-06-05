"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ordersApi,
  paymentMethodLabel,
  type OrderRead,
  type PaymentMethod,
} from "@/lib/orders-api";
import { ApiError } from "@/lib/api";
import { formatCurrencyPEN } from "@/lib/format";
import { cn } from "@/lib/utils";

const METHODS: { value: PaymentMethod; icon: typeof Banknote }[] = [
  { value: "cash", icon: Banknote },
  { value: "yape", icon: Smartphone },
  { value: "plin", icon: Smartphone },
  { value: "transfer", icon: Landmark },
  { value: "pos_card", icon: CreditCard },
  { value: "credit", icon: HandCoins },
  { value: "other", icon: Wallet },
];

export function PaymentDialog({
  order,
  onClose,
  onSuccess,
}: {
  order: OrderRead;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const balance = Number(order.balance ?? 0);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [reference, setReference] = useState("");

  const payM = useMutation({
    mutationFn: () =>
      ordersApi.recordPayment(order.id, {
        method,
        amount,
        reference: reference || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", order.id] });
      toast.success("Pago registrado");
      onSuccess();
    },
    onError: (e) => toast.error(humanError(e, "No pude registrar el pago.")),
  });

  const needsRef = method === "yape" || method === "plin" || method === "transfer";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Saldo pendiente: {formatCurrencyPEN(balance)}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            payM.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const selected = method === m.value;
                return (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-input text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                    {paymentMethodLabel(m.value)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Monto (S/) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {needsRef && (
            <div className="space-y-1">
              <Label>Referencia / Nº operación</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: últimos 4 dígitos o nº de op."
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={payM.isPending || Number(amount) <= 0}>
              {payM.isPending && <Loader2 className="size-4 animate-spin" />}
              Cobrar {formatCurrencyPEN(amount)}
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
