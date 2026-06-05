"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  notificationsApi,
  channelLabel,
  notificationStatusLabel,
  NOTIFICATION_STATUS_LABELS,
  type NotificationStatus,
} from "@/lib/notifications-api";
import { formatDateTime } from "@/lib/format";

function statusVariant(s: string) {
  if (s === "delivered" || s === "sent") return "secondary" as const;
  if (s === "failed") return "destructive" as const;
  if (s === "blocked_safe_mode") return "outline" as const;
  return "default" as const;
}

const STATUS_OPTIONS: NotificationStatus[] = [
  "queued",
  "sent",
  "delivered",
  "failed",
  "blocked_safe_mode",
];

export function NotificationsTab() {
  const [status, setStatus] = useState<NotificationStatus | "">("");

  const q = useQuery({
    queryKey: ["notifications", "envios", status],
    queryFn: () =>
      notificationsApi.list({
        status: status || undefined,
        page_size: 100,
      }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as NotificationStatus | "")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {NOTIFICATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Destinatario</TableHead>
              <TableHead>Plantilla</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Enviado</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ) : q.data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No hay envíos. Mandá tu primer mensaje desde "Enviar mensaje".
                </TableCell>
              </TableRow>
            ) : (
              q.data?.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <Badge variant="outline">{channelLabel(n.channel)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {n.recipient}
                  </TableCell>
                  <TableCell className="text-sm">
                    {n.template_code ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(n.status)}>
                      {notificationStatusLabel(n.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(n.sent_at)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-destructive">
                    {n.error_message ?? ""}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
