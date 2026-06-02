"""Schemas Pydantic para Customer."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import ORMModel
from app.services import peru_doc

DocumentType = Literal["DNI", "RUC", "CE", "PASSPORT"]


class CustomerBase(ORMModel):
    document_type: DocumentType
    document_number: str = Field(min_length=5, max_length=20)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    business_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None
    phone_primary: str = Field(min_length=6, max_length=20)
    phone_secondary: str | None = Field(default=None, max_length=20)
    whatsapp_opted_in: bool = True
    email_opted_in: bool = True
    address: str | None = Field(default=None, max_length=500)
    district: str | None = Field(default=None, max_length=100)
    city: str = Field(default="Lima", max_length=100)
    birth_date: date | None = None
    referral_source: str | None = Field(default=None, max_length=100)
    notes: str | None = None

    @field_validator("document_number")
    @classmethod
    def _normalize_document(cls, v: str) -> str:
        return v.strip()


class CustomerCreate(CustomerBase):
    @field_validator("document_number")
    @classmethod
    def _validate_doc(cls, v: str, info) -> str:  # type: ignore[no-untyped-def]
        document_type = info.data.get("document_type")
        if document_type and not peru_doc.validate(document_type, v):
            raise ValueError(f"Número {document_type} inválido: '{v}'")
        return v


class CustomerUpdate(ORMModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    business_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None
    phone_primary: str | None = Field(default=None, min_length=6, max_length=20)
    phone_secondary: str | None = Field(default=None, max_length=20)
    whatsapp_opted_in: bool | None = None
    email_opted_in: bool | None = None
    address: str | None = Field(default=None, max_length=500)
    district: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    birth_date: date | None = None
    notes: str | None = None


class CustomerRead(ORMModel):
    id: str
    organization_id: str
    document_type: str
    document_number: str
    first_name: str
    last_name: str
    business_name: str | None
    email: str | None
    phone_primary: str
    phone_secondary: str | None
    whatsapp_opted_in: bool
    email_opted_in: bool
    address: str | None
    district: str | None
    city: str
    birth_date: date | None
    notes: str | None


class DocumentValidationRequest(ORMModel):
    document_type: DocumentType
    document_number: str


class DocumentValidationResponse(ORMModel):
    document_type: DocumentType
    document_number: str
    valid: bool
    detected_type: str | None = None
