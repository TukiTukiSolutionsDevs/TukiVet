"""Servicios para mascotas."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.models import Customer, Pet, PetOwner, PetWeightHistory
from app.schemas.pet import PetCreate, PetUpdate, PetWeightCreate


async def get_pet(db: AsyncSession, *, organization_id: str, pet_id: str) -> Pet:
    pet = await db.get(Pet, pet_id)
    if (
        pet is None
        or pet.organization_id != organization_id
        or pet.deleted_at is not None
    ):
        raise NotFoundError("Mascota no encontrada")
    return pet


async def list_pets(
    db: AsyncSession,
    *,
    organization_id: str,
    q: str | None = None,
    species: str | None = None,
    customer_id: str | None = None,
    microchip: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Pet], int]:
    stmt = select(Pet).where(
        Pet.organization_id == organization_id,
        Pet.deleted_at.is_(None),
    )
    count_stmt = select(func.count(Pet.id)).where(
        Pet.organization_id == organization_id,
        Pet.deleted_at.is_(None),
    )
    if species:
        stmt = stmt.where(Pet.species == species)
        count_stmt = count_stmt.where(Pet.species == species)
    if microchip:
        stmt = stmt.where(Pet.microchip == microchip.strip())
        count_stmt = count_stmt.where(Pet.microchip == microchip.strip())
    if customer_id:
        stmt = stmt.join(PetOwner, PetOwner.pet_id == Pet.id).where(
            PetOwner.customer_id == customer_id
        )
        count_stmt = count_stmt.join(PetOwner, PetOwner.pet_id == Pet.id).where(
            PetOwner.customer_id == customer_id
        )
    if q:
        like = f"%{q.lower()}%"
        cond = or_(
            func.lower(Pet.name).like(like),
            func.lower(func.coalesce(Pet.breed_name, "")).like(like),
            func.lower(func.coalesce(Pet.color, "")).like(like),
            Pet.microchip.like(f"%{q}%"),
        )
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    stmt = stmt.order_by(Pet.name.asc()).offset((page - 1) * page_size).limit(page_size)
    total = (await db.execute(count_stmt)).scalar_one()
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows), total


async def create_pet(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: PetCreate,
) -> Pet:
    # Verifica que el customer exista en la misma org
    customer = await db.get(Customer, payload.customer_id)
    if (
        customer is None
        or customer.organization_id != organization_id
        or customer.deleted_at is not None
    ):
        raise NotFoundError("Cliente (tutor) no encontrado")

    if payload.microchip:
        chip_check = await db.execute(
            select(Pet).where(
                Pet.microchip == payload.microchip,
                Pet.deleted_at.is_(None),
            )
        )
        if chip_check.scalar_one_or_none() is not None:
            raise ConflictError("Ya existe una mascota con ese microchip")

    pet = Pet(
        organization_id=organization_id,
        name=payload.name,
        species=payload.species,
        breed_id=payload.breed_id,
        breed_name=payload.breed_name,
        sex=payload.sex,
        birth_date=payload.birth_date,
        birth_date_estimated=payload.birth_date_estimated,
        color=payload.color,
        distinguishing_marks=payload.distinguishing_marks,
        microchip=payload.microchip,
        tattoo=payload.tattoo,
        sterilized=payload.sterilized,
        sterilization_date=payload.sterilization_date,
        alerts=payload.alerts,
        chronic_conditions=payload.chronic_conditions,
        photo_url=payload.photo_url,
    )
    db.add(pet)
    await db.flush()
    db.add(PetOwner(customer_id=customer.id, pet_id=pet.id, role="primary"))
    await db.flush()
    return pet


async def update_pet(
    db: AsyncSession,
    *,
    organization_id: str,
    pet_id: str,
    payload: PetUpdate,
) -> Pet:
    pet = await get_pet(db, organization_id=organization_id, pet_id=pet_id)
    data = payload.model_dump(exclude_unset=True)
    if "microchip" in data and data["microchip"]:
        # Verifica unicidad si cambia el chip
        if data["microchip"] != pet.microchip:
            chip_check = await db.execute(
                select(Pet).where(
                    Pet.microchip == data["microchip"],
                    Pet.id != pet.id,
                    Pet.deleted_at.is_(None),
                )
            )
            if chip_check.scalar_one_or_none() is not None:
                raise ConflictError("Ya existe otra mascota con ese microchip")
    for field, value in data.items():
        setattr(pet, field, value)
    await db.flush()
    return pet


async def soft_delete_pet(
    db: AsyncSession, *, organization_id: str, pet_id: str
) -> Pet:
    pet = await get_pet(db, organization_id=organization_id, pet_id=pet_id)
    pet.deleted_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return pet


async def record_weight(
    db: AsyncSession,
    *,
    organization_id: str,
    pet_id: str,
    payload: PetWeightCreate,
    recorded_by: str | None,
) -> PetWeightHistory:
    pet = await get_pet(db, organization_id=organization_id, pet_id=pet_id)
    weight = PetWeightHistory(
        pet_id=pet.id,
        weight_kg=Decimal(payload.weight_kg),
        measured_at=payload.measured_at or datetime.now(tz=timezone.utc),
        recorded_by=recorded_by,
        notes=payload.notes,
    )
    db.add(weight)
    # Actualiza el snapshot en el pet si es la medición más reciente.
    if pet.current_weight_at is None or weight.measured_at >= pet.current_weight_at:
        pet.current_weight_kg = weight.weight_kg
        pet.current_weight_at = weight.measured_at
    await db.flush()
    return weight


async def list_weights(
    db: AsyncSession,
    *,
    organization_id: str,
    pet_id: str,
) -> list[PetWeightHistory]:
    pet = await get_pet(db, organization_id=organization_id, pet_id=pet_id)
    result = await db.execute(
        select(PetWeightHistory)
        .where(PetWeightHistory.pet_id == pet.id)
        .order_by(PetWeightHistory.measured_at.desc())
    )
    return list(result.scalars().all())


async def list_pets_for_customer(
    db: AsyncSession,
    *,
    organization_id: str,
    customer_id: str,
) -> list[Pet]:
    customer = await db.get(Customer, customer_id)
    if (
        customer is None
        or customer.organization_id != organization_id
        or customer.deleted_at is not None
    ):
        raise NotFoundError("Cliente no encontrado")
    result = await db.execute(
        select(Pet)
        .join(PetOwner, PetOwner.pet_id == Pet.id)
        .where(
            PetOwner.customer_id == customer_id,
            Pet.deleted_at.is_(None),
        )
        .order_by(Pet.name.asc())
    )
    return list(result.scalars().all())
