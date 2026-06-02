"""Endpoints de encuentros clínicos."""

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
from app.schemas.encounter import (
    EncounterAmendRequest,
    EncounterCreate,
    EncounterRead,
    EncounterUpdate,
    SoapNoteRead,
    SoapNoteUpdate,
    VitalSignCreate,
    VitalSignRead,
)
from app.services import encounter_service

router = APIRouter()


@router.post(
    "",
    response_model=EncounterRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear encuentro clínico (visita)",
    dependencies=[Depends(require_permission("encounter:write"))],
)
async def create_encounter(
    payload: EncounterCreate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> EncounterRead:
    encounter = await encounter_service.create_encounter(
        db,
        organization_id=current_user.organization_id,
        payload=payload,
        veterinarian_id_fallback=current_user.id,
    )
    await audit(
        db,
        action="encounter.created",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="encounter",
        target_id=encounter.id,
        after={"pet_id": encounter.pet_id, "type": encounter.type},
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return EncounterRead.model_validate(encounter)


@router.get(
    "",
    response_model=Page[EncounterRead],
    summary="Listar encuentros con filtros",
    dependencies=[Depends(require_permission("encounter:read"))],
)
async def list_encounters(
    current_user: CurrentUser,
    db: DBSession,
    pet_id: str | None = Query(default=None),
    customer_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
) -> Page[EncounterRead]:
    rows, total = await encounter_service.list_encounters(
        db,
        organization_id=current_user.organization_id,
        pet_id=pet_id,
        customer_id=customer_id,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )
    return Page[EncounterRead](
        items=[EncounterRead.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{encounter_id}",
    response_model=EncounterRead,
    summary="Obtener encuentro",
    dependencies=[Depends(require_permission("encounter:read"))],
)
async def get_encounter(
    encounter_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> EncounterRead:
    encounter = await encounter_service.get_encounter(
        db, organization_id=current_user.organization_id, encounter_id=encounter_id
    )
    return EncounterRead.model_validate(encounter)


@router.put(
    "/{encounter_id}",
    response_model=EncounterRead,
    summary="Actualizar metadata del encuentro (antes de cierre)",
    dependencies=[Depends(require_permission("encounter:write"))],
)
async def update_encounter(
    encounter_id: str,
    payload: EncounterUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> EncounterRead:
    encounter = await encounter_service.update_encounter(
        db,
        organization_id=current_user.organization_id,
        encounter_id=encounter_id,
        payload=payload,
    )
    await db.commit()
    return EncounterRead.model_validate(encounter)


@router.get(
    "/{encounter_id}/soap",
    response_model=SoapNoteRead,
    summary="Obtener SOAP del encuentro",
    dependencies=[Depends(require_permission("encounter:read"))],
)
async def get_soap(
    encounter_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> SoapNoteRead:
    await encounter_service.get_encounter(
        db, organization_id=current_user.organization_id, encounter_id=encounter_id
    )
    soap = await encounter_service.get_soap(db, encounter_id)
    return SoapNoteRead.model_validate(soap)


@router.put(
    "/{encounter_id}/soap",
    response_model=SoapNoteRead,
    summary="Actualizar SOAP del encuentro",
    dependencies=[Depends(require_permission("encounter:write"))],
)
async def update_soap(
    encounter_id: str,
    payload: SoapNoteUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> SoapNoteRead:
    soap = await encounter_service.update_soap(
        db,
        organization_id=current_user.organization_id,
        encounter_id=encounter_id,
        payload=payload,
    )
    await db.commit()
    return SoapNoteRead.model_validate(soap)


@router.post(
    "/{encounter_id}/close",
    response_model=EncounterRead,
    summary="Cerrar el encuentro (lo deja inmutable)",
    dependencies=[Depends(require_permission("encounter:close"))],
)
async def close_encounter(
    encounter_id: str,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> EncounterRead:
    encounter = await encounter_service.close_encounter(
        db, organization_id=current_user.organization_id, encounter_id=encounter_id
    )
    await audit(
        db,
        action="encounter.closed",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="encounter",
        target_id=encounter.id,
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return EncounterRead.model_validate(encounter)


@router.post(
    "/{encounter_id}/amend",
    response_model=EncounterRead,
    summary="Enmendar el SOAP de un encuentro cerrado (firmado + auditado)",
    dependencies=[Depends(require_permission("encounter:amend"))],
)
async def amend_encounter(
    encounter_id: str,
    payload: EncounterAmendRequest,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> EncounterRead:
    encounter = await encounter_service.amend_encounter(
        db,
        organization_id=current_user.organization_id,
        encounter_id=encounter_id,
        payload=payload,
        actor_user_id=current_user.id,
    )
    await audit(
        db,
        action="encounter.amended",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="encounter",
        target_id=encounter.id,
        after={"reason": payload.reason},
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return EncounterRead.model_validate(encounter)


@router.post(
    "/{encounter_id}/vitals",
    response_model=VitalSignRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar signos vitales",
    dependencies=[Depends(require_permission("vital:write"))],
)
async def add_vitals(
    encounter_id: str,
    payload: VitalSignCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> VitalSignRead:
    vital = await encounter_service.add_vital_sign(
        db,
        organization_id=current_user.organization_id,
        encounter_id=encounter_id,
        payload=payload,
        recorded_by=current_user.id,
    )
    await db.commit()
    return VitalSignRead.model_validate(vital)


@router.get(
    "/{encounter_id}/vitals",
    response_model=list[VitalSignRead],
    summary="Listar signos vitales del encuentro",
    dependencies=[Depends(require_permission("encounter:read"))],
)
async def list_vitals(
    encounter_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> list[VitalSignRead]:
    vitals = await encounter_service.list_vital_signs(
        db, organization_id=current_user.organization_id, encounter_id=encounter_id
    )
    return [VitalSignRead.model_validate(v) for v in vitals]
