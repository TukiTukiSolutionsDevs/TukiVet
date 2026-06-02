"""Endpoints de vacunas (catálogo + administraciones)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.schemas.vaccine import (
    VaccineAdministrationCreate,
    VaccineAdministrationRead,
    VaccineCatalogCreate,
    VaccineCatalogRead,
    VaccineCatalogUpdate,
    VaccineDueRow,
)
from app.services import vaccine_service

router = APIRouter()


# ----- Catálogo -----


@router.get(
    "/catalog",
    response_model=list[VaccineCatalogRead],
    summary="Listar vacunas del catálogo",
    dependencies=[Depends(require_permission("vaccine:read"))],
)
async def list_catalog(
    current_user: CurrentUser,
    db: DBSession,
    species: str | None = Query(default=None),
    active_only: bool = Query(default=True),
) -> list[VaccineCatalogRead]:
    rows = await vaccine_service.list_catalog(
        db,
        organization_id=current_user.organization_id,
        species=species,
        active_only=active_only,
    )
    return [VaccineCatalogRead.model_validate(r) for r in rows]


@router.post(
    "/catalog",
    response_model=VaccineCatalogRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear entrada del catálogo de vacunas",
    dependencies=[Depends(require_permission("product:write"))],
)
async def create_catalog_entry(
    payload: VaccineCatalogCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> VaccineCatalogRead:
    entry = await vaccine_service.create_catalog_entry(
        db, organization_id=current_user.organization_id, payload=payload
    )
    await db.commit()
    return VaccineCatalogRead.model_validate(entry)


@router.put(
    "/catalog/{vaccine_id}",
    response_model=VaccineCatalogRead,
    summary="Actualizar vacuna del catálogo",
    dependencies=[Depends(require_permission("product:write"))],
)
async def update_catalog_entry(
    vaccine_id: str,
    payload: VaccineCatalogUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> VaccineCatalogRead:
    entry = await vaccine_service.update_catalog_entry(
        db,
        organization_id=current_user.organization_id,
        vaccine_id=vaccine_id,
        payload=payload,
    )
    await db.commit()
    return VaccineCatalogRead.model_validate(entry)


# ----- Administraciones -----


@router.post(
    "/administrations",
    response_model=VaccineAdministrationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar aplicación de vacuna",
    dependencies=[Depends(require_permission("vaccine:administer"))],
)
async def record_administration(
    payload: VaccineAdministrationCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> VaccineAdministrationRead:
    admin = await vaccine_service.record_administration(
        db,
        organization_id=current_user.organization_id,
        payload=payload,
        administered_by=current_user.id,
    )
    await db.commit()
    out = VaccineAdministrationRead.model_validate(admin)
    out.vaccine_name = admin.vaccine.name if admin.vaccine else None
    return out


@router.get(
    "/pets/{pet_id}/vaccines",
    response_model=list[VaccineAdministrationRead],
    summary="Histórico de vacunas de una mascota",
    dependencies=[Depends(require_permission("vaccine:read"))],
)
async def list_pet_vaccines(
    pet_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> list[VaccineAdministrationRead]:
    rows = await vaccine_service.list_administrations_for_pet(
        db, organization_id=current_user.organization_id, pet_id=pet_id
    )
    out: list[VaccineAdministrationRead] = []
    for admin, vaccine_name in rows:
        item = VaccineAdministrationRead.model_validate(admin)
        item.vaccine_name = vaccine_name
        out.append(item)
    return out


@router.get(
    "/due",
    response_model=list[VaccineDueRow],
    summary="Vacunas vencidas o por vencer (para recordatorios)",
    dependencies=[Depends(require_permission("vaccine:read"))],
)
async def list_due(
    current_user: CurrentUser,
    db: DBSession,
    days_window: int = Query(default=30, ge=0, le=365),
) -> list[VaccineDueRow]:
    return await vaccine_service.list_due_vaccines(
        db,
        organization_id=current_user.organization_id,
        days_window=days_window,
    )
