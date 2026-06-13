"""Schemas Pydantic para PetDocument."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


DOCUMENT_CATEGORIES = [
    "lab_result",
    "imaging",
    "certificate",
    "prescription",
    "consent",
    "other",
]

CATEGORY_LABELS: dict[str, str] = {
    "lab_result": "Resultado laboratorio",
    "imaging": "Imagen / radiografía",
    "certificate": "Certificado",
    "prescription": "Receta",
    "consent": "Consentimiento",
    "other": "Otro",
}


class PetDocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    pet_id: str
    uploaded_by: str
    encounter_id: str | None
    file_name: str
    file_size: int
    content_type: str
    category: str
    description: str | None
    created_at: datetime
    download_url: str = ""
