"""Endpoints de clientes (tutores)."""

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
from app.schemas.customer import (
    CustomerCreate,
    CustomerRead,
    CustomerUpdate,
    DocumentValidationRequest,
    DocumentValidationResponse,
)
from app.schemas.pet import PetRead
from app.services import customer_service, peru_doc, pet_service

router = APIRouter()


@router.post(
    "/validate-doc",
    response_model=DocumentValidationResponse,
    summary="Validar DNI / RUC / CE / Pasaporte (formato + dígito verificador)",
)
async def validate_document(payload: DocumentValidationRequest) -> DocumentValidationResponse:
    detected = peru_doc.detect_document_type(payload.document_number)
    valid = peru_doc.validate(payload.document_type, payload.document_number)
    return DocumentValidationResponse(
        document_type=payload.document_type,
        document_number=payload.document_number,
        valid=valid,
        detected_type=detected,
    )


@router.post(
    "",
    response_model=CustomerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear cliente (tutor)",
    dependencies=[Depends(require_permission("customer:write"))],
)
async def create_customer(
    payload: CustomerCreate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> CustomerRead:
    customer = await customer_service.create_customer(
        db,
        organization_id=current_user.organization_id,
        payload=payload,
    )
    await audit(
        db,
        action="customer.created",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="customer",
        target_id=customer.id,
        after={"document": f"{customer.document_type}:{customer.document_number}"},
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return CustomerRead.model_validate(customer)


@router.get(
    "",
    response_model=Page[CustomerRead],
    summary="Listar y buscar clientes",
    dependencies=[Depends(require_permission("customer:read"))],
)
async def list_customers(
    current_user: CurrentUser,
    db: DBSession,
    q: str | None = Query(default=None, max_length=100),
    document_number: str | None = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
) -> Page[CustomerRead]:
    rows, total = await customer_service.list_customers(
        db,
        organization_id=current_user.organization_id,
        q=q,
        document_number=document_number,
        page=page,
        page_size=page_size,
    )
    return Page[CustomerRead](
        items=[CustomerRead.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{customer_id}",
    response_model=CustomerRead,
    summary="Obtener cliente",
    dependencies=[Depends(require_permission("customer:read"))],
)
async def get_customer(
    customer_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> CustomerRead:
    customer = await customer_service.get_customer(
        db, organization_id=current_user.organization_id, customer_id=customer_id
    )
    return CustomerRead.model_validate(customer)


@router.put(
    "/{customer_id}",
    response_model=CustomerRead,
    summary="Actualizar cliente",
    dependencies=[Depends(require_permission("customer:write"))],
)
async def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> CustomerRead:
    customer = await customer_service.update_customer(
        db,
        organization_id=current_user.organization_id,
        customer_id=customer_id,
        payload=payload,
    )
    await audit(
        db,
        action="customer.updated",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="customer",
        target_id=customer.id,
        after=payload.model_dump(exclude_unset=True),
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()
    return CustomerRead.model_validate(customer)


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Eliminar (soft) cliente",
    dependencies=[Depends(require_permission("customer:delete"))],
)
async def delete_customer(
    customer_id: str,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    customer = await customer_service.soft_delete_customer(
        db, organization_id=current_user.organization_id, customer_id=customer_id
    )
    await audit(
        db,
        action="customer.deleted",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="customer",
        target_id=customer.id,
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()


@router.get(
    "/{customer_id}/pets",
    response_model=list[PetRead],
    summary="Mascotas asociadas al cliente",
    dependencies=[Depends(require_permission("pet:read"))],
)
async def list_pets_of_customer(
    customer_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> list[PetRead]:
    pets = await pet_service.list_pets_for_customer(
        db, organization_id=current_user.organization_id, customer_id=customer_id
    )
    return [PetRead.model_validate(p) for p in pets]
