"""Schemas Pydantic para Pet."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.common import ORMModel

Species = Literal["dog", "cat", "bird", "rabbit", "rodent", "reptile", "exotic", "other"]
PetSex = Literal["male", "female", "unknown"]
PetStatus = Literal["active", "deceased", "transferred", "lost"]


class PetBase(ORMModel):
    name: str = Field(min_length=1, max_length=100)
    species: Species
    breed_id: str | None = None
    breed_name: str | None = Field(default=None, max_length=100)
    sex: PetSex = "unknown"
    birth_date: date | None = None
    birth_date_estimated: bool = False
    color: str | None = Field(default=None, max_length=100)
    distinguishing_marks: str | None = None
    microchip: str | None = Field(default=None, max_length=20)
    tattoo: str | None = Field(default=None, max_length=50)
    sterilized: bool = False
    sterilization_date: date | None = None
    alerts: list[str] | None = None
    chronic_conditions: list[str] | None = None
    photo_url: str | None = None

    @field_validator("microchip")
    @classmethod
    def _normalize_chip(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip().replace(" ", "").replace("-", "")
        if cleaned and not cleaned.isdigit():
            raise ValueError("El microchip debe contener solo dígitos")
        if cleaned and len(cleaned) not in (10, 15):
            raise ValueError("El microchip debe tener 10 o 15 dígitos (ISO 11784/11785)")
        return cleaned or None


class PetCreate(PetBase):
    customer_id: str = Field(description="ID del tutor principal")


class PetUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    breed_id: str | None = None
    breed_name: str | None = Field(default=None, max_length=100)
    sex: PetSex | None = None
    birth_date: date | None = None
    birth_date_estimated: bool | None = None
    color: str | None = Field(default=None, max_length=100)
    distinguishing_marks: str | None = None
    microchip: str | None = Field(default=None, max_length=20)
    sterilized: bool | None = None
    sterilization_date: date | None = None
    status: PetStatus | None = None
    deceased_date: date | None = None
    deceased_reason: str | None = None
    alerts: list[str] | None = None
    chronic_conditions: list[str] | None = None
    photo_url: str | None = None


class PetRead(ORMModel):
    id: str
    organization_id: str
    customer_id: str | None = None
    name: str
    species: str
    breed_id: str | None
    breed_name: str | None
    sex: str
    birth_date: date | None
    birth_date_estimated: bool
    color: str | None
    distinguishing_marks: str | None
    microchip: str | None
    tattoo: str | None
    sterilized: bool
    sterilization_date: date | None
    status: str
    deceased_date: date | None
    deceased_reason: str | None
    alerts: list[str] | None
    chronic_conditions: list[str] | None
    current_weight_kg: Decimal | None
    current_weight_at: datetime | None
    photo_url: str | None


class PetWeightCreate(ORMModel):
    weight_kg: Decimal = Field(gt=0, le=Decimal("999.99"))
    measured_at: datetime | None = None
    notes: str | None = None


class PetWeightRead(ORMModel):
    id: str
    pet_id: str
    weight_kg: Decimal
    measured_at: datetime
    recorded_by: str | None
    notes: str | None
