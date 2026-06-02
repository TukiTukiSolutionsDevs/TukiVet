"""Servicios de vacunación: catálogo + administraciones + due-list."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.models import Customer, Pet, PetOwner, VaccineAdministration, VaccineCatalog
from app.schemas.vaccine import (
    VaccineAdministrationCreate,
    VaccineCatalogCreate,
    VaccineCatalogUpdate,
    VaccineDueRow,
)


# ------------------- Catálogo -------------------


async def list_catalog(
    db: AsyncSession,
    *,
    organization_id: str,
    species: str | None = None,
    active_only: bool = True,
) -> list[VaccineCatalog]:
    stmt = select(VaccineCatalog).where(
        VaccineCatalog.organization_id == organization_id,
        VaccineCatalog.deleted_at.is_(None),
    )
    if species and species != "all":
        # Devuelve la específica de la especie + las marcadas como 'all'
        stmt = stmt.where(VaccineCatalog.species.in_([species, "all"]))
    if active_only:
        stmt = stmt.where(VaccineCatalog.active.is_(True))
    stmt = stmt.order_by(VaccineCatalog.species.asc(), VaccineCatalog.name.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_catalog_entry(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: VaccineCatalogCreate,
) -> VaccineCatalog:
    entry = VaccineCatalog(
        organization_id=organization_id,
        name=payload.name,
        species=payload.species,
        manufacturer=payload.manufacturer,
        protects_against=payload.protects_against,
        default_booster_interval_days=payload.default_booster_interval_days,
        is_rabies=payload.is_rabies,
        active=payload.active,
    )
    db.add(entry)
    await db.flush()
    return entry


async def update_catalog_entry(
    db: AsyncSession,
    *,
    organization_id: str,
    vaccine_id: str,
    payload: VaccineCatalogUpdate,
) -> VaccineCatalog:
    entry = await db.get(VaccineCatalog, vaccine_id)
    if (
        entry is None
        or entry.organization_id != organization_id
        or entry.deleted_at is not None
    ):
        raise NotFoundError("Vacuna no encontrada en el catálogo")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(entry, field, value)
    await db.flush()
    return entry


# ------------------- Administraciones -------------------


async def record_administration(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: VaccineAdministrationCreate,
    administered_by: str | None,
) -> VaccineAdministration:
    pet = await db.get(Pet, payload.pet_id)
    if pet is None or pet.organization_id != organization_id or pet.deleted_at is not None:
        raise NotFoundError("Mascota no encontrada")

    vaccine = await db.get(VaccineCatalog, payload.vaccine_id)
    if (
        vaccine is None
        or vaccine.organization_id != organization_id
        or vaccine.deleted_at is not None
    ):
        raise NotFoundError("Vacuna no encontrada en el catálogo")

    administered_at = payload.administered_at or datetime.now(tz=timezone.utc)

    # Calcula next_dose si no vino explícito y tenemos default_booster_interval_days
    next_due = payload.next_dose_due_date
    if next_due is None and vaccine.default_booster_interval_days:
        next_due = (administered_at + timedelta(days=vaccine.default_booster_interval_days)).date()

    admin = VaccineAdministration(
        organization_id=organization_id,
        pet_id=pet.id,
        vaccine_id=vaccine.id,
        encounter_id=payload.encounter_id,
        administered_by=administered_by,
        administered_at=administered_at,
        lot_number=payload.lot_number,
        expiry_date=payload.expiry_date,
        site_of_application=payload.site_of_application,
        dose_number=payload.dose_number,
        next_dose_due_date=next_due,
        certificate_number=payload.certificate_number,
        notes=payload.notes,
        status="administered",
    )
    db.add(admin)
    await db.flush()
    return admin


async def list_administrations_for_pet(
    db: AsyncSession,
    *,
    organization_id: str,
    pet_id: str,
) -> list[tuple[VaccineAdministration, str]]:
    pet = await db.get(Pet, pet_id)
    if pet is None or pet.organization_id != organization_id or pet.deleted_at is not None:
        raise NotFoundError("Mascota no encontrada")

    result = await db.execute(
        select(VaccineAdministration, VaccineCatalog.name)
        .join(VaccineCatalog, VaccineCatalog.id == VaccineAdministration.vaccine_id)
        .where(VaccineAdministration.pet_id == pet_id)
        .order_by(VaccineAdministration.administered_at.desc())
    )
    return [(admin, name) for admin, name in result.all()]


async def list_due_vaccines(
    db: AsyncSession,
    *,
    organization_id: str,
    days_window: int = 30,
) -> list[VaccineDueRow]:
    """Lista mascotas con vacunas vencidas o por vencer en los próximos N días.

    Para cada (pet, vaccine) trae el último registro con next_dose_due_date <= hoy + N.
    """
    cutoff = date.today() + timedelta(days=days_window)

    stmt = (
        select(
            Pet.id,
            Pet.name,
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            Customer.business_name,
            Customer.phone_primary,
            VaccineCatalog.id,
            VaccineCatalog.name,
            VaccineAdministration.administered_at,
            VaccineAdministration.next_dose_due_date,
        )
        .select_from(VaccineAdministration)
        .join(VaccineCatalog, VaccineCatalog.id == VaccineAdministration.vaccine_id)
        .join(Pet, Pet.id == VaccineAdministration.pet_id)
        .join(PetOwner, PetOwner.pet_id == Pet.id)
        .join(Customer, Customer.id == PetOwner.customer_id)
        .where(
            VaccineAdministration.organization_id == organization_id,
            VaccineAdministration.next_dose_due_date.isnot(None),
            VaccineAdministration.next_dose_due_date <= cutoff,
            Pet.deleted_at.is_(None),
            Pet.status == "active",
            Customer.deleted_at.is_(None),
            PetOwner.role == "primary",
        )
        .order_by(VaccineAdministration.next_dose_due_date.asc())
    )

    result = await db.execute(stmt)
    today = date.today()
    out: list[VaccineDueRow] = []
    for row in result.all():
        (
            pet_id,
            pet_name,
            customer_id,
            first_name,
            last_name,
            business_name,
            phone,
            vaccine_id,
            vaccine_name,
            administered_at,
            next_due,
        ) = row
        display = business_name if business_name else f"{first_name} {last_name}".strip()
        days_overdue = (today - next_due).days  # negativo si aún no vence
        out.append(
            VaccineDueRow(
                pet_id=pet_id,
                pet_name=pet_name,
                customer_id=customer_id,
                customer_name=display,
                customer_phone=phone,
                vaccine_id=vaccine_id,
                vaccine_name=vaccine_name,
                last_administered_at=administered_at,
                next_dose_due_date=next_due,
                days_overdue=days_overdue,
            )
        )
    return out
