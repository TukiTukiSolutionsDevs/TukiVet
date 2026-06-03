"""Endpoints comerciales: service catalog, órdenes, pagos."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.schemas.common import Page
from app.schemas.order import (
    OrderCreate,
    OrderItemInput,
    OrderRead,
    PaymentCreate,
    PaymentRead,
    ServiceCatalogCreate,
    ServiceCatalogRead,
    ServiceCatalogUpdate,
)
from app.services import order_service

router = APIRouter()


def _serialize_order(order) -> OrderRead:  # type: ignore[no-untyped-def]
    out = OrderRead.model_validate(order)
    out.balance = order.total - order.paid_amount
    return out


# ----- Service catalog -----


@router.get(
    "/services",
    response_model=list[ServiceCatalogRead],
    dependencies=[Depends(require_permission("order:read"))],
)
async def list_services(
    current_user: CurrentUser,
    db: DBSession,
    active_only: bool = Query(default=True),
) -> list[ServiceCatalogRead]:
    rows = await order_service.list_services(
        db, organization_id=current_user.organization_id, active_only=active_only
    )
    return [ServiceCatalogRead.model_validate(r) for r in rows]


@router.post(
    "/services",
    response_model=ServiceCatalogRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("product:write"))],
)
async def create_service(
    payload: ServiceCatalogCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> ServiceCatalogRead:
    service = await order_service.create_service(
        db, organization_id=current_user.organization_id, payload=payload
    )
    await db.commit()
    return ServiceCatalogRead.model_validate(service)


@router.put(
    "/services/{service_id}",
    response_model=ServiceCatalogRead,
    dependencies=[Depends(require_permission("product:write"))],
)
async def update_service(
    service_id: str,
    payload: ServiceCatalogUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> ServiceCatalogRead:
    service = await order_service.update_service(
        db,
        organization_id=current_user.organization_id,
        service_id=service_id,
        payload=payload,
    )
    await db.commit()
    return ServiceCatalogRead.model_validate(service)


# ----- Orders -----


@router.post(
    "",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear orden (ticket) con items opcionales",
    dependencies=[Depends(require_permission("order:write"))],
)
async def create_order(
    payload: OrderCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> OrderRead:
    order = await order_service.create_order(
        db,
        organization_id=current_user.organization_id,
        payload=payload,
        created_by=current_user.id,
    )
    await db.commit()
    order = await order_service.get_order(
        db, organization_id=current_user.organization_id, order_id=order.id
    )
    return _serialize_order(order)


@router.get(
    "",
    response_model=Page[OrderRead],
    dependencies=[Depends(require_permission("order:read"))],
)
async def list_orders(
    current_user: CurrentUser,
    db: DBSession,
    customer_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
) -> Page[OrderRead]:
    rows, total = await order_service.list_orders(
        db,
        organization_id=current_user.organization_id,
        customer_id=customer_id,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )
    return Page[OrderRead](
        items=[_serialize_order(o) for o in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{order_id}",
    response_model=OrderRead,
    dependencies=[Depends(require_permission("order:read"))],
)
async def get_order(
    order_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> OrderRead:
    order = await order_service.get_order(
        db, organization_id=current_user.organization_id, order_id=order_id
    )
    return _serialize_order(order)


@router.post(
    "/{order_id}/items",
    response_model=OrderRead,
    summary="Agregar línea a una orden abierta",
    dependencies=[Depends(require_permission("order:write"))],
)
async def add_item(
    order_id: str,
    payload: OrderItemInput,
    current_user: CurrentUser,
    db: DBSession,
) -> OrderRead:
    order = await order_service.add_item(
        db,
        organization_id=current_user.organization_id,
        order_id=order_id,
        line=payload,
    )
    await db.commit()
    order = await order_service.get_order(
        db, organization_id=current_user.organization_id, order_id=order.id
    )
    return _serialize_order(order)


@router.delete(
    "/{order_id}/items/{item_id}",
    response_model=OrderRead,
    dependencies=[Depends(require_permission("order:write"))],
)
async def remove_item(
    order_id: str,
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> OrderRead:
    order = await order_service.remove_item(
        db,
        organization_id=current_user.organization_id,
        order_id=order_id,
        item_id=item_id,
    )
    await db.commit()
    order = await order_service.get_order(
        db, organization_id=current_user.organization_id, order_id=order.id
    )
    return _serialize_order(order)


@router.post(
    "/{order_id}/void",
    response_model=OrderRead,
    dependencies=[Depends(require_permission("order:void"))],
)
async def void_order(
    order_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> OrderRead:
    order = await order_service.void_order(
        db, organization_id=current_user.organization_id, order_id=order_id
    )
    await db.commit()
    order = await order_service.get_order(
        db, organization_id=current_user.organization_id, order_id=order.id
    )
    return _serialize_order(order)


# ----- Payments -----


@router.post(
    "/{order_id}/payments",
    response_model=PaymentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar pago manual sobre la orden",
    dependencies=[Depends(require_permission("payment:record"))],
)
async def record_payment(
    order_id: str,
    payload: PaymentCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> PaymentRead:
    cash = await order_service.get_active_cash_session(
        db, organization_id=current_user.organization_id, user_id=current_user.id
    )
    payment = await order_service.record_payment(
        db,
        organization_id=current_user.organization_id,
        order_id=order_id,
        payload=payload,
        received_by=current_user.id,
        cash_session_id=cash.id if cash else None,
    )
    await db.commit()
    return PaymentRead.model_validate(payment)
