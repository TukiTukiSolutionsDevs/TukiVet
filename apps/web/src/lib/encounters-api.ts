import { api } from "./api";
import { buildQueryString, type Page } from "./pagination";

export type EncounterType =
  | "consultation"
  | "vaccination"
  | "surgery"
  | "emergency"
  | "follow_up"
  | "checkup"
  | "hospitalization";

export const ENCOUNTER_TYPE_LABELS: Record<EncounterType, string> = {
  consultation: "Consulta",
  vaccination: "Vacunación",
  surgery: "Cirugía",
  emergency: "Emergencia",
  follow_up: "Seguimiento",
  checkup: "Chequeo",
  hospitalization: "Hospitalización",
};

export const ENCOUNTER_TYPE_OPTIONS: EncounterType[] = [
  "consultation",
  "vaccination",
  "surgery",
  "emergency",
  "follow_up",
  "checkup",
  "hospitalization",
];

export type EncounterStatus = "draft" | "in_progress" | "closed" | "amended";

export const ENCOUNTER_STATUS_LABELS: Record<EncounterStatus, string> = {
  draft: "Borrador",
  in_progress: "En progreso",
  closed: "Cerrado",
  amended: "Enmendado",
};

export type EncounterRead = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  pet_id: string;
  customer_id: string;
  veterinarian_id: string | null;
  type: string;
  chief_complaint: string | null;
  status: string;
  started_at: string;
  closed_at: string | null;
  total_amount: string;
};

export type EncounterCreate = {
  pet_id: string;
  customer_id: string;
  veterinarian_id?: string | null;
  type?: EncounterType;
  chief_complaint?: string | null;
  started_at?: string | null;
};

export type EncounterUpdate = {
  veterinarian_id?: string | null;
  chief_complaint?: string | null;
  type?: EncounterType | null;
};

// SOAP — Estructura flexible. Para el editor usamos shape conocido:
//   subjective.summary, .history, .medications, .diet
//   objective.physical_exam, .lab_results, .imaging
//   assessment: list of { description, status?, code? }
//   plan.treatment, .follow_up, .owner_instructions
export type SoapNoteRead = {
  id: string;
  encounter_id: string;
  subjective: Record<string, unknown>;
  objective: Record<string, unknown>;
  assessment: unknown[];
  plan: Record<string, unknown>;
  template_id: string | null;
  version: number;
  is_current: boolean;
};

export type SoapNoteUpdate = {
  subjective?: Record<string, unknown>;
  objective?: Record<string, unknown>;
  assessment?: unknown[];
  plan?: Record<string, unknown>;
  template_id?: string | null;
};

export type VitalSignCreate = {
  measured_at?: string | null;
  temperature_c?: string | null;
  heart_rate_bpm?: number | null;
  respiratory_rate?: number | null;
  weight_kg?: string | null;
  body_condition_score?: number | null;
  mucous_membranes?: string | null;
  capillary_refill_seconds?: string | null;
  hydration_status?: string | null;
  pain_score?: number | null;
  notes?: string | null;
};

export type VitalSignRead = {
  id: string;
  encounter_id: string;
  measured_at: string;
  temperature_c: string | null;
  heart_rate_bpm: number | null;
  respiratory_rate: number | null;
  weight_kg: string | null;
  body_condition_score: number | null;
  mucous_membranes: string | null;
  capillary_refill_seconds: string | null;
  hydration_status: string | null;
  pain_score: number | null;
  notes: string | null;
  recorded_by: string | null;
};

export type EncounterAmendRequest = {
  reason: string;
  soap_update: SoapNoteUpdate;
};

export type EncounterListParams = {
  pet_id?: string;
  customer_id?: string;
  status?: EncounterStatus | "";
  page?: number;
  page_size?: number;
};

export const encountersApi = {
  list: (params: EncounterListParams = {}) =>
    api.get<Page<EncounterRead>>(
      `/api/v1/encounters${buildQueryString(params)}`,
    ),
  get: (id: string) => api.get<EncounterRead>(`/api/v1/encounters/${id}`),
  create: (payload: EncounterCreate) =>
    api.post<EncounterRead>("/api/v1/encounters", payload),
  update: (id: string, payload: EncounterUpdate) =>
    api.put<EncounterRead>(`/api/v1/encounters/${id}`, payload),
  close: (id: string) =>
    api.post<EncounterRead>(`/api/v1/encounters/${id}/close`),
  amend: (id: string, payload: EncounterAmendRequest) =>
    api.post<EncounterRead>(`/api/v1/encounters/${id}/amend`, payload),

  getSoap: (id: string) =>
    api.get<SoapNoteRead>(`/api/v1/encounters/${id}/soap`),
  updateSoap: (id: string, payload: SoapNoteUpdate) =>
    api.put<SoapNoteRead>(`/api/v1/encounters/${id}/soap`, payload),

  listVitals: (id: string) =>
    api.get<VitalSignRead[]>(`/api/v1/encounters/${id}/vitals`),
  addVital: (id: string, payload: VitalSignCreate) =>
    api.post<VitalSignRead>(`/api/v1/encounters/${id}/vitals`, payload),
};

/* ---- Problems (POMR) ---- */

export type ProblemStatus = "active" | "inactive" | "resolved" | "chronic";

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  resolved: "Resuelto",
  chronic: "Crónico",
};

export type ProblemRead = {
  id: string;
  organization_id: string;
  pet_id: string;
  description: string;
  code: string | null;
  status: string;
  onset_date: string | null;
  resolved_date: string | null;
  notes: string | null;
  created_by_encounter_id: string | null;
};

export type ProblemCreate = {
  description: string;
  code?: string | null;
  status?: ProblemStatus;
  onset_date?: string | null;
  notes?: string | null;
};

export type ProblemUpdate = {
  description?: string | null;
  code?: string | null;
  status?: ProblemStatus | null;
  onset_date?: string | null;
  resolved_date?: string | null;
  notes?: string | null;
};

export const problemsApi = {
  listForPet: (petId: string, statusFilter?: ProblemStatus | "") =>
    api.get<ProblemRead[]>(
      `/api/v1/pets/${petId}/problems${buildQueryString({ status: statusFilter })}`,
    ),
  createForPet: (
    petId: string,
    payload: ProblemCreate,
    encounterId?: string,
  ) =>
    api.post<ProblemRead>(
      `/api/v1/pets/${petId}/problems${buildQueryString({ encounter_id: encounterId })}`,
      payload,
    ),
  update: (id: string, payload: ProblemUpdate) =>
    api.put<ProblemRead>(`/api/v1/problems/${id}`, payload),
  delete: (id: string) => api.delete<void>(`/api/v1/problems/${id}`),
};

export function encounterTypeLabel(t: string): string {
  return ENCOUNTER_TYPE_LABELS[t as EncounterType] ?? t;
}

export function encounterStatusLabel(s: string): string {
  return ENCOUNTER_STATUS_LABELS[s as EncounterStatus] ?? s;
}

export function problemStatusLabel(s: string): string {
  return PROBLEM_STATUS_LABELS[s as ProblemStatus] ?? s;
}
