"""Endpoints de mascotas."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, status

from app.api.deps import (
    CurrentUser,
    DBSession,
    get_client_ip,
    get_user_agent,
    require_permission,
)
from app.core.audit import audit
from app.schemas.common import Page
from app.schemas.pet import PetCreate, PetRead, PetUpdate, PetWeightCreate, PetWeightRead
from app.services import pet_service

router = APIRouter()


@router.post(
    "",
    response_model=PetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear mascota",
    dependencies=[Depends(require_permission("pet:write"))],
)
async def create_pet(
    payload: PetCreate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> PetRead:
    pet = await pet_service.create_pet(
        db,
        organization_id=current_user.organization_id,
        payload=payload,
    )
    await audit(
        db,
        action="pet.created",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="pet",
        target_id=pet.id,
        after={"name": pet.name, "species": pet.species, "customer_id": payload.customer_id},
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return PetRead.model_validate(pet)


@router.get(
    "",
    response_model=Page[PetRead],
    summary="Listar y buscar mascotas",
    dependencies=[Depends(require_permission("pet:read"))],
)
async def list_pets(
    current_user: CurrentUser,
    db: DBSession,
    q: str | None = Query(default=None, max_length=100),
    species: str | None = Query(default=None, max_length=50),
    customer_id: str | None = Query(default=None),
    microchip: str | None = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
) -> Page[PetRead]:
    rows, total = await pet_service.list_pets(
        db,
        organization_id=current_user.organization_id,
        q=q,
        species=species,
        customer_id=customer_id,
        microchip=microchip,
        page=page,
        page_size=page_size,
    )
    return Page[PetRead](
        items=[PetRead.model_validate(p) for p in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{pet_id}",
    response_model=PetRead,
    summary="Obtener mascota",
    dependencies=[Depends(require_permission("pet:read"))],
)
async def get_pet(
    pet_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> PetRead:
    pet = await pet_service.get_pet(
        db, organization_id=current_user.organization_id, pet_id=pet_id
    )
    return PetRead.model_validate(pet)


@router.put(
    "/{pet_id}",
    response_model=PetRead,
    summary="Actualizar mascota",
    dependencies=[Depends(require_permission("pet:write"))],
)
async def update_pet(
    pet_id: str,
    payload: PetUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> PetRead:
    pet = await pet_service.update_pet(
        db,
        organization_id=current_user.organization_id,
        pet_id=pet_id,
        payload=payload,
    )
    await audit(
        db,
        action="pet.updated",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="pet",
        target_id=pet.id,
        after=payload.model_dump(exclude_unset=True),
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return PetRead.model_validate(pet)


@router.delete(
    "/{pet_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar (soft) mascota",
    dependencies=[Depends(require_permission("pet:delete"))],
)
async def delete_pet(
    pet_id: str,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    pet = await pet_service.soft_delete_pet(
        db, organization_id=current_user.organization_id, pet_id=pet_id
    )
    await audit(
        db,
        action="pet.deleted",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="pet",
        target_id=pet.id,
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()


@router.post(
    "/{pet_id}/weights",
    response_model=PetWeightRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar peso de la mascota",
    dependencies=[Depends(require_permission("vital:write"))],
)
async def record_weight(
    pet_id: str,
    payload: PetWeightCreate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> PetWeightRead:
    weight = await pet_service.record_weight(
        db,
        organization_id=current_user.organization_id,
        pet_id=pet_id,
        payload=payload,
        recorded_by=current_user.id,
    )
    await audit(
        db,
        action="pet.weight_recorded",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="pet",
        target_id=pet_id,
        after={"weight_kg": str(weight.weight_kg)},
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return PetWeightRead.model_validate(weight)


@router.get(
    "/{pet_id}/weights",
    response_model=list[PetWeightRead],
    summary="Histórico de pesos",
    dependencies=[Depends(require_permission("pet:read"))],
)
async def list_weights(
    pet_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> list[PetWeightRead]:
    weights = await pet_service.list_weights(
        db, organization_id=current_user.organization_id, pet_id=pet_id
    )
    return [PetWeightRead.model_validate(w) for w in weights]
