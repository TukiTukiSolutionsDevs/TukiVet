"""Schemas Pydantic para usuarios."""

from __future__ import annotations

from pydantic import EmailStr, Field, SecretStr

from app.schemas.common import ORMModel


class UserCreate(ORMModel):
    email: EmailStr
    password: SecretStr = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    professional_id: str | None = Field(default=None, max_length=50)
    role_codes: list[str] = Field(default_factory=list)


class UserUpdate(ORMModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    professional_id: str | None = Field(default=None, max_length=50)
    status: str | None = None


class UserPasswordUpdate(ORMModel):
    current_password: SecretStr
    new_password: SecretStr = Field(min_length=10, max_length=128)


class UserRead(ORMModel):
    id: str
    organization_id: str
    email: str
    full_name: str
    phone: str | None
    professional_id: str | None
    status: str
    role_codes: list[str] = Field(default_factory=list)
