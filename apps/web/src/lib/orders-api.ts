import { api } from "./api";
import { buildQueryString, type Page } from "./pagination";

export type ServiceCategory =
  | "consultation"
  | "vaccination"
  | "surgery"
  | "imaging"
  | "lab"
  | "grooming"
  | "boarding"
  | "other";

export const SERVICE_CATEGORY_OPTIONS: ServiceCategory[] = [
  "consultation",
  "vaccination",
  "surgery",
  "imaging",
  "lab",
  "grooming",
  "boarding",
  "other",
];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  consultation: "Consulta",
  vaccination: "Vacunación",
  surgery: "Cirugía",
  imaging: "Imágenes",
  lab: "Laboratorio",
  grooming: "Grooming",
  boarding: "Hospedaje",
  other: "Otro",
};

export type OrderStatus =
  | "draft"
  | "open"
  | "paid"
  | "partially_paid"
  | "void";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  open: "Abierta",
  paid: "Pagada",
  partially_paid: "Pago parcial",
  void: "Anulada",
};

export type PaymentMethod =
  | "cash"
  | "yape"
  | "plin"
  | "transfer"
  | "pos_card"
  | "credit"
  | "other";

export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  "cash",
  "yape",
  "plin",
  "transfer",
  "pos_card",
  "credit",
  "other",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transfer: "Transferencia",
  pos_card: "POS Tarjeta",
  credit: "Crédito",
  other: "Otro",
};

export type ServiceCatalogRead = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  category: string;
  base_price: string;
  price_includes_igv: boolean;
  igv_affected: boolean;
  sunat_code: string | null;
  active: boolean;
};

export type ServiceCatalogCreate = {
  code: string;
  name: string;
  category: ServiceCategory;
  base_price?: string;
  price_includes_igv?: boolean;
  igv_affected?: boolean;
  sunat_code?: string | null;
  active?: boolean;
};

export type ServiceCatalogUpdate = Partial<ServiceCatalogCreate>;

export type OrderItemInput = {
  product_id?: string | null;
  service_id?: string | null;
  description?: string | null;
  quantity: string;
  unit_price?: string | null;
  discount_pct?: string;
  reference_type?: string | null;
  reference_id?: string | null;
};

export type OrderItemRead = {
  id: string;
  order_id: string;
  product_id: string | null;
  service_id: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  discount_pct: string;
  igv_amount: string;
  subtotal: string;
  total: string;
  lot_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
};

export type OrderRead = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  encounter_id: string | null;
  customer_id: string;
  cash_session_id: string | null;
  status: string;
  number: number | null;
  issued_at: string;
  subtotal: string;
  igv_amount: string;
  discount_amount: string;
  total: string;
  paid_amount: string;
  balance: string | null;
  notes: string | null;
  created_by: string | null;
  items: OrderItemRead[];
};

export type OrderCreate = {
  customer_id: string;
  encounter_id?: string | null;
  notes?: string | null;
  items?: OrderItemInput[];
};

export type PaymentCreate = {
  method: PaymentMethod;
  amount: string;
  reference?: string | null;
};

export type PaymentRead = {
  id: string;
  organization_id: string;
  order_id: string;
  cash_session_id: string | null;
  method: string;
  amount: string;
  reference: string | null;
  received_by: string | null;
  received_at: string;
  status: string;
};

export type CashSessionRead = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  user_id: string;
  opened_at: string;
  opening_balance: string;
  closed_at: string | null;
  closing_balance_declared: string | null;
  closing_balance_calculated: string | null;
  difference: string | null;
  notes: string | null;
};

export type CashSessionOpen = {
  opening_balance?: string;
  branch_id?: string | null;
};

export type CashSessionClose = {
  closing_balance_declared: string;
  notes?: string | null;
};

export type OrderListParams = {
  customer_id?: string;
  status?: OrderStatus;
  page?: number;
  page_size?: number;
};

export const ordersApi = {
  listServices: (active_only = true) =>
    api.get<ServiceCatalogRead[]>(
      `/api/v1/orders/services${buildQueryString({ active_only })}`,
    ),
  createService: (payload: ServiceCatalogCreate) =>
    api.post<ServiceCatalogRead>("/api/v1/orders/services", payload),
  updateService: (id: string, payload: ServiceCatalogUpdate) =>
    api.put<ServiceCatalogRead>(`/api/v1/orders/services/${id}`, payload),

  createOrder: (payload: OrderCreate) =>
    api.post<OrderRead>("/api/v1/orders", payload),
  listOrders: (params: OrderListParams = {}) =>
    api.get<Page<OrderRead>>(`/api/v1/orders${buildQueryString(params)}`),
  getOrder: (id: string) => api.get<OrderRead>(`/api/v1/orders/${id}`),
  addItem: (orderId: string, item: OrderItemInput) =>
    api.post<OrderRead>(`/api/v1/orders/${orderId}/items`, item),
  removeItem: (orderId: string, itemId: string) =>
    api.delete<OrderRead>(`/api/v1/orders/${orderId}/items/${itemId}`),
  voidOrder: (id: string) =>
    api.post<OrderRead>(`/api/v1/orders/${id}/void`),
  recordPayment: (orderId: string, payload: PaymentCreate) =>
    api.post<PaymentRead>(`/api/v1/orders/${orderId}/payments`, payload),
};

export type CashSessionListParams = {
  user_id?: string;
  closed_only?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
};

export const cashApi = {
  open: (payload: CashSessionOpen) =>
    api.post<CashSessionRead>("/api/v1/cash-sessions/open", payload),
  active: () =>
    api.get<CashSessionRead | null>("/api/v1/cash-sessions/active"),
  close: (id: string, payload: CashSessionClose) =>
    api.post<CashSessionRead>(`/api/v1/cash-sessions/${id}/close`, payload),
  list: (params: CashSessionListParams = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
    const qs = q.toString() ? `?${q.toString()}` : "";
    return api.get<CashSessionRead[]>(`/api/v1/cash-sessions${qs}`);
  },
};

export function orderStatusLabel(s: string): string {
  return ORDER_STATUS_LABELS[s as OrderStatus] ?? s;
}

export function paymentMethodLabel(m: string): string {
  return PAYMENT_METHOD_LABELS[m as PaymentMethod] ?? m;
}

export function serviceCategoryLabel(c: string): string {
  return SERVICE_CATEGORY_LABELS[c as ServiceCategory] ?? c;
}
