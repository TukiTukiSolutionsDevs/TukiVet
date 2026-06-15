"use client";

import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { prescriptionsApi, routeLabel, type PrescriptionRead } from "@/lib/prescriptions-api";
import { petsApi, sexLabel, speciesLabel, type PetRead } from "@/lib/pets-api";
import { customersApi, customerFullName, type CustomerRead } from "@/lib/customers-api";
import { formatDateShort, formatDateTime } from "@/lib/format";
import { formatPetAge } from "@/lib/format";

export default function PrescriptionPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const rxQ = useQuery({
    queryKey: ["prescriptions", id],
    queryFn: () => prescriptionsApi.get(id),
  });

  const petQ = useQuery({
    queryKey: ["pets", rxQ.data?.pet_id],
    queryFn: () => petsApi.get(rxQ.data!.pet_id),
    enabled: !!rxQ.data?.pet_id,
  });

  const custQ = useQuery({
    queryKey: ["customers", petQ.data?.customer_id],
    queryFn: () => customersApi.get(petQ.data!.customer_id!),
    enabled: !!petQ.data?.customer_id,
  });

  const hasCust = !petQ.data || !!petQ.data.customer_id;
  const ready = rxQ.data && petQ.data && (!petQ.data.customer_id || custQ.data);

  // Auto-print once data loads
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <PrintDocument
      rx={rxQ.data!}
      pet={petQ.data!}
      customer={custQ.data ?? null}
    />
  );
}

