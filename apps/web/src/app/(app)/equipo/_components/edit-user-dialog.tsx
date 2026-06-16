"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  ROLE_LABELS,
  ROLE_OPTIONS,
  usersApi,
  type UserAdminUpdate,
  type UserRead,
} from "@/lib/users-api";

type Form = {
  full_name: string;
  phone: string;
  professional_id: string;
  role_codes: string[];
};

function userToForm(u: UserRead): Form {
  return {
    full_name: u.full_name,
    phone: u.phone ?? "",
    professional_id: u.professional_id ?? "",
    role_codes: [...u.role_codes],
  };
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserRead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(() => userToForm(user));

  useEffect(() => {
    if (open) setForm(userToForm(user));
  }, [open, user]);

  const m = useMutation({
    mutationFn: (payload: UserAdminUpdate) => usersApi.update(user.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario actualizado");
      onOpenChange(false);
    },
    onError: (e) => toast.error(humanError(e, "No pude actualizar.")),
  });

  const toggleRole = (r: string) =>
    setForm((p) => ({
      ...p,
      role_codes: p.role_codes.includes(r)
        ? p.role_codes.filter((x) => x !== r)
        : [...p.role_codes, r],
    }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.full_name.trim().length < 2) {
      toast.error("Nombre demasiado corto.");
      return;
    }
    if (form.role_codes.length === 0) {
      toast.error("Asigná al menos un rol.");
      return;
    }
    m.mutate({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      professional_id: form.professional_id.trim() || null,
      role_codes: form.role_codes,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cmvp">CMVP</Label>
              <Input
                id="cmvp"
                value={form.professional_id}
                onChange={(e) =>
                  setForm({ ...form, professional_id: e.target.value })
                }
                placeholder="Solo veterinarios"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Roles</Label>
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
              Guardar
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
