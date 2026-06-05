"use client";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { VaccineCatalogTab } from "./_components/vaccine-catalog-tab";
import { VaccinesDueTab } from "./_components/vaccines-due-tab";
import { RecordVaccineDialog } from "./_components/record-vaccine-dialog";

export default function VacunasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Vacunas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de la clínica + recordatorios pendientes.
          </p>
        </div>
        <RecordVaccineDialog />
      </div>

      <Tabs defaultValue="due">
        <TabsList>
          <TabsTab value="due">Pendientes</TabsTab>
          <TabsTab value="catalog">Catálogo</TabsTab>
        </TabsList>

        <TabsPanel value="due">
          <VaccinesDueTab />
        </TabsPanel>
        <TabsPanel value="catalog">
          <VaccineCatalogTab />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
