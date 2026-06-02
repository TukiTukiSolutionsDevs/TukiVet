"""Schemas Pydantic para Problem (POMR)."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import Field

from app.schemas.common import ORMModel

ProblemStatus = Literal["active", "inactive", "resolved", "chronic"]


class ProblemCreate(ORMModel):
    description: str = Field(min_length=2, max_length=255)
    code: str | None = Field(default=None, max_length=50)
    status: ProblemStatus = "active"
    onset_date: date | None = None
    notes: str | None = None


class ProblemUpdate(ORMModel):
    description: str | None = Field(default=None, min_length=2, max_length=255)
    code: str | None = Field(default=None, max_length=50)
    status: ProblemStatus | None = None
    onset_date: date | None = None
    resolved_date: date | None = None
    notes: str | None = None


class ProblemRead(ORMModel):
    id: str
    organization_id: str
    pet_id: str
    description: str
    code: str | None
    status: str
    onset_date: date | None
    resolved_date: date | None
    notes: str | None
    created_by_encounter_id: str | None
