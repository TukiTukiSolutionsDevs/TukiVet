"""Endpoints del portal del cliente."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.api.deps import DBSession, get_client_ip, get_user_agent
from app.core.errors import NotFoundError, UnauthorizedError
from app.models import Customer, CustomerSession, Order
from app.schemas.portal import (
    ARCORead,
    ARCORequest,
    ConsentRead,
    ConsentSubmit,
    CustomerSelfRead,
    DataExportResponse,
    MagicLinkConsume,
    MagicLinkRequest,
    PetHistoryRead,
    PetSelfRead,
    PortalRefreshRequest,
    PortalTokens,
)
from app.services import portal_service

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)


async def get_portal_customer(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DBSession,
) -> Customer:
    if creds is None:
        raise UnauthorizedError("Token requerido")
    try:
        payload = portal_service.decode_portal_token(creds.credentials, "access")
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Token inválido") from exc
    customer = await db.get(Customer, payload["sub"])
    if customer is None or customer.deleted_at is not None:
        raise UnauthorizedError("Cliente no encontrado")
    return customer


PortalCustomer = Annotated[Customer, Depends(get_portal_customer)]


# ----- Auth -----


@router.post(
    "/auth/magic-link",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Solicita un código de acceso al WhatsApp del cliente",
)
async def magic_link(
    payload: MagicLinkRequest,
    db: DBSession,
    request: Request,
) -> dict[str, str]:
    # Necesitamos derivar organization_id desde algún header o config.
    # En single-tenant tomamos la primera organización.
    from app.models import Organization

    result = await db.execute(select(Organization).limit(1))
    org = result.scalar_one_or_none()
    if org is None:
        raise NotFoundError("Organización no registrada")

    link = await portal_service.request_magic_link(
        db,
        organization_id=org.id,
        document_type=payload.document_type,
        document_number=payload.document_number,
        channel=payload.channel,
    )
    await db.commit()
    # En dev devolvemos el token para facilitar tests. En prod, sólo accepted.
    body = {"sent": "true"}
    if hasattr(link, "_raw_token"):
        body["dev_token"] = getattr(link, "_raw_token")
    return body


@router.post(
    "/auth/consume",
    response_model=PortalTokens,
    summary="Intercambia magic token por par de access+refresh",
)
async def consume(
    payload: MagicLinkConsume,
    request: Request,
    db: DBSession,
) -> PortalTokens:
    from app.models import Organization

    result = await db.execute(select(Organization).limit(1))
    org = result.scalar_one_or_none()
    if org is None:
        raise UnauthorizedError("Token inválido o ya usado")

    customer = await portal_service.consume_magic_link(
        db, organization_id=org.id, raw_token=payload.token
    )
    access, refresh, expires_in = await portal_service.issue_portal_tokens(
        db, customer=customer, user_agent=get_user_agent(request)
    )
    await db.commit()
    return PortalTokens(access_token=access, refresh_token=refresh, expires_in=expires_in)


@router.post(
    "/auth/refresh",
    response_model=PortalTokens,
)
async def refresh_portal(
    payload: PortalRefreshRequest,
    request: Request,
    db: DBSession,
) -> PortalTokens:
    try:
        decoded = portal_service.decode_portal_token(payload.refresh_token, "refresh")
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Refresh inválido") from exc
    sess = await db.get(CustomerSession, decoded["jti"])
    if sess is None or sess.revoked_at is not None:
        raise UnauthorizedError("Sesión revocada")
    customer = await db.get(Customer, decoded["sub"])
    if customer is None or customer.deleted_at is not None:
        raise UnauthorizedError("Cliente inválido")
    # Rotación: revoca el viejo, emite uno nuevo
    from datetime import datetime, timezone

    sess.revoked_at = datetime.now(tz=timezone.utc)
    access, refresh, expires_in = await portal_service.issue_portal_tokens(
        db, customer=customer, user_agent=get_user_agent(request)
    )
    await db.commit()
    return PortalTokens(access_token=access, refresh_token=refresh, expires_in=expires_in)


# ----- Self-service -----


@router.get("/me", response_model=CustomerSelfRead)
async def me(customer: PortalCustomer) -> CustomerSelfRead:
    return CustomerSelfRead.model_validate(customer)


@router.get("/pets", response_model=list[PetSelfRead])
async def my_pets(customer: PortalCustomer, db: DBSession) -> list[PetSelfRead]:
    pets = await portal_service.get_my_pets(db, customer_id=customer.id)
    return [PetSelfRead.model_validate(p) for p in pets]


@router.get("/pets/{pet_id}/history", response_model=PetHistoryRead)
async def pet_history(
    pet_id: str, customer: PortalCustomer, db: DBSession
) -> PetHistoryRead:
    data = await portal_service.get_pet_history(
        db, customer_id=customer.id, pet_id=pet_id
    )
    return PetHistoryRead.model_validate(data)


@router.get("/orders/pending", response_model=list[dict])
async def pending_orders(
    customer: PortalCustomer, db: DBSession
) -> list[dict[str, object]]:
    result = await db.execute(
        select(Order).where(
            Order.organization_id == customer.organization_id,
            Order.customer_id == customer.id,
            Order.status.in_(["open", "partially_paid"]),
        )
    )
    return [
        {
            "id": o.id,
            "total": str(o.total),
            "paid_amount": str(o.paid_amount),
            "balance": str(o.total - o.paid_amount),
            "issued_at": o.issued_at.isoformat(),
            "status": o.status,
        }
        for o in result.scalars().all()
    ]


# ----- Ley 29733 — ARCO + consentimientos -----


@router.post(
    "/data-requests",
    response_model=ARCORead,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitud ARCO (acceso, rectificación, cancelación, oposición)",
)
async def submit_arco(
    payload: ARCORequest,
    customer: PortalCustomer,
    db: DBSession,
) -> ARCORead:
    req = await portal_service.submit_arco_request(
        db, customer=customer, type_=payload.type, description=payload.description
    )
    await db.commit()
    return ARCORead.model_validate(req)


@router.get(
    "/data-export",
    response_model=DataExportResponse,
    summary="Exporta los datos personales del cliente (derecho de acceso)",
)
async def data_export(
    customer: PortalCustomer, db: DBSession
) -> DataExportResponse:
    data = await portal_service.export_my_data(db, customer=customer)
    return DataExportResponse.model_validate(data)


@router.post(
    "/consents",
    response_model=ConsentRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_consent(
    payload: ConsentSubmit,
    request: Request,
    customer: PortalCustomer,
    db: DBSession,
) -> ConsentRead:
    consent = await portal_service.record_consent(
        db,
        customer=customer,
        type_=payload.type,
        version=payload.version,
        body=payload.body,
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return ConsentRead.model_validate(consent)
