import { api } from "./api";

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

export const reportsApi = {
  kpis: () => api.get<KPIs>("/api/v1/reports/kpis"),
};
