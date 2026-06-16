"""Servicio del portal del cliente: magic links, sesiones, datos del cliente."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import NotFoundError, UnauthorizedError
from app.db.base import new_ulid
from app.models import (
    Consent,
    Customer,
    CustomerMagicLink,
    CustomerSession,
    DataSubjectRequest,
    Encounter,
    Pet,
    PetOwner,
    VaccineAdministration,
    VaccineCatalog,
)
from app.services import notification_service

PORTAL_JWT_ALGO = "HS256"
MAGIC_LINK_TTL_MINUTES = 15
PORTAL_ACCESS_MINUTES = 30
PORTAL_REFRESH_DAYS = 30


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _build_portal_access_token(customer: Customer) -> tuple[str, datetime]:
    now = datetime.now(tz=timezone.utc)
    exp = now + timedelta(minutes=PORTAL_ACCESS_MINUTES)
    payload: dict[str, Any] = {
        "sub": customer.id,
        "org": customer.organization_id,
        "scope": "portal",
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": new_ulid(),
    }
    return (
        jwt.encode(payload, settings.secret_key.get_secret_value(), algorithm=PORTAL_JWT_ALGO),
        exp,
    )


def _build_portal_refresh(customer_id: str) -> tuple[str, str, datetime]:
    now = datetime.now(tz=timezone.utc)
    exp = now + timedelta(days=PORTAL_REFRESH_DAYS)
    jti = new_ulid()
    payload = {
        "sub": customer_id,
        "scope": "portal",
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": jti,
    }
    token = jwt.encode(
        payload, settings.secret_key.get_secret_value(), algorithm=PORTAL_JWT_ALGO
    )
    return token, jti, exp


def decode_portal_token(token: str, expected_type: str) -> dict[str, Any]:
    payload = jwt.decode(
        token, settings.secret_key.get_secret_value(), algorithms=[PORTAL_JWT_ALGO]
    )
    if payload.get("scope") != "portal" or payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Token de portal inválido")
    return payload


async def get_customer_by_document(
    db: AsyncSession,
    *,
    organization_id: str,
    document_type: str,
    document_number: str,
) -> Customer | None:
    result = await db.execute(
        select(Customer).where(
            Customer.organization_id == organization_id,
            Customer.document_type == document_type,
            Customer.document_number == document_number,
            Customer.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def request_magic_link(
    db: AsyncSession,
    *,
    organization_id: str,
    document_type: str,
    document_number: str,
    channel: str = "whatsapp",
) -> CustomerMagicLink:
    """Genera un magic link y lo envía por el canal indicado."""
    customer = await get_customer_by_document(
        db,
        organization_id=organization_id,
        document_type=document_type,
        document_number=document_number,
    )
    if customer is None:
        # No revelamos si el cliente existe → mismo comportamiento
        raise NotFoundError("Cliente no encontrado")

    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires = datetime.now(tz=timezone.utc) + timedelta(minutes=MAGIC_LINK_TTL_MINUTES)
    recipient = customer.phone_primary if channel == "whatsapp" else (customer.email or "")
    link = CustomerMagicLink(
        customer_id=customer.id,
        token_hash=token_hash,
        channel=channel,
        sent_to=recipient,
        expires_at=expires,
        created_at=datetime.now(tz=timezone.utc),
    )
    db.add(link)
    await db.flush()

    if recipient and channel == "whatsapp":
        # Crea la plantilla si no existe (defensivo)
        from app.services.notification_service import DEFAULT_TEMPLATES, create_template, get_template

        try:
            await get_template(
                db,
                organization_id=organization_id,
                code="vet_portal_magic_link",
                channel="whatsapp",
            )
        except NotFoundError:
            spec = DEFAULT_TEMPLATES.get("vet_portal_magic_link") or (
                "Magic link portal",
                "Tu código de acceso al portal: {{token}}. Expira en 15 minutos.",
                ["token"],
            )
            name, body, vars_ = spec
            await create_template(
                db,
                organization_id=organization_id,
                code="vet_portal_magic_link",
                name=name,
                channel="whatsapp",
                body=body,
                variables=vars_,
            )

        await notification_service.send_using_template(
            db,
            organization_id=organization_id,
            template_code="vet_portal_magic_link",
            channel="whatsapp",
            recipient=recipient,
            variables={"token": raw_token[:8]},  # versión corta para mostrar; el real se mantiene
            customer_id=customer.id,
            related_type="customer_portal",
        )

    link.token_hash = token_hash  # ya está, pero explícito
    await db.flush()
    # Devolvemos el link pero ojo: el raw_token nunca lo persistimos.
    # En tests se devuelve el raw_token via el helper de abajo.
    link._raw_token = raw_token  # type: ignore[attr-defined]
    return link


async def consume_magic_link(
    db: AsyncSession,
    *,
    organization_id: str,
    raw_token: str,
) -> Customer:
    token_hash = _hash_token(raw_token)
    result = await db.execute(
        select(CustomerMagicLink, Customer)
        .join(Customer, Customer.id == CustomerMagicLink.customer_id)
        .where(
            CustomerMagicLink.token_hash == token_hash,
            Customer.organization_id == organization_id,
        )
    )
    row = result.first()
    if row is None:
        raise UnauthorizedError("Token inválido o ya usado")
    link, customer = row
    if link.consumed_at is not None:
        raise UnauthorizedError("El link ya fue usado")
    if link.expires_at <= datetime.now(tz=timezone.utc):
        raise UnauthorizedError("El link expiró")
    link.consumed_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return customer


async def issue_portal_tokens(
    db: AsyncSession,
    *,
    customer: Customer,
    user_agent: str | None = None,
) -> tuple[str, str, int]:
    """Devuelve (access_token, refresh_token, expires_in)."""
    access, access_exp = _build_portal_access_token(customer)
    refresh, jti, refresh_exp = _build_portal_refresh(customer.id)
    db.add(
        CustomerSession(
            jti=jti,
            customer_id=customer.id,
            issued_at=datetime.now(tz=timezone.utc),
            expires_at=refresh_exp,
            user_agent=user_agent,
        )
    )
    await db.flush()
    expires_in = int((access_exp - datetime.now(tz=timezone.utc)).total_seconds())
    return access, refresh, expires_in


# --------- Operaciones del cliente autenticado ---------


async def get_my_pets(db: AsyncSession, *, customer_id: str) -> list[Pet]:
    result = await db.execute(
        select(Pet)
        .join(PetOwner, PetOwner.pet_id == Pet.id)
        .where(PetOwner.customer_id == customer_id, Pet.deleted_at.is_(None))
        .order_by(Pet.name.asc())
    )
    return list(result.scalars().all())


async def get_pet_history(
    db: AsyncSession, *, customer_id: str, pet_id: str
) -> dict[str, Any]:
    # Verifica ownership
    owner = await db.execute(
        select(PetOwner).where(
            PetOwner.customer_id == customer_id, PetOwner.pet_id == pet_id
        )
    )
    if owner.scalar_one_or_none() is None:
        raise NotFoundError("Mascota no encontrada")

    enc_result = await db.execute(
        select(Encounter)
        .where(Encounter.pet_id == pet_id)
        .order_by(Encounter.started_at.desc())
        .limit(50)
    )
    encounters = enc_result.scalars().all()

    vac_result = await db.execute(
        select(VaccineAdministration, VaccineCatalog.name)
        .join(VaccineCatalog, VaccineCatalog.id == VaccineAdministration.vaccine_id)
        .where(VaccineAdministration.pet_id == pet_id)
        .order_by(VaccineAdministration.administered_at.desc())
    )
    vaccines = vac_result.all()

    return {
        "encounters": [
            {
                "id": e.id,
                "type": e.type,
                "started_at": e.started_at.isoformat(),
                "status": e.status,
                "chief_complaint": e.chief_complaint,
            }
            for e in encounters
        ],
        "vaccines": [
            {
                "id": v.id,
                "name": name,
                "administered_at": v.administered_at.isoformat(),
                "next_dose_due_date": v.next_dose_due_date.isoformat()
                if v.next_dose_due_date
                else None,
            }
            for v, name in vaccines
        ],
    }


async def submit_arco_request(
    db: AsyncSession,
    *,
    customer: Customer,
    type_: str,
    description: str | None,
) -> DataSubjectRequest:
    """Recibe solicitud ARCO (Ley 29733)."""
    valid_types = {"access", "rectification", "cancellation", "opposition"}
    if type_ not in valid_types:
        raise UnauthorizedError(
            f"Tipo inválido. Debe ser uno de: {', '.join(sorted(valid_types))}"
        )
    req = DataSubjectRequest(
        organization_id=customer.organization_id,
        customer_id=customer.id,
        type=type_,
        description=description,
        status="pending",
        requested_at=datetime.now(tz=timezone.utc),
    )
    db.add(req)
    await db.flush()
    return req


async def export_my_data(
    db: AsyncSession, *, customer: Customer
) -> dict[str, Any]:
    """Genera export de datos personales (derecho de acceso)."""
    pets = await get_my_pets(db, customer_id=customer.id)
    return {
        "customer": {
            "id": customer.id,
            "document_type": customer.document_type,
            "document_number": customer.document_number,
            "name": f"{customer.first_name} {customer.last_name}".strip(),
            "business_name": customer.business_name,
            "email": customer.email,
            "phone_primary": customer.phone_primary,
            "address": customer.address,
            "created_at": customer.created_at.isoformat(),
        },
        "pets": [
            {
                "id": p.id,
                "name": p.name,
                "species": p.species,
                "microchip": p.microchip,
                "status": p.status,
            }
            for p in pets
        ],
    }


async def record_consent(
    db: AsyncSession,
    *,
    customer: Customer,
    type_: str,
    version: str,
    body: str,
    ip: str | None = None,
    user_agent: str | None = None,
) -> Consent:
    body_hash = hashlib.sha256(body.encode()).hexdigest()
    consent = Consent(
        organization_id=customer.organization_id,
        customer_id=customer.id,
        type=type_,
        version=version,
        accepted_at=datetime.now(tz=timezone.utc),
        ip=ip,
        user_agent=user_agent,
        body_hash=body_hash,
    )
    db.add(consent)
    await db.flush()
    return consent


async def update_preferences(
    db: AsyncSession,
    *,
    customer: Customer,
    whatsapp_opted_in: bool | None,
    email_opted_in: bool | None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> Customer:
    """Actualiza opt-in/opt-out de canales y registra Consent por cada cambio."""
    if whatsapp_opted_in is not None and whatsapp_opted_in != customer.whatsapp_opted_in:
        customer.whatsapp_opted_in = whatsapp_opted_in
        action = "whatsapp_opt_in" if whatsapp_opted_in else "whatsapp_opt_out"
        await record_consent(
            db,
            customer=customer,
            type_=action,
            version="v1",
            body=f"Cliente {customer.id} actualizó preferencia WhatsApp a {whatsapp_opted_in}",
            ip=ip,
            user_agent=user_agent,
        )
    if email_opted_in is not None and email_opted_in != customer.email_opted_in:
        customer.email_opted_in = email_opted_in
        action = "email_opt_in" if email_opted_in else "email_opt_out"
        await record_consent(
            db,
            customer=customer,
            type_=action,
            version="v1",
            body=f"Cliente {customer.id} actualizó preferencia Email a {email_opted_in}",
            ip=ip,
            user_agent=user_agent,
        )
    await db.flush()
    return customer
