"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  portalApi,
  portalTokenStore,
  type DocType,
} from "@/lib/portal-api";
import { ApiError } from "@/lib/api";

const DOC_OPTIONS: { v: DocType; label: string }[] = [
  { v: "DNI", label: "DNI" },
  { v: "RUC", label: "RUC" },
  { v: "CE", label: "Carné de extranjería" },
  { v: "PASSPORT", label: "Pasaporte" },
];

export default function PortalLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "consume">("request");
  const [docType, setDocType] = useState<DocType>("DNI");
  const [docNumber, setDocNumber] = useState("");
  const [code, setCode] = useState("");

  const requestM = useMutation({
    mutationFn: () =>
      portalApi.requestMagic({
        document_type: docType,
        document_number: docNumber,
      }),
    onSuccess: (res) => {
      toast.success("Código enviado por WhatsApp");
      setStep("consume");
      if (res.dev_token) {
        // En sandbox/dev el backend devuelve el token para tests
        setCode(res.dev_token);
        toast.message(`Sandbox: usá el código mostrado.`);
      }
    },
    onError: (e) =>
      toast.error(humanError(e, "No pude enviar el código.")),
  });

  const consumeM = useMutation({
    mutationFn: () => portalApi.consume(code),
    onSuccess: (tokens) => {
      portalTokenStore.set(tokens.access_token, tokens.refresh_token);
      router.replace("/portal");
    },
    onError: (e) =>
      toast.error(humanError(e, "Código inválido o expirado.")),
  });

  return (
    <div className="mx-auto max-w-md space-y-6 pt-8">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-foreground">
          Portal del cliente
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingresá con tu documento y te enviamos un código por WhatsApp.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        {step === "request" ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              requestM.mutate();
            }}
          >
            <div className="space-y-1">
              <Label>Tipo de documento</Label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {DOC_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Número de documento</Label>
              <Input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                autoFocus
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={requestM.isPending || !docNumber.trim()}
            >
              {requestM.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageCircle className="size-4" />
              )}
              Recibir código por WhatsApp
            </Button>
          </form>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              consumeM.mutate();
            }}
          >
            <p className="text-sm text-muted-foreground">
              Pegá el código que recibiste para iniciar sesión.
            </p>
            <div className="space-y-1">
              <Label>Código</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="código de un solo uso"
                autoFocus
                required
                className="font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("request")}
              >
                Volver
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={consumeM.isPending || !code.trim()}
              >
                {consumeM.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Iniciar sesión
              </Button>
            </div>
          </form>
        )}
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Si no podés ingresar, contactanos al WhatsApp de la clínica.
      </p>
    </div>
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
