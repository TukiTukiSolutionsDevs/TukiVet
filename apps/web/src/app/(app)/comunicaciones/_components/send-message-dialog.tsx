"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  notificationsApi,
  type NotificationChannel,
} from "@/lib/notifications-api";
import { ApiError } from "@/lib/api";

export function SendMessageDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<NotificationChannel>("whatsapp");
  const [templateCode, setTemplateCode] = useState("");
  const [recipient, setRecipient] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({});

  const templatesQ = useQuery({
    queryKey: ["notifications", "templates"],
    queryFn: () => notificationsApi.listTemplates(),
    enabled: open,
  });

  const template = useMemo(
    () => templatesQ.data?.find((t) => t.code === templateCode) ?? null,
    [templatesQ.data, templateCode],
  );

  const sendM = useMutation({
    mutationFn: () =>
      notificationsApi.send({
        channel,
        template_code: templateCode,
        recipient,
        variables: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "envios"] });
      toast.success("Mensaje encolado");
      setOpen(false);
      setRecipient("");
      setTemplateCode("");
      setVars({});
    },
    onError: (e) => toast.error(humanError(e, "No pude enviar el mensaje.")),
  });

  const reqVars = template?.variables ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Send className="size-4" />
            Enviar mensaje
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar mensaje</DialogTitle>
          <DialogDescription>
            En sandbox los WhatsApp se marcan como{" "}
            <code>blocked_safe_mode</code> hasta tener trámite Meta aprobado.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendM.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Canal *</Label>
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as NotificationChannel)
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Plantilla *</Label>
              <select
                value={templateCode}
                onChange={(e) => {
                  setTemplateCode(e.target.value);
                  setVars({});
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">— elegí —</option>
                {templatesQ.data
                  ?.filter((t) => t.channel === channel)
                  .map((t) => (
                    <option key={t.id} value={t.code}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Destinatario *</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={
                channel === "email" ? "cliente@ejemplo.com" : "+51 9XX XXX XXX"
              }
              required
            />
          </div>

          {template && (
            <div className="rounded-md border border-input bg-muted/40 p-3 text-xs">
              <p className="mb-1 font-medium text-foreground">Vista previa</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {template.body}
              </p>
            </div>
          )}

          {reqVars.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Variables requeridas
              </p>
              {reqVars.map((v) => (
                <div key={v} className="space-y-1">
                  <Label>{v}</Label>
                  <Input
                    value={vars[v] ?? ""}
                    onChange={(e) =>
                      setVars((p) => ({ ...p, [v]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                sendM.isPending ||
                !templateCode ||
                !recipient.trim() ||
                reqVars.some((v) => !vars[v]?.trim())
              }
            >
              {sendM.isPending && <Loader2 className="size-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function humanError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (typeof e.detail === "string") return e.detail;
    if (Array.isArray(e.detail)) {
      const first = e.detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
  }
  return fallback;
}
