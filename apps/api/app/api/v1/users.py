"""Endpoints de gestión de usuarios dentro de la organización."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select

from app.api.deps import (
    CurrentUser,
    DBSession,
    get_client_ip,
    get_user_agent,
    require_permission,
)
from app.core.audit import audit
from app.core.errors import NotFoundError
from app.models import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import user_service

router = APIRouter()


@router.patch(
    "/me",
    response_model=UserRead,
    summary="Actualizar mi perfil",
)
async def update_own_profile(
    payload: UserUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> UserRead:
    user = await user_service.update_own_profile(
        db,
        user_id=current_user.id,
        full_name=payload.full_name,
        phone=payload.phone,
        professional_id=payload.professional_id,
    )
    await audit(
        db,
        action="user.profile_updated",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="user",
        target_id=user.id,
        after=payload.model_dump(exclude_none=True),
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    await db.refresh(user)
    role_codes = await user_service.get_role_codes(db, user.id)
    return UserRead(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        professional_id=user.professional_id,
        status=user.status,
        role_codes=role_codes,
    )


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un usuario en la organización",
    dependencies=[Depends(require_permission("user:write"))],
)
async def create_user(
    payload: UserCreate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> UserRead:
    user = await user_service.create_user(
        db,
        organization_id=current_user.organization_id,
        email=payload.email,
        password=payload.password.get_secret_value(),
        full_name=payload.full_name,
        phone=payload.phone,
        professional_id=payload.professional_id,
        role_codes=payload.role_codes,
    )
    role_codes = await user_service.get_role_codes(db, user.id)
    await audit(
        db,
        action="user.created",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="user",
        target_id=user.id,
        after={"email": user.email, "role_codes": role_codes},
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return UserRead(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        professional_id=user.professional_id,
        status=user.status,
        role_codes=role_codes,
    )


@router.get(
    "",
    response_model=list[UserRead],
    summary="Listar usuarios de la organización",
    dependencies=[Depends(require_permission("user:read"))],
)
async def list_users(current_user: CurrentUser, db: DBSession) -> list[UserRead]:
    result = await db.execute(
        select(User).where(
            User.organization_id == current_user.organization_id,
            User.deleted_at.is_(None),
        )
    )
    users = result.scalars().all()
    out: list[UserRead] = []
    for u in users:
        roles = await user_service.get_role_codes(db, u.id)
        out.append(
            UserRead(
                id=u.id,
                organization_id=u.organization_id,
                email=u.email,
                full_name=u.full_name,
                phone=u.phone,
                professional_id=u.professional_id,
                status=u.status,
                role_codes=roles,
            )
        )
    return out


@router.get(
    "/{user_id}",
    response_model=UserRead,
    summary="Obtener usuario por id",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_user_endpoint(
    user_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> UserRead:
    user = await user_service.get_user(db, user_id)
    if user.organization_id != current_user.organization_id:
        raise NotFoundError("Usuario no encontrado")
    roles = await user_service.get_role_codes(db, user.id)
    return UserRead(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        professional_id=user.professional_id,
        status=user.status,
        role_codes=roles,
    )
