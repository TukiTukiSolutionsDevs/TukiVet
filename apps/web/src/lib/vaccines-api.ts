import { api } from "./api";
import { buildQueryString } from "./pagination";

export type VaccineSpecies =
  | "dog"
  | "cat"
  | "rabbit"
  | "bird"
  | "rodent"
  | "exotic"
  | "all";

export const VACCINE_SPECIES_OPTIONS: VaccineSpecies[] = [
  "all",
  "dog",
  "cat",
  "rabbit",
  "bird",
  "rodent",
  "exotic",
];

export const VACCINE_SPECIES_LABELS: Record<VaccineSpecies, string> = {
  all: "Todas",
  dog: "Perro",
  cat: "Gato",
  rabbit: "Conejo",
  bird: "Ave",
  rodent: "Roedor",
  exotic: "Exótico",
};

export type VaccineCatalogRead = {
  id: string;
  organization_id: string;
  name: string;
  species: string;
  manufacturer: string | null;
  protects_against: string | null;
  default_booster_interval_days: number | null;
  is_rabies: boolean;
  active: boolean;
};

export type VaccineCatalogCreate = {
  name: string;
  species: VaccineSpecies;
  manufacturer?: string | null;
  protects_against?: string | null;
  default_booster_interval_days?: number | null;
  is_rabies?: boolean;
  active?: boolean;
};

export type VaccineCatalogUpdate = {
  name?: string;
  manufacturer?: string | null;
  protects_against?: string | null;
  default_booster_interval_days?: number | null;
  is_rabies?: boolean;
  active?: boolean;
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

export type VaccineAdministrationCreate = {
  pet_id: string;
  vaccine_id: string;
  encounter_id?: string | null;
  administered_at?: string | null;
  lot_number?: string | null;
  expiry_date?: string | null;
  site_of_application?: string | null;
  dose_number?: number | null;
  next_dose_due_date?: string | null;
  certificate_number?: string | null;
  notes?: string | null;
};

export type VaccineDueRow = {
  pet_id: string;
  pet_name: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  vaccine_id: string;
  vaccine_name: string;
  last_administered_at: string;
  next_dose_due_date: string;
  days_overdue: number;
};

export const vaccinesApi = {
  listCatalog: (params: { species?: string; active_only?: boolean } = {}) =>
    api.get<VaccineCatalogRead[]>(
      `/api/v1/vaccines/catalog${buildQueryString(params)}`,
    ),
  createCatalog: (payload: VaccineCatalogCreate) =>
    api.post<VaccineCatalogRead>("/api/v1/vaccines/catalog", payload),
  updateCatalog: (id: string, payload: VaccineCatalogUpdate) =>
    api.put<VaccineCatalogRead>(`/api/v1/vaccines/catalog/${id}`, payload),

  recordAdministration: (payload: VaccineAdministrationCreate) =>
    api.post<VaccineAdministrationRead>(
      "/api/v1/vaccines/administrations",
      payload,
    ),
  listForPet: (petId: string) =>
    api.get<VaccineAdministrationRead[]>(
      `/api/v1/vaccines/pets/${petId}/vaccines`,
    ),
  listDue: (daysWindow = 30) =>
    api.get<VaccineDueRow[]>(
      `/api/v1/vaccines/due${buildQueryString({ days_window: daysWindow })}`,
    ),
};

export function speciesLabel(species: string): string {
  return VACCINE_SPECIES_LABELS[species as VaccineSpecies] ?? species;
}
