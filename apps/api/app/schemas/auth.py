"""Schemas Pydantic para autenticación."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, SecretStr

from app.schemas.organization import (
    BranchCreate,
    BranchRead,
    OrganizationCreate,
    OrganizationRead,
)
from app.schemas.user import UserCreate, UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: SecretStr


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int = Field(description="Vida del access_token en segundos")


class RegisterOrgRequest(BaseModel):
    organization: OrganizationCreate
    branch: BranchCreate
    owner: UserCreate


class RegisterOrgResponse(BaseModel):
    organization: OrganizationRead
    branch: BranchRead
    owner: UserRead
    tokens: TokenPair


class MeResponse(UserRead):
    organization: OrganizationRead
    permissions: list[str] = Field(default_factory=list)
