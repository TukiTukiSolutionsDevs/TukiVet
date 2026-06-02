"""Schemas Pydantic para Vaccine."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import ORMModel

VaccineSpecies = Literal["dog", "cat", "rabbit", "bird", "rodent", "exotic", "all"]


class VaccineCatalogCreate(ORMModel):
    name: str = Field(min_length=2, max_length=150)
    species: VaccineSpecies
    manufacturer: str | None = Field(default=None, max_length=150)
    protects_against: str | None = None
    default_booster_interval_days: int | None = Field(default=None, ge=1, le=3650)
    is_rabies: bool = False
    active: bool = True


class VaccineCatalogUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    manufacturer: str | None = Field(default=None, max_length=150)
    protects_against: str | None = None
    default_booster_interval_days: int | None = Field(default=None, ge=1, le=3650)
    is_rabies: bool | None = None
    active: bool | None = None


class VaccineCatalogRead(ORMModel):
    id: str
    organization_id: str
    name: str
    species: str
    manufacturer: str | None
    protects_against: str | None
    default_booster_interval_days: int | None
    is_rabies: bool
    active: bool


class VaccineAdministrationCreate(ORMModel):
    pet_id: str
    vaccine_id: str
    encounter_id: str | None = None
    administered_at: datetime | None = None
    lot_number: str | None = Field(default=None, max_length=50)
    expiry_date: date | None = None
    site_of_application: str | None = Field(default=None, max_length=100)
    dose_number: int | None = Field(default=None, ge=1, le=10)
    next_dose_due_date: date | None = Field(
        default=None,
        description="Si no se envía, se calcula desde default_booster_interval_days",
    )
    certificate_number: str | None = Field(default=None, max_length=50)
    notes: str | None = None


class VaccineAdministrationRead(ORMModel):
    id: str
    organization_id: str
    pet_id: str
    vaccine_id: str
    encounter_id: str | None
    administered_by: str | None
    administered_at: datetime
    lot_number: str | None
    expiry_date: date | None
    site_of_application: str | None
    dose_number: int | None
    next_dose_due_date: date | None
    certificate_number: str | None
    notes: str | None
    status: str
    vaccine_name: str | None = None


class VaccineDueRow(ORMModel):
    pet_id: str
    pet_name: str
    customer_id: str
    customer_name: str
    customer_phone: str
    vaccine_id: str
    vaccine_name: str
    last_administered_at: datetime
    next_dose_due_date: date
    days_overdue: int
