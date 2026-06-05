"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Receipt, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ordersApi,
  orderStatusLabel,
  type OrderItemInput,
  type OrderRead,
} from "@/lib/orders-api";
import { ApiError } from "@/lib/api";
import { formatCurrencyPEN } from "@/lib/format";
import type { CustomerRead } from "@/lib/customers-api";
import type { ProductRead } from "@/lib/inventory-api";
import type { ServiceCatalogRead } from "@/lib/orders-api";
import { CashSessionBar } from "./_components/cash-session-bar";
import { CustomerPicker } from "./_components/customer-picker";
import { ItemPicker } from "./_components/item-picker";
import { PaymentDialog } from "./_components/payment-dialog";

type CartItem = OrderItemInput & {
  uid: string;
  label: string;
};

export default function PosPage() {
  const qc = useQueryClient();
  const [customer, setCustomer] = useState<CustomerRead | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const orderQ = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: !!orderId,
    refetchOnWindowFocus: false,
  });

  const order = orderQ.data ?? null;

  const reset = () => {
    setCustomer(null);
    setCart([]);
    setOrderId(null);
    setPaymentOpen(false);
  };

  // local cart calc
  const cartSubtotal = cart.reduce((sum, it) => {
    const price = Number(it.unit_price ?? 0);
    const discount = Number(it.discount_pct ?? 0);
    return sum + price * Number(it.quantity) * (1 - discount / 100);
  }, 0);

  const createOrderM = useMutation({
    mutationFn: () => {
      if (!customer) throw new Error("Sin cliente");
      return ordersApi.createOrder({
        customer_id: customer.id,
        items: cart.map((c) => ({
          product_id: c.product_id ?? null,
          service_id: c.service_id ?? null,
          description: c.description,
          quantity: c.quantity,
          unit_price: c.unit_price ?? null,
          discount_pct: c.discount_pct ?? "0",
        })),
      });
    },
    onSuccess: (o) => {
      setOrderId(o.id);
      setCart([]);
      toast.success(`Orden #${o.number ?? "nueva"} creada`);
    },
    onError: (e) => toast.error(humanError(e, "No pude crear la orden.")),
  });

  const addItemM = useMutation({
    mutationFn: (item: OrderItemInput) =>
      ordersApi.addItem(orderId!, item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", orderId] });
    },
    onError: (e) => toast.error(humanError(e, "No pude agregar el item.")),
  });

  const removeItemM = useMutation({
    mutationFn: (itemId: string) => ordersApi.removeItem(orderId!, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", orderId] });
    },
    onError: (e) => toast.error(humanError(e, "No pude quitar el item.")),
  });

  const voidM = useMutation({
    mutationFn: () => ordersApi.voidOrder(orderId!),
    onSuccess: () => {
      toast.success("Orden anulada");
      reset();
    },
    onError: (e) => toast.error(humanError(e, "No pude anular la orden.")),
  });

  const handleAddProduct = (p: ProductRead) => {
    const item: OrderItemInput = {
      product_id: p.id,
      quantity: "1",
      unit_price: p.sale_price,
      discount_pct: "0",
    };
    if (order) {
      addItemM.mutate(item);
    } else {
      setCart((prev) => [
        ...prev,
        {
          ...item,
          uid: crypto.randomUUID(),
          label: p.name,
        },
      ]);
    }
  };

  const handleAddService = (s: ServiceCatalogRead) => {
    const item: OrderItemInput = {
      service_id: s.id,
      quantity: "1",
      unit_price: s.base_price,
      discount_pct: "0",
    };
    if (order) {
      addItemM.mutate(item);
    } else {
      setCart((prev) => [
        ...prev,
        {
          ...item,
          uid: crypto.randomUUID(),
          label: s.name,
        },
      ]);
    }
  };

  const removeCartItem = (uid: string) => {
    setCart((prev) => prev.filter((c) => c.uid !== uid));
  };

  const canCreate = !!customer && cart.length > 0 && !createOrderM.isPending;
  const isPaid = order?.status === "paid";
  const isVoid = order?.status === "void";
  const hasBalance = order ? Number(order.balance ?? 0) > 0.001 : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            POS y caja
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Armá la orden, cobrá con efectivo / Yape / Plin / tarjeta y conciliá
            tu caja.
          </p>
        </div>
        {order && (
          <Button variant="outline" onClick={reset}>
            Nueva orden
          </Button>
        )}
      </div>

      <CashSessionBar />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <CustomerPicker
            customer={customer}
            onChange={(c) => {
              if (order) return;
              setCustomer(c);
            }}
          />

          {!order && customer && (
            <ItemPicker
              onAddProduct={handleAddProduct}
              onAddService={handleAddService}
            />
          )}

          {order && !isVoid && !isPaid && (
            <ItemPicker
              onAddProduct={handleAddProduct}
              onAddService={handleAddService}
            />
          )}

          <ItemsTable
            order={order}
            cart={cart}
            onRemoveCart={removeCartItem}
            onRemoveOrderItem={(id) => removeItemM.mutate(id)}
            removing={removeItemM.isPending}
          />
        </div>

        <TotalsPanel
          order={order}
          cartSubtotal={cartSubtotal}
          canCreate={canCreate}
          creating={createOrderM.isPending}
          onCreate={() => createOrderM.mutate()}
          onPay={() => setPaymentOpen(true)}
          onVoid={() => voidM.mutate()}
          voiding={voidM.isPending}
          hasBalance={hasBalance}
          isPaid={isPaid}
          isVoid={isVoid}
        />
      </div>

      {order && paymentOpen && (
        <PaymentDialog
          order={order}
          onClose={() => setPaymentOpen(false)}
          onSuccess={() => setPaymentOpen(false)}
        />
      )}
    </div>
  );
}

