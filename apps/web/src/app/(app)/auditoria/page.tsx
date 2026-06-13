"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { buildQueryString } from "@/lib/pagination";

type AuditLogRead = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
};

type AuditPage = {
  items: AuditLogRead[];
  total: number;
  page: number;
  page_size: number;
};

const ACTION_TINTS: Record<string, string> = {
  created: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  updated: "border-blue-500/40 text-blue-700 dark:text-blue-300",
  deleted: "border-destructive/40 text-destructive",
  closed: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  amended: "border-purple-500/40 text-purple-700 dark:text-purple-300",
};

function actionTint(action: string): string {
  for (const [key, cls] of Object.entries(ACTION_TINTS)) {
    if (action.includes(key)) return cls;
  }
  return "text-muted-foreground";
}

function actionLabel(action: string): string {
  return action
    .replace(/\./g, " › ")
    .replace(/_/g, " ");
}

export default function AuditoriaPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", debouncedSearch, page],
    queryFn: () =>
      api.get<AuditPage>(
        `/api/v1/audit-logs${buildQueryString({
          action: debouncedSearch || undefined,
          page,
          page_size: PAGE_SIZE,
        })}`,
      ),
    staleTime: 30_000,
  });

  const handleSearch = () => {
    setDebouncedSearch(search);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-5 text-primary" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Auditoría
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro inmutable de todas las acciones en el sistema.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Filtrar por acción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          Buscar
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Fecha / hora</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead className="w-32">Tipo</TableHead>
              <TableHead className="w-32 hidden sm:table-cell">IP</TableHead>
              <TableHead className="w-28 hidden md:table-cell">
                Actor ID
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Sin registros de auditoría
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${actionTint(log.action)}`}
                    >
                      {actionLabel(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.target_type ?? "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                    {log.ip ?? "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {log.actor_user_id
                      ? log.actor_user_id.slice(-8)
                      : "sistema"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} entradas · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
