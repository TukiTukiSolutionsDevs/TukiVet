"""Endpoints de mascotas."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Query, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    CurrentUser,
    DBSession,
    get_client_ip,
    get_user_agent,
    require_permission,
)
from app.core.audit import audit
from app.db.base import new_ulid
from app.models import Pet, PetOwner
from app.models.pet_document import PetDocument
from app.schemas.common import Page
from app.schemas.pet import PetCreate, PetRead, PetUpdate, PetWeightCreate, PetWeightRead
from app.schemas.pet_document import PetDocumentRead
from app.services import pet_service, storage_service

router = APIRouter()


async def _primary_owner_map(
    db: AsyncSession, pet_ids: list[str]
) -> dict[str, str]:
    """Devuelve {pet_id: customer_id} para el tutor primario."""
    if not pet_ids:
        return {}
    rows = await db.execute(
        select(PetOwner.pet_id, PetOwner.customer_id).where(
            PetOwner.pet_id.in_(pet_ids),
            PetOwner.role == "primary",
        )
    )
    return {pet_id: customer_id for pet_id, customer_id in rows.all()}


def _pet_to_read(pet: Pet, primary_customer_id: str | None) -> PetRead:
    return PetRead.model_validate(pet).model_copy(
        update={"customer_id": primary_customer_id}
    )


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
    owners = await _primary_owner_map(db, [pet.id])
    return _pet_to_read(pet, owners.get(pet.id))


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
    owners = await _primary_owner_map(db, [p.id for p in rows])
    return Page[PetRead](
        items=[_pet_to_read(p, owners.get(p.id)) for p in rows],
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
    owners = await _primary_owner_map(db, [pet.id])
    return _pet_to_read(pet, owners.get(pet.id))


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
    owners = await _primary_owner_map(db, [pet.id])
    return _pet_to_read(pet, owners.get(pet.id))


@router.delete(
    "/{pet_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
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


# ---- Documentos adjuntos -----------------------------------------------


@router.get(
    "/{pet_id}/documents",
    response_model=list[PetDocumentRead],
    summary="Listar documentos de la mascota",
    dependencies=[Depends(require_permission("pet:read"))],
)
async def list_documents(
    pet_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> list[PetDocumentRead]:
    result = await db.execute(
        select(PetDocument)
        .where(
            PetDocument.pet_id == pet_id,
            PetDocument.organization_id == current_user.organization_id,
        )
        .order_by(PetDocument.created_at.desc())
    )
    docs = result.scalars().all()
    items = []
    for doc in docs:
        url = await storage_service.get_presigned_url(doc.file_key)
        items.append(
            PetDocumentRead.model_validate(doc).model_copy(update={"download_url": url})
        )
    return items


@router.post(
    "/{pet_id}/documents",
    response_model=PetDocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Subir documento a la mascota",
    dependencies=[Depends(require_permission("pet:write"))],
)
async def upload_document(
    pet_id: str,
    file: UploadFile,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
    category: str = Form(default="other"),
    description: str | None = Form(default=None),
    encounter_id: str | None = Form(default=None),
) -> PetDocumentRead:
    content = await file.read()
    key = await storage_service.upload_file(
        content,
        file.filename or "archivo",
        file.content_type or "application/octet-stream",
        folder=f"pets/{pet_id}",
    )
    doc = PetDocument(
        id=new_ulid(),
        organization_id=current_user.organization_id,
        pet_id=pet_id,
        uploaded_by=current_user.id,
        encounter_id=encounter_id or None,
        file_key=key,
        file_name=file.filename or "archivo",
        file_size=len(content),
        content_type=file.content_type or "application/octet-stream",
        category=category,
        description=description,
    )
    db.add(doc)
    await audit(
        db,
        action="pet_document.uploaded",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="pet",
        target_id=pet_id,
        after={"file_name": doc.file_name, "category": doc.category},
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    url = await storage_service.get_presigned_url(key)
    return PetDocumentRead.model_validate(doc).model_copy(update={"download_url": url})


@router.delete(
    "/{pet_id}/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Eliminar documento",
    dependencies=[Depends(require_permission("pet:write"))],
)
async def delete_document(
    pet_id: str,
    doc_id: str,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    result = await db.execute(
        select(PetDocument).where(
            PetDocument.id == doc_id,
            PetDocument.pet_id == pet_id,
            PetDocument.organization_id == current_user.organization_id,
        )
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    await storage_service.delete_file(doc.file_key)
    await db.delete(doc)
    await audit(
        db,
        action="pet_document.deleted",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="pet",
        target_id=pet_id,
        after={"file_name": doc.file_name},
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
