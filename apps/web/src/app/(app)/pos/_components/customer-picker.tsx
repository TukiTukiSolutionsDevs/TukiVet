"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { customersApi, customerFullName, type CustomerRead } from "@/lib/customers-api";
import { cn } from "@/lib/utils";

export function CustomerPicker({
  customer,
  onChange,
}: {
  customer: CustomerRead | null;
  onChange: (c: CustomerRead | null) => void;
}) {
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["customers", "pos-picker", search],
    queryFn: () => customersApi.list({ q: search || undefined, page_size: 6 }),
    enabled: !customer && search.length >= 2,
  });

  if (customer) {
    return (
      <Card className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <User className="size-5 text-primary" />
          <div>
            <p className="font-semibold text-foreground">
              {customerFullName(customer)}
            </p>
            <p className="text-xs text-muted-foreground">
              {customer.document_type} {customer.document_number} ·{" "}
              {customer.phone_primary}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Quitar cliente"
        >
          <X className="size-4" />
        </button>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente por nombre, DNI o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {search.length >= 2 && (
        <ul className="space-y-1">
          {q.data?.items.length === 0 ? (
            <li className="py-3 text-center text-sm text-muted-foreground">
              Sin resultados.
            </li>
          ) : (
            q.data?.items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full rounded-md border border-input p-3 text-left text-sm hover:bg-muted",
                  )}
                >
                  <div className="font-medium">{customerFullName(c)}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.document_type} {c.document_number} · {c.phone_primary}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </Card>
  );
}
