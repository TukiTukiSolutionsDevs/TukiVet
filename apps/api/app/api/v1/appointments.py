"""Endpoints de citas."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.schemas.appointment import (
    AppointmentCancel,
    AppointmentCreate,
    AppointmentRead,
    AppointmentUpdate,
    RoomCreate,
    RoomRead,
)
from app.schemas.common import Page
from app.services import appointment_service

router = APIRouter()


# ----- Rooms -----


@router.get(
    "/rooms",
    response_model=list[RoomRead],
    dependencies=[Depends(require_permission("appointment:read"))],
)
async def list_rooms(current_user: CurrentUser, db: DBSession) -> list[RoomRead]:
    rows = await appointment_service.list_rooms(
        db, organization_id=current_user.organization_id
    )
    return [RoomRead.model_validate(r) for r in rows]


@router.post(
    "/rooms",
    response_model=RoomRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("appointment:write"))],
)
async def create_room(
    payload: RoomCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> RoomRead:
    room = await appointment_service.create_room(
        db, organization_id=current_user.organization_id, payload=payload
    )
    await db.commit()
    return RoomRead.model_validate(room)


# ----- Appointments -----


@router.post(
    "",
    response_model=AppointmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Agendar cita",
    dependencies=[Depends(require_permission("appointment:write"))],
)
async def create_appointment(
    payload: AppointmentCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> AppointmentRead:
    appt = await appointment_service.create_appointment(
        db, organization_id=current_user.organization_id, payload=payload
    )
    await db.commit()
    return AppointmentRead.model_validate(appt)


@router.get(
    "",
    response_model=Page[AppointmentRead],
    summary="Listar/buscar citas con filtros de rango",
    dependencies=[Depends(require_permission("appointment:read"))],
)
async def list_appointments(
    current_user: CurrentUser,
    db: DBSession,
    starts_at_from: datetime | None = Query(default=None),
    starts_at_to: datetime | None = Query(default=None),
    veterinarian_id: str | None = Query(default=None),
    pet_id: str | None = Query(default=None),
    customer_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> Page[AppointmentRead]:
    rows, total = await appointment_service.list_appointments(
        db,
        organization_id=current_user.organization_id,
        starts_at_from=starts_at_from,
        starts_at_to=starts_at_to,
        veterinarian_id=veterinarian_id,
        pet_id=pet_id,
        customer_id=customer_id,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )
    return Page[AppointmentRead](
        items=[AppointmentRead.model_validate(a) for a in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{appointment_id}",
    response_model=AppointmentRead,
    dependencies=[Depends(require_permission("appointment:read"))],
)
async def get_appointment(
    appointment_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> AppointmentRead:
    appt = await appointment_service.get_appointment(
        db, organization_id=current_user.organization_id, appointment_id=appointment_id
    )
    return AppointmentRead.model_validate(appt)


@router.put(
    "/{appointment_id}",
    response_model=AppointmentRead,
    summary="Reagendar / modificar cita",
    dependencies=[Depends(require_permission("appointment:write"))],
)
async def update_appointment(
    appointment_id: str,
    payload: AppointmentUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> AppointmentRead:
    appt = await appointment_service.update_appointment(
        db,
        organization_id=current_user.organization_id,
        appointment_id=appointment_id,
        payload=payload,
    )
    await db.commit()
    return AppointmentRead.model_validate(appt)


@router.post(
    "/{appointment_id}/confirm",
    response_model=AppointmentRead,
    dependencies=[Depends(require_permission("appointment:write"))],
)
async def confirm(
    appointment_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> AppointmentRead:
    appt = await appointment_service.confirm_appointment(
        db, organization_id=current_user.organization_id, appointment_id=appointment_id
    )
    await db.commit()
    return AppointmentRead.model_validate(appt)


@router.post(
    "/{appointment_id}/start",
    response_model=AppointmentRead,
    summary="Marcar cita como in_progress",
    dependencies=[Depends(require_permission("appointment:write"))],
)
async def start(
    appointment_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> AppointmentRead:
    appt = await appointment_service.mark_in_progress(
        db, organization_id=current_user.organization_id, appointment_id=appointment_id
    )
    await db.commit()
    return AppointmentRead.model_validate(appt)


@router.post(
    "/{appointment_id}/complete",
    response_model=AppointmentRead,
    dependencies=[Depends(require_permission("appointment:write"))],
)
async def complete(
    appointment_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> AppointmentRead:
    appt = await appointment_service.complete_appointment(
        db, organization_id=current_user.organization_id, appointment_id=appointment_id
    )
    await db.commit()
    return AppointmentRead.model_validate(appt)


@router.post(
    "/{appointment_id}/cancel",
    response_model=AppointmentRead,
    dependencies=[Depends(require_permission("appointment:cancel"))],
)
async def cancel(
    appointment_id: str,
    payload: AppointmentCancel,
    current_user: CurrentUser,
    db: DBSession,
) -> AppointmentRead:
    appt = await appointment_service.cancel_appointment(
        db,
        organization_id=current_user.organization_id,
        appointment_id=appointment_id,
        actor_user_id=current_user.id,
        reason=payload.reason,
    )
    await db.commit()
    return AppointmentRead.model_validate(appt)


@router.post(
    "/{appointment_id}/no-show",
    response_model=AppointmentRead,
    dependencies=[Depends(require_permission("appointment:write"))],
)
async def no_show(
    appointment_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> AppointmentRead:
    appt = await appointment_service.mark_no_show(
        db, organization_id=current_user.organization_id, appointment_id=appointment_id
    )
    await db.commit()
    return AppointmentRead.model_validate(appt)
