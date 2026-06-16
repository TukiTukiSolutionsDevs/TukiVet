"""Operaciones CRUD sobre Branch (sede)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.models import Branch
from app.schemas.organization import BranchCreate, BranchUpdate


async def list_branches(db: AsyncSession, organization_id: str) -> list[Branch]:
    result = await db.execute(
        select(Branch)
        .where(
            Branch.organization_id == organization_id,
            Branch.deleted_at.is_(None),
        )
        .order_by(Branch.is_main.desc(), Branch.name)
    )
    return list(result.scalars().all())


async def get_branch(db: AsyncSession, organization_id: str, branch_id: str) -> Branch:
    branch = await db.get(Branch, branch_id)
    if branch is None or branch.organization_id != organization_id or branch.deleted_at is not None:
        raise NotFoundError("Sede no encontrada")
    return branch


async def create_branch(
    db: AsyncSession,
    *,
    organization_id: str,
    data: BranchCreate,
) -> Branch:
    branch = Branch(
        organization_id=organization_id,
        name=data.name,
        address=data.address,
        phone=data.phone,
        is_main=False,
        timezone=data.timezone,
    )
    db.add(branch)
    await db.flush()
    return branch


async def update_branch(
    db: AsyncSession,
    *,
    organization_id: str,
    branch_id: str,
    data: BranchUpdate,
) -> Branch:
    branch = await get_branch(db, organization_id, branch_id)
    if data.name is not None:
        branch.name = data.name
    if data.address is not None:
        branch.address = data.address or None
    if data.phone is not None:
        branch.phone = data.phone or None
    if data.timezone is not None:
        branch.timezone = data.timezone
    await db.flush()
    return branch


async def soft_delete_branch(
    db: AsyncSession,
    *,
    organization_id: str,
    branch_id: str,
) -> Branch:
    branch = await get_branch(db, organization_id, branch_id)
    if branch.is_main:
        raise ConflictError("No puedes eliminar la sede principal")
    branch.deleted_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return branch
