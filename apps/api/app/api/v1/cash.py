"""Endpoints de sesiones de caja."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.core.errors import NotFoundError
from app.schemas.order import CashSessionClose, CashSessionOpen, CashSessionRead
from app.services import order_service

router = APIRouter()


@router.post(
    "/open",
    response_model=CashSessionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Abrir caja para el usuario actual",
    dependencies=[Depends(require_permission("cash_session:manage"))],
)
async def open_cash_session(
    payload: CashSessionOpen,
    current_user: CurrentUser,
    db: DBSession,
) -> CashSessionRead:
    session = await order_service.open_cash_session(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        branch_id=payload.branch_id,
        opening_balance=payload.opening_balance,
    )
    await db.commit()
    return CashSessionRead.model_validate(session)


@router.get(
    "/active",
    response_model=CashSessionRead | None,
    summary="Caja abierta del usuario actual (null si no hay)",
    dependencies=[Depends(require_permission("cash_session:read"))],
)
async def get_active(
    current_user: CurrentUser, db: DBSession
) -> CashSessionRead | None:
    session = await order_service.get_active_cash_session(
        db, organization_id=current_user.organization_id, user_id=current_user.id
    )
    return CashSessionRead.model_validate(session) if session else None


@router.get(
    "",
    response_model=list[CashSessionRead],
    summary="Listar sesiones de caja (por defecto sólo cerradas)",
    dependencies=[Depends(require_permission("cash_session:read"))],
)
async def list_cash_sessions(
    current_user: CurrentUser,
    db: DBSession,
    user_id: str | None = Query(default=None),
    closed_only: bool = Query(default=True),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[CashSessionRead]:
    sessions = await order_service.list_cash_sessions(
        db,
        organization_id=current_user.organization_id,
        user_id=user_id,
        closed_only=closed_only,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    return [CashSessionRead.model_validate(s) for s in sessions]


@router.post(
    "/{cash_session_id}/close",
    response_model=CashSessionRead,
    summary="Cerrar caja con declaración de saldo",
    dependencies=[Depends(require_permission("cash_session:manage"))],
)
async def close_cash_session(
    cash_session_id: str,
    payload: CashSessionClose,
    current_user: CurrentUser,
    db: DBSession,
) -> CashSessionRead:
    session = await order_service.close_cash_session(
        db,
        organization_id=current_user.organization_id,
        cash_session_id=cash_session_id,
        user_id=current_user.id,
        closing_balance_declared=payload.closing_balance_declared,
        notes=payload.notes,
    )
    if session is None:
        raise NotFoundError("Caja no encontrada")
    await db.commit()
    return CashSessionRead.model_validate(session)
