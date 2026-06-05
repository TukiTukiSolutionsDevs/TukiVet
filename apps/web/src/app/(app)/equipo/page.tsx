"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, UserPlus } from "lucide-react";
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
  usersApi,
  ROLE_LABELS,
  ROLE_OPTIONS,
  roleLabel,
  type UserCreate,
} from "@/lib/users-api";
import { ApiError } from "@/lib/api";

export default function EquipoPage() {
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
                  Sin usuarios. Invitá al primero con "Nuevo usuario".
                </TableCell>
              </TableRow>
            ) : (
              q.data?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.phone ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {u.professional_id ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.role_codes.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      ) : (
                        u.role_codes.map((r) => (
                          <Badge key={r} variant="outline">
                            {roleLabel(r)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.status === "active" ? "secondary" : "outline"}
                    >
                      {u.status}
                    </Badge>
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
