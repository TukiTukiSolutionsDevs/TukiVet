"use client";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { ProductsTab } from "./_components/products-tab";
import { AlertsTab } from "./_components/alerts-tab";
import { SuppliersTab } from "./_components/suppliers-tab";
import { NewProductDialog } from "./_components/new-product-dialog";
import { ReceiveLotDialog } from "./_components/receive-lot-dialog";
import { AdjustmentDialog } from "./_components/adjustment-dialog";

export default function InventarioPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Inventario
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Productos, lotes con vencimiento FIFO, movimientos y alertas de stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdjustmentDialog />
          <ReceiveLotDialog />
          <NewProductDialog />
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTab value="products">Productos</TabsTab>
          <TabsTab value="alerts">Alertas</TabsTab>
          <TabsTab value="suppliers">Proveedores</TabsTab>
        </TabsList>

        <TabsPanel value="products">
          <ProductsTab />
        </TabsPanel>
        <TabsPanel value="alerts">
          <AlertsTab />
        </TabsPanel>
        <TabsPanel value="suppliers">
          <SuppliersTab />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
