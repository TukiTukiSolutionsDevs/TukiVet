"""Endpoints de autenticación."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request, status

from app.api.deps import (
    CurrentUser,
    DBSession,
    PrincipalDep,
    get_client_ip,
    get_user_agent,
)
from app.config import settings
from app.core.security import create_password_reset_token, decode_token

log = logging.getLogger(__name__)
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    RefreshRequest,
    RegisterOrgRequest,
    RegisterOrgResponse,
    TokenPair,
)
from app.schemas.organization import BranchRead, OrganizationRead
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    UserRead,
)
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
    response_model=None,
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


def _reset_link_for(token: str) -> str:
    base = settings.cors_origins[0].rstrip("/") if settings.cors_origins else "http://localhost:3100"
    return f"{base}/reset-password?token={token}"


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Solicitar email de reset de contraseña",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: DBSession,
) -> ForgotPasswordResponse:
    user = await user_service.get_user_by_email(db, payload.email)
    generic = ForgotPasswordResponse(
        message="Si el correo está registrado, recibirás instrucciones para restablecer la contraseña.",
    )
    if user is None or not user.is_active:
        return generic
    token, _ = create_password_reset_token(user_id=user.id)
    link = _reset_link_for(token)
    log.info("password_reset_link user_id=%s link=%s", user.id, link)
    if settings.is_development:
        return ForgotPasswordResponse(message=generic.message, reset_link=link)
    return generic


@router.post(
    "/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Aplicar nueva contraseña con token de reset",
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: DBSession,
) -> None:
    import jwt

    try:
        claims = decode_token(payload.token, expected_type="reset")
    except jwt.ExpiredSignatureError as exc:
        from app.core.errors import UnauthorizedError

        raise UnauthorizedError("Token expirado") from exc
    except jwt.PyJWTError as exc:
        from app.core.errors import UnauthorizedError

        raise UnauthorizedError("Token inválido") from exc
    user_id = claims["sub"]
    await user_service.reset_user_password(
        db,
        user_id=user_id,
        new_password=payload.new_password.get_secret_value(),
    )
    await db.commit()
