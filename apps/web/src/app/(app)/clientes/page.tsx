"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  customersApi,
  customerFullName,
  DOCUMENT_TYPES,
  type CustomerCreate,
  type DocumentType,
} from "@/lib/customers-api";
import { ApiError } from "@/lib/api";

export default function ClientesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ClientesInner />
    </Suspense>
  );
}

function ClientesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const qParam = params.get("q") ?? "";
  const pageParam = parseInt(params.get("page") ?? "1", 10);

  const [inputValue, setInputValue] = useState(qParam);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const sp = new URLSearchParams();
      if (inputValue) sp.set("q", inputValue);
      sp.set("page", "1");
      router.push(`/clientes?${sp.toString()}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [inputValue, router]);

  const customersQ = useQuery({
    queryKey: ["customers", qParam, pageParam],
    queryFn: () =>
      customersApi.list({ q: qParam || undefined, page: pageParam, page_size: 25 }),
  });

  function goPage(next: number) {
    const sp = new URLSearchParams();
    if (qParam) sp.set("q", qParam);
    sp.set("page", String(next));
    router.push(`/clientes?${sp.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tutores registrados en Clínica Razas.
          </p>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <UserPlus className="size-4" />
          Nuevo cliente
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Buscar por nombre, DNI, RUC o teléfono…"
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Canales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customersQ.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : customersQ.data?.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-14 text-center text-sm text-muted-foreground"
                >
                  {qParam
                    ? `Sin resultados para "${qParam}".`
                    : "Sin clientes registrados. Crea el primero con «Nuevo cliente»."}
                </TableCell>
              </TableRow>
            ) : (
              customersQ.data?.items.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/clientes/${c.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{customerFullName(c)}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.document_type} {c.document_number}
                  </TableCell>
                  <TableCell className="text-sm">{c.phone_primary}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{c.city}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.whatsapp_opted_in && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400"
                        >
                          WA
                        </Badge>
                      )}
                      {c.email_opted_in && (
                        <Badge
                          variant="outline"
                          className="border-sky-500/40 px-1.5 py-0 text-[10px] text-sky-600 dark:text-sky-400"
                        >
                          Email
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {customersQ.data && customersQ.data.total > 25 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {customersQ.data.total} clientes · página {pageParam}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => goPage(Math.max(1, pageParam - 1))}
              disabled={pageParam === 1}
              className="rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted"
            >
              Anterior
            </button>
            <button
              onClick={() => goPage(pageParam + 1)}
              disabled={pageParam * 25 >= customersQ.data.total}
              className="rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <NewCustomerDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

const blankForm = () => ({
  first_name: "",
  last_name: "",
  business_name: "",
  phone_primary: "",
  phone_secondary: "",
  email: "",
  address: "",
  district: "",
  city: "Arequipa",
  whatsapp_opted_in: true,
  email_opted_in: false,
  notes: "",
});

function NewCustomerDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [docType, setDocType] = useState<DocumentType>("DNI");
  const [docNumber, setDocNumber] = useState("");
  const [docValid, setDocValid] = useState<boolean | null>(null);
  const [form, setForm] = useState(blankForm());

  const validateM = useMutation({
    mutationFn: () => customersApi.validateDoc(docType, docNumber),
    onSuccess: (res) => setDocValid(res.valid),
    onError: () => setDocValid(false),
  });

  const createM = useMutation({
    mutationFn: () =>
      customersApi.create({
        document_type: docType,
        document_number: docNumber,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        business_name:
          docType === "RUC" ? form.business_name.trim() || null : null,
        phone_primary: form.phone_primary.trim(),
        phone_secondary: form.phone_secondary.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        district: form.district.trim() || null,
        city: form.city.trim() || "Lima",
        whatsapp_opted_in: form.whatsapp_opted_in,
        email_opted_in: form.email_opted_in,
        notes: form.notes.trim() || null,
      } as CustomerCreate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente creado");
      onClose();
      setDocNumber("");
      setDocValid(null);
      setForm(blankForm());
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && typeof e.detail === "string"
          ? e.detail
          : "No pude crear el cliente.";
      toast.error(msg);
    },
  });

  function isValid() {
    return (
      docNumber.length >= 8 &&
      form.first_name.trim().length >= 2 &&
      form.phone_primary.trim().length >= 9
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            El DNI/RUC se usa para emitir boletas y facturas SUNAT.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo y número de documento *</Label>
            <div className="flex gap-2">
              <select
                value={docType}
                onChange={(e) => {
                  setDocType(e.target.value as DocumentType);
                  setDocValid(null);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Input
                value={docNumber}
                onChange={(e) => {
                  setDocNumber(e.target.value);
                  setDocValid(null);
                }}
                placeholder={docType === "DNI" ? "12345678" : "20123456789"}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => validateM.mutate()}
                disabled={docNumber.length < 8 || validateM.isPending}
              >
                {validateM.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Validar"
                )}
              </Button>
            </div>
            {docValid === true && (
              <p className="text-xs text-emerald-600">✓ Documento válido</p>
            )}
            {docValid === false && (
              <p className="text-xs text-destructive">
                ✗ Número inválido para {docType}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nombres *</Label>
              <Input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Apellidos *</Label>
              <Input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Pérez García"
              />
            </div>
          </div>

          {docType === "RUC" && (
            <div className="space-y-1.5">
              <Label>Razón social</Label>
              <Input
                value={form.business_name}
                onChange={(e) =>
                  setForm({ ...form, business_name: e.target.value })
                }
                placeholder="Empresa S.A.C."
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Teléfono principal *</Label>
              <Input
                value={form.phone_primary}
                onChange={(e) =>
                  setForm({ ...form, phone_primary: e.target.value })
                }
                placeholder="+51 999 999 999"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="juan@email.com"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Dirección</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Av. Principal 123"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Arequipa"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.whatsapp_opted_in}
                onChange={(e) =>
                  setForm({ ...form, whatsapp_opted_in: e.target.checked })
                }
                className="size-4 rounded border-input"
              />
              Acepta mensajes WhatsApp
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.email_opted_in}
                onChange={(e) =>
                  setForm({ ...form, email_opted_in: e.target.checked })
                }
                className="size-4 rounded border-input"
              />
              Acepta emails
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={createM.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => createM.mutate()}
            disabled={!isValid() || createM.isPending}
          >
            {createM.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Crear cliente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
