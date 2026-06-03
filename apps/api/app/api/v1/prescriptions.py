"""Endpoints de recetas."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.schemas.prescription import (
    DispenseRequest,
    DoseCalculationRequest,
    DoseCalculationResponse,
    PrescriptionCreate,
    PrescriptionItemRead,
    PrescriptionRead,
)
from app.services import prescription_service

router = APIRouter()


@router.post(
    "/calculate-dose",
    response_model=DoseCalculationResponse,
    summary="Calcular dosis total y unidades por administración",
    dependencies=[Depends(require_permission("prescription:write"))],
)
async def calculate_dose(payload: DoseCalculationRequest) -> DoseCalculationResponse:
    return prescription_service.calculate_dose(payload)


@router.post(
    "",
    response_model=PrescriptionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir receta",
    dependencies=[Depends(require_permission("prescription:write"))],
)
async def create_prescription(
    payload: PrescriptionCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> PrescriptionRead:
    presc = await prescription_service.create_prescription(
        db,
        organization_id=current_user.organization_id,
        payload=payload,
        prescribed_by=current_user.id,
    )
    await db.commit()
    # Re-fetch con items para serializar
    presc = await prescription_service.get_prescription(
        db, organization_id=current_user.organization_id, prescription_id=presc.id
    )
    return PrescriptionRead.model_validate(presc)


@router.get(
    "/{prescription_id}",
    response_model=PrescriptionRead,
    dependencies=[Depends(require_permission("prescription:read"))],
)
async def get_prescription(
    prescription_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> PrescriptionRead:
    presc = await prescription_service.get_prescription(
        db,
        organization_id=current_user.organization_id,
        prescription_id=prescription_id,
    )
    return PrescriptionRead.model_validate(presc)


@router.get(
    "/pets/{pet_id}/prescriptions",
    response_model=list[PrescriptionRead],
    summary="Recetas históricas de una mascota",
    dependencies=[Depends(require_permission("prescription:read"))],
)
async def list_for_pet(
    pet_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> list[PrescriptionRead]:
    rows = await prescription_service.list_prescriptions_for_pet(
        db, organization_id=current_user.organization_id, pet_id=pet_id
    )
    return [PrescriptionRead.model_validate(r) for r in rows]


@router.post(
    "/{prescription_id}/items/{item_id}/dispense",
    response_model=PrescriptionItemRead,
    summary="Dispensar línea de receta (descuenta stock FIFO)",
    dependencies=[Depends(require_permission("prescription:dispense"))],
)
async def dispense_item(
    prescription_id: str,
    item_id: str,
    payload: DispenseRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> PrescriptionItemRead:
    item = await prescription_service.dispense_item(
        db,
        organization_id=current_user.organization_id,
        prescription_id=prescription_id,
        item_id=item_id,
        quantity=payload.quantity,
        witness_user_id=payload.witness_user_id,
        performed_by=current_user.id,
    )
    await db.commit()
    return PrescriptionItemRead.model_validate(item)


@router.post(
    "/{prescription_id}/void",
    response_model=PrescriptionRead,
    summary="Anular receta",
    dependencies=[Depends(require_permission("prescription:write"))],
)
async def void_prescription(
    prescription_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> PrescriptionRead:
    presc = await prescription_service.void_prescription(
        db,
        organization_id=current_user.organization_id,
        prescription_id=prescription_id,
    )
    await db.commit()
    presc = await prescription_service.get_prescription(
        db, organization_id=current_user.organization_id, prescription_id=presc.id
    )
    return PrescriptionRead.model_validate(presc)
