"""Endpoints de reportes y KPIs."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser, DBSession, require_permission
from app.schemas.reports import FinancialReport, KPIs
from app.services import reports_service

router = APIRouter()


@router.get(
    "/kpis",
    response_model=KPIs,
    summary="Dashboard de KPIs (10 métricas estándar PIMS)",
    dependencies=[Depends(require_permission("report:read"))],
)
async def get_kpis(
    current_user: CurrentUser,
    db: DBSession,
    window_days: int = Query(default=30, ge=1, le=365),
) -> KPIs:
    return await reports_service.compute_kpis(
        db, organization_id=current_user.organization_id, window_days=window_days
    )


@router.get(
    "/financial",
    response_model=FinancialReport,
    summary="Reporte financiero por rango de fechas",
    dependencies=[Depends(require_permission("report:read"))],
)
async def get_financial(
    current_user: CurrentUser,
    db: DBSession,
    start: date = Query(...),
    end: date = Query(...),
) -> FinancialReport:
    return await reports_service.financial_report(
        db,
        organization_id=current_user.organization_id,
        start=start,
        end=end,
    )
