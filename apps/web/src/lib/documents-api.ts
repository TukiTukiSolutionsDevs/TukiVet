import { api } from "./api";

export type DocumentCategory =
  | "lab_result"
  | "imaging"
  | "certificate"
  | "prescription"
  | "consent"
  | "other";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  lab_result: "Resultado laboratorio",
  imaging: "Imagen / radiografía",
  certificate: "Certificado",
  prescription: "Receta",
  consent: "Consentimiento informado",
  other: "Otro",
};

export const DOCUMENT_CATEGORY_OPTIONS: DocumentCategory[] = [
  "lab_result",
  "imaging",
  "certificate",
  "prescription",
  "consent",
  "other",
];

export type PetDocumentRead = {
  id: string;
  organization_id: string;
  pet_id: string;
  uploaded_by: string;
  encounter_id: string | null;
  file_name: string;
  file_size: number;
  content_type: string;
  category: string;
  description: string | null;
  created_at: string;
  download_url: string;
};

export const documentsApi = {
  list: (petId: string) =>
    api.get<PetDocumentRead[]>(`/api/v1/pets/${petId}/documents`),

  upload: (
    petId: string,
    file: File,
    category: DocumentCategory,
    description?: string,
    encounterId?: string,
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    if (description) fd.append("description", description);
    if (encounterId) fd.append("encounter_id", encounterId);
    return api.post<PetDocumentRead>(`/api/v1/pets/${petId}/documents`, fd);
  },

  delete: (petId: string, docId: string) =>
    api.delete<void>(`/api/v1/pets/${petId}/documents/${docId}`),
};

export function categoryLabel(category: string): string {
  return (
    DOCUMENT_CATEGORY_LABELS[category as DocumentCategory] ?? category
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
