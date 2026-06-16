"""Schemas Pydantic para el portal del cliente."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import Field

from app.schemas.common import ORMModel

DocType = Literal["DNI", "RUC", "CE", "PASSPORT"]
ARCOType = Literal["access", "rectification", "cancellation", "opposition"]


class MagicLinkRequest(ORMModel):
    document_type: DocType
    document_number: str = Field(min_length=5, max_length=20)
    channel: Literal["whatsapp", "email"] = "whatsapp"


class MagicLinkConsume(ORMModel):
    token: str = Field(min_length=10, max_length=100)


class PortalTokens(ORMModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class PortalRefreshRequest(ORMModel):
    refresh_token: str


class CustomerSelfRead(ORMModel):
    id: str
    document_type: str
    document_number: str
    first_name: str
    last_name: str
    business_name: str | None
    email: str | None
    phone_primary: str
    whatsapp_opted_in: bool
    email_opted_in: bool


class PreferencesUpdate(ORMModel):
    whatsapp_opted_in: bool | None = None
    email_opted_in: bool | None = None


class PetSelfRead(ORMModel):
    id: str
    name: str
    species: str
    sex: str
    birth_date: date | None
    microchip: str | None
    status: str


class HistoryEncounter(ORMModel):
    id: str
    type: str
    started_at: str
    status: str
    chief_complaint: str | None


class HistoryVaccine(ORMModel):
    id: str
    name: str
    administered_at: str
    next_dose_due_date: str | None


class PetHistoryRead(ORMModel):
    encounters: list[HistoryEncounter]
    vaccines: list[HistoryVaccine]


class ARCORequest(ORMModel):
    type: ARCOType
    description: str | None = Field(default=None, max_length=2000)


class ARCORead(ORMModel):
    id: str
    organization_id: str
    customer_id: str
    type: str
    description: str | None
    status: str
    requested_at: datetime
    responded_at: datetime | None


class ConsentSubmit(ORMModel):
    type: str = Field(min_length=2, max_length=50)
    version: str = Field(min_length=1, max_length=20)
    body: str = Field(min_length=10)


class ConsentRead(ORMModel):
    id: str
    type: str
    version: str
    accepted_at: datetime
    body_hash: str


class DataExportResponse(ORMModel):
    customer: dict[str, Any]
    pets: list[dict[str, Any]]
