"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  inventoryApi,
  type SupplierCreate,
  type SupplierRead,
} from "@/lib/inventory-api";
import { ApiError } from "@/lib/api";

export function SuppliersTab() {
  const qc = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);

  const q = useQuery({
    queryKey: ["inventory", "suppliers", activeOnly],
    queryFn: () => inventoryApi.listSuppliers(activeOnly),
  });

  const toggleM = useMutation({
    mutationFn: (s: SupplierRead) =>
      inventoryApi.updateSupplier(s.id, { active: !s.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory", "suppliers"] }),
    onError: (e) => toast.error(humanError(e, "No pude actualizar.")),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Solo activos
          </label>
          <NewSupplierDialog />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RUC</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
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
                  No hay proveedores cargados todavía.
                </TableCell>
              </TableRow>
            ) : (
              q.data?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.ruc ?? "—"}</TableCell>
                  <TableCell className="text-sm">{s.contact_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{s.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm">{s.email ?? "—"}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleM.mutate(s)}
                      disabled={toggleM.isPending}
                      className="cursor-pointer"
                    >
                      {s.active ? (
                        <Badge variant="secondary">Activo</Badge>
                      ) : (
                        <Badge variant="outline">Inactivo</Badge>
                      )}
                    </button>
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

function NewSupplierDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SupplierCreate>({ name: "" });

  const createM = useMutation({
    mutationFn: () => inventoryApi.createSupplier(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "suppliers"] });
      toast.success("Proveedor creado");
      setForm({ name: "" });
      setOpen(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude crear el proveedor.")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Nuevo proveedor
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo proveedor</DialogTitle>
          <DialogDescription>
            Datos del laboratorio o distribuidor. Solo nombre es obligatorio.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createM.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Nombre comercial *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>RUC</Label>
              <Input
                maxLength={11}
                value={form.ruc ?? ""}
                onChange={(e) => setForm({ ...form, ruc: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label>Contacto</Label>
              <Input
                value={form.contact_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contact_name: e.target.value || null })
                }
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value || null })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Dirección</Label>
            <Input
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value || null })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createM.isPending || !form.name.trim()}>
              {createM.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear
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
