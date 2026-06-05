import { api } from "./api";

export type NotificationChannel = "whatsapp" | "sms" | "email";

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

export const notificationsApi = {
  send: (payload: SendMessageRequest) =>
    api.post<NotificationRead>("/api/v1/notifications/send", payload),
  listTemplates: () =>
    api.get<TemplateRead[]>("/api/v1/notifications/templates"),
  seedDefaults: () =>
    api.post<{ created: number; skipped: number }>(
      "/api/v1/notifications/templates/seed-defaults",
    ),
};
