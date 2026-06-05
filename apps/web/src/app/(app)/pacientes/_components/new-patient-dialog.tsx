"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  PawPrint,
  Plus,
  Search,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  customersApi,
  customerFullName,
  DOCUMENT_TYPES,
  type CustomerCreate,
  type CustomerRead,
  type DocumentType,
} from "@/lib/customers-api";
import {
  petsApi,
  SPECIES_LABELS,
  SPECIES_OPTIONS,
  type PetCreate,
  type PetSex,
  type Species,
} from "@/lib/pets-api";
import { cn } from "@/lib/utils";

type TutorMode = "select" | "create";

type CustomerForm = {
  document_type: DocumentType;
  document_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_primary: string;
  address: string;
  district: string;
  whatsapp_opted_in: boolean;
};

const initialCustomer: CustomerForm = {
  document_type: "DNI",
  document_number: "",
  first_name: "",
  last_name: "",
  email: "",
  phone_primary: "",
  address: "",
  district: "",
  whatsapp_opted_in: true,
};

type PetForm = {
  name: string;
  species: Species;
  breed_name: string;
  sex: PetSex;
  birth_date: string;
  birth_date_estimated: boolean;
  color: string;
  microchip: string;
  sterilized: boolean;
  alerts: string;
};

const initialPet: PetForm = {
  name: "",
  species: "dog",
  breed_name: "",
  sex: "unknown",
  birth_date: "",
  birth_date_estimated: false,
  color: "",
  microchip: "",
  sterilized: false,
  alerts: "",
};

function validateCustomer(c: CustomerForm): string | null {
  if (c.document_number.trim().length < 5)
    return "Documento muy corto.";
  if (c.document_type === "DNI" && !/^\d{8}$/.test(c.document_number.trim()))
    return "DNI debe tener 8 dígitos.";
  if (c.document_type === "RUC" && !/^\d{11}$/.test(c.document_number.trim()))
    return "RUC debe tener 11 dígitos.";
  if (c.first_name.trim().length < 1) return "Nombre obligatorio.";
  if (c.last_name.trim().length < 1) return "Apellido obligatorio.";
  if (c.phone_primary.trim().length < 6) return "Teléfono inválido.";
  if (c.email && !/\S+@\S+\.\S+/.test(c.email)) return "Email inválido.";
  return null;
}

function validatePet(p: PetForm): string | null {
  if (p.name.trim().length < 1) return "Nombre de la mascota obligatorio.";
  if (p.microchip) {
    const clean = p.microchip.replace(/[\s-]/g, "");
    if (!/^\d+$/.test(clean)) return "Microchip solo dígitos.";
    if (clean.length !== 10 && clean.length !== 15)
      return "Microchip debe tener 10 o 15 dígitos.";
  }
  return null;
}

function petPayload(customer_id: string, p: PetForm): PetCreate {
  const alerts = p.alerts
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    customer_id,
    name: p.name.trim(),
    species: p.species,
    sex: p.sex,
    breed_name: p.breed_name.trim() || null,
    birth_date: p.birth_date || null,
    birth_date_estimated: p.birth_date ? p.birth_date_estimated : false,
    color: p.color.trim() || null,
    microchip: p.microchip.trim() || null,
    sterilized: p.sterilized,
    alerts: alerts.length ? alerts : null,
  };
}

function customerPayload(c: CustomerForm): CustomerCreate {
  return {
    document_type: c.document_type,
    document_number: c.document_number.trim(),
    first_name: c.first_name.trim(),
    last_name: c.last_name.trim(),
    email: c.email.trim() || null,
    phone_primary: c.phone_primary.trim(),
    address: c.address.trim() || null,
    district: c.district.trim() || null,
    whatsapp_opted_in: c.whatsapp_opted_in,
  };
}