function PrintDocument({
  rx,
  pet,
  customer,
}: {
  rx: PrescriptionRead;
  pet: PetRead;
  customer: CustomerRead | null;
}) {
  const hasControlled = rx.items.some((i) => i.is_controlled);
  const rxNumber = rx.id.slice(-8).toUpperCase();

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Print action bar — hidden when printing */}
      <div className="print:hidden flex items-center justify-between gap-3 bg-gray-100 px-6 py-3 border-b">
        <span className="text-sm text-gray-600">
          Vista previa de receta <strong>#{rxNumber}</strong>
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.history.back()}>
            Volver
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-4" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Document — A4 proportions */}
      <div
        className="mx-auto w-full max-w-[794px] px-12 py-10 text-sm print:px-10 print:py-8"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Clinic header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
          <div>
            <div className="text-2xl font-black tracking-tight">Clínica Veterinaria Razas</div>
            <div className="text-xs text-gray-600 mt-0.5">Atención médica especializada para tu mascota</div>
          </div>
          <div className="text-right text-xs text-gray-600 space-y-0.5">
            <div>Av. Principal 123, Lima, Perú</div>
            <div>Tel: (+51) 999-000-000</div>
            <div>www.clinicaRazas.pe</div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold uppercase tracking-widest border border-black inline-block px-6 py-1">
            Receta Médica Veterinaria
            {hasControlled && " — Controlada"}
          </h1>
          <div className="mt-1 text-xs text-gray-500">N.° {rxNumber}</div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6">
          {/* Patient */}
          <div className="space-y-2">
            <div className="font-bold text-xs uppercase tracking-wide text-gray-500 border-b border-gray-300 pb-1">
              Paciente
            </div>
            <InfoRow label="Nombre" value={pet.name} />
            <InfoRow label="Especie / Raza" value={`${speciesLabel(pet.species)}${pet.breed_name ? ` — ${pet.breed_name}` : ""}`} />
            <InfoRow label="Sexo" value={sexLabel(pet.sex)} />
            {pet.birth_date && <InfoRow label="Edad" value={formatPetAge(pet.birth_date)} />}
            {pet.current_weight_kg && <InfoRow label="Peso" value={`${pet.current_weight_kg} kg`} />}
            {pet.microchip && <InfoRow label="Microchip" value={pet.microchip} />}
          </div>

          {/* Owner + Rx meta */}
          <div className="space-y-2">
            <div className="font-bold text-xs uppercase tracking-wide text-gray-500 border-b border-gray-300 pb-1">
              Propietario
            </div>
            {customer ? (
              <>
                <InfoRow label="Nombre" value={customerFullName(customer)} />
                {customer.phone_primary && <InfoRow label="Teléfono" value={customer.phone_primary} />}
                {customer.email && <InfoRow label="Email" value={customer.email} />}
              </>
            ) : (
              <div className="text-xs text-gray-400">Sin propietario registrado</div>
            )}

            <div className="pt-2 font-bold text-xs uppercase tracking-wide text-gray-500 border-b border-gray-300 pb-1">
              Receta
            </div>
            <InfoRow label="Fecha emisión" value={formatDateTime(rx.issued_at)} />
            <InfoRow label="Estado" value={rx.status === "issued" ? "Emitida" : rx.status === "void" ? "Anulada" : "Dispensada"} />
          </div>
        </div>

        {/* Diagnosis */}
        {rx.diagnosis && (
          <div className="mb-6">
            <div className="font-bold text-xs uppercase tracking-wide text-gray-500 mb-1">Diagnóstico / Motivo</div>
            <div className="rounded border border-gray-300 px-3 py-2 text-sm">{rx.diagnosis}</div>
          </div>
        )}

        {/* Medications table */}
        <div className="mb-6">
          <div className="font-bold text-xs uppercase tracking-wide text-gray-500 mb-2">Prescripción</div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">#</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Medicamento</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Dosis / Cant.</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Vía</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Frecuencia</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Días</th>
              </tr>
            </thead>
            <tbody>
              {rx.items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-2 py-2 font-bold">{idx + 1}</td>
                  <td className="border border-gray-300 px-2 py-2">
                    <div className="font-semibold">{item.medication_name}</div>
                    {item.active_ingredient && (
                      <div className="text-gray-500">{item.active_ingredient}</div>
                    )}
                    {item.presentation && (
                      <div className="text-gray-500">{item.presentation}</div>
                    )}
                    {item.is_controlled && (
                      <div className="text-red-600 font-bold text-[10px]">▲ CONTROLADA</div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    {item.total_dose_mg ? `${item.total_dose_mg} mg` : item.quantity}
                    {item.dose_mg_per_kg && (
                      <div className="text-gray-500">{item.dose_mg_per_kg} mg/kg</div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">{routeLabel(item.route)}</td>
                  <td className="border border-gray-300 px-2 py-2">{item.frequency ?? "—"}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{item.duration_days ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Instructions per item */}
        {rx.items.some((i) => i.instructions) && (
          <div className="mb-6">
            <div className="font-bold text-xs uppercase tracking-wide text-gray-500 mb-2">Instrucciones</div>
            <div className="space-y-1.5">
              {rx.items.filter((i) => i.instructions).map((item, idx) => (
                <div key={item.id} className="flex gap-2 text-xs">
                  <span className="font-bold shrink-0">{item.medication_name}:</span>
                  <span>{item.instructions}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General notes */}
        {rx.notes && (
          <div className="mb-6">
            <div className="font-bold text-xs uppercase tracking-wide text-gray-500 mb-1">Observaciones</div>
            <div className="rounded border border-gray-300 px-3 py-2 text-xs">{rx.notes}</div>
          </div>
        )}

        {/* Controlled substance notice */}
        {hasControlled && (
          <div className="mb-6 rounded border border-red-400 bg-red-50 px-3 py-2 text-xs text-red-700">
            <strong>RECETA ESPECIAL — SUSTANCIA CONTROLADA:</strong> Esta receta tiene validez de 72 horas
            desde la fecha de emisión. Debe ser retenida por el dispensador al momento de la entrega.
            Uso exclusivo veterinario. Según normativa D.S. 023-2001-SA.
          </div>
        )}

        {/* Signature */}
        <div className="mt-10 grid grid-cols-2 gap-16">
          <div className="space-y-1">
            <div className="border-t border-black pt-1 text-center text-xs text-gray-600">
              Firma y sello del médico veterinario
            </div>
            <div className="text-center text-xs text-gray-400">CMP / CMV: ______________</div>
          </div>
          <div className="space-y-1">
            <div className="border-t border-black pt-1 text-center text-xs text-gray-600">
              Firma y DNI del propietario
            </div>
            <div className="text-center text-xs text-gray-400">DNI: ______________</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-300 pt-3 text-center text-[10px] text-gray-400">
          Receta generada electrónicamente por Centro Veterinario Razas ·{" "}
          {formatDateShort(rx.issued_at)}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-500 w-28 shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
