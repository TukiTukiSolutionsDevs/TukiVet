"""Schemas Pydantic para citas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import ORMModel

AppointmentType = Literal[
    "consultation",
    "vaccination",
    "surgery",
    "follow_up",
    "checkup",
    "grooming",
    "emergency",
]

AppointmentStatus = Literal[
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
    "no_show",
    "cancelled",
]


class AppointmentCreate(ORMModel):
    customer_id: str
    pet_id: str | None = None
    veterinarian_id: str
    room_id: str | None = None
    type: AppointmentType = "consultation"
    starts_at: datetime
    ends_at: datetime
    notes: str | None = None
    source: str = Field(default="staff", max_length=20)

    @model_validator(mode="after")
    def _validate_range(self) -> AppointmentCreate:
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at debe ser posterior a starts_at")
        if (self.ends_at - self.starts_at).total_seconds() > 8 * 3600:
            raise ValueError("La cita no puede durar más de 8 horas")
        return self


class AppointmentUpdate(ORMModel):
    pet_id: str | None = None
    veterinarian_id: str | None = None
    room_id: str | None = None
    type: AppointmentType | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = None


class AppointmentCancel(ORMModel):
    reason: str | None = Field(default=None, max_length=500)


class AppointmentRead(ORMModel):
    id: str
    organization_id: str
    branch_id: str | None
    pet_id: str | None
    customer_id: str
    veterinarian_id: str
    room_id: str | None
    type: str
    starts_at: datetime
    ends_at: datetime
    status: str
    confirmed_at: datetime | None
    cancelled_at: datetime | None
    cancel_reason: str | None
    notes: str | None
    source: str


class AvailabilitySlot(ORMModel):
    starts_at: datetime
    ends_at: datetime
    available: bool
    conflicting_appointment_id: str | None = None


class RoomCreate(ORMModel):
    name: str = Field(min_length=1, max_length=100)
    type: str = Field(default="consultation", max_length=50)
    branch_id: str | None = None


class RoomUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    type: str | None = Field(default=None, max_length=50)
    branch_id: str | None = None
    active: bool | None = None


class RoomRead(ORMModel):
    id: str
    organization_id: str
    branch_id: str | None
    name: str
    type: str
    active: bool
