"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreVertical, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  usersApi,
  ROLE_LABELS,
  ROLE_OPTIONS,
  roleLabel,
  type UserCreate,
  type UserRead,
} from "@/lib/users-api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { EditUserDialog } from "./_components/edit-user-dialog";

export default function EquipoPage() {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role_codes.includes("owner") ?? false;
  const q = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Equipo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usuarios de la organización. RBAC con 5 roles y 41 permisos
            definidos por el sistema.
          </p>
        </div>
        <NewUserDialog />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>CMVP</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Estado</TableHead>
              {isOwner && <TableHead className="w-12 text-right" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 7 : 6}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ) : q.data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 7 : 6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Sin usuarios. Invitá al primero con "Nuevo usuario".
                </TableCell>
              </TableRow>
            ) : (
              q.data?.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  canManage={isOwner}
                  isSelf={u.id === currentUser?.id}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function UserRow({
  user,
  canManage,
  isSelf,
}: {
  user: UserRead;
  canManage: boolean;
  isSelf: boolean;
}) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const toggleM = useMutation({
    mutationFn: () =>
      usersApi.update(user.id, {
        status: user.status === "active" ? "disabled" : "active",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(user.status === "active" ? "Usuario desactivado" : "Usuario reactivado");
    },
    onError: (e) => toast.error(humanError(e, "No pude actualizar.")),
  });

  const deleteM = useMutation({
    mutationFn: () => usersApi.remove(user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario eliminado");
      setConfirmDel(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude eliminar.")),
  });

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{user.full_name}</TableCell>
        <TableCell className="text-sm">{user.email}</TableCell>
        <TableCell className="text-sm">{user.phone ?? "—"}</TableCell>
        <TableCell className="font-mono text-xs">{user.professional_id ?? "—"}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {user.role_codes.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              user.role_codes.map((r) => (
                <Badge key={r} variant="outline">
                  {roleLabel(r)}
                </Badge>
              ))
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={user.status === "active" ? "secondary" : "outline"}>
            {user.status}
          </Badge>
        </TableCell>
        {canManage && (
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
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                {!isSelf && (
                  <DropdownMenuItem
                    onClick={() => toggleM.mutate()}
                    disabled={toggleM.isPending}
                  >
                    {user.status === "active" ? "Desactivar" : "Reactivar"}
                  </DropdownMenuItem>
                )}
                {!isSelf && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setConfirmDel(true)}
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
        )}
      </TableRow>
      {editOpen && (
        <EditUserDialog
          user={user}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      <Dialog open={confirmDel} onOpenChange={setConfirmDel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              ¿Eliminar a {user.full_name}? Se desactivará y dejará de poder
              iniciar sesión.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDel(false)}
              disabled={deleteM.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => deleteM.mutate()}
              disabled={deleteM.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteM.isPending && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewUserDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UserCreate>({
    email: "",
    password: "",
    full_name: "",
    phone: null,
    professional_id: null,
    role_codes: [],
  });

  const createM = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado");
      setOpen(false);
      setForm({
        email: "",
        password: "",
        full_name: "",
        phone: null,
        professional_id: null,
        role_codes: [],
      });
    },
    onError: (e) => toast.error(humanError(e, "No pude crear el usuario.")),
  });

  const toggleRole = (r: string) => {
    setForm((f) => ({
      ...f,
      role_codes: f.role_codes.includes(r)
        ? f.role_codes.filter((x) => x !== r)
        : [...f.role_codes, r],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus className="size-4" />
            Nuevo usuario
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            La contraseña debe tener al menos 10 caracteres. Asigná al menos un
            rol.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createM.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nombre completo *</Label>
              <Input
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>CMVP (colegiatura)</Label>
              <Input
                value={form.professional_id ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    professional_id: e.target.value || null,
                  })
                }
                placeholder="Solo veterinarios"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Contraseña inicial * (≥ 10 chars)</Label>
            <Input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Roles *</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((r) => {
                const checked = form.role_codes.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={
                      "flex items-center gap-2 rounded-md border p-2 text-sm transition-colors " +
                      (checked
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-input text-foreground hover:bg-muted")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="size-4 rounded border-input"
                    />
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                createM.isPending ||
                form.role_codes.length === 0 ||
                form.password.length < 10
              }
            >
              {createM.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear usuario
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
