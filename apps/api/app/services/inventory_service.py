"""Servicios de inventario: productos, lotes, movimientos y alertas.

Reglas:
- Productos: CRUD + soft delete.
- Lotes: se crean al recibir una compra. current_qty se reduce con cada salida.
- Dispensación FIFO: vende del lote con expiry_date más temprana y stock > 0.
- Cualquier mov de salida verifica disponibilidad y descuenta atómicamente.
- Lote llega a 0 → status='depleted'.
- expiry_date pasada → status='expired' (cuando lo detecta el listado de alertas).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.models import InventoryLot, InventoryMovement, Product, Supplier
from app.schemas.inventory import (
    ExpiringLotRow,
    LotCreate,
    MovementCreate,
    ProductCreate,
    ProductUpdate,
    StockAlertRow,
    SupplierCreate,
    SupplierUpdate,
)


# ------------------- Suppliers -------------------


async def list_suppliers(
    db: AsyncSession, *, organization_id: str, active_only: bool = True
) -> list[Supplier]:
    stmt = select(Supplier).where(
        Supplier.organization_id == organization_id, Supplier.deleted_at.is_(None)
    )
    if active_only:
        stmt = stmt.where(Supplier.active.is_(True))
    stmt = stmt.order_by(Supplier.name.asc())
    return list((await db.execute(stmt)).scalars().all())


async def create_supplier(
    db: AsyncSession, *, organization_id: str, payload: SupplierCreate
) -> Supplier:
    supplier = Supplier(
        organization_id=organization_id,
        name=payload.name,
        ruc=payload.ruc,
        contact_name=payload.contact_name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        active=True,
    )
    db.add(supplier)
    await db.flush()
    return supplier


async def update_supplier(
    db: AsyncSession,
    *,
    organization_id: str,
    supplier_id: str,
    payload: SupplierUpdate,
) -> Supplier:
    supplier = await db.get(Supplier, supplier_id)
    if (
        supplier is None
        or supplier.organization_id != organization_id
        or supplier.deleted_at is not None
    ):
        raise NotFoundError("Proveedor no encontrado")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, f, v)
    await db.flush()
    return supplier


# ------------------- Products -------------------


async def list_products(
    db: AsyncSession,
    *,
    organization_id: str,
    q: str | None = None,
    category: str | None = None,
    page: int = 1,
    page_size: int = 20,
    with_qty: bool = False,
) -> tuple[list[tuple[Product, Decimal]], int]:
    stmt = select(Product).where(
        Product.organization_id == organization_id, Product.deleted_at.is_(None)
    )
    count_stmt = select(func.count(Product.id)).where(
        Product.organization_id == organization_id, Product.deleted_at.is_(None)
    )
    if category:
        stmt = stmt.where(Product.category == category)
        count_stmt = count_stmt.where(Product.category == category)
    if q:
        like = f"%{q.lower()}%"
        cond = or_(
            func.lower(Product.name).like(like),
            func.lower(Product.sku).like(like),
            func.lower(func.coalesce(Product.active_ingredient, "")).like(like),
            Product.barcode == q,
        )
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)
    stmt = stmt.order_by(Product.name.asc()).offset((page - 1) * page_size).limit(page_size)

    total = (await db.execute(count_stmt)).scalar_one()
    products = list((await db.execute(stmt)).scalars().all())

    if with_qty and products:
        product_ids = [p.id for p in products]
        qty_stmt = (
            select(InventoryLot.product_id, func.sum(InventoryLot.current_qty))
            .where(
                InventoryLot.product_id.in_(product_ids),
                InventoryLot.status == "active",
            )
            .group_by(InventoryLot.product_id)
        )
        qty_map: dict[str, Decimal] = {
            pid: q or Decimal("0") for pid, q in (await db.execute(qty_stmt)).all()
        }
        return [(p, qty_map.get(p.id, Decimal("0"))) for p in products], total

    return [(p, Decimal("0")) for p in products], total


async def get_product(db: AsyncSession, *, organization_id: str, product_id: str) -> Product:
    product = await db.get(Product, product_id)
    if (
        product is None
        or product.organization_id != organization_id
        or product.deleted_at is not None
    ):
        raise NotFoundError("Producto no encontrado")
    return product


async def create_product(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: ProductCreate,
) -> Product:
    # Unicidad de SKU
    existing = await db.execute(
        select(Product).where(
            Product.organization_id == organization_id,
            Product.sku == payload.sku,
            Product.deleted_at.is_(None),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(f"SKU '{payload.sku}' ya existe")
    product = Product(
        organization_id=organization_id,
        **payload.model_dump(),
    )
    db.add(product)
    await db.flush()
    return product


async def update_product(
    db: AsyncSession,
    *,
    organization_id: str,
    product_id: str,
    payload: ProductUpdate,
) -> Product:
    product = await get_product(db, organization_id=organization_id, product_id=product_id)
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(product, f, v)
    await db.flush()
    return product


async def get_product_available_qty(
    db: AsyncSession, *, organization_id: str, product_id: str
) -> Decimal:
    result = await db.execute(
        select(func.sum(InventoryLot.current_qty)).where(
            InventoryLot.organization_id == organization_id,
            InventoryLot.product_id == product_id,
            InventoryLot.status == "active",
        )
    )
    return result.scalar_one() or Decimal("0")


# ------------------- Lots -------------------


async def receive_lot(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: LotCreate,
    performed_by: str | None,
) -> InventoryLot:
    """Recibe un lote = compra. Crea lote + movimiento purchase."""
    await get_product(db, organization_id=organization_id, product_id=payload.product_id)

    if payload.supplier_id:
        supplier = await db.get(Supplier, payload.supplier_id)
        if (
            supplier is None
            or supplier.organization_id != organization_id
            or supplier.deleted_at is not None
        ):
            raise NotFoundError("Proveedor no encontrado")

    # Verifica unicidad lot_number por producto
    existing = await db.execute(
        select(InventoryLot).where(
            InventoryLot.product_id == payload.product_id,
            InventoryLot.lot_number == payload.lot_number,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(
            f"Ya existe un lote '{payload.lot_number}' para este producto"
        )

    lot = InventoryLot(
        organization_id=organization_id,
        product_id=payload.product_id,
        lot_number=payload.lot_number,
        expiry_date=payload.expiry_date,
        received_at=payload.received_at or date.today(),
        supplier_id=payload.supplier_id,
        unit_cost=payload.unit_cost,
        initial_qty=payload.initial_qty,
        current_qty=payload.initial_qty,
        status="active",
    )
    db.add(lot)
    await db.flush()

    db.add(
        InventoryMovement(
            organization_id=organization_id,
            product_id=lot.product_id,
            lot_id=lot.id,
            type="purchase",
            quantity=payload.initial_qty,
            unit_cost=payload.unit_cost,
            performed_by=performed_by,
            created_at=datetime.now(tz=timezone.utc),
        )
    )
    await db.flush()
    return lot


async def list_lots_for_product(
    db: AsyncSession,
    *,
    organization_id: str,
    product_id: str,
    include_depleted: bool = False,
) -> list[InventoryLot]:
    stmt = select(InventoryLot).where(
        InventoryLot.organization_id == organization_id,
        InventoryLot.product_id == product_id,
    )
    if not include_depleted:
        stmt = stmt.where(InventoryLot.status == "active")
    stmt = stmt.order_by(InventoryLot.expiry_date.asc().nullslast())
    return list((await db.execute(stmt)).scalars().all())


# ------------------- Movements -------------------


async def record_movement(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: MovementCreate,
    performed_by: str | None,
) -> InventoryMovement:
    """Movimiento manual (ajuste, merma, transferencia)."""
    await get_product(db, organization_id=organization_id, product_id=payload.product_id)

    qty = payload.quantity
    lot: InventoryLot | None = None
    if payload.lot_id:
        lot = await db.get(InventoryLot, payload.lot_id)
        if lot is None or lot.organization_id != organization_id:
            raise NotFoundError("Lote no encontrado")
        if lot.product_id != payload.product_id:
            raise ConflictError("El lote no corresponde al producto")
        # Si es salida, descuenta. Si es entrada, suma.
        new_qty = lot.current_qty + qty
        if new_qty < 0:
            raise ConflictError(
                f"Stock insuficiente en lote '{lot.lot_number}': {lot.current_qty}"
            )
        lot.current_qty = new_qty
        if lot.current_qty <= 0:
            lot.status = "depleted"

    db.add(
        InventoryMovement(
            organization_id=organization_id,
            product_id=payload.product_id,
            lot_id=payload.lot_id,
            type=payload.type,
            quantity=qty,
            unit_cost=payload.unit_cost,
            reference_type=payload.reference_type,
            reference_id=payload.reference_id,
            reason=payload.reason,
            performed_by=performed_by,
            witness_user_id=payload.witness_user_id,
            created_at=datetime.now(tz=timezone.utc),
        )
    )
    await db.flush()
    # Devuelve el último movimiento insertado (no expreso) — usamos un re-query simple
    last_mov = await db.execute(
        select(InventoryMovement)
        .where(
            InventoryMovement.product_id == payload.product_id,
            InventoryMovement.performed_by == performed_by,
        )
        .order_by(InventoryMovement.created_at.desc())
        .limit(1)
    )
    return last_mov.scalar_one()


async def dispense_fifo(
    db: AsyncSession,
    *,
    organization_id: str,
    product_id: str,
    quantity: Decimal,
    reference_type: str | None,
    reference_id: str | None,
    performed_by: str | None,
    witness_user_id: str | None = None,
) -> list[InventoryMovement]:
    """Dispensa cantidad usando FIFO por expiry_date. Lanza si no hay stock suficiente."""
    if quantity <= 0:
        raise ConflictError("La cantidad a dispensar debe ser positiva")

    lots = await list_lots_for_product(
        db, organization_id=organization_id, product_id=product_id, include_depleted=False
    )
    total_available = sum((lot.current_qty for lot in lots), Decimal("0"))
    if total_available < quantity:
        raise ConflictError(
            f"Stock insuficiente: disponible={total_available}, solicitado={quantity}"
        )

    remaining = quantity
    movements: list[InventoryMovement] = []
    now = datetime.now(tz=timezone.utc)
    for lot in lots:
        if remaining <= 0:
            break
        take = min(lot.current_qty, remaining)
        lot.current_qty -= take
        if lot.current_qty <= 0:
            lot.status = "depleted"
        mov = InventoryMovement(
            organization_id=organization_id,
            product_id=product_id,
            lot_id=lot.id,
            type="dispensation",
            quantity=-take,
            unit_cost=lot.unit_cost,
            reference_type=reference_type,
            reference_id=reference_id,
            performed_by=performed_by,
            witness_user_id=witness_user_id,
            created_at=now,
        )
        db.add(mov)
        movements.append(mov)
        remaining -= take

    await db.flush()
    return movements


# ------------------- Alerts -------------------


async def list_low_stock(
    db: AsyncSession, *, organization_id: str
) -> list[StockAlertRow]:
    qty_subq = (
        select(InventoryLot.product_id, func.sum(InventoryLot.current_qty).label("qty"))
        .where(
            InventoryLot.organization_id == organization_id,
            InventoryLot.status == "active",
        )
        .group_by(InventoryLot.product_id)
        .subquery()
    )
    stmt = (
        select(
            Product.id,
            Product.sku,
            Product.name,
            Product.category,
            func.coalesce(qty_subq.c.qty, Decimal("0")).label("available"),
            Product.reorder_point,
        )
        .outerjoin(qty_subq, qty_subq.c.product_id == Product.id)
        .where(
            Product.organization_id == organization_id,
            Product.deleted_at.is_(None),
            Product.active.is_(True),
            Product.reorder_point.isnot(None),
            and_(
                func.coalesce(qty_subq.c.qty, Decimal("0")) <= Product.reorder_point,
            ),
        )
        .order_by(Product.name.asc())
    )
    result = await db.execute(stmt)
    return [
        StockAlertRow(
            product_id=pid,
            sku=sku,
            name=name,
            category=category,
            available_qty=available or Decimal("0"),
            reorder_point=rp,
        )
        for pid, sku, name, category, available, rp in result.all()
    ]


async def list_expiring_lots(
    db: AsyncSession, *, organization_id: str, days_window: int = 30
) -> list[ExpiringLotRow]:
    cutoff = date.today() + timedelta(days=days_window)
    stmt = (
        select(
            InventoryLot.id,
            InventoryLot.product_id,
            Product.name,
            InventoryLot.lot_number,
            InventoryLot.expiry_date,
            InventoryLot.current_qty,
        )
        .join(Product, Product.id == InventoryLot.product_id)
        .where(
            InventoryLot.organization_id == organization_id,
            InventoryLot.status == "active",
            InventoryLot.current_qty > 0,
            InventoryLot.expiry_date.isnot(None),
            InventoryLot.expiry_date <= cutoff,
        )
        .order_by(InventoryLot.expiry_date.asc())
    )
    today = date.today()
    return [
        ExpiringLotRow(
            lot_id=lid,
            product_id=pid,
            product_name=name,
            lot_number=lot,
            expiry_date=exp,
            days_until_expiry=(exp - today).days,
            current_qty=qty,
        )
        for lid, pid, name, lot, exp, qty in (await db.execute(stmt)).all()
    ]
