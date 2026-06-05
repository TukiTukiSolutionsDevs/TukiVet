import { api } from "./api";
import { buildQueryString, type Page } from "./pagination";

export type InvoiceDocType = "01" | "03" | "07" | "08";

export const INVOICE_DOC_TYPE_LABELS: Record<InvoiceDocType, string> = {
  "01": "Factura",
  "03": "Boleta",
  "07": "Nota de crédito",
  "08": "Nota de débito",
};

export type InvoiceStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  rejected: "Rechazado",
  cancelled: "Anulado",
};

export const INVOICE_STATUS_OPTIONS: InvoiceStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
];

export type ElectronicDocumentRead = {
  id: string;
  organization_id: string;
  order_id: string | null;
  type: string;
  series: string;
  number: number;
  customer_id: string | null;
  customer_document_type: string;
  customer_document_number: string;
  customer_name: string;
  customer_address: string | null;
  issued_at: string;
  currency: string;
  subtotal: string;
  igv_amount: string;
  total: string;
  status: string;
  tukifact_id: string | null;
  tukifact_status: string | null;
  sunat_code: string | null;
  sunat_message: string | null;
  cancellation_reason: string | null;
  pdf_url: string | null;
  xml_url: string | null;
};

export type EmitInvoiceRequest = {
  order_id: string;
  doc_type?: InvoiceDocType | null;
};

export type VoidInvoiceRequest = {
  reason: string;
};

export type InvoiceListParams = {
  status?: InvoiceStatus;
  page?: number;
  page_size?: number;
};

export const invoicesApi = {
  list: (params: InvoiceListParams = {}) =>
    api.get<Page<ElectronicDocumentRead>>(
      `/api/v1/invoices${buildQueryString(params)}`,
    ),
  get: (id: string) =>
    api.get<ElectronicDocumentRead>(`/api/v1/invoices/${id}`),
  emit: (payload: EmitInvoiceRequest) =>
    api.post<ElectronicDocumentRead>("/api/v1/invoices", payload),
  void: (id: string, payload: VoidInvoiceRequest) =>
    api.post<ElectronicDocumentRead>(`/api/v1/invoices/${id}/void`, payload),
};

export function invoiceTypeLabel(t: string): string {
  return INVOICE_DOC_TYPE_LABELS[t as InvoiceDocType] ?? t;
}

export function invoiceStatusLabel(s: string): string {
  return INVOICE_STATUS_LABELS[s as InvoiceStatus] ?? s;
}
