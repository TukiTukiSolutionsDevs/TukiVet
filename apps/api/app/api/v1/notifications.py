"""Endpoints de notificaciones + plantillas."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.schemas.notification import (
    NotificationRead,
    SendMessageRequest,
    TemplateCreate,
    TemplateRead,
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
