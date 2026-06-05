import { api } from "./api";

export type PrescriptionStatus =
  | "issued"
  | "dispensed_partial"
  | "dispensed_full"
  | "void";

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  issued: "Emitida",
  dispensed_partial: "Dispensada parcial",
  dispensed_full: "Dispensada completa",
  void: "Anulada",
};

export type Route =
  | "oral"
  | "sc"
  | "im"
  | "iv"
  | "topical"
  | "ocular"
  | "otic"
  | "inhalation"
  | "rectal";

export const ROUTE_LABELS: Record<Route, string> = {
  oral: "Oral",
  sc: "Subcutánea",
  im: "Intramuscular",
  iv: "Intravenosa",
  topical: "Tópica",
  ocular: "Ocular",
  otic: "Ótica",
  inhalation: "Inhalación",
  rectal: "Rectal",
};

export const ROUTE_OPTIONS: Route[] = [
  "oral",
  "sc",
  "im",
  "iv",
  "topical",
  "ocular",
  "otic",
  "inhalation",
  "rectal",
];

export type PrescriptionItemInput = {
  product_id?: string | null;
  medication_name: string;
  active_ingredient?: string | null;
  dose_mg_per_kg?: string | null;
  total_dose_mg?: string | null;
  presentation?: string | null;
  quantity: string;
  frequency?: string | null;
  duration_days?: number | null;
  route?: Route | null;
  instructions?: string | null;
  is_controlled?: boolean;
};

export type PrescriptionItemRead = {
  id: string;
  prescription_id: string;
  product_id: string | null;
  medication_name: string;
  active_ingredient: string | null;
  dose_mg_per_kg: string | null;
  total_dose_mg: string | null;
  presentation: string | null;
  quantity: string;
  frequency: string | null;
  duration_days: number | null;
  route: string | null;
  instructions: string | null;
  dispensed_qty: string;
  dispensed_at: string | null;
  dispensed_by: string | null;
  lot_id: string | null;
  is_controlled: boolean;
  witness_user_id: string | null;
};

export type PrescriptionCreate = {
  pet_id: string;
  encounter_id?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  items: PrescriptionItemInput[];
};

export type PrescriptionRead = {
  id: string;
  organization_id: string;
  encounter_id: string | null;
  pet_id: string;
  prescribed_by: string;
  issued_at: string;
  diagnosis: string | null;
  notes: string | null;
  status: string;
  items: PrescriptionItemRead[];
};

export type DispenseRequest = {
  quantity: string;
  witness_user_id?: string | null;
};

export type DoseCalculationRequest = {
  weight_kg: string;
  dose_mg_per_kg: string;
  presentation_mg_per_unit: string;
};

export type DoseCalculationResponse = {
  weight_kg: string;
  dose_mg_per_kg: string;
  total_dose_mg: string;
  presentation_mg_per_unit: string;
  units_per_dose: string;
};

export const prescriptionsApi = {
  calculateDose: (payload: DoseCalculationRequest) =>
    api.post<DoseCalculationResponse>(
      "/api/v1/prescriptions/calculate-dose",
      payload,
    ),
  create: (payload: PrescriptionCreate) =>
    api.post<PrescriptionRead>("/api/v1/prescriptions", payload),
  get: (id: string) => api.get<PrescriptionRead>(`/api/v1/prescriptions/${id}`),
  listForPet: (petId: string) =>
    api.get<PrescriptionRead[]>(
      `/api/v1/prescriptions/pets/${petId}/prescriptions`,
    ),
  dispense: (prescriptionId: string, itemId: string, payload: DispenseRequest) =>
    api.post<PrescriptionItemRead>(
      `/api/v1/prescriptions/${prescriptionId}/items/${itemId}/dispense`,
      payload,
    ),
  void: (id: string) =>
    api.post<PrescriptionRead>(`/api/v1/prescriptions/${id}/void`),
};

export function statusLabel(s: string): string {
  return PRESCRIPTION_STATUS_LABELS[s as PrescriptionStatus] ?? s;
}

export function routeLabel(r: string | null): string {
  if (!r) return "—";
  return ROUTE_LABELS[r as Route] ?? r;
}
