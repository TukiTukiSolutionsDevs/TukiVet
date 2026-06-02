"""Endpoints de autenticación."""

from __future__ import annotations

from fastapi import APIRouter, Request, status

from app.api.deps import (
    CurrentUser,
    DBSession,
    PrincipalDep,
    get_client_ip,
    get_user_agent,
)
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    RefreshRequest,
    RegisterOrgRequest,
    RegisterOrgResponse,
    TokenPair,
)
from app.schemas.organization import BranchRead, OrganizationRead
from app.schemas.user import UserRead
from app.services import auth_service, organization_service, user_service

router = APIRouter()


@router.post(
    "/register-org",
    response_model=RegisterOrgResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registra la organización inicial + owner user",
)
async def register_org(
    payload: RegisterOrgRequest,
    request: Request,
    db: DBSession,
) -> RegisterOrgResponse:
    owner, tokens = await auth_service.register_organization_with_owner(
        db,
        payload,
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()

    organization = await organization_service.get_organization(db, owner.organization_id)
    from sqlalchemy import select

    from app.models import Branch

    branch_row = (
        (await db.execute(select(Branch).where(Branch.organization_id == organization.id).limit(1)))
        .scalars()
        .one()
    )

    role_codes = await user_service.get_role_codes(db, owner.id)
    owner_read = UserRead(
        id=owner.id,
        organization_id=owner.organization_id,
        email=owner.email,
        full_name=owner.full_name,
        phone=owner.phone,
        professional_id=owner.professional_id,
        status=owner.status,
        role_codes=role_codes,
    )
    return RegisterOrgResponse(
        organization=OrganizationRead.model_validate(organization),
        branch=BranchRead.model_validate(branch_row),
        owner=owner_read,
        tokens=tokens,
    )


@router.post(
    "/login",
    response_model=TokenPair,
    summary="Iniciar sesión con email y contraseña",
)
async def login(
    payload: LoginRequest,
    request: Request,
    db: DBSession,
) -> TokenPair:
    _, tokens = await auth_service.authenticate(
        db,
        email=payload.email,
        password=payload.password.get_secret_value(),
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return tokens


@router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Rotar el refresh token",
)
async def refresh(
    payload: RefreshRequest,
    request: Request,
    db: DBSession,
) -> TokenPair:
    _, tokens = await auth_service.refresh_tokens(
        db,
        refresh_token=payload.refresh_token,
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return tokens


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revocar el refresh token actual",
)
async def logout(payload: RefreshRequest, db: DBSession) -> None:
    await auth_service.logout(db, refresh_token=payload.refresh_token)
    await db.commit()


@router.get(
    "/me",
    response_model=MeResponse,
    summary="Información del usuario autenticado",
)
async def me(
    current_user: CurrentUser,
    principal: PrincipalDep,
    db: DBSession,
) -> MeResponse:
    organization = await organization_service.get_organization(db, current_user.organization_id)
    role_codes = await user_service.get_role_codes(db, current_user.id)
    return MeResponse(
        id=current_user.id,
        organization_id=current_user.organization_id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        professional_id=current_user.professional_id,
        status=current_user.status,
        role_codes=role_codes,
        organization=OrganizationRead.model_validate(organization),
        permissions=principal.permission_codes,
    )
