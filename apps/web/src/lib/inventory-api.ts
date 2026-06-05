import { api } from "./api";
import { buildQueryString, type Page } from "./pagination";

export type ProductCategory =
  | "medication"
  | "vaccine"
  | "food"
  | "accessory"
  | "supply"
  | "service";

export const PRODUCT_CATEGORY_OPTIONS: ProductCategory[] = [
  "medication",
  "vaccine",
  "food",
  "accessory",
  "supply",
  "service",
];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  medication: "Medicamento",
  vaccine: "Vacuna",
  food: "Alimento",
  accessory: "Accesorio",
  supply: "Insumo",
  service: "Servicio",
};

export type LotStatus = "active" | "depleted" | "expired" | "recalled";

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  active: "Activo",
  depleted: "Agotado",
  expired: "Vencido",
  recalled: "Retirado",
};

export type MovementType =
  | "purchase"
  | "sale"
  | "dispensation"
  | "adjustment"
  | "waste"
  | "transfer";

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  purchase: "Compra",
  sale: "Venta",
  dispensation: "Dispensación",
  adjustment: "Ajuste",
  waste: "Merma",
  transfer: "Transferencia",
};

export type SupplierRead = {
  id: string;
  organization_id: string;
  name: string;
  ruc: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
};

export type SupplierCreate = {
  name: string;
  ruc?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type SupplierUpdate = {
  name?: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  active?: boolean;
};

export type ProductRead = {
  id: string;
  organization_id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  presentation: string | null;
  active_ingredient: string | null;
  manufacturer: string | null;
  is_controlled: boolean;
  barcode: string | null;
  unit: string;
  reorder_point: string | null;
  reorder_qty: string | null;
  sale_price: string;
  sale_price_includes_igv: boolean;
  igv_affected: boolean;
  sunat_code: string | null;
  active: boolean;
  available_qty: string | null;
};

export type ProductCreate = {
  sku: string;
  name: string;
  category: ProductCategory;
  subcategory?: string | null;
  presentation?: string | null;
  active_ingredient?: string | null;
  manufacturer?: string | null;
  is_controlled?: boolean;
  barcode?: string | null;
  unit?: string;
  reorder_point?: string | null;
  reorder_qty?: string | null;
  sale_price?: string;
  sale_price_includes_igv?: boolean;
  igv_affected?: boolean;
  sunat_code?: string | null;
  active?: boolean;
};

export type ProductUpdate = Partial<ProductCreate>;

export type LotRead = {
  id: string;
  organization_id: string;
  product_id: string;
  lot_number: string;
  expiry_date: string | null;
  received_at: string | null;
  supplier_id: string | null;
  unit_cost: string;
  initial_qty: string;
  current_qty: string;
  status: string;
};

export type LotCreate = {
  product_id: string;
  lot_number: string;
  expiry_date?: string | null;
  received_at?: string | null;
  supplier_id?: string | null;
  unit_cost?: string;
  initial_qty: string;
};

export type MovementCreate = {
  product_id: string;
  lot_id?: string | null;
  type: MovementType;
  quantity: string;
  unit_cost?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  reason?: string | null;
  witness_user_id?: string | null;
};

export type MovementRead = {
  id: string;
  organization_id: string;
  product_id: string;
  lot_id: string | null;
  type: string;
  quantity: string;
  unit_cost: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  performed_by: string | null;
  witness_user_id: string | null;
};

export type StockAlertRow = {
  product_id: string;
  sku: string;
  name: string;
  category: string;
  available_qty: string;
  reorder_point: string | null;
};

export type ExpiringLotRow = {
  lot_id: string;
  product_id: string;
  product_name: string;
  lot_number: string;
  expiry_date: string;
  days_until_expiry: number;
  current_qty: string;
};

export type ProductListParams = {
  q?: string;
  category?: ProductCategory;
  page?: number;
  page_size?: number;
  with_qty?: boolean;
};

export const inventoryApi = {
  listSuppliers: (active_only = true) =>
    api.get<SupplierRead[]>(
      `/api/v1/inventory/suppliers${buildQueryString({ active_only })}`,
    ),
  createSupplier: (payload: SupplierCreate) =>
    api.post<SupplierRead>("/api/v1/inventory/suppliers", payload),
  updateSupplier: (id: string, payload: SupplierUpdate) =>
    api.put<SupplierRead>(`/api/v1/inventory/suppliers/${id}`, payload),

  listProducts: (params: ProductListParams = {}) =>
    api.get<Page<ProductRead>>(
      `/api/v1/inventory/products${buildQueryString(params)}`,
    ),
  getProduct: (id: string) =>
    api.get<ProductRead>(`/api/v1/inventory/products/${id}`),
  createProduct: (payload: ProductCreate) =>
    api.post<ProductRead>("/api/v1/inventory/products", payload),
  updateProduct: (id: string, payload: ProductUpdate) =>
    api.put<ProductRead>(`/api/v1/inventory/products/${id}`, payload),

  listLots: (productId: string, include_depleted = false) =>
    api.get<LotRead[]>(
      `/api/v1/inventory/products/${productId}/lots${buildQueryString({ include_depleted })}`,
    ),
  receiveLot: (payload: LotCreate) =>
    api.post<LotRead>("/api/v1/inventory/lots", payload),

  recordMovement: (payload: MovementCreate) =>
    api.post<MovementRead>("/api/v1/inventory/movements", payload),

  lowStock: () =>
    api.get<StockAlertRow[]>("/api/v1/inventory/alerts/low-stock"),
  expiring: (days_window = 30) =>
    api.get<ExpiringLotRow[]>(
      `/api/v1/inventory/alerts/expiring${buildQueryString({ days_window })}`,
    ),
};

export function categoryLabel(c: string): string {
  return PRODUCT_CATEGORY_LABELS[c as ProductCategory] ?? c;
}

export function lotStatusLabel(s: string): string {
  return LOT_STATUS_LABELS[s as LotStatus] ?? s;
}

export function movementTypeLabel(t: string): string {
  return MOVEMENT_TYPE_LABELS[t as MovementType] ?? t;
}
