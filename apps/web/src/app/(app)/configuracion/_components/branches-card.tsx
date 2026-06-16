"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/api";
import {
  branchesApi,
  COMMON_TIMEZONES,
  type BranchCreate,
  type BranchRead,
  type BranchUpdate,
} from "@/lib/branches-api";

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

export function BranchesCard() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list(),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRead | null>(null);
  const [deleting, setDeleting] = useState<BranchRead | null>(null);

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Sucursales</div>
              <div className="text-xs text-muted-foreground">
                Múltiples sedes por organización
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nueva sede
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Zona horaria</TableHead>
              <TableHead className="w-12 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ) : (q.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Sin sucursales.
                </TableCell>
              </TableRow>
            ) : (
              q.data!.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {b.name}
                    {b.is_main && (
                      <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                        principal
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{b.address ?? "—"}</TableCell>
                  <TableCell className="text-sm">{b.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm">{b.timezone}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button size="sm" variant="ghost" aria-label="Acciones">
                            <MoreVertical className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(b)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        {!b.is_main && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleting(b)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <BranchFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["branches"] })}
      />
      {editing && (
        <BranchFormDialog
          mode="edit"
          branch={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["branches"] })}
        />
      )}
      {deleting && (
        <DeleteBranchDialog
          branch={deleting}
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          onDone={() => qc.invalidateQueries({ queryKey: ["branches"] })}
        />
      )}
    </>
  );
}

function BranchFormDialog({
  mode,
  branch,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: "create" | "edit";
  branch?: BranchRead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [tz, setTz] = useState(branch?.timezone ?? "America/Lima");

  const m = useMutation({
    mutationFn: () => {
      if (mode === "edit" && branch) {
        const payload: BranchUpdate = {
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          timezone: tz,
        };
        return branchesApi.update(branch.id, payload);
      }
      const payload: BranchCreate = {
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        timezone: tz,
      };
      return branchesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Sede actualizada" : "Sede creada");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude guardar.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar sede" : "Nueva sede"}</DialogTitle>
          <DialogDescription>
            La sede principal no se puede eliminar.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 2) {
              toast.error("Nombre mínimo 2 caracteres.");
              return;
            }
            m.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="b-name">Nombre</Label>
            <Input
              id="b-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sede Sur"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-address">Dirección</Label>
            <Input
              id="b-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Av. Larco 123"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-phone">Teléfono</Label>
              <Input
                id="b-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+51..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Zona horaria</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={tz}
                onChange={(e) => setTz(e.target.value)}
              >
                {COMMON_TIMEZONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={m.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending && <Loader2 className="size-4 animate-spin" />}
              {mode === "edit" ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBranchDialog({
  branch,
  open,
  onOpenChange,
  onDone,
}: {
  branch: BranchRead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const m = useMutation({
    mutationFn: () => branchesApi.remove(branch.id),
    onSuccess: () => {
      toast.success("Sede eliminada");
      onDone();
      onOpenChange(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude eliminar.")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar sede</DialogTitle>
          <DialogDescription>
            ¿Eliminar la sede {branch.name}? Es soft-delete.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={m.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {m.isPending && <Loader2 className="size-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
