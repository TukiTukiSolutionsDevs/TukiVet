import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Construction className="size-6" />
        </div>
        <div className="text-base font-semibold text-foreground">
          Próximo sprint
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Esta pantalla está en el plan F1–F8 del ROADMAP. El backend ya está
          listo (~90 endpoints); falta el UI que la consuma.
        </p>
      </Card>
    </div>
  );
}