function ItemsTable({
  order,
  cart,
  onRemoveCart,
  onRemoveOrderItem,
  removing,
}: {
  order: OrderRead | null;
  cart: CartItem[];
  onRemoveCart: (uid: string) => void;
  onRemoveOrderItem: (id: string) => void;
  removing: boolean;
}) {
  const empty = order ? order.items.length === 0 : cart.length === 0;

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Cant.</TableHead>
            <TableHead className="text-right">P. unit.</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {empty ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                Agregá productos o servicios para armar la orden.
              </TableCell>
            </TableRow>
          ) : order ? (
            order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrencyPEN(item.unit_price)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {formatCurrencyPEN(item.total)}
                </TableCell>
                <TableCell className="w-12 text-right">
                  {order.status !== "paid" && order.status !== "void" && (
                    <button
                      type="button"
                      onClick={() => onRemoveOrderItem(item.id)}
                      disabled={removing}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label="Quitar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            cart.map((item) => {
              const total =
                Number(item.unit_price ?? 0) * Number(item.quantity) *
                (1 - Number(item.discount_pct ?? 0) / 100);
              return (
                <TableRow key={item.uid}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrencyPEN(item.unit_price ?? "0")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatCurrencyPEN(total)}
                  </TableCell>
                  <TableCell className="w-12 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveCart(item.uid)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label="Quitar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function TotalsPanel({
  order,
  cartSubtotal,
  canCreate,
  creating,
  onCreate,
  onPay,
  onVoid,
  voiding,
  hasBalance,
  isPaid,
  isVoid,
}: {
  order: OrderRead | null;
  cartSubtotal: number;
  canCreate: boolean;
  creating: boolean;
  onCreate: () => void;
  onPay: () => void;
  onVoid: () => void;
  voiding: boolean;
  hasBalance: boolean;
  isPaid: boolean;
  isVoid: boolean;
}) {
  return (
    <Card className="sticky top-4 space-y-4 p-5">
      {order ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Orden
              </p>
              <p className="font-mono text-sm font-semibold">
                #{order.number ?? "—"}
              </p>
            </div>
            <Badge variant={isPaid ? "secondary" : isVoid ? "outline" : "default"}>
              {orderStatusLabel(order.status)}
            </Badge>
          </div>

          <Separator />

          <Totals
            subtotal={Number(order.subtotal)}
            igv={Number(order.igv_amount)}
            discount={Number(order.discount_amount)}
            total={Number(order.total)}
            paid={Number(order.paid_amount)}
            balance={Number(order.balance ?? 0)}
          />

          <div className="space-y-2">
            {!isVoid && hasBalance && (
              <Button onClick={onPay} className="w-full" size="lg">
                <Receipt className="size-4" />
                Cobrar
              </Button>
            )}
            {isPaid && (
              <p className="rounded-md bg-secondary/40 px-3 py-2 text-center text-sm font-medium text-secondary-foreground">
                Orden pagada.
              </p>
            )}
            {isVoid && (
              <p className="rounded-md bg-muted px-3 py-2 text-center text-sm font-medium text-muted-foreground">
                Orden anulada.
              </p>
            )}
            {!isVoid && Number(order.paid_amount) === 0 && (
              <Button
                onClick={onVoid}
                variant="ghost"
                className="w-full text-destructive hover:bg-destructive/10"
                disabled={voiding}
              >
                {voiding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                Anular orden
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal estimado</span>
            <span className="tabular-nums font-semibold">
              {formatCurrencyPEN(cartSubtotal)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            El IGV y descuentos se calculan al crear la orden.
          </p>
          <Button
            onClick={onCreate}
            disabled={!canCreate}
            className="w-full"
            size="lg"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Receipt className="size-4" />
            )}
            Crear orden
          </Button>
        </>
      )}
    </Card>
  );
}

function Totals({
  subtotal,
  igv,
  discount,
  total,
  paid,
  balance,
}: {
  subtotal: number;
  igv: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Subtotal" value={subtotal} />
      {discount > 0 && <Row label="Descuento" value={-discount} />}
      <Row label="IGV (18%)" value={igv} />
      <Separator />
      <Row label="Total" value={total} strong />
      <Row label="Pagado" value={paid} muted />
      <Row
        label="Saldo"
        value={balance}
        strong={balance > 0.001}
        warn={balance > 0.001}
      />
    </dl>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
  warn,
}: {
  label: string;
  value: number;
  strong?: boolean;
  muted?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd
        className={
          "tabular-nums " +
          (strong ? "font-semibold " : "") +
          (warn ? "text-destructive" : "")
        }
      >
        {formatCurrencyPEN(value)}
      </dd>
    </div>
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
