"""Endpoints de inventario: productos, lotes, movimientos y alertas."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.schemas.common import Page
from app.schemas.inventory import (
    ExpiringLotRow,
    LotCreate,
    LotRead,
    MovementCreate,
    MovementRead,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    StockAlertRow,
    SupplierCreate,
    SupplierRead,
    SupplierUpdate,
)
from app.services import inventory_service

router = APIRouter()


# ------------------- Suppliers -------------------


@router.get(
    "/suppliers",
    response_model=list[SupplierRead],
    summary="Listar proveedores",
    dependencies=[Depends(require_permission("inventory:read"))],
)
async def list_suppliers(
    current_user: CurrentUser,
    db: DBSession,
    active_only: bool = Query(default=True),
) -> list[SupplierRead]:
    rows = await inventory_service.list_suppliers(
        db, organization_id=current_user.organization_id, active_only=active_only
    )
    return [SupplierRead.model_validate(r) for r in rows]


@router.post(
    "/suppliers",
    response_model=SupplierRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear proveedor",
    dependencies=[Depends(require_permission("inventory:write"))],
)
async def create_supplier(
    payload: SupplierCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> SupplierRead:
    supplier = await inventory_service.create_supplier(
        db, organization_id=current_user.organization_id, payload=payload
    )
    await db.commit()
    return SupplierRead.model_validate(supplier)


@router.put(
    "/suppliers/{supplier_id}",
    response_model=SupplierRead,
    dependencies=[Depends(require_permission("inventory:write"))],
)
async def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> SupplierRead:
    s = await inventory_service.update_supplier(
        db,
        organization_id=current_user.organization_id,
        supplier_id=supplier_id,
        payload=payload,
    )
    await db.commit()
    return SupplierRead.model_validate(s)


# ------------------- Products -------------------


@router.get(
    "/products",
    response_model=Page[ProductRead],
    summary="Listar productos del catálogo",
    dependencies=[Depends(require_permission("inventory:read"))],
)
async def list_products(
    current_user: CurrentUser,
    db: DBSession,
    q: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    with_qty: bool = Query(default=True),
) -> Page[ProductRead]:
    rows_with_qty, total = await inventory_service.list_products(
        db,
        organization_id=current_user.organization_id,
        q=q,
        category=category,
        page=page,
        page_size=page_size,
        with_qty=with_qty,
    )
    items: list[ProductRead] = []
    for product, qty in rows_with_qty:
        item = ProductRead.model_validate(product)
        item.available_qty = qty if with_qty else None
        items.append(item)
    return Page[ProductRead](items=items, total=total, page=page, page_size=page_size)


@router.post(
    "/products",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("product:write"))],
)
async def create_product(
    payload: ProductCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> ProductRead:
    product = await inventory_service.create_product(
        db, organization_id=current_user.organization_id, payload=payload
    )
    await db.commit()
    return ProductRead.model_validate(product)


@router.get(
    "/products/{product_id}",
    response_model=ProductRead,
    dependencies=[Depends(require_permission("inventory:read"))],
)
async def get_product(
    product_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> ProductRead:
    product = await inventory_service.get_product(
        db, organization_id=current_user.organization_id, product_id=product_id
    )
    qty = await inventory_service.get_product_available_qty(
        db, organization_id=current_user.organization_id, product_id=product_id
    )
    out = ProductRead.model_validate(product)
    out.available_qty = qty
    return out


@router.put(
    "/products/{product_id}",
    response_model=ProductRead,
    dependencies=[Depends(require_permission("product:write"))],
)
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> ProductRead:
    product = await inventory_service.update_product(
        db,
        organization_id=current_user.organization_id,
        product_id=product_id,
        payload=payload,
    )
    await db.commit()
    return ProductRead.model_validate(product)


# ------------------- Lots -------------------


@router.get(
    "/products/{product_id}/lots",
    response_model=list[LotRead],
    dependencies=[Depends(require_permission("inventory:read"))],
)
async def list_product_lots(
    product_id: str,
    current_user: CurrentUser,
    db: DBSession,
    include_depleted: bool = Query(default=False),
) -> list[LotRead]:
    rows = await inventory_service.list_lots_for_product(
        db,
        organization_id=current_user.organization_id,
        product_id=product_id,
        include_depleted=include_depleted,
    )
    return [LotRead.model_validate(r) for r in rows]


@router.post(
    "/lots",
    response_model=LotRead,
    status_code=status.HTTP_201_CREATED,
    summary="Recibir lote (= compra)",
    dependencies=[Depends(require_permission("inventory:write"))],
)
async def receive_lot(
    payload: LotCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> LotRead:
    lot = await inventory_service.receive_lot(
        db,
        organization_id=current_user.organization_id,
        payload=payload,
        performed_by=current_user.id,
    )
    await db.commit()
    return LotRead.model_validate(lot)


# ------------------- Movements -------------------


@router.post(
    "/movements",
    response_model=MovementRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar movimiento manual (ajuste, merma, transferencia)",
    dependencies=[Depends(require_permission("inventory:write"))],
)
async def record_movement(
    payload: MovementCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> MovementRead:
    mov = await inventory_service.record_movement(
        db,
        organization_id=current_user.organization_id,
        payload=payload,
        performed_by=current_user.id,
    )
    await db.commit()
    return MovementRead.model_validate(mov)


# ------------------- Alerts -------------------


@router.get(
    "/alerts/low-stock",
    response_model=list[StockAlertRow],
    dependencies=[Depends(require_permission("inventory:read"))],
)
async def low_stock(
    current_user: CurrentUser, db: DBSession
) -> list[StockAlertRow]:
    return await inventory_service.list_low_stock(
        db, organization_id=current_user.organization_id
    )


@router.get(
    "/alerts/expiring",
    response_model=list[ExpiringLotRow],
    dependencies=[Depends(require_permission("inventory:read"))],
)
async def expiring(
    current_user: CurrentUser,
    db: DBSession,
    days_window: int = Query(default=30, ge=0, le=365),
) -> list[ExpiringLotRow]:
    return await inventory_service.list_expiring_lots(
        db, organization_id=current_user.organization_id, days_window=days_window
    )
