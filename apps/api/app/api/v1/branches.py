"""Endpoints de sedes (Branch)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status

from app.api.deps import (
    CurrentUser,
    DBSession,
    get_client_ip,
    get_user_agent,
    require_permission,
)
from app.core.audit import audit
from app.schemas.organization import BranchCreate, BranchRead, BranchUpdate
from app.services import branch_service

router = APIRouter()


@router.get(
    "",
    response_model=list[BranchRead],
    summary="Listar sedes",
)
async def list_branches(
    current_user: CurrentUser,
    db: DBSession,
) -> list[BranchRead]:
    branches = await branch_service.list_branches(db, current_user.organization_id)
    return [BranchRead.model_validate(b) for b in branches]


@router.post(
    "",
    response_model=BranchRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear sede",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def create_branch(
    payload: BranchCreate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> BranchRead:
    branch = await branch_service.create_branch(
        db,
        organization_id=current_user.organization_id,
        data=payload,
    )
    await audit(
        db,
        action="branch.created",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="branch",
        target_id=branch.id,
        after={"name": branch.name},
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    await db.refresh(branch)
    return BranchRead.model_validate(branch)


@router.get(
    "/{branch_id}",
    response_model=BranchRead,
    summary="Obtener sede",
)
async def get_branch(
    branch_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> BranchRead:
    branch = await branch_service.get_branch(
        db, current_user.organization_id, branch_id
    )
    return BranchRead.model_validate(branch)


@router.patch(
    "/{branch_id}",
    response_model=BranchRead,
    summary="Actualizar sede",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def update_branch(
    branch_id: str,
    payload: BranchUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> BranchRead:
    branch = await branch_service.update_branch(
        db,
        organization_id=current_user.organization_id,
        branch_id=branch_id,
        data=payload,
    )
    await audit(
        db,
        action="branch.updated",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="branch",
        target_id=branch.id,
        after=payload.model_dump(exclude_none=True),
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    await db.refresh(branch)
    return BranchRead.model_validate(branch)


@router.delete(
    "/{branch_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Eliminar sede (soft delete; no se puede eliminar la principal)",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def delete_branch(
    branch_id: str,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    branch = await branch_service.soft_delete_branch(
        db,
        organization_id=current_user.organization_id,
        branch_id=branch_id,
    )
    await audit(
        db,
        action="branch.deleted",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="branch",
        target_id=branch.id,
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
