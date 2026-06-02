"""Dependencias inyectables comunes (auth, DB, RBAC)."""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable, Coroutine
from typing import Annotated, Any

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.services.user_service import get_user

_bearer = HTTPBearer(auto_error=False, description="JWT access token")


class Principal(BaseModel):
    """Identidad efectiva de quien hace el request (extraído del access JWT)."""

    user_id: str
    organization_id: str
    role_codes: list[str]
    permission_codes: list[str]

    def has_permission(self, code: str) -> bool:
        return code in self.permission_codes

    def has_any_role(self, *codes: str) -> bool:
        return any(c in self.role_codes for c in codes)


async def get_current_principal(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Principal:
    if creds is None:
        raise UnauthorizedError("Token requerido")
    try:
        payload = decode_token(creds.credentials, expected_type="access")
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Token expirado") from exc
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Token inválido") from exc

    return Principal(
        user_id=payload["sub"],
        organization_id=payload.get("org", ""),
        role_codes=payload.get("roles", []),
        permission_codes=payload.get("perms", []),
    )


PrincipalDep = Annotated[Principal, Depends(get_current_principal)]
DBSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    principal: PrincipalDep,
    db: DBSession,
) -> User:
    user = await get_user(db, principal.user_id)
    if not user.is_active:
        raise UnauthorizedError("Cuenta deshabilitada")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_permission(
    *permission_codes: str,
) -> Callable[..., Coroutine[Any, Any, Principal]]:
    """Dependency factory que exige que el principal tenga TODOS los permisos dados."""

    async def _check(principal: PrincipalDep) -> Principal:
        missing = [p for p in permission_codes if not principal.has_permission(p)]
        if missing:
            raise ForbiddenError(f"Faltan permisos: {', '.join(missing)}")
        return principal

    return _check


def require_role(*role_codes: str) -> Callable[..., Coroutine[Any, Any, Principal]]:
    """Dependency factory que exige que el principal tenga AL MENOS UNO de los roles."""

    async def _check(principal: PrincipalDep) -> Principal:
        if not principal.has_any_role(*role_codes):
            raise ForbiddenError(f"Requiere uno de: {', '.join(role_codes)}")
        return principal

    return _check


def get_client_ip(request: Request) -> str | None:
    """Obtiene la IP del cliente respetando X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def get_user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


# Iterator stub para mypy.
async def _stub() -> AsyncIterator[None]:  # pragma: no cover
    yield
