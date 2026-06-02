"""Operaciones sobre usuarios."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models import Permission, Role, RolePermission, User, UserRole, UserStatus


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email.lower(), User.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def get_user(db: AsyncSession, user_id: str) -> User:
    user = await db.get(User, user_id)
    if not user or user.deleted_at is not None:
        raise NotFoundError("Usuario no encontrado")
    return user


async def get_user_with_roles(db: AsyncSession, user_id: str) -> User:
    result = await db.execute(
        select(User)
        .where(User.id == user_id, User.deleted_at.is_(None))
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("Usuario no encontrado")
    return user


async def get_role_codes(db: AsyncSession, user_id: str) -> list[str]:
    """Devuelve los códigos de rol asignados a un usuario."""
    result = await db.execute(
        select(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    return list(result.scalars().all())


async def get_permission_codes(db: AsyncSession, user_id: str) -> list[str]:
    """Devuelve los códigos de permiso (denormalizados) que tiene un usuario."""
    result = await db.execute(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_code == Permission.code)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
        .distinct()
    )
    return list(result.scalars().all())


async def create_user(
    db: AsyncSession,
    *,
    organization_id: str,
    email: str,
    full_name: str,
    password: str,
    phone: str | None = None,
    professional_id: str | None = None,
    role_codes: list[str] | None = None,
) -> User:
    """Crea un usuario y le asigna roles por código dentro de la organización."""
    email_lower = email.lower()
    if await get_user_by_email(db, email_lower):
        raise ConflictError("Ya existe un usuario con ese email")

    user = User(
        organization_id=organization_id,
        email=email_lower,
        password_hash=hash_password(password),
        full_name=full_name,
        phone=phone,
        professional_id=professional_id,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    await db.flush()

    if role_codes:
        await _assign_roles_by_code(db, user.id, organization_id, role_codes)

    return user


async def _assign_roles_by_code(
    db: AsyncSession,
    user_id: str,
    organization_id: str,
    role_codes: list[str],
) -> None:
    if not role_codes:
        return
    result = await db.execute(
        select(Role).where(
            Role.organization_id == organization_id,
            Role.code.in_(role_codes),
        )
    )
    roles = result.scalars().all()
    found_codes = {r.code for r in roles}
    missing = set(role_codes) - found_codes
    if missing:
        raise NotFoundError(f"Roles inexistentes: {', '.join(sorted(missing))}")
    for role in roles:
        db.add(UserRole(user_id=user_id, role_id=role.id))
    await db.flush()


async def update_last_login(db: AsyncSession, user_id: str) -> None:
    from datetime import datetime, timezone

    from sqlalchemy import update

    await db.execute(
        update(User).where(User.id == user_id).values(last_login_at=datetime.now(tz=timezone.utc))
    )