export function NewPatientDialog({
  trigger,
  defaultCustomerId,
}: {
  trigger?: React.ReactNode;
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1>(defaultCustomerId ? 1 : 0);
  const [tutorMode, setTutorMode] = useState<TutorMode>("select");
  const [selected, setSelected] = useState<CustomerRead | null>(null);
  const [customer, setCustomer] = useState<CustomerForm>(initialCustomer);
  const [pet, setPet] = useState<PetForm>(initialPet);
  const [search, setSearch] = useState("");

  // Pre-cargar tutor por defecto si se abre desde la página del cliente
  useEffect(() => {
    if (!open) return;
    if (defaultCustomerId) {
      customersApi
        .get(defaultCustomerId)
        .then((c) => {
          setSelected(c);
          setStep(1);
        })
        .catch(() => undefined);
    }
  }, [open, defaultCustomerId]);

  const customersQ = useQuery({
    queryKey: ["customers", "search", search],
    queryFn: () => customersApi.list({ q: search || undefined, page_size: 6 }),
    enabled: open && step === 0 && tutorMode === "select",
  });

  const createCustomerM = useMutation({
    mutationFn: (payload: CustomerCreate) => customersApi.create(payload),
  });

  const createPetM = useMutation({
    mutationFn: (payload: PetCreate) => petsApi.create(payload),
  });

  function reset() {
    setStep(defaultCustomerId ? 1 : 0);
    setTutorMode("select");
    setSelected(null);
    setCustomer(initialCustomer);
    setPet(initialPet);
    setSearch("");
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  async function handleNext() {
    if (step === 0) {
      if (tutorMode === "select") {
        if (!selected) {
          toast.error("Selecciona un tutor o crea uno nuevo.");
          return;
        }
        setStep(1);
        return;
      }
      // tutorMode === "create" → POST customer
      const err = validateCustomer(customer);
      if (err) {
        toast.error(err);
        return;
      }
      try {
        const created = await createCustomerM.mutateAsync(
          customerPayload(customer),
        );
        setSelected(created);
        qc.invalidateQueries({ queryKey: ["customers"] });
        toast.success("Tutor creado");
        setStep(1);
      } catch (e) {
        toast.error(humanError(e, "No pude crear el tutor."));
      }
    }
  }

  async function handleSubmit() {
    if (!selected) return;
    const err = validatePet(pet);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const created = await createPetM.mutateAsync(petPayload(selected.id, pet));
      qc.invalidateQueries({ queryKey: ["pets"] });
      toast.success(`${created.name} creado`);
      close();
      router.push(`/pacientes/${created.id}`);
    } catch (e) {
      toast.error(humanError(e, "No pude crear la mascota."));
    }
  }

  const busy = createCustomerM.isPending || createPetM.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(reset, 200);
      }}
    >
      <DialogTrigger
        render={
          trigger
            ? undefined
            : (
              <Button>
                <Plus className="size-4" />
                Nuevo paciente
              </Button>
            )
        }
      >
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo paciente</DialogTitle>
          <DialogDescription>
            {step === 0
              ? "Busca al tutor o registra uno nuevo."
              : "Datos de la mascota."}
          </DialogDescription>
          <div className="mt-3 flex items-center gap-2">
            <StepDot active={step >= 0} done={step > 0} icon={<User className="size-3.5" />} label="Tutor" />
            <div className={cn("h-px flex-1", step > 0 ? "bg-primary" : "bg-border")} />
            <StepDot active={step >= 1} done={false} icon={<PawPrint className="size-3.5" />} label="Mascota" />
          </div>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tutorMode === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setTutorMode("select")}
              >
                Buscar existente
              </Button>
              <Button
                type="button"
                variant={tutorMode === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => setTutorMode("create")}
              >
                <Plus className="size-3.5" /> Crear nuevo
              </Button>
            </div>

            {tutorMode === "select" ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Nombre, apellido, DNI o teléfono…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-72 space-y-1 overflow-auto rounded-md border border-border bg-card">
                  {customersQ.isLoading ? (
                    <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" /> Cargando…
                    </div>
                  ) : customersQ.data?.items.length ? (
                    customersQ.data.items.map((c) => {
                      const isSel = selected?.id === c.id;
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setSelected(c)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                            isSel ? "bg-primary/10" : "hover:bg-muted",
                          )}
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">
                              {customerFullName(c)}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {c.document_type} {c.document_number} · {c.phone_primary}
                            </div>
                          </div>
                          {isSel && <Check className="size-4 text-primary" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Sin resultados. Cambia a “Crear nuevo”.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <CustomerFormFields customer={customer} setCustomer={setCustomer} />
            )}
          </div>
        )}

        {step === 1 && selected && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-foreground">
                    Tutor: {customerFullName(selected)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selected.document_type} {selected.document_number} · {selected.phone_primary}
                  </div>
                </div>
                {!defaultCustomerId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelected(null);
                      setStep(0);
                    }}
                  >
                    Cambiar
                  </Button>
                )}
              </div>
            </div>

            <PetFormFields pet={pet} setPet={setPet} />
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (step === 1 && !defaultCustomerId) setStep(0);
              else close();
            }}
            disabled={busy}
          >
            {step === 1 && !defaultCustomerId ? (
              <>
                <ArrowLeft className="size-4" /> Atrás
              </>
            ) : (
              "Cancelar"
            )}
          </Button>
          {step === 0 ? (
            <Button type="button" onClick={handleNext} disabled={busy}>
              {createCustomerM.isPending && <Loader2 className="size-4 animate-spin" />}
              Continuar
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={busy}>
              {createPetM.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear mascota
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepDot({
  active,
  done,
  icon,
  label,
}: {
  active: boolean;
  done: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex size-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
          done && "border-primary bg-primary text-primary-foreground",
          active && !done && "border-primary bg-primary/10 text-primary",
          !active && "border-border text-muted-foreground",
        )}
      >
        {done ? <Check className="size-3.5" /> : icon}
      </div>
      <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}

function CustomerFormFields({
  customer,
  setCustomer,
}: {
  customer: CustomerForm;
  setCustomer: React.Dispatch<React.SetStateAction<CustomerForm>>;
}) {
  const upd = <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) =>
    setCustomer((p) => ({ ...p, [k]: v }));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Tipo doc.</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={customer.document_type}
          onChange={(e) => upd("document_type", e.target.value as DocumentType)}
        >
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Número</Label>
        <Input
          value={customer.document_number}
          onChange={(e) => upd("document_number", e.target.value)}
          placeholder={customer.document_type === "DNI" ? "12345678" : "20612345678"}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Nombres</Label>
        <Input
          value={customer.first_name}
          onChange={(e) => upd("first_name", e.target.value)}
          placeholder="María"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Apellidos</Label>
        <Input
          value={customer.last_name}
          onChange={(e) => upd("last_name", e.target.value)}
          placeholder="Pérez"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Teléfono</Label>
        <Input
          value={customer.phone_primary}
          onChange={(e) => upd("phone_primary", e.target.value)}
          placeholder="+51999111222"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Email (opc.)</Label>
        <Input
          type="email"
          value={customer.email}
          onChange={(e) => upd("email", e.target.value)}
          placeholder="maria@ejemplo.pe"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Dirección (opc.)</Label>
        <Input
          value={customer.address}
          onChange={(e) => upd("address", e.target.value)}
          placeholder="Av. Larco 123"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Distrito (opc.)</Label>
        <Input
          value={customer.district}
          onChange={(e) => upd("district", e.target.value)}
          placeholder="San Borja"
        />
      </div>
      <div className="flex items-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={customer.whatsapp_opted_in}
            onChange={(e) => upd("whatsapp_opted_in", e.target.checked)}
            className="size-4 rounded border-input"
          />
          Acepta WhatsApp
        </label>
      </div>
    </div>
  );
}

