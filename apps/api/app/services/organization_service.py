"""Lógica de creación de la organización y siembra de roles por defecto."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.core.permissions import DEFAULT_ROLES
from app.models import Branch, Organization, Role, RolePermission
from app.schemas.organization import BranchCreate, OrganizationCreate, OrganizationUpdate


async def organization_exists(db: AsyncSession) -> bool:
    """True si ya existe alguna organización (lock single-tenant)."""
    result = await db.execute(select(Organization.id).limit(1))
    return result.scalar_one_or_none() is not None


async def get_organization(db: AsyncSession, organization_id: str) -> Organization:
    org = await db.get(Organization, organization_id)
    if not org or org.deleted_at is not None:
        raise NotFoundError("Organización no encontrada")
    return org


async def create_organization(
    db: AsyncSession,
    data: OrganizationCreate,
) -> Organization:
    """Crea la organización. Falla si ya existe una (single-tenant)."""
    if await organization_exists(db):
        raise ConflictError(
            "Ya existe una organización registrada (sistema single-tenant)",
        )
    org = Organization(
        legal_name=data.legal_name,
        trade_name=data.trade_name,
        ruc=data.ruc,
        address=data.address,
        phone=data.phone,
        email=data.email,
    )
    db.add(org)
    await db.flush()
    return org


async def create_main_branch(
    db: AsyncSession,
    organization_id: str,
    data: BranchCreate,
) -> Branch:
    branch = Branch(
        organization_id=organization_id,
        name=data.name,
        address=data.address,
        phone=data.phone,
        is_main=True,
        timezone=data.timezone,
    )
    db.add(branch)
    await db.flush()
    return branch


async def update_organization(
    db: AsyncSession,
    organization_id: str,
    data: OrganizationUpdate,
) -> Organization:
    org = await get_organization(db, organization_id)
    if data.legal_name is not None:
        org.legal_name = data.legal_name
    if data.trade_name is not None:
        org.trade_name = data.trade_name
    if data.address is not None:
        org.address = data.address
    if data.phone is not None:
        org.phone = data.phone
    if data.email is not None:
        org.email = str(data.email)
    await db.flush()
    return org


async def seed_default_roles(
    db: AsyncSession,
    organization_id: str,
) -> dict[str, Role]:
    """Crea los 5 roles por defecto + sus permisos asociados para la org."""
    created: dict[str, Role] = {}
    for code, spec in DEFAULT_ROLES.items():
        role = Role(
            organization_id=organization_id,
            code=code,
            name=str(spec["name"]),
            description=str(spec.get("description") or ""),
            is_system=True,
        )
        db.add(role)
        await db.flush()
        for perm_code in spec["permissions"]:  # type: ignore[union-attr]
            db.add(RolePermission(role_id=role.id, permission_code=perm_code))
        created[code] = role
    await db.flush()
    return created
