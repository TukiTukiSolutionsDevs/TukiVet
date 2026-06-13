"""Endpoints de auditoría (lectura del log inmutable)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, DBSession, require_permission
from app.models import AuditLog
from app.schemas.common import ORMModel, Page

router = APIRouter()


class AuditLogRead(ORMModel):
    id: str
    organization_id: str | None
    actor_user_id: str | None
    action: str
    target_type: str | None
    target_id: str | None
    before: dict[str, Any] | None
    after: dict[str, Any] | None
    ip: str | None
    created_at: datetime


@router.get(
    "",
    response_model=Page[AuditLogRead],
    summary="Listar entradas del log de auditoría",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def list_audit_logs(
    current_user: CurrentUser,
    db: DBSession,
    action: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
    actor_user_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> Page[AuditLogRead]:
    base = (
        select(AuditLog)
        .where(AuditLog.organization_id == current_user.organization_id)
        .order_by(AuditLog.created_at.desc())
    )
    if action:
        base = base.where(AuditLog.action.ilike(f"%{action}%"))
    if target_type:
        base = base.where(AuditLog.target_type == target_type)
    if actor_user_id:
        base = base.where(AuditLog.actor_user_id == actor_user_id)

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    rows_result = await db.execute(base.offset(offset).limit(page_size))
    rows = rows_result.scalars().all()

    return Page(
        items=[AuditLogRead.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )
