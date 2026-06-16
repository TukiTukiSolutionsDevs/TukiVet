"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorOpen, Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
  appointmentsApi,
  ROOM_TYPE_LABELS,
  type RoomCreate,
  type RoomRead,
  type RoomUpdate,
} from "@/lib/appointments-api";
import { branchesApi, type BranchRead } from "@/lib/branches-api";

const ROOM_TYPE_OPTIONS = ["consultation", "surgery", "imaging", "grooming", "hospital"];

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

export function RoomsCard() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["rooms"],
    queryFn: () => appointmentsApi.listRooms(),
  });
  const branchesQ = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RoomRead | null>(null);
  const [deleting, setDeleting] = useState<RoomRead | null>(null);

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <DoorOpen className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Consultorios y salas</div>
              <div className="text-xs text-muted-foreground">
                Recursos asignables a citas (consulta, cirugía, peluquería…)
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nuevo consultorio
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Estado</TableHead>
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
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Sin consultorios. Creá el primero.
                </TableCell>
              </TableRow>
            ) : (
              q.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm">
                    {ROOM_TYPE_LABELS[r.type] ?? r.type}
                  </TableCell>
                  <TableCell className="text-sm">
                    {branchesQ.data?.find((b) => b.id === r.branch_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.active ? "secondary" : "outline"}>
                      {r.active ? "activo" : "inactivo"}
                    </Badge>
                  </TableCell>
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
                        <DropdownMenuItem onClick={() => setEditing(r)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleting(r)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <RoomFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        branches={branchesQ.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["rooms"] })}
      />
      {editing && (
        <RoomFormDialog
          mode="edit"
          room={editing}
          branches={branchesQ.data ?? []}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["rooms"] })}
        />
      )}
      {deleting && (
        <DeleteRoomDialog
          room={deleting}
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          onDone={() => qc.invalidateQueries({ queryKey: ["rooms"] })}
        />
      )}
    </>
  );
}

function RoomFormDialog({
  mode,
  room,
  branches,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: "create" | "edit";
  room?: RoomRead;
  branches: BranchRead[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(room?.name ?? "");
  const [type, setType] = useState(room?.type ?? "consultation");
  const [branchId, setBranchId] = useState(room?.branch_id ?? "");
  const [active, setActive] = useState(room?.active ?? true);

  const m = useMutation({
    mutationFn: () => {
      if (mode === "edit" && room) {
        const payload: RoomUpdate = {
          name: name.trim(),
          type,
          branch_id: branchId || null,
          active,
        };
        return appointmentsApi.updateRoom(room.id, payload);
      }
      const payload: RoomCreate = {
        name: name.trim(),
        type,
        branch_id: branchId || null,
      };
      return appointmentsApi.createRoom(payload);
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Consultorio actualizado" : "Consultorio creado");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude guardar.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar consultorio" : "Nuevo consultorio"}
          </DialogTitle>
          <DialogDescription>
            El consultorio se podrá asignar al programar citas.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 1) {
              toast.error("Nombre obligatorio.");
              return;
            }
            m.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Nombre</Label>
            <Input
              id="r-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Consultorio 1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {ROOM_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {ROOM_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Sede</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">— sin sede —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          {mode === "edit" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Activo
            </label>
          )}
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

function DeleteRoomDialog({
  room,
  open,
  onOpenChange,
  onDone,
}: {
  room: RoomRead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const m = useMutation({
    mutationFn: () => appointmentsApi.deleteRoom(room.id),
    onSuccess: () => {
      toast.success("Consultorio eliminado");
      onDone();
      onOpenChange(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude eliminar.")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar consultorio</DialogTitle>
          <DialogDescription>¿Eliminar {room.name}?</DialogDescription>
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
