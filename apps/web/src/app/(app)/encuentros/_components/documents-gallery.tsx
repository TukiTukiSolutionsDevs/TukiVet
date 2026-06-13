"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  categoryLabel,
  DOCUMENT_CATEGORY_OPTIONS,
  documentsApi,
  formatFileSize,
  type DocumentCategory,
  type PetDocumentRead,
} from "@/lib/documents-api";
import { cn } from "@/lib/utils";

type Props = {
  petId: string;
  encounterId: string;
  readOnly?: boolean;
};

export function DocumentsGallery({ petId, encounterId, readOnly }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [lightbox, setLightbox] = useState<PetDocumentRead | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents", petId],
    queryFn: () => documentsApi.list(petId),
    staleTime: 60_000,
  });

  const encounterDocs = docs.filter((d) => d.encounter_id === encounterId);
  const otherDocs = docs.filter((d) => d.encounter_id !== encounterId);

  const uploadM = useMutation({
    mutationFn: (file: File) =>
      documentsApi.upload(petId, file, category, undefined, encounterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", petId] });
      toast.success("Archivo subido");
    },
    onError: () => toast.error("Error al subir el archivo"),
  });

  const deleteM = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(petId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", petId] });
      toast.success("Archivo eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadM.mutate(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">
            Documentos e imágenes
            {encounterDocs.length > 0 && (
              <span className="ml-1.5 text-muted-foreground font-normal">
                ({encounterDocs.length})
              </span>
            )}
          </h3>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as DocumentCategory)}
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {categoryLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => fileRef.current?.click()}
              disabled={uploadM.isPending}
            >
              <Upload className="size-3.5" />
              {uploadM.isPending ? "Subiendo…" : "Subir archivo"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFile}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : encounterDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          <Paperclip className="mb-2 size-8 opacity-30" />
          Sin archivos adjuntos en este encuentro
          {!readOnly && (
            <p className="mt-1 text-xs">Sube una imagen, PDF o documento</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {encounterDocs.map((doc) => (
            <DocTile
              key={doc.id}
              doc={doc}
              readOnly={readOnly}
              onPreview={() => setLightbox(doc)}
              onDelete={() => deleteM.mutate(doc.id)}
              deleting={deleteM.isPending}
            />
          ))}
        </div>
      )}

      {otherDocs.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
            Ver {otherDocs.length} documento
            {otherDocs.length > 1 ? "s" : ""} de otros encuentros
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {otherDocs.map((doc) => (
              <DocTile
                key={doc.id}
                doc={doc}
                readOnly
                onPreview={() => setLightbox(doc)}
                onDelete={() => deleteM.mutate(doc.id)}
                deleting={deleteM.isPending}
              />
            ))}
          </div>
        </details>
      )}

      <LightboxDialog doc={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

function DocTile({
  doc,
  readOnly,
  onPreview,
  onDelete,
  deleting,
}: {
  doc: PetDocumentRead;
  readOnly?: boolean;
  onPreview: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const isImage = doc.content_type.startsWith("image/");

  return (
    <div className="group relative rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        className="flex aspect-square w-full items-center justify-center p-2 hover:bg-muted/60 transition-colors"
        onClick={isImage ? onPreview : undefined}
        title={doc.file_name}
      >
        {isImage ? (
          <img
            src={doc.download_url}
            alt={doc.file_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground leading-tight break-all">
              {doc.file_name.length > 18
                ? doc.file_name.slice(0, 15) + "…"
                : doc.file_name}
            </span>
          </div>
        )}
      </button>

      <div className="px-2 pb-2">
        <p className="truncate text-[11px] font-medium leading-tight text-foreground">
          {categoryLabel(doc.category)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {formatFileSize(doc.file_size)}
        </p>
      </div>

      <div
        className={cn(
          "absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100",
        )}
      >
        <a
          href={doc.download_url}
          download={doc.file_name}
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-6 items-center justify-center rounded-md bg-background/90 hover:bg-background shadow-sm"
          title="Descargar"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="size-3.5" />
        </a>
        {!readOnly && (
          <button
            disabled={deleting}
            className="flex size-6 items-center justify-center rounded-md bg-background/90 hover:bg-destructive hover:text-destructive-foreground shadow-sm disabled:opacity-50"
            title="Eliminar"
            onClick={() => {
              if (window.confirm(`Eliminar "${doc.file_name}"?`)) onDelete();
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function LightboxDialog({
  doc,
  onClose,
}: {
  doc: PetDocumentRead | null;
  onClose: () => void;
}) {
  if (!doc) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="truncate">{doc.file_name}</span>
            <a
              href={doc.download_url}
              download={doc.file_name}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1 shrink-0">
                <Download className="size-3.5" /> Descargar
              </Button>
            </a>
          </DialogTitle>
        </DialogHeader>
        <img
          src={doc.download_url}
          alt={doc.file_name}
          className="max-h-[70vh] w-full rounded-md object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
