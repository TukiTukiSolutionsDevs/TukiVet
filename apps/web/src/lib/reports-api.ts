import { api } from "./api";
import { buildQueryString } from "./pagination";

export type KPIs = {
  active_patients: number;
  active_clients: number;
  total_encounters_last_30d: number;
  average_transaction_charge: string;
  revenue_last_30d: string;
  revenue_per_vet_last_30d: Record<string, string>;
  appointments_last_30d: number;
  no_show_rate_pct: string;
  vaccines_compliance_pct: string;
  inventory_value: string;
  expiring_lots_count: number;
  low_stock_count: number;
  period_start: string;
  period_end: string;
};

export type RevenueByCategoryRow = {
  category: string;
  count: number;
  total: string;
};

export type FinancialReport = {
  period_start: string;
  period_end: string;
  gross_revenue: string;
  igv_collected: string;
  net_revenue: string;
  payments_by_method: Record<string, string>;
  revenue_by_category: RevenueByCategoryRow[];
  invoices_emitted: number;
  boletas_emitted: number;
  cancelled_documents: number;
};

export type KPIParams = {
  window_days?: number;
};

export type FinancialParams = {
  start: string;
  end: string;
};

export const reportsApi = {
  kpis: (params: KPIParams = {}) =>
    api.get<KPIs>(`/api/v1/reports/kpis${buildQueryString(params)}`),
  financial: (params: FinancialParams) =>
    api.get<FinancialReport>(`/api/v1/reports/financial${buildQueryString(params)}`),
};
