"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  documentsApi,
  categoryLabel,
  formatFileSize,
  DOCUMENT_CATEGORY_OPTIONS,
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
} from "@/lib/documents-api";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const ICON_BY_TYPE: Record<string, string> = {
  "application/pdf": "📄",
  "image/jpeg": "🖼",
  "image/png": "🖼",
  "image/webp": "🖼",
};

export function DocumentsTab({ petId }: { petId: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);

  const q = useQuery({
    queryKey: ["pet-documents", petId],
    queryFn: () => documentsApi.list(petId),
  });

  const qc = useQueryClient();

  const deleteM = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(petId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pet-documents", petId] });
      toast.success("Documento eliminado");
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && typeof e.detail === "string"
          ? e.detail
          : "No pude eliminar el documento.";
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Documentos adjuntos
          </span>
          {q.data && q.data.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {q.data.length}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          Subir documento
        </Button>
      </div>

      {q.isLoading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando documentos…
        </div>
      ) : !q.data?.length ? (
        <Card>
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileText className="size-6" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              Sin documentos
            </div>
            <p className="max-w-xs text-xs text-muted-foreground">
              Sube exámenes de laboratorio, radiografías, certificados o
              consentimientos.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((doc) => (
            <Card
              key={doc.id}
              className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                  {ICON_BY_TYPE[doc.content_type] ?? "📎"}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-sm font-medium"
                    title={doc.file_name}
                  >
                    {doc.file_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  {categoryLabel(doc.category)}
                </Badge>
              </div>

              {doc.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {doc.description}
                </p>
              )}

              <div className="text-xs text-muted-foreground">
                {formatDateTime(doc.created_at)}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={doc.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted",
                  )}
                >
                  <Download className="size-3.5" />
                  Descargar
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`¿Eliminar "${doc.file_name}"?`)) {
                      deleteM.mutate(doc.id);
                    }
                  }}
                  disabled={deleteM.isPending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {uploadOpen && (
        <UploadDialog
          petId={petId}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </div>
  );
}

function UploadDialog({
  petId,
  onClose,
}: {
  petId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("lab_result");
  const [description, setDescription] = useState("");

  const uploadM = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Selecciona un archivo");
      return documentsApi.upload(petId, file, category, description || undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pet-documents", petId] });
      toast.success("Documento subido correctamente");
      onClose();
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && typeof e.detail === "string"
          ? e.detail
          : "No pude subir el archivo.";
      toast.error(msg);
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/30",
              file && "border-primary/50 bg-primary/5",
            )}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-6 text-muted-foreground" />
            <div className="text-sm">
              {file ? (
                <span className="font-medium text-foreground">{file.name}</span>
              ) : (
                <span className="text-muted-foreground">
                  Haz clic o arrastra un archivo
                </span>
              )}
            </div>
            {file && (
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xlsx,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {DOCUMENT_CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hemograma completo 12/06/2026"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={uploadM.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => uploadM.mutate()}
            disabled={!file || uploadM.isPending}
          >
            {uploadM.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Subir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
