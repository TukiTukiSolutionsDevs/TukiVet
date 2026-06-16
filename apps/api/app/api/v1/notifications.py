"""Endpoints de notificaciones + plantillas."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.schemas.notification import (
    NotificationRead,
    SendMessageRequest,
    TemplateCreate,
    TemplateRead,
    TemplateUpdate,
)
from app.services import notification_service

router = APIRouter()


@router.get(
    "/templates",
    response_model=list[TemplateRead],
    dependencies=[Depends(require_permission("user:read"))],
)
async def list_templates(current_user: CurrentUser, db: DBSession) -> list[TemplateRead]:
    from sqlalchemy import select

    from app.models import MessageTemplate

    result = await db.execute(
        select(MessageTemplate)
        .where(MessageTemplate.organization_id == current_user.organization_id)
        .order_by(MessageTemplate.channel.asc(), MessageTemplate.code.asc())
    )
    rows = result.scalars().all()
    return [TemplateRead.model_validate(r) for r in rows]


@router.post(
    "/templates",
    response_model=TemplateRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("organization:update"))],
)
async def create_template(
    payload: TemplateCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> TemplateRead:
    tpl = await notification_service.create_template(
        db,
        organization_id=current_user.organization_id,
        code=payload.code,
        name=payload.name,
        channel=payload.channel,
        body=payload.body,
        locale=payload.locale,
        variables=payload.variables,
    )
    await db.commit()
    return TemplateRead.model_validate(tpl)


@router.patch(
    "/templates/{template_id}",
    response_model=TemplateRead,
    dependencies=[Depends(require_permission("organization:update"))],
)
async def update_template_endpoint(
    template_id: str,
    payload: TemplateUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> TemplateRead:
    tpl = await notification_service.update_template(
        db,
        organization_id=current_user.organization_id,
        template_id=template_id,
        name=payload.name,
        body=payload.body,
        locale=payload.locale,
        variables=payload.variables,
        status=payload.status,
    )
    await db.commit()
    await db.refresh(tpl)
    return TemplateRead.model_validate(tpl)


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    dependencies=[Depends(require_permission("organization:update"))],
)
async def delete_template_endpoint(
    template_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    await notification_service.delete_template(
        db,
        organization_id=current_user.organization_id,
        template_id=template_id,
    )
    await db.commit()


@router.post(
    "/templates/seed-defaults",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Crea las plantillas por defecto (recordatorios cita/vacuna, etc.)",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def seed_defaults(current_user: CurrentUser, db: DBSession) -> dict[str, int]:
    created = await notification_service.seed_default_templates(
        db, organization_id=current_user.organization_id
    )
    await db.commit()
    return {"created": created}


@router.post(
    "/send",
    response_model=NotificationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar mensaje usando una plantilla",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def send_message(
    payload: SendMessageRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> NotificationRead:
    notif = await notification_service.send_using_template(
        db,
        organization_id=current_user.organization_id,
        template_code=payload.template_code,
        channel=payload.channel,
        recipient=payload.recipient,
        variables=payload.variables,
        customer_id=payload.customer_id,
    )
    await db.commit()
    return NotificationRead.model_validate(notif)


@router.post(
    "/appointments/{appointment_id}/remind",
    response_model=NotificationRead,
    summary="Enviar recordatorio de cita ahora (manual)",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def send_appointment_reminder(
    appointment_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> NotificationRead:
    from sqlalchemy import select

    from app.core.errors import ConflictError, NotFoundError
    from app.models import Appointment, Customer, Pet

    appt = await db.get(Appointment, appointment_id)
    if appt is None or appt.organization_id != current_user.organization_id:
        raise NotFoundError("Cita no encontrada")
    customer = await db.get(Customer, appt.customer_id)
    if customer is None:
        raise NotFoundError("Tutor no encontrado")
    pet_name = "tu mascota"
    if appt.pet_id:
        pet = await db.get(Pet, appt.pet_id)
        if pet:
            pet_name = pet.name
    notif = await notification_service.notify_appointment_reminder(
        db,
        organization_id=current_user.organization_id,
        customer=customer,
        pet_name=pet_name,
        when=appt.starts_at.strftime("%d/%m/%Y %H:%M"),
    )
    if notif is None:
        raise ConflictError(
            "No pude enviar: el tutor no aceptó WhatsApp o no tiene teléfono."
        )
    await db.commit()
    return NotificationRead.model_validate(notif)


@router.post(
    "/vaccines/{administration_id}/remind",
    response_model=NotificationRead,
    summary="Enviar recordatorio de vacuna ahora (manual)",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def send_vaccine_reminder(
    administration_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> NotificationRead:
    from app.core.errors import ConflictError, NotFoundError
    from app.models import Customer, Pet, Vaccine
    from app.models.vaccine import VaccineAdministration

    adm = await db.get(VaccineAdministration, administration_id)
    if adm is None or adm.organization_id != current_user.organization_id:
        raise NotFoundError("Vacunación no encontrada")
    pet = await db.get(Pet, adm.pet_id)
    if pet is None:
        raise NotFoundError("Mascota no encontrada")
    from sqlalchemy import select

    from app.models import PetOwner

    res = await db.execute(
        select(PetOwner.customer_id).where(
            PetOwner.pet_id == pet.id, PetOwner.role == "primary"
        )
    )
    customer_id = res.scalar_one_or_none()
    if customer_id is None:
        raise NotFoundError("Tutor primario no encontrado")
    customer = await db.get(Customer, customer_id)
    if customer is None:
        raise NotFoundError("Tutor no encontrado")
    vaccine = await db.get(Vaccine, adm.vaccine_id)
    vaccine_name = vaccine.name if vaccine else "vacuna"
    due = adm.next_dose_due_date.strftime("%d/%m/%Y") if adm.next_dose_due_date else "pronto"
    notif = await notification_service.notify_vaccine_due(
        db,
        organization_id=current_user.organization_id,
        customer=customer,
        pet_name=pet.name,
        vaccine_name=vaccine_name,
        due_date=due,
    )
    if notif is None:
        raise ConflictError(
            "No pude enviar: el tutor no aceptó WhatsApp o no tiene teléfono."
        )
    await db.commit()
    return NotificationRead.model_validate(notif)


@router.get(
    "",
    response_model=list[NotificationRead],
    dependencies=[Depends(require_permission("user:read"))],
)
async def list_notifications(
    current_user: CurrentUser,
    db: DBSession,
    status_filter: str | None = Query(default=None, alias="status"),
    customer_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> list[NotificationRead]:
    rows = await notification_service.list_notifications(
        db,
        organization_id=current_user.organization_id,
        status_filter=status_filter,
        customer_id=customer_id,
        page=page,
        page_size=page_size,
    )
    return [NotificationRead.model_validate(r) for r in rows]


# ── Safe recipients whitelist ──────────────────────────────────────────────


from pydantic import BaseModel as _BM  # noqa: E402

from app.models import SafeRecipient  # noqa: E402
from app.schemas.common import ORMModel  # noqa: E402


class SafeRecipientRead(ORMModel):
    id: str
    phone_number: str
    label: str | None


class SafeRecipientCreate(_BM):
    phone_number: str
    label: str | None = None


@router.get(
    "/safe-recipients",
    response_model=list[SafeRecipientRead],
    summary="Listar números en lista blanca",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def list_safe_recipients(
    current_user: CurrentUser, db: DBSession
) -> list[SafeRecipientRead]:
    from sqlalchemy import select

    result = await db.execute(
        select(SafeRecipient)
        .where(SafeRecipient.organization_id == current_user.organization_id)
        .order_by(SafeRecipient.created_at.asc())
    )
    return [SafeRecipientRead.model_validate(r) for r in result.scalars().all()]


@router.post(
    "/safe-recipients",
    response_model=SafeRecipientRead,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar número a la lista blanca",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def add_safe_recipient(
    payload: SafeRecipientCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> SafeRecipientRead:
    entry = SafeRecipient(
        organization_id=current_user.organization_id,
        phone_number=payload.phone_number.strip(),
        label=payload.label,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return SafeRecipientRead.model_validate(entry)


@router.delete(
    "/safe-recipients/{recipient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Eliminar número de la lista blanca",
    dependencies=[Depends(require_permission("organization:update"))],
)
async def delete_safe_recipient(
    recipient_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    from sqlalchemy import select

    from app.core.errors import NotFoundError

    result = await db.execute(
        select(SafeRecipient).where(
            SafeRecipient.id == recipient_id,
            SafeRecipient.organization_id == current_user.organization_id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError("Número no encontrado")
    await db.delete(entry)
    await db.commit()
