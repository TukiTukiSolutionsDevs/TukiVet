"""Servicios de encuentro clínico (visita) + SOAP + signos vitales."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models import (
    Customer,
    Encounter,
    EncounterAmendment,
    Pet,
    SoapNote,
    VitalSign,
)
from app.schemas.encounter import (
    EncounterAmendRequest,
    EncounterCreate,
    EncounterUpdate,
    SoapNoteUpdate,
    VitalSignCreate,
)


async def get_encounter(
    db: AsyncSession, *, organization_id: str, encounter_id: str
) -> Encounter:
    encounter = await db.get(Encounter, encounter_id)
    if encounter is None or encounter.organization_id != organization_id:
        raise NotFoundError("Encuentro no encontrado")
    return encounter


async def get_encounter_with_relations(
    db: AsyncSession, *, organization_id: str, encounter_id: str
) -> Encounter:
    result = await db.execute(
        select(Encounter)
        .where(Encounter.id == encounter_id, Encounter.organization_id == organization_id)
        .options(
            selectinload(Encounter.soap_note),
            selectinload(Encounter.vital_signs),
        )
    )
    encounter = result.scalar_one_or_none()
    if encounter is None:
        raise NotFoundError("Encuentro no encontrado")
    return encounter


async def list_encounters(
    db: AsyncSession,
    *,
    organization_id: str,
    pet_id: str | None = None,
    customer_id: str | None = None,
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Encounter], int]:
    stmt = select(Encounter).where(Encounter.organization_id == organization_id)
    count_stmt = select(func.count(Encounter.id)).where(
        Encounter.organization_id == organization_id
    )
    if pet_id:
        stmt = stmt.where(Encounter.pet_id == pet_id)
        count_stmt = count_stmt.where(Encounter.pet_id == pet_id)
    if customer_id:
        stmt = stmt.where(Encounter.customer_id == customer_id)
        count_stmt = count_stmt.where(Encounter.customer_id == customer_id)
    if status_filter:
        stmt = stmt.where(Encounter.status == status_filter)
        count_stmt = count_stmt.where(Encounter.status == status_filter)

    stmt = stmt.order_by(Encounter.started_at.desc()).offset((page - 1) * page_size).limit(page_size)
    total = (await db.execute(count_stmt)).scalar_one()
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows), total


async def create_encounter(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: EncounterCreate,
    veterinarian_id_fallback: str | None,
) -> Encounter:
    # Verifica pet
    pet = await db.get(Pet, payload.pet_id)
    if pet is None or pet.organization_id != organization_id or pet.deleted_at is not None:
        raise NotFoundError("Mascota no encontrada")
    # Verifica customer
    customer = await db.get(Customer, payload.customer_id)
    if (
        customer is None
        or customer.organization_id != organization_id
        or customer.deleted_at is not None
    ):
        raise NotFoundError("Cliente no encontrado")

    encounter = Encounter(
        organization_id=organization_id,
        pet_id=payload.pet_id,
        customer_id=payload.customer_id,
        veterinarian_id=payload.veterinarian_id or veterinarian_id_fallback,
        type=payload.type,
        chief_complaint=payload.chief_complaint,
        status="draft",
        started_at=payload.started_at or datetime.now(tz=timezone.utc),
    )
    db.add(encounter)
    await db.flush()

    # Crea un SOAP vacío asociado
    db.add(SoapNote(encounter_id=encounter.id))
    await db.flush()

    return encounter


async def update_encounter(
    db: AsyncSession,
    *,
    organization_id: str,
    encounter_id: str,
    payload: EncounterUpdate,
) -> Encounter:
    encounter = await get_encounter(db, organization_id=organization_id, encounter_id=encounter_id)
    if encounter.is_closed:
        raise ConflictError("No se puede modificar un encuentro cerrado. Usa /amend")

    data = payload.model_dump(exclude_unset=True)
    if data:
        for field, value in data.items():
            setattr(encounter, field, value)
        if encounter.status == "draft":
            encounter.status = "in_progress"
        await db.flush()
    return encounter


async def get_soap(db: AsyncSession, encounter_id: str) -> SoapNote:
    result = await db.execute(
        select(SoapNote).where(SoapNote.encounter_id == encounter_id)
    )
    soap = result.scalar_one_or_none()
    if soap is None:
        raise NotFoundError("SOAP no encontrado")
    return soap


async def update_soap(
    db: AsyncSession,
    *,
    organization_id: str,
    encounter_id: str,
    payload: SoapNoteUpdate,
) -> SoapNote:
    encounter = await get_encounter(db, organization_id=organization_id, encounter_id=encounter_id)
    if encounter.is_closed:
        raise ConflictError("SOAP cerrado, usar /amend")

    soap = await get_soap(db, encounter_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is not None:
            setattr(soap, field, value)
    if encounter.status == "draft":
        encounter.status = "in_progress"
    await db.flush()
    return soap


async def close_encounter(
    db: AsyncSession,
    *,
    organization_id: str,
    encounter_id: str,
) -> Encounter:
    encounter = await get_encounter(db, organization_id=organization_id, encounter_id=encounter_id)
    if encounter.is_closed:
        raise ConflictError("El encuentro ya está cerrado")
    encounter.status = "closed"
    encounter.closed_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return encounter


async def amend_encounter(
    db: AsyncSession,
    *,
    organization_id: str,
    encounter_id: str,
    payload: EncounterAmendRequest,
    actor_user_id: str,
) -> Encounter:
    encounter = await get_encounter(db, organization_id=organization_id, encounter_id=encounter_id)
    if not encounter.is_closed:
        raise ConflictError("Solo se enmiendan encuentros cerrados")

    soap = await get_soap(db, encounter_id)
    before_snapshot: dict[str, Any] = {
        "subjective": soap.subjective,
        "objective": soap.objective,
        "assessment": soap.assessment,
        "plan": soap.plan,
    }
    soap_update = payload.soap_update.model_dump(exclude_unset=True)
    for field, value in soap_update.items():
        if value is not None:
            setattr(soap, field, value)
    soap.version = (soap.version or 1) + 1

    after_snapshot: dict[str, Any] = {
        "subjective": soap.subjective,
        "objective": soap.objective,
        "assessment": soap.assessment,
        "plan": soap.plan,
    }
    db.add(
        EncounterAmendment(
            encounter_id=encounter.id,
            amended_by_user_id=actor_user_id,
            reason=payload.reason,
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            created_at=datetime.now(tz=timezone.utc),
        )
    )
    encounter.status = "amended"
    await db.flush()
    return encounter


async def add_vital_sign(
    db: AsyncSession,
    *,
    organization_id: str,
    encounter_id: str,
    payload: VitalSignCreate,
    recorded_by: str | None,
) -> VitalSign:
    encounter = await get_encounter(db, organization_id=organization_id, encounter_id=encounter_id)
    if encounter.is_closed:
        raise ConflictError("Encuentro cerrado, no se aceptan más signos vitales")

    vital = VitalSign(
        encounter_id=encounter.id,
        measured_at=payload.measured_at or datetime.now(tz=timezone.utc),
        temperature_c=payload.temperature_c,
        heart_rate_bpm=payload.heart_rate_bpm,
        respiratory_rate=payload.respiratory_rate,
        weight_kg=payload.weight_kg,
        body_condition_score=payload.body_condition_score,
        mucous_membranes=payload.mucous_membranes,
        capillary_refill_seconds=payload.capillary_refill_seconds,
        hydration_status=payload.hydration_status,
        pain_score=payload.pain_score,
        notes=payload.notes,
        recorded_by=recorded_by,
    )
    db.add(vital)
    if encounter.status == "draft":
        encounter.status = "in_progress"
    await db.flush()
    return vital


async def list_vital_signs(
    db: AsyncSession, *, organization_id: str, encounter_id: str
) -> list[VitalSign]:
    encounter = await get_encounter(db, organization_id=organization_id, encounter_id=encounter_id)
    result = await db.execute(
        select(VitalSign)
        .where(VitalSign.encounter_id == encounter.id)
        .order_by(VitalSign.measured_at.desc())
    )
    return list(result.scalars().all())
