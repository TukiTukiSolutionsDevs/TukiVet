import { api } from "./api";
import { buildQueryString } from "./pagination";

export type NotificationChannel = "whatsapp" | "sms" | "email";

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

export type NotificationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "blocked_safe_mode";

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  queued: "En cola",
  sent: "Enviado",
  delivered: "Entregado",
  failed: "Falló",
  blocked_safe_mode: "Bloqueado (safe-mode)",
};

export type TemplateCreate = {
  code: string;
  name: string;
  channel: NotificationChannel;
  body: string;
  locale?: string;
  variables?: string[];
};

export type TemplateUpdate = {
  name?: string | null;
  body?: string | null;
  locale?: string | null;
  variables?: string[] | null;
  status?: string | null;
};

export type SendMessageRequest = {
  channel?: NotificationChannel;
  recipient: string;
  template_code: string;
  variables?: Record<string, string>;
  customer_id?: string | null;
};

export type NotificationRead = {
  id: string;
  organization_id: string;
  channel: string;
  recipient: string;
  template_code: string | null;
  body_preview: string | null;
  status: string;
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  related_type: string | null;
  related_id: string | null;
  customer_id: string | null;
};

export type TemplateRead = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  channel: string;
  locale: string;
  body: string;
  variables: string[] | null;
  status: string;
};

export type NotificationListParams = {
  status?: NotificationStatus;
  customer_id?: string;
  page?: number;
  page_size?: number;
};

export const notificationsApi = {
  send: (payload: SendMessageRequest) =>
    api.post<NotificationRead>("/api/v1/notifications/send", payload),
  list: (params: NotificationListParams = {}) =>
    api.get<NotificationRead[]>(
      `/api/v1/notifications${buildQueryString(params)}`,
    ),
  listTemplates: () =>
    api.get<TemplateRead[]>("/api/v1/notifications/templates"),
  createTemplate: (payload: TemplateCreate) =>
    api.post<TemplateRead>("/api/v1/notifications/templates", payload),
  updateTemplate: (id: string, payload: TemplateUpdate) =>
    api.patch<TemplateRead>(`/api/v1/notifications/templates/${id}`, payload),
  deleteTemplate: (id: string) =>
    api.delete<void>(`/api/v1/notifications/templates/${id}`),
  seedDefaults: () =>
    api.post<{ created: number }>(
      "/api/v1/notifications/templates/seed-defaults",
    ),
  sendAppointmentReminder: (appointmentId: string) =>
    api.post<NotificationRead>(
      `/api/v1/notifications/appointments/${appointmentId}/remind`,
    ),
  sendVaccineReminder: (administrationId: string) =>
    api.post<NotificationRead>(
      `/api/v1/notifications/vaccines/${administrationId}/remind`,
    ),
};

export function channelLabel(c: string): string {
  return CHANNEL_LABELS[c as NotificationChannel] ?? c;
}

export function notificationStatusLabel(s: string): string {
  return NOTIFICATION_STATUS_LABELS[s as NotificationStatus] ?? s;
}
