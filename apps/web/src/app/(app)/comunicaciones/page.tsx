"use client";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { TemplatesTab } from "./_components/templates-tab";
import { NotificationsTab } from "./_components/notifications-tab";
import { SendMessageDialog } from "./_components/send-message-dialog";

export default function ComunicacionesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Comunicaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plantillas de mensajería y log de envíos.
            En sandbox los WhatsApp se marcan <code>blocked_safe_mode</code>.
          </p>
        </div>
        <SendMessageDialog />
      </div>

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTab value="notifications">Envíos</TabsTab>
          <TabsTab value="templates">Plantillas</TabsTab>
        </TabsList>

        <TabsPanel value="notifications">
          <NotificationsTab />
        </TabsPanel>
        <TabsPanel value="templates">
          <TemplatesTab />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
