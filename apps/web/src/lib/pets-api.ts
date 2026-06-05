import { api } from "./api";
import { buildQueryString, type Page } from "./pagination";

export type Species =
  | "dog"
  | "cat"
  | "bird"
  | "rabbit"
  | "rodent"
  | "reptile"
  | "exotic"
  | "other";

export const SPECIES_OPTIONS: Species[] = [
  "dog",
  "cat",
  "bird",
  "rabbit",
  "rodent",
  "reptile",
  "exotic",
  "other",
];

export const SPECIES_LABELS: Record<Species, string> = {
  dog: "Perro",
  cat: "Gato",
  bird: "Ave",
  rabbit: "Conejo",
  rodent: "Roedor",
  reptile: "Reptil",
  exotic: "Exótico",
  other: "Otro",
};

export type PetSex = "male" | "female" | "unknown";

export const SEX_LABELS: Record<PetSex, string> = {
  male: "Macho",
  female: "Hembra",
  unknown: "—",
};

export type PetStatus = "active" | "deceased" | "transferred" | "lost";

export const STATUS_LABELS: Record<PetStatus, string> = {
  active: "Activo",
  deceased: "Fallecido",
  transferred: "Transferido",
  lost: "Perdido",
};

export type PetRead = {
  id: string;
  organization_id: string;
  customer_id: string | null;
  name: string;
  species: string;
  breed_id: string | null;
  breed_name: string | null;
  sex: string;
  birth_date: string | null;
  birth_date_estimated: boolean;
  color: string | null;
  distinguishing_marks: string | null;
  microchip: string | null;
  tattoo: string | null;
  sterilized: boolean;
  sterilization_date: string | null;
  status: string;
  deceased_date: string | null;
  deceased_reason: string | null;
  alerts: string[] | null;
  chronic_conditions: string[] | null;
  current_weight_kg: string | null;
  current_weight_at: string | null;
  photo_url: string | null;
};

export type PetCreate = {
  customer_id: string;
  name: string;
  species: Species;
  breed_name?: string | null;
  sex?: PetSex;
  birth_date?: string | null;
  birth_date_estimated?: boolean;
  color?: string | null;
  microchip?: string | null;
  sterilized?: boolean;
  sterilization_date?: string | null;
  alerts?: string[] | null;
  chronic_conditions?: string[] | null;
};

export type PetWeightRead = {
  id: string;
  pet_id: string;
  weight_kg: string;
  measured_at: string;
  recorded_by: string | null;
  notes: string | null;
};

export type PetWeightCreate = {
  weight_kg: string;
  measured_at?: string | null;
  notes?: string | null;
};

export type PetListParams = {
  q?: string;
  species?: Species | "";
  customer_id?: string;
  microchip?: string;
  page?: number;
  page_size?: number;
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

export type VaccineAdministrationRead = {
  id: string;
  organization_id: string;
  pet_id: string;
  vaccine_id: string;
  encounter_id: string | null;
  administered_by: string | null;
  administered_at: string;
  lot_number: string | null;
  expiry_date: string | null;
  site_of_application: string | null;
  dose_number: number | null;
  next_dose_due_date: string | null;
  certificate_number: string | null;
  notes: string | null;
  status: string;
  vaccine_name: string | null;
};

export type PrescriptionItemRead = {
  id: string;
  prescription_id: string;
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
  is_controlled: boolean;
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

export const petsApi = {
  list: (params: PetListParams = {}) =>
    api.get<Page<PetRead>>(`/api/v1/pets${buildQueryString(params)}`),
  get: (id: string) => api.get<PetRead>(`/api/v1/pets/${id}`),
  create: (payload: PetCreate) => api.post<PetRead>("/api/v1/pets", payload),
  listWeights: (petId: string) =>
    api.get<PetWeightRead[]>(`/api/v1/pets/${petId}/weights`),
  recordWeight: (petId: string, payload: PetWeightCreate) =>
    api.post<PetWeightRead>(`/api/v1/pets/${petId}/weights`, payload),
  listEncounters: (petId: string, pageSize = 50) =>
    api.get<Page<EncounterRead>>(
      `/api/v1/encounters${buildQueryString({ pet_id: petId, page_size: pageSize })}`,
    ),
  listVaccines: (petId: string) =>
    api.get<VaccineAdministrationRead[]>(
      `/api/v1/vaccines/pets/${petId}/vaccines`,
    ),
  listPrescriptions: (petId: string) =>
    api.get<PrescriptionRead[]>(
      `/api/v1/prescriptions/pets/${petId}/prescriptions`,
    ),
};

export function speciesLabel(species: string): string {
  return SPECIES_LABELS[species as Species] ?? species;
}

export function sexLabel(sex: string): string {
  return SEX_LABELS[sex as PetSex] ?? sex;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as PetStatus] ?? status;
}
