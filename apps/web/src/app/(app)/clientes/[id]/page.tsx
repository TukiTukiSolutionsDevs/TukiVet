"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Edit2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import {
  customersApi,
  customerFullName,
  DOCUMENT_TYPES,
  type CustomerRead,
  type CustomerUpdate,
  type DocumentType,
} from "@/lib/customers-api";
import { speciesLabel, statusLabel } from "@/lib/pets-api";
import {
  encountersApi,
  encounterTypeLabel,
  encounterStatusLabel,
} from "@/lib/encounters-api";
import { formatDateShort, formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const q = useQuery({
    queryKey: ["customers", id],
    queryFn: () => customersApi.get(id),
  });

  if (q.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!q.data)
    return (
      <Card className="border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
        No se pudo cargar el cliente.
      </Card>
    );

  return <CustomerDetail customer={q.data} />;
}

function CustomerDetail({ customer }: { customer: CustomerRead }) {
  const [editOpen, setEditOpen] = useState(false);
  const name = customerFullName(customer);

  const petsQ = useQuery({
    queryKey: ["customers", customer.id, "pets"],
    queryFn: () => customersApi.listPets(customer.id),
  });

  const encountersQ = useQuery({
    queryKey: ["encounters", "by-customer", customer.id],
    queryFn: () =>
      encountersApi.list({ customer_id: customer.id, page_size: 20 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clientes" className="hover:text-foreground">
          Clientes
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{name}</span>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary select-none">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{name}</h1>
              <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                {customer.document_type} {customer.document_number}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="size-3.5" />
                  {customer.phone_primary}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="size-3.5" />
                    {customer.email}
                  </span>
                )}
                {(customer.address || customer.district || customer.city) && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {[customer.address, customer.district, customer.city]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>
              <div className="mt-2 flex gap-1.5">
                {customer.whatsapp_opted_in && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-xs text-emerald-600 dark:text-emerald-400"
                  >
                    <MessageCircle className="mr-1 size-3" />
                    WhatsApp
                  </Badge>
                )}
                {customer.email_opted_in && (
                  <Badge
                    variant="outline"
                    className="border-sky-500/40 text-xs text-sky-600 dark:text-sky-400"
                  >
                    <Mail className="mr-1 size-3" />
                    Email
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit2 className="size-4" />
            Editar
          </Button>
        </div>
        {customer.notes && (
          <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {customer.notes}
          </div>
        )}
      </Card>

      <Tabs defaultValue="mascotas">
        <TabsList>
          <TabsTab value="mascotas">
            Mascotas{petsQ.data ? ` (${petsQ.data.length})` : ""}
          </TabsTab>
          <TabsTab value="consultas">Consultas</TabsTab>
        </TabsList>

        <TabsPanel value="mascotas" className="mt-4">
          {petsQ.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : !petsQ.data?.length ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              Sin mascotas registradas para este cliente.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {petsQ.data.map((pet) => (
                <Link key={pet.id} href={`/pacientes/${pet.id}`}>
                  <Card className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/50">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <PawPrint className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">
                          {pet.name}
                        </span>
                        {pet.status !== "active" && (
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {statusLabel(pet.status)}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {speciesLabel(pet.species)}
                        {pet.breed_name ? ` · ${pet.breed_name}` : ""}
                      </div>
                      {pet.current_weight_kg && (
                        <div className="text-xs text-muted-foreground">
                          {pet.current_weight_kg} kg
                          {pet.current_weight_at
                            ? ` · ${formatDateShort(pet.current_weight_at)}`
                            : ""}
                        </div>
                      )}
                      {pet.alerts && pet.alerts.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {pet.alerts.map((a) => (
                            <Badge
                              key={a}
                              className="bg-warning/15 px-1 py-0 text-[10px] text-warning"
                            >
                              ⚠ {a}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsPanel>

        <TabsPanel value="consultas" className="mt-4">
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encountersQ.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ) : !encountersQ.data?.items.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Sin consultas registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  encountersQ.data.items.map((enc) => (
                    <TableRow
                      key={enc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        (window.location.href = `/encuentros/${enc.id}`)
                      }
                    >
                      <TableCell className="text-sm">
                        {formatDateShort(enc.started_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {encounterTypeLabel(enc.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                        {enc.chief_complaint ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            enc.status === "closed" || enc.status === "amended"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {encounterStatusLabel(enc.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        S/ {Number(enc.total_amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsPanel>
      </Tabs>

      {editOpen && (
        <EditCustomerDialog
          customer={customer}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}

function EditCustomerDialog({
  customer,
  onClose,
}: {
  customer: CustomerRead;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CustomerUpdate>({
    first_name: customer.first_name,
    last_name: customer.last_name,
    business_name: customer.business_name,
    email: customer.email,
    phone_primary: customer.phone_primary,
    phone_secondary: customer.phone_secondary,
    whatsapp_opted_in: customer.whatsapp_opted_in,
    email_opted_in: customer.email_opted_in,
    address: customer.address,
    district: customer.district,
    city: customer.city,
    birth_date: customer.birth_date,
    notes: customer.notes,
  });

  const updateM = useMutation({
    mutationFn: () => customersApi.update(customer.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customer.id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente actualizado");
      onClose();
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && typeof e.detail === "string"
          ? e.detail
          : "No pude actualizar el cliente.";
      toast.error(msg);
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>
            {customer.document_type} {customer.document_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nombres *</Label>
              <Input
                value={form.first_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Apellidos *</Label>
              <Input
                value={form.last_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
              />
            </div>
          </div>

          {customer.document_type === "RUC" && (
            <div className="space-y-1.5">
              <Label>Razón social</Label>
              <Input
                value={form.business_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, business_name: e.target.value || null })
                }
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Teléfono principal *</Label>
              <Input
                value={form.phone_primary ?? ""}
                onChange={(e) =>
                  setForm({ ...form, phone_primary: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value || null })
                }
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Dirección</Label>
              <Input
                value={form.address ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas internas</Label>
            <Input
              value={form.notes ?? ""}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value || null })
              }
              placeholder="Observaciones sobre el cliente…"
            />
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.whatsapp_opted_in ?? false}
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
                checked={form.email_opted_in ?? false}
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
            disabled={updateM.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => updateM.mutate()}
            disabled={updateM.isPending}
          >
            {updateM.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
