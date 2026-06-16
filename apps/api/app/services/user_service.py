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


async def update_own_profile(
    db: AsyncSession,
    user_id: str,
    full_name: str | None,
    phone: str | None,
    professional_id: str | None,
) -> User:
    user = await get_user(db, user_id)
    if full_name is not None:
        user.full_name = full_name
    if phone is not None:
        user.phone = phone
    if professional_id is not None:
        user.professional_id = professional_id
    await db.flush()
    return user


async def update_last_login(db: AsyncSession, user_id: str) -> None:
    from datetime import datetime, timezone

    from sqlalchemy import update

    await db.execute(
        update(User).where(User.id == user_id).values(last_login_at=datetime.now(tz=timezone.utc))
    )


async def update_user(
    db: AsyncSession,
    *,
    organization_id: str,
    user_id: str,
    full_name: str | None = None,
    phone: str | None = None,
    professional_id: str | None = None,
    status: str | None = None,
    role_codes: list[str] | None = None,
) -> User:
    """Actualiza un usuario (perfil + status + roles)."""
    user = await get_user(db, user_id)
    if user.organization_id != organization_id:
        raise NotFoundError("Usuario no encontrado")
    if full_name is not None:
        user.full_name = full_name
    if phone is not None:
        user.phone = phone or None
    if professional_id is not None:
        user.professional_id = professional_id or None
    if status is not None:
        try:
            UserStatus(status)
        except ValueError as exc:
            raise ConflictError(f"Estado inválido: {status}") from exc
        user.status = status
    if role_codes is not None:
        from sqlalchemy import delete

        from app.models import UserRole

        await db.execute(delete(UserRole).where(UserRole.user_id == user_id))
        await _assign_roles_by_code(db, user_id, organization_id, role_codes)
    await db.flush()
    return user


async def soft_delete_user(
    db: AsyncSession,
    *,
    organization_id: str,
    user_id: str,
) -> User:
    """Soft delete: set status=disabled + deleted_at."""
    from datetime import datetime, timezone

    user = await get_user(db, user_id)
    if user.organization_id != organization_id:
        raise NotFoundError("Usuario no encontrado")
    user.status = UserStatus.DISABLED.value
    user.deleted_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return user


async def reset_user_password(
    db: AsyncSession,
    *,
    user_id: str,
    new_password: str,
) -> User:
    """Setea una nueva contraseña tras validar token de reset."""
    user = await get_user(db, user_id)
    user.password_hash = hash_password(new_password)
    await db.flush()
    return user
