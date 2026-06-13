"""Endpoints de gestión de la organización."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.api.deps import CurrentUser, DBSession, get_client_ip, get_user_agent, require_permission
from app.core.audit import audit
from app.schemas.organization import OrganizationRead, OrganizationUpdate
from app.services import organization_service

router = APIRouter()


@router.patch(
    "/me",
    response_model=OrganizationRead,
    summary="Actualizar datos de la organización",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def update_organization(
    payload: OrganizationUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> OrganizationRead:
    org = await organization_service.update_organization(
        db, organization_id=current_user.organization_id, data=payload
    )
    await audit(
        db,
        action="organization.updated",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="organization",
        target_id=org.id,
        after=payload.model_dump(exclude_none=True),
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    await db.refresh(org)
    return OrganizationRead.model_validate(org)


@router.get(
    "/me",
    response_model=OrganizationRead,
    summary="Obtener datos de la organización actual",
)
async def get_organization(
    current_user: CurrentUser,
    db: DBSession,
) -> OrganizationRead:
    org = await organization_service.get_organization(db, current_user.organization_id)
    return OrganizationRead.model_validate(org)
