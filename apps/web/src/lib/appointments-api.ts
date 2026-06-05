import { api } from "./api";
import { buildQueryString, type Page } from "./pagination";

export type AppointmentType =
  | "consultation"
  | "vaccination"
  | "surgery"
  | "follow_up"
  | "checkup"
  | "grooming"
  | "emergency";

export const APPOINTMENT_TYPE_OPTIONS: AppointmentType[] = [
  "consultation",
  "vaccination",
  "surgery",
  "follow_up",
  "checkup",
  "grooming",
  "emergency",
];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  consultation: "Consulta",
  vaccination: "Vacunación",
  surgery: "Cirugía",
  follow_up: "Seguimiento",
  checkup: "Checkup",
  grooming: "Grooming",
  emergency: "Emergencia",
};

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "no_show"
  | "cancelled";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  no_show: "No asistió",
  cancelled: "Cancelada",
};

export type AppointmentRead = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  pet_id: string | null;
  customer_id: string;
  veterinarian_id: string;
  room_id: string | null;
  type: string;
  starts_at: string;
  ends_at: string;
  status: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  source: string;
};

export type AppointmentCreate = {
  customer_id: string;
  pet_id?: string | null;
  veterinarian_id: string;
  room_id?: string | null;
  type?: AppointmentType;
  starts_at: string;
  ends_at: string;
  notes?: string | null;
  source?: string;
};

export type AppointmentUpdate = {
  pet_id?: string | null;
  veterinarian_id?: string | null;
  room_id?: string | null;
  type?: AppointmentType | null;
  starts_at?: string | null;
  ends_at?: string | null;
  notes?: string | null;
};

export type AppointmentListParams = {
  starts_at_from?: string;
  starts_at_to?: string;
  veterinarian_id?: string;
  pet_id?: string;
  customer_id?: string;
  status?: AppointmentStatus;
  page?: number;
  page_size?: number;
};

export type RoomRead = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  name: string;
  type: string;
  active: boolean;
};

export const appointmentsApi = {
  list: (params: AppointmentListParams = {}) =>
    api.get<Page<AppointmentRead>>(
      `/api/v1/appointments${buildQueryString(params)}`,
    ),
  get: (id: string) =>
    api.get<AppointmentRead>(`/api/v1/appointments/${id}`),
  create: (payload: AppointmentCreate) =>
    api.post<AppointmentRead>("/api/v1/appointments", payload),
  update: (id: string, payload: AppointmentUpdate) =>
    api.put<AppointmentRead>(`/api/v1/appointments/${id}`, payload),
  confirm: (id: string) =>
    api.post<AppointmentRead>(`/api/v1/appointments/${id}/confirm`),
  start: (id: string) =>
    api.post<AppointmentRead>(`/api/v1/appointments/${id}/start`),
  complete: (id: string) =>
    api.post<AppointmentRead>(`/api/v1/appointments/${id}/complete`),
  cancel: (id: string, reason?: string | null) =>
    api.post<AppointmentRead>(`/api/v1/appointments/${id}/cancel`, {
      reason: reason ?? null,
    }),
  noShow: (id: string) =>
    api.post<AppointmentRead>(`/api/v1/appointments/${id}/no-show`),
  listRooms: () => api.get<RoomRead[]>("/api/v1/appointments/rooms"),
};

export function appointmentTypeLabel(t: string): string {
  return APPOINTMENT_TYPE_LABELS[t as AppointmentType] ?? t;
}

export function appointmentStatusLabel(s: string): string {
  return APPOINTMENT_STATUS_LABELS[s as AppointmentStatus] ?? s;
}
