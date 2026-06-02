"""Servicios de autenticación: registro de org, login, refresh, logout."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.audit import audit
from app.core.errors import ConflictError, UnauthorizedError
from app.core.permissions import ROLE_OWNER
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models import RefreshToken, User, UserStatus
from app.schemas.auth import RegisterOrgRequest, TokenPair
from app.services import organization_service, user_service


def _build_token_pair(
    *,
    user_id: str,
    organization_id: str,
    role_codes: list[str],
    permission_codes: list[str],
) -> tuple[TokenPair, str, datetime]:
    """Crea access + refresh tokens. Devuelve (pair, refresh_jti, refresh_exp)."""
    access_token, access_exp = create_access_token(
        user_id=user_id,
        organization_id=organization_id,
        role_codes=role_codes,
        permission_codes=permission_codes,
    )
    refresh_token, refresh_jti, refresh_exp = create_refresh_token(user_id=user_id)
    pair = TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int((access_exp - datetime.now(tz=timezone.utc)).total_seconds()),
    )
    return pair, refresh_jti, refresh_exp


async def _persist_refresh(
    db: AsyncSession,
    *,
    jti: str,
    user_id: str,
    expires_at: datetime,
    user_agent: str | None,
    ip: str | None,
) -> RefreshToken:
    row = RefreshToken(
        jti=jti,
        user_id=user_id,
        issued_at=datetime.now(tz=timezone.utc),
        expires_at=expires_at,
        user_agent=user_agent,
        ip=ip,
    )
    db.add(row)
    await db.flush()
    return row


async def register_organization_with_owner(
    db: AsyncSession,
    payload: RegisterOrgRequest,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, TokenPair]:
    """Crea organización + sede principal + usuario owner + tokens iniciales."""
    organization = await organization_service.create_organization(db, payload.organization)
    branch = await organization_service.create_main_branch(
        db, organization.id, payload.branch
    )
    roles = await organization_service.seed_default_roles(db, organization.id)
    owner_role = roles[ROLE_OWNER]

    owner = await user_service.create_user(
        db,
        organization_id=organization.id,
        email=payload.owner.email,
        password=payload.owner.password.get_secret_value(),
        full_name=payload.owner.full_name,
        phone=payload.owner.phone,
        professional_id=payload.owner.professional_id,
    )

    from app.models import UserRole

    db.add(UserRole(user_id=owner.id, role_id=owner_role.id))
    await db.flush()

    perms = await user_service.get_permission_codes(db, owner.id)
    pair, jti, exp = _build_token_pair(
        user_id=owner.id,
        organization_id=organization.id,
        role_codes=[ROLE_OWNER],
        permission_codes=perms,
    )
    await _persist_refresh(db, jti=jti, user_id=owner.id, expires_at=exp, user_agent=user_agent, ip=ip)

    await audit(
        db,
        action="org.registered",
        organization_id=organization.id,
        actor_user_id=owner.id,
        target_type="organization",
        target_id=organization.id,
        after={"ruc": organization.ruc, "trade_name": organization.trade_name},
        ip=ip,
        user_agent=user_agent,
    )

    # Silencia el warning de variable no usada — branch se crea como side-effect.
    _ = branch
    return owner, pair


async def authenticate(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    ip: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, TokenPair]:
    """Verifica credenciales y emite tokens."""
    user = await user_service.get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        raise UnauthorizedError("Email o contraseña incorrectos")
    if user.status != UserStatus.ACTIVE.value:
        raise UnauthorizedError("Cuenta deshabilitada")

    role_codes = await user_service.get_role_codes(db, user.id)
    perms = await user_service.get_permission_codes(db, user.id)
    pair, jti, exp = _build_token_pair(
        user_id=user.id,
        organization_id=user.organization_id,
        role_codes=role_codes,
        permission_codes=perms,
    )
    await _persist_refresh(db, jti=jti, user_id=user.id, expires_at=exp, user_agent=user_agent, ip=ip)
    await user_service.update_last_login(db, user.id)

    await audit(
        db,
        action="user.login",
        organization_id=user.organization_id,
        actor_user_id=user.id,
        target_type="user",
        target_id=user.id,
        ip=ip,
        user_agent=user_agent,
    )
    return user, pair


async def refresh_tokens(
    db: AsyncSession,
    *,
    refresh_token: str,
    ip: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, TokenPair]:
    """Rota el refresh token y emite un nuevo par."""
    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except Exception as exc:
        raise UnauthorizedError("Refresh token inválido") from exc

    jti: str = payload["jti"]
    user_id: str = payload["sub"]

    db_row = await db.get(RefreshToken, jti)
    if db_row is None or db_row.revoked_at is not None:
        raise UnauthorizedError("Refresh token revocado")
    if db_row.user_id != user_id:
        raise UnauthorizedError("Refresh token inconsistente")
    if db_row.expires_at <= datetime.now(tz=timezone.utc):
        raise UnauthorizedError("Refresh token expirado")

    user = await user_service.get_user(db, user_id)
    if user.status != UserStatus.ACTIVE.value:
        raise UnauthorizedError("Cuenta deshabilitada")

    role_codes = await user_service.get_role_codes(db, user.id)
    perms = await user_service.get_permission_codes(db, user.id)
    pair, new_jti, exp = _build_token_pair(
        user_id=user.id,
        organization_id=user.organization_id,
        role_codes=role_codes,
        permission_codes=perms,
    )
    await _persist_refresh(db, jti=new_jti, user_id=user.id, expires_at=exp, user_agent=user_agent, ip=ip)

    db_row.revoked_at = datetime.now(tz=timezone.utc)
    db_row.replaced_by_jti = new_jti
    await db.flush()
    return user, pair


async def logout(
    db: AsyncSession,
    *,
    refresh_token: str,
) -> None:
    """Revoca el refresh token. El access token expira naturalmente."""
    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except Exception:
        return  # token inválido: nada que revocar, logout es idempotente
    jti = payload["jti"]
    db_row = await db.get(RefreshToken, jti)
    if db_row and db_row.revoked_at is None:
        db_row.revoked_at = datetime.now(tz=timezone.utc)
        await db.flush()


async def list_active_refresh_tokens(db: AsyncSession, user_id: str) -> list[RefreshToken]:
    """Para tests y debugging."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
    )
    return list(result.scalars().all())


# Re-export para imports cómodos.
__all__ = [
    "authenticate",
    "list_active_refresh_tokens",
    "logout",
    "refresh_tokens",
    "register_organization_with_owner",
    "settings",
]
