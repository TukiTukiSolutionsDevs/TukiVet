"""Schemas Pydantic para Prescription y PrescriptionItem."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import Field

from app.schemas.common import ORMModel

PrescriptionStatus = Literal["issued", "dispensed_partial", "dispensed_full", "void"]
Route = Literal["oral", "sc", "im", "iv", "topical", "ocular", "otic", "inhalation", "rectal"]


class PrescriptionItemInput(ORMModel):
    product_id: str | None = None
    medication_name: str = Field(min_length=1, max_length=255)
    active_ingredient: str | None = Field(default=None, max_length=255)
    dose_mg_per_kg: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("9999"))
    total_dose_mg: Decimal | None = Field(default=None, ge=Decimal("0"))
    presentation: str | None = Field(default=None, max_length=100)
    quantity: Decimal = Field(gt=Decimal("0"))
    frequency: str | None = Field(default=None, max_length=100)
    duration_days: int | None = Field(default=None, ge=1, le=365)
    route: Route | None = None
    instructions: str | None = None
    is_controlled: bool = False


class PrescriptionItemRead(ORMModel):
    id: str
    prescription_id: str
    product_id: str | None
    medication_name: str
    active_ingredient: str | None
    dose_mg_per_kg: Decimal | None
    total_dose_mg: Decimal | None
    presentation: str | None
    quantity: Decimal
    frequency: str | None
    duration_days: int | None
    route: str | None
    instructions: str | None
    dispensed_qty: Decimal
    dispensed_at: datetime | None
    dispensed_by: str | None
    lot_id: str | None
    is_controlled: bool
    witness_user_id: str | None


class PrescriptionCreate(ORMModel):
    pet_id: str
    encounter_id: str | None = None
    diagnosis: str | None = None
    notes: str | None = None
    items: list[PrescriptionItemInput] = Field(min_length=1)


class PrescriptionRead(ORMModel):
    id: str
    organization_id: str
    encounter_id: str | None
    pet_id: str
    prescribed_by: str
    issued_at: datetime
    diagnosis: str | None
    notes: str | None
    status: str
    items: list[PrescriptionItemRead] = Field(default_factory=list)


class DispenseRequest(ORMModel):
    quantity: Decimal = Field(gt=Decimal("0"))
    witness_user_id: str | None = Field(
        default=None,
        description="Requerido si el item es controlado",
    )


class DoseCalculationRequest(ORMModel):
    weight_kg: Decimal = Field(gt=Decimal("0"))
    dose_mg_per_kg: Decimal = Field(gt=Decimal("0"))
    presentation_mg_per_unit: Decimal = Field(
        gt=Decimal("0"),
        description="Concentración del producto (mg por unidad: tableta, ml, etc.)",
    )


class DoseCalculationResponse(ORMModel):
    weight_kg: Decimal
    dose_mg_per_kg: Decimal
    total_dose_mg: Decimal
    presentation_mg_per_unit: Decimal
    units_per_dose: Decimal