function PetFormFields({
  pet,
  setPet,
}: {
  pet: PetForm;
  setPet: React.Dispatch<React.SetStateAction<PetForm>>;
}) {
  const upd = <K extends keyof PetForm>(k: K, v: PetForm[K]) =>
    setPet((p) => ({ ...p, [k]: v }));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Nombre</Label>
        <Input
          value={pet.name}
          onChange={(e) => upd("name", e.target.value)}
          placeholder="Firulais"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Especie</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={pet.species}
          onChange={(e) => upd("species", e.target.value as Species)}
        >
          {SPECIES_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SPECIES_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Raza (opc.)</Label>
        <Input
          value={pet.breed_name}
          onChange={(e) => upd("breed_name", e.target.value)}
          placeholder="Mestizo, Labrador…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Sexo</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={pet.sex}
          onChange={(e) => upd("sex", e.target.value as PetSex)}
        >
          <option value="unknown">Desconocido</option>
          <option value="male">Macho</option>
          <option value="female">Hembra</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Fecha de nacimiento</Label>
        <Input
          type="date"
          value={pet.birth_date}
          onChange={(e) => upd("birth_date", e.target.value)}
        />
      </div>
      <div className="flex items-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pet.birth_date_estimated}
            onChange={(e) => upd("birth_date_estimated", e.target.checked)}
            disabled={!pet.birth_date}
            className="size-4 rounded border-input"
          />
          Aproximada
        </label>
      </div>
      <div className="space-y-1.5">
        <Label>Color</Label>
        <Input
          value={pet.color}
          onChange={(e) => upd("color", e.target.value)}
          placeholder="Negro, marrón…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Microchip (opc.)</Label>
        <Input
          value={pet.microchip}
          onChange={(e) => upd("microchip", e.target.value)}
          placeholder="10 o 15 dígitos"
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pet.sterilized}
            onChange={(e) => upd("sterilized", e.target.checked)}
            className="size-4 rounded border-input"
          />
          Esterilizado
        </label>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Alertas (separadas por coma)</Label>
        <Input
          value={pet.alerts}
          onChange={(e) => upd("alerts", e.target.value)}
          placeholder="Agresivo con extraños, alergia a la penicilina"
        />
      </div>
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
