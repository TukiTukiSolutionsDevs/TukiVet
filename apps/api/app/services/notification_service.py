"""Servicio de mensajería: persistencia + envío + safe-mode."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from string import Template
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import NotFoundError
from app.models import Customer, MessageTemplate, Notification
from app.services.messaging import MessageRequest, MessagingProvider
from app.services.messaging.console_provider import ConsoleMessagingProvider
from app.services.messaging.twilio_provider import TwilioWhatsAppProvider

log = structlog.get_logger()


def get_messaging_provider() -> MessagingProvider:
    """Devuelve provider real si Twilio configurado, sino Console."""
    sid = settings.twilio_account_sid.get_secret_value()
    token = settings.twilio_auth_token.get_secret_value()
    if sid and token and settings.twilio_whatsapp_from:
        return TwilioWhatsAppProvider(
            account_sid=sid,
            auth_token=token,
            whatsapp_from=settings.twilio_whatsapp_from,
        )
    return ConsoleMessagingProvider()


async def is_recipient_allowed(
    recipient: str,
    db: AsyncSession | None = None,
    organization_id: str | None = None,
) -> bool:
    """En modo SAFE_RECIPIENTS_ONLY, sólo se envía a la whitelist (env + DB)."""
    if not settings.safe_recipients_only:
        return True
    if any(recipient.startswith(r) or r == recipient for r in settings.safe_recipients):
        return True
    if db is None or organization_id is None:
        return False
    from sqlalchemy import select as _select

    from app.models.safe_recipient import SafeRecipient

    result = await db.execute(
        _select(SafeRecipient).where(
            SafeRecipient.organization_id == organization_id,
            SafeRecipient.phone_number == recipient,
        )
    )
    return result.scalar_one_or_none() is not None


_VAR_RE = re.compile(r"\{\{(\w+)\}\}")


def render_template(body: str, variables: dict[str, str]) -> str:
    """Renderiza placeholders {{nombre}} con variables provistas."""

    def _replace(match: re.Match[str]) -> str:
        key = match.group(1)
        return str(variables.get(key, match.group(0)))

    return _VAR_RE.sub(_replace, body)


async def get_template(
    db: AsyncSession, *, organization_id: str, code: str, channel: str
) -> MessageTemplate:
    result = await db.execute(
        select(MessageTemplate).where(
            MessageTemplate.organization_id == organization_id,
            MessageTemplate.code == code,
            MessageTemplate.channel == channel,
        )
    )
    tpl = result.scalar_one_or_none()
    if tpl is None:
        raise NotFoundError(f"Plantilla '{code}' ({channel}) no encontrada")
    return tpl


async def send_message(
    db: AsyncSession,
    *,
    organization_id: str,
    channel: str,
    recipient: str,
    body: str,
    template_code: str | None = None,
    template_data: dict[str, str] | None = None,
    customer_id: str | None = None,
    related_type: str | None = None,
    related_id: str | None = None,
    provider: MessagingProvider | None = None,
) -> Notification:
    """Persiste notificación y delega al provider. No falla si safe-mode bloquea."""
    if provider is None:
        provider = get_messaging_provider()

    notif = Notification(
        organization_id=organization_id,
        channel=channel,
        recipient=recipient,
        template_code=template_code,
        template_data=template_data or {},
        body_preview=body[:1000],
        status="queued",
        customer_id=customer_id,
        related_type=related_type,
        related_id=related_id,
    )
    db.add(notif)
    await db.flush()

    if not await is_recipient_allowed(recipient, db=db, organization_id=organization_id):
        notif.status = "blocked_safe_mode"
        notif.error_message = "Recipient no está en SAFE_RECIPIENTS"
        await db.flush()
        log.info(
            "messaging.blocked_safe_mode", recipient=recipient, channel=channel
        )
        return notif

    response = await provider.send(
        MessageRequest(
            channel=channel,
            to=recipient,
            body=body,
            template_code=template_code,
            template_variables=template_data or {},
        )
    )
    notif.provider = provider.__class__.__name__
    notif.provider_message_id = response.provider_message_id
    if response.status == "sent":
        notif.status = "sent"
        notif.sent_at = datetime.now(tz=timezone.utc)
    else:
        notif.status = "failed"
        notif.error_message = response.error
    await db.flush()
    return notif


async def send_using_template(
    db: AsyncSession,
    *,
    organization_id: str,
    template_code: str,
    channel: str,
    recipient: str,
    variables: dict[str, str],
    customer_id: str | None = None,
    related_type: str | None = None,
    related_id: str | None = None,
    provider: MessagingProvider | None = None,
) -> Notification:
    tpl = await get_template(
        db, organization_id=organization_id, code=template_code, channel=channel
    )
    body = render_template(tpl.body, variables)
    return await send_message(
        db,
        organization_id=organization_id,
        channel=channel,
        recipient=recipient,
        body=body,
        template_code=template_code,
        template_data=variables,
        customer_id=customer_id,
        related_type=related_type,
        related_id=related_id,
        provider=provider,
    )


async def list_notifications(
    db: AsyncSession,
    *,
    organization_id: str,
    status_filter: str | None = None,
    customer_id: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[Notification]:
    stmt = select(Notification).where(Notification.organization_id == organization_id)
    if status_filter:
        stmt = stmt.where(Notification.status == status_filter)
    if customer_id:
        stmt = stmt.where(Notification.customer_id == customer_id)
    stmt = (
        stmt.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list((await db.execute(stmt)).scalars().all())


async def create_template(
    db: AsyncSession,
    *,
    organization_id: str,
    code: str,
    name: str,
    channel: str,
    body: str,
    locale: str = "es_PE",
    variables: list[str] | None = None,
) -> MessageTemplate:
    tpl = MessageTemplate(
        organization_id=organization_id,
        code=code,
        name=name,
        channel=channel,
        body=body,
        locale=locale,
        variables=variables or [],
        status="approved",
    )
    db.add(tpl)
    await db.flush()
    return tpl


# Helpers de dominio --------------------------------------------------------


def _customer_phone(customer: Customer) -> str | None:
    return customer.phone_primary if customer.whatsapp_opted_in else None


async def notify_vaccine_due(
    db: AsyncSession,
    *,
    organization_id: str,
    customer: Customer,
    pet_name: str,
    vaccine_name: str,
    due_date: str,
    provider: MessagingProvider | None = None,
) -> Notification | None:
    phone = _customer_phone(customer)
    if not phone:
        return None
    variables = {"pet": pet_name, "vaccine": vaccine_name, "due_date": due_date}
    return await send_using_template(
        db,
        organization_id=organization_id,
        template_code="vet_vaccine_due",
        channel="whatsapp",
        recipient=phone,
        variables=variables,
        customer_id=customer.id,
        related_type="vaccine",
        provider=provider,
    )


async def notify_appointment_reminder(
    db: AsyncSession,
    *,
    organization_id: str,
    customer: Customer,
    pet_name: str,
    when: str,
    provider: MessagingProvider | None = None,
) -> Notification | None:
    phone = _customer_phone(customer)
    if not phone:
        return None
    variables = {"pet": pet_name, "when": when}
    return await send_using_template(
        db,
        organization_id=organization_id,
        template_code="vet_appointment_reminder_24h",
        channel="whatsapp",
        recipient=phone,
        variables=variables,
        customer_id=customer.id,
        related_type="appointment",
        provider=provider,
    )


# Plantillas semilla recomendadas (referencia)
DEFAULT_TEMPLATES: dict[str, tuple[str, str, list[str]]] = {
    "vet_appointment_reminder_24h": (
        "Recordatorio de cita 24h",
        "Hola! Recordamos la cita de {{pet}} mañana a las {{when}}. Responde CONFIRMO o REAGENDAR.",
        ["pet", "when"],
    ),
    "vet_appointment_confirmation": (
        "Confirmación de cita",
        "Tu cita para {{pet}} quedó agendada para el {{when}}. ¡Te esperamos!",
        ["pet", "when"],
    ),
    "vet_vaccine_due": (
        "Vacuna por vencer / vencida",
        "La vacuna {{vaccine}} de {{pet}} vence el {{due_date}}. Reagenda con nosotros.",
        ["pet", "vaccine", "due_date"],
    ),
    "vet_invoice_receipt": (
        "Comprobante emitido",
        "Te enviamos el comprobante {{series}}-{{number}} por S/ {{total}}. Descarga: {{pdf_url}}",
        ["series", "number", "total", "pdf_url"],
    ),
    "vet_nps_followup": (
        "Encuesta post-visita",
        "¿Cómo estuvo la atención de {{pet}}? Califícanos del 0 al 10 respondiendo este mensaje.",
        ["pet"],
    ),
}


async def seed_default_templates(db: AsyncSession, *, organization_id: str) -> int:
    """Crea las plantillas por defecto si no existen. Devuelve count creadas."""
    created = 0
    for code, (name, body, variables) in DEFAULT_TEMPLATES.items():
        existing = await db.execute(
            select(MessageTemplate).where(
                MessageTemplate.organization_id == organization_id,
                MessageTemplate.code == code,
                MessageTemplate.channel == "whatsapp",
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue
        await create_template(
            db,
            organization_id=organization_id,
            code=code,
            name=name,
            channel="whatsapp",
            body=body,
            variables=variables,
        )
        created += 1
    return created


# Mantener imports usados
_ = Any
