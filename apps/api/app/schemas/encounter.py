"""Schemas Pydantic para encounter, SOAP, vital signs, amendments."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import Field

from app.schemas.common import ORMModel

EncounterType = Literal[
    "consultation",
    "vaccination",
    "surgery",
    "emergency",
    "follow_up",
    "checkup",
    "hospitalization",
]

EncounterStatus = Literal["draft", "in_progress", "closed", "amended"]


class EncounterCreate(ORMModel):
    pet_id: str
    customer_id: str
    veterinarian_id: str | None = None
    type: EncounterType = "consultation"
    chief_complaint: str | None = None
    started_at: datetime | None = None


class EncounterUpdate(ORMModel):
    veterinarian_id: str | None = None
    chief_complaint: str | None = None
    type: EncounterType | None = None


class EncounterRead(ORMModel):
    id: str
    organization_id: str
    branch_id: str | None
    pet_id: str
    customer_id: str
    veterinarian_id: str | None
    type: str
    chief_complaint: str | None
    status: str
    started_at: datetime
    closed_at: datetime | None
    total_amount: Decimal


class SoapNoteRead(ORMModel):
    id: str
    encounter_id: str
    subjective: dict[str, Any]
    objective: dict[str, Any]
    assessment: list[Any]
    plan: dict[str, Any]
    template_id: str | None
    version: int
    is_current: bool


class SoapNoteUpdate(ORMModel):
    subjective: dict[str, Any] | None = None
    objective: dict[str, Any] | None = None
    assessment: list[Any] | None = None
    plan: dict[str, Any] | None = None
    template_id: str | None = None


class VitalSignCreate(ORMModel):
    measured_at: datetime | None = None
    temperature_c: Decimal | None = Field(default=None, ge=Decimal("30"), le=Decimal("45"))
    heart_rate_bpm: int | None = Field(default=None, ge=0, le=400)
    respiratory_rate: int | None = Field(default=None, ge=0, le=200)
    weight_kg: Decimal | None = Field(default=None, gt=Decimal("0"), le=Decimal("999.99"))
    body_condition_score: int | None = Field(default=None, ge=1, le=9)
    mucous_membranes: str | None = Field(default=None, max_length=50)
    capillary_refill_seconds: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("10"))
    hydration_status: str | None = Field(default=None, max_length=50)
    pain_score: int | None = Field(default=None, ge=0, le=10)
    notes: str | None = None


class VitalSignRead(ORMModel):
    id: str
    encounter_id: str
    measured_at: datetime
    temperature_c: Decimal | None
    heart_rate_bpm: int | None
    respiratory_rate: int | None
    weight_kg: Decimal | None
    body_condition_score: int | None
    mucous_membranes: str | None
    capillary_refill_seconds: Decimal | None
    hydration_status: str | None
    pain_score: int | None
    notes: str | None
    recorded_by: str | None


class EncounterCloseRequest(ORMModel):
    summary: str | None = Field(default=None, description="Resumen breve opcional")


class EncounterAmendRequest(ORMModel):
    reason: str = Field(min_length=10, max_length=2000)
    soap_update: SoapNoteUpdate
