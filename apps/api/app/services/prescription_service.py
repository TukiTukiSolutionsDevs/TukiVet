"""Servicios para recetas: emisión, dispensación, cálculo de dosis."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models import (
    InventoryLot,
    Pet,
    Prescription,
    PrescriptionItem,
    Product,
)
from app.schemas.prescription import (
    DoseCalculationRequest,
    DoseCalculationResponse,
    PrescriptionCreate,
)
from app.services import inventory_service


def calculate_dose(req: DoseCalculationRequest) -> DoseCalculationResponse:
    """Dosis total (mg) y unidades del producto necesarias por administración."""
    total_dose_mg = req.weight_kg * req.dose_mg_per_kg
    units = total_dose_mg / req.presentation_mg_per_unit
    return DoseCalculationResponse(
        weight_kg=req.weight_kg,
        dose_mg_per_kg=req.dose_mg_per_kg,
        total_dose_mg=total_dose_mg,
        presentation_mg_per_unit=req.presentation_mg_per_unit,
        units_per_dose=units,
    )


async def create_prescription(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: PrescriptionCreate,
    prescribed_by: str,
) -> Prescription:
    pet = await db.get(Pet, payload.pet_id)
    if pet is None or pet.organization_id != organization_id or pet.deleted_at is not None:
        raise NotFoundError("Mascota no encontrada")

    prescription = Prescription(
        organization_id=organization_id,
        encounter_id=payload.encounter_id,
        pet_id=pet.id,
        prescribed_by=prescribed_by,
        issued_at=datetime.now(tz=timezone.utc),
        diagnosis=payload.diagnosis,
        notes=payload.notes,
        status="issued",
    )
    db.add(prescription)
    await db.flush()

    for line in payload.items:
        if line.product_id:
            product = await db.get(Product, line.product_id)
            if (
                product is None
                or product.organization_id != organization_id
                or product.deleted_at is not None
            ):
                raise NotFoundError(f"Producto {line.product_id} no encontrado")

        # Si dose y peso de la mascota disponibles, calcula total_dose
        total_dose_mg = line.total_dose_mg
        if (
            total_dose_mg is None
            and line.dose_mg_per_kg
            and pet.current_weight_kg
        ):
            total_dose_mg = pet.current_weight_kg * line.dose_mg_per_kg

        item = PrescriptionItem(
            prescription_id=prescription.id,
            product_id=line.product_id,
            medication_name=line.medication_name,
            active_ingredient=line.active_ingredient,
            dose_mg_per_kg=line.dose_mg_per_kg,
            total_dose_mg=total_dose_mg,
            presentation=line.presentation,
            quantity=line.quantity,
            frequency=line.frequency,
            duration_days=line.duration_days,
            route=line.route,
            instructions=line.instructions,
            is_controlled=line.is_controlled,
        )
        db.add(item)
    await db.flush()
    return prescription


async def get_prescription(
    db: AsyncSession, *, organization_id: str, prescription_id: str
) -> Prescription:
    result = await db.execute(
        select(Prescription)
        .where(
            Prescription.id == prescription_id,
            Prescription.organization_id == organization_id,
        )
        .options(selectinload(Prescription.items))
    )
    presc = result.scalar_one_or_none()
    if presc is None:
        raise NotFoundError("Receta no encontrada")
    return presc


async def list_prescriptions_for_pet(
    db: AsyncSession,
    *,
    organization_id: str,
    pet_id: str,
) -> list[Prescription]:
    result = await db.execute(
        select(Prescription)
        .where(
            Prescription.organization_id == organization_id,
            Prescription.pet_id == pet_id,
        )
        .options(selectinload(Prescription.items))
        .order_by(Prescription.issued_at.desc())
    )
    return list(result.scalars().all())


async def dispense_item(
    db: AsyncSession,
    *,
    organization_id: str,
    prescription_id: str,
    item_id: str,
    quantity: Decimal,
    witness_user_id: str | None,
    performed_by: str,
) -> PrescriptionItem:
    presc = await get_prescription(
        db, organization_id=organization_id, prescription_id=prescription_id
    )
    if presc.status == "void":
        raise ConflictError("Receta anulada")

    item = next((i for i in presc.items if i.id == item_id), None)
    if item is None:
        raise NotFoundError("Línea de receta no encontrada")

    if item.dispensed_qty + quantity > item.quantity:
        raise ConflictError(
            f"La dispensación excede lo recetado: {item.quantity}"
        )

    if item.is_controlled and witness_user_id is None:
        raise ConflictError("Sustancia controlada: requiere testigo (witness_user_id)")

    # Si está vinculado a un producto, descuenta stock via FIFO
    if item.product_id:
        movements = await inventory_service.dispense_fifo(
            db,
            organization_id=organization_id,
            product_id=item.product_id,
            quantity=quantity,
            reference_type="prescription_item",
            reference_id=item.id,
            performed_by=performed_by,
            witness_user_id=witness_user_id,
        )
        # Guarda el primer lote tocado (informativo)
        if movements and movements[0].lot_id:
            item.lot_id = movements[0].lot_id

    item.dispensed_qty += quantity
    item.dispensed_at = datetime.now(tz=timezone.utc)
    item.dispensed_by = performed_by
    item.witness_user_id = witness_user_id

    # Actualiza status de la receta
    all_full = all(it.dispensed_qty >= it.quantity for it in presc.items)
    any_partial = any(it.dispensed_qty > 0 for it in presc.items)
    if all_full:
        presc.status = "dispensed_full"
    elif any_partial:
        presc.status = "dispensed_partial"

    await db.flush()
    return item


async def void_prescription(
    db: AsyncSession, *, organization_id: str, prescription_id: str
) -> Prescription:
    presc = await get_prescription(
        db, organization_id=organization_id, prescription_id=prescription_id
    )
    if presc.status == "void":
        return presc
    presc.status = "void"
    await db.flush()
    return presc


# Lot helpers — para mostrar al frontend de qué lote salió la dispensación
async def get_lot_label(db: AsyncSession, lot_id: str) -> str:
    lot = await db.get(InventoryLot, lot_id)
    return lot.lot_number if lot else ""
