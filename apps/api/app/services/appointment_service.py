"""Servicios de citas y disponibilidad."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.models import Appointment, Customer, Pet, Room, TimeOff, User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    RoomCreate,
)


async def _conflict_exists(
    db: AsyncSession,
    *,
    organization_id: str,
    starts_at: datetime,
    ends_at: datetime,
    veterinarian_id: str | None = None,
    room_id: str | None = None,
    exclude_appointment_id: str | None = None,
) -> str | None:
    """True si hay solapamiento con otra cita activa. Devuelve el id si existe."""
    conditions = [
        Appointment.organization_id == organization_id,
        Appointment.status.in_(["scheduled", "confirmed", "in_progress"]),
        Appointment.starts_at < ends_at,
        Appointment.ends_at > starts_at,
    ]
    if veterinarian_id:
        conditions.append(Appointment.veterinarian_id == veterinarian_id)
    if room_id:
        conditions.append(Appointment.room_id == room_id)
    if exclude_appointment_id:
        conditions.append(Appointment.id != exclude_appointment_id)

    stmt = select(Appointment.id).where(and_(*conditions)).limit(1)
    return (await db.execute(stmt)).scalar_one_or_none()


async def _time_off_blocks(
    db: AsyncSession,
    *,
    organization_id: str,
    starts_at: datetime,
    ends_at: datetime,
    user_id: str | None = None,
    room_id: str | None = None,
) -> bool:
    conditions = [
        TimeOff.organization_id == organization_id,
        TimeOff.starts_at < ends_at,
        TimeOff.ends_at > starts_at,
    ]
    if user_id and room_id:
        conditions.append(or_(TimeOff.user_id == user_id, TimeOff.room_id == room_id))
    elif user_id:
        conditions.append(TimeOff.user_id == user_id)
    elif room_id:
        conditions.append(TimeOff.room_id == room_id)
    stmt = select(TimeOff.id).where(and_(*conditions)).limit(1)
    return (await db.execute(stmt)).scalar_one_or_none() is not None


async def create_appointment(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: AppointmentCreate,
) -> Appointment:
    customer = await db.get(Customer, payload.customer_id)
    if (
        customer is None
        or customer.organization_id != organization_id
        or customer.deleted_at is not None
    ):
        raise NotFoundError("Cliente no encontrado")

    if payload.pet_id:
        pet = await db.get(Pet, payload.pet_id)
        if (
            pet is None
            or pet.organization_id != organization_id
            or pet.deleted_at is not None
        ):
            raise NotFoundError("Mascota no encontrada")

    vet = await db.get(User, payload.veterinarian_id)
    if vet is None or vet.organization_id != organization_id:
        raise NotFoundError("Veterinario/a no encontrado")

    if payload.room_id:
        room = await db.get(Room, payload.room_id)
        if room is None or room.organization_id != organization_id or room.deleted_at is not None:
            raise NotFoundError("Sala no encontrada")

    conflict_id = await _conflict_exists(
        db,
        organization_id=organization_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        veterinarian_id=payload.veterinarian_id,
        room_id=payload.room_id,
    )
    if conflict_id:
        raise ConflictError(f"Conflicto de horario con cita {conflict_id}")

    if await _time_off_blocks(
        db,
        organization_id=organization_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        user_id=payload.veterinarian_id,
        room_id=payload.room_id,
    ):
        raise ConflictError("Bloqueo de agenda (TimeOff) cubre ese horario")

    appt = Appointment(
        organization_id=organization_id,
        pet_id=payload.pet_id,
        customer_id=payload.customer_id,
        veterinarian_id=payload.veterinarian_id,
        room_id=payload.room_id,
        type=payload.type,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        notes=payload.notes,
        source=payload.source,
        status="scheduled",
    )
    db.add(appt)
    await db.flush()
    return appt


async def get_appointment(
    db: AsyncSession, *, organization_id: str, appointment_id: str
) -> Appointment:
    appt = await db.get(Appointment, appointment_id)
    if appt is None or appt.organization_id != organization_id:
        raise NotFoundError("Cita no encontrada")
    return appt


async def list_appointments(
    db: AsyncSession,
    *,
    organization_id: str,
    starts_at_from: datetime | None = None,
    starts_at_to: datetime | None = None,
    veterinarian_id: str | None = None,
    pet_id: str | None = None,
    customer_id: str | None = None,
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Appointment], int]:
    stmt = select(Appointment).where(Appointment.organization_id == organization_id)
    count_stmt = select(func.count(Appointment.id)).where(
        Appointment.organization_id == organization_id
    )
    if starts_at_from:
        stmt = stmt.where(Appointment.starts_at >= starts_at_from)
        count_stmt = count_stmt.where(Appointment.starts_at >= starts_at_from)
    if starts_at_to:
        stmt = stmt.where(Appointment.starts_at <= starts_at_to)
        count_stmt = count_stmt.where(Appointment.starts_at <= starts_at_to)
    if veterinarian_id:
        stmt = stmt.where(Appointment.veterinarian_id == veterinarian_id)
        count_stmt = count_stmt.where(Appointment.veterinarian_id == veterinarian_id)
    if pet_id:
        stmt = stmt.where(Appointment.pet_id == pet_id)
        count_stmt = count_stmt.where(Appointment.pet_id == pet_id)
    if customer_id:
        stmt = stmt.where(Appointment.customer_id == customer_id)
        count_stmt = count_stmt.where(Appointment.customer_id == customer_id)
    if status_filter:
        stmt = stmt.where(Appointment.status == status_filter)
        count_stmt = count_stmt.where(Appointment.status == status_filter)

    stmt = (
        stmt.order_by(Appointment.starts_at.asc()).offset((page - 1) * page_size).limit(page_size)
    )
    total = (await db.execute(count_stmt)).scalar_one()
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows), total


async def update_appointment(
    db: AsyncSession,
    *,
    organization_id: str,
    appointment_id: str,
    payload: AppointmentUpdate,
) -> Appointment:
    appt = await get_appointment(
        db, organization_id=organization_id, appointment_id=appointment_id
    )
    if appt.status in ("completed", "cancelled", "no_show"):
        raise ConflictError(f"No se puede modificar cita en estado '{appt.status}'")

    data = payload.model_dump(exclude_unset=True)
    if "starts_at" in data or "ends_at" in data:
        starts_at = data.get("starts_at", appt.starts_at)
        ends_at = data.get("ends_at", appt.ends_at)
        if ends_at <= starts_at:
            raise ConflictError("ends_at debe ser posterior a starts_at")
        vet_id = data.get("veterinarian_id", appt.veterinarian_id)
        room_id = data.get("room_id", appt.room_id)
        conflict_id = await _conflict_exists(
            db,
            organization_id=organization_id,
            starts_at=starts_at,
            ends_at=ends_at,
            veterinarian_id=vet_id,
            room_id=room_id,
            exclude_appointment_id=appt.id,
        )
        if conflict_id:
            raise ConflictError(f"Conflicto de horario con cita {conflict_id}")

    for f, v in data.items():
        setattr(appt, f, v)
    await db.flush()
    return appt


async def confirm_appointment(
    db: AsyncSession, *, organization_id: str, appointment_id: str
) -> Appointment:
    appt = await get_appointment(
        db, organization_id=organization_id, appointment_id=appointment_id
    )
    if appt.status != "scheduled":
        raise ConflictError(f"Solo se confirman citas en 'scheduled' (actual: {appt.status})")
    appt.status = "confirmed"
    appt.confirmed_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return appt


async def mark_in_progress(
    db: AsyncSession, *, organization_id: str, appointment_id: str
) -> Appointment:
    appt = await get_appointment(
        db, organization_id=organization_id, appointment_id=appointment_id
    )
    if appt.status not in ("scheduled", "confirmed"):
        raise ConflictError(f"No se puede pasar a in_progress desde '{appt.status}'")
    appt.status = "in_progress"
    await db.flush()
    return appt


async def complete_appointment(
    db: AsyncSession, *, organization_id: str, appointment_id: str
) -> Appointment:
    appt = await get_appointment(
        db, organization_id=organization_id, appointment_id=appointment_id
    )
    if appt.status not in ("in_progress", "confirmed", "scheduled"):
        raise ConflictError(f"Solo se completan citas activas (actual: {appt.status})")
    appt.status = "completed"
    await db.flush()
    return appt


async def cancel_appointment(
    db: AsyncSession,
    *,
    organization_id: str,
    appointment_id: str,
    actor_user_id: str,
    reason: str | None,
) -> Appointment:
    appt = await get_appointment(
        db, organization_id=organization_id, appointment_id=appointment_id
    )
    if appt.status in ("completed", "cancelled"):
        raise ConflictError(f"La cita ya está en estado '{appt.status}'")
    appt.status = "cancelled"
    appt.cancelled_at = datetime.now(tz=timezone.utc)
    appt.cancelled_by_user_id = actor_user_id
    appt.cancel_reason = reason
    await db.flush()
    return appt


async def mark_no_show(
    db: AsyncSession, *, organization_id: str, appointment_id: str
) -> Appointment:
    appt = await get_appointment(
        db, organization_id=organization_id, appointment_id=appointment_id
    )
    if appt.status not in ("scheduled", "confirmed"):
        raise ConflictError(f"No se puede marcar no-show desde '{appt.status}'")
    appt.status = "no_show"
    await db.flush()
    return appt


# Rooms
async def list_rooms(
    db: AsyncSession, *, organization_id: str, active_only: bool = True
) -> list[Room]:
    stmt = select(Room).where(
        Room.organization_id == organization_id, Room.deleted_at.is_(None)
    )
    if active_only:
        stmt = stmt.where(Room.active.is_(True))
    stmt = stmt.order_by(Room.name.asc())
    return list((await db.execute(stmt)).scalars().all())


async def create_room(
    db: AsyncSession, *, organization_id: str, payload: RoomCreate
) -> Room:
    room = Room(
        organization_id=organization_id,
        branch_id=payload.branch_id,
        name=payload.name,
        type=payload.type,
        active=True,
    )
    db.add(room)
    await db.flush()
    return room
