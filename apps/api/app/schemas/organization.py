"""Schemas Pydantic para organización y sede."""

from __future__ import annotations

import re

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import ORMModel

_RUC_RE = re.compile(r"^[12]\d{10}$")


class OrganizationCreate(ORMModel):
    legal_name: str = Field(min_length=2, max_length=255)
    trade_name: str = Field(min_length=2, max_length=255)
    ruc: str = Field(min_length=11, max_length=11)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None

    @field_validator("ruc")
    @classmethod
    def _valid_ruc(cls, v: str) -> str:
        if not _RUC_RE.match(v):
            raise ValueError("RUC inválido (debe tener 11 dígitos y empezar con 1 o 2)")
        return v


class OrganizationUpdate(ORMModel):
    legal_name: str | None = Field(default=None, min_length=2, max_length=255)
    trade_name: str | None = Field(default=None, min_length=2, max_length=255)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None


class OrganizationRead(ORMModel):
    id: str
    legal_name: str
    trade_name: str
    ruc: str
    address: str | None
    phone: str | None
    email: str | None


class BranchCreate(ORMModel):
    name: str = Field(min_length=2, max_length=255)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=20)
    timezone: str = Field(default="America/Lima", max_length=50)


class BranchRead(ORMModel):
    id: str
    organization_id: str
    name: str
    address: str | None
    phone: str | None
    is_main: bool
    timezone: str
