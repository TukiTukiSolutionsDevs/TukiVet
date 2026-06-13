"""Servicios de órdenes, pagos y cálculo de totales con IGV."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models import (
    CashSession,
    Customer,
    Order,
    OrderItem,
    Payment,
    Product,
    ServiceCatalog,
)
from app.schemas.order import (
    OrderCreate,
    OrderItemInput,
    PaymentCreate,
    ServiceCatalogCreate,
    ServiceCatalogUpdate,
)

_TWO = Decimal("0.01")
_IGV_RATE = Decimal("0.18")


def _q(value: Decimal) -> Decimal:
    """Cuantiza a 2 decimales con ROUND_HALF_UP (regla SUNAT)."""
    return value.quantize(_TWO, rounding=ROUND_HALF_UP)


def _line_totals(
    *,
    unit_price: Decimal,
    quantity: Decimal,
    discount_pct: Decimal,
    igv_affected: bool,
    price_includes_igv: bool,
) -> tuple[Decimal, Decimal, Decimal]:
    """Calcula (subtotal, igv_amount, total) para una línea según IGV."""
    gross = unit_price * quantity * (Decimal("1") - discount_pct / Decimal("100"))
    if not igv_affected:
        return _q(gross), Decimal("0.00"), _q(gross)
    if price_includes_igv:
        # SUNAT: igv = total × 18/118, subtotal = total - igv
        igv = gross * _IGV_RATE / (Decimal("1") + _IGV_RATE)
        subtotal = gross - igv
        return _q(subtotal), _q(igv), _q(gross)
    # IGV agregado
    igv = gross * _IGV_RATE
    return _q(gross), _q(igv), _q(gross + igv)


# ------------------- Service catalog -------------------


async def list_services(
    db: AsyncSession, *, organization_id: str, active_only: bool = True
) -> list[ServiceCatalog]:
    stmt = select(ServiceCatalog).where(
        ServiceCatalog.organization_id == organization_id,
        ServiceCatalog.deleted_at.is_(None),
    )
    if active_only:
        stmt = stmt.where(ServiceCatalog.active.is_(True))
    stmt = stmt.order_by(ServiceCatalog.category.asc(), ServiceCatalog.name.asc())
    return list((await db.execute(stmt)).scalars().all())


async def create_service(
    db: AsyncSession, *, organization_id: str, payload: ServiceCatalogCreate
) -> ServiceCatalog:
    existing = await db.execute(
        select(ServiceCatalog).where(
            ServiceCatalog.organization_id == organization_id,
            ServiceCatalog.code == payload.code,
            ServiceCatalog.deleted_at.is_(None),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(f"Código '{payload.code}' ya existe en el catálogo")
    service = ServiceCatalog(
        organization_id=organization_id,
        **payload.model_dump(),
    )
    db.add(service)
    await db.flush()
    return service


async def update_service(
    db: AsyncSession,
    *,
    organization_id: str,
    service_id: str,
    payload: ServiceCatalogUpdate,
) -> ServiceCatalog:
    service = await db.get(ServiceCatalog, service_id)
    if (
        service is None
        or service.organization_id != organization_id
        or service.deleted_at is not None
    ):
        raise NotFoundError("Servicio no encontrado")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(service, f, v)
    await db.flush()
    return service


# ------------------- Orders -------------------


async def _resolve_item(
    db: AsyncSession,
    *,
    organization_id: str,
    line: OrderItemInput,
) -> tuple[OrderItem, Decimal, Decimal]:
    """Construye un OrderItem (sin order_id) y devuelve (item, gross_for_discount, igv_amount).

    Determina precio, descripción e IGV en base al producto/servicio referenciado.
    """
    if line.product_id:
        product = await db.get(Product, line.product_id)
        if (
            product is None
            or product.organization_id != organization_id
            or product.deleted_at is not None
        ):
            raise NotFoundError("Producto no encontrado")
        unit_price = line.unit_price if line.unit_price is not None else product.sale_price
        description = line.description or product.name
        subtotal, igv, total = _line_totals(
            unit_price=unit_price,
            quantity=line.quantity,
            discount_pct=line.discount_pct,
            igv_affected=product.igv_affected,
            price_includes_igv=product.sale_price_includes_igv,
        )
        item = OrderItem(
            product_id=product.id,
            service_id=None,
            description=description,
            quantity=line.quantity,
            unit_price=unit_price,
            discount_pct=line.discount_pct,
            igv_amount=igv,
            subtotal=subtotal,
            total=total,
            reference_type=line.reference_type,
            reference_id=line.reference_id,
        )
        return item, subtotal, igv
    if line.service_id is None:
        raise ConflictError("Línea sin product_id ni service_id")
    service = await db.get(ServiceCatalog, line.service_id)
    if (
        service is None
        or service.organization_id != organization_id
        or service.deleted_at is not None
    ):
        raise NotFoundError("Servicio no encontrado")
    unit_price = line.unit_price if line.unit_price is not None else service.base_price
    description = line.description or service.name
    subtotal, igv, total = _line_totals(
        unit_price=unit_price,
        quantity=line.quantity,
        discount_pct=line.discount_pct,
        igv_affected=service.igv_affected,
        price_includes_igv=service.price_includes_igv,
    )
    item = OrderItem(
        product_id=None,
        service_id=service.id,
        description=description,
        quantity=line.quantity,
        unit_price=unit_price,
        discount_pct=line.discount_pct,
        igv_amount=igv,
        subtotal=subtotal,
        total=total,
        reference_type=line.reference_type,
        reference_id=line.reference_id,
    )
    return item, subtotal, igv


def _recompute_order_totals(order: Order) -> None:
    """Recalcula totales del order a partir de sus items."""
    subtotal_sum = sum((it.subtotal for it in order.items), Decimal("0"))
    igv_sum = sum((it.igv_amount for it in order.items), Decimal("0"))
    total_sum = sum((it.total for it in order.items), Decimal("0"))
    order.subtotal = _q(subtotal_sum)
    order.igv_amount = _q(igv_sum)
    order.total = _q(total_sum)


def _recompute_status(order: Order) -> None:
    """Actualiza status según paid_amount vs total."""
    if order.status == "void":
        return
    if order.total == Decimal("0"):
        order.status = "draft"
        return
    if order.paid_amount >= order.total:
        order.status = "paid"
    elif order.paid_amount > Decimal("0"):
        order.status = "partially_paid"
    else:
        order.status = "open"


async def create_order(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: OrderCreate,
    created_by: str,
) -> Order:
    customer = await db.get(Customer, payload.customer_id)
    if (
        customer is None
        or customer.organization_id != organization_id
        or customer.deleted_at is not None
    ):
        raise NotFoundError("Cliente no encontrado")

    next_number_result = await db.execute(
        select(func.coalesce(func.max(Order.number), 0) + 1).where(
            Order.organization_id == organization_id
        )
    )
    next_number = next_number_result.scalar_one()

    order = Order(
        organization_id=organization_id,
        customer_id=customer.id,
        encounter_id=payload.encounter_id,
        number=next_number,
        status="draft",
        issued_at=datetime.now(tz=timezone.utc),
        notes=payload.notes,
        created_by=created_by,
    )
    db.add(order)
    await db.flush()

    for line in payload.items:
        item, _, _ = await _resolve_item(
            db, organization_id=organization_id, line=line
        )
        item.order_id = order.id
        db.add(item)
    await db.flush()
    await db.refresh(order, ["items"])
    _recompute_order_totals(order)
    _recompute_status(order)
    await db.flush()
    return order


async def get_order(db: AsyncSession, *, organization_id: str, order_id: str) -> Order:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.organization_id == organization_id)
        .options(selectinload(Order.items), selectinload(Order.payments))
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError("Orden no encontrada")
    return order


async def list_orders(
    db: AsyncSession,
    *,
    organization_id: str,
    customer_id: str | None = None,
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Order], int]:
    stmt = select(Order).where(Order.organization_id == organization_id)
    count_stmt = select(func.count(Order.id)).where(
        Order.organization_id == organization_id
    )
    if customer_id:
        stmt = stmt.where(Order.customer_id == customer_id)
        count_stmt = count_stmt.where(Order.customer_id == customer_id)
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
        count_stmt = count_stmt.where(Order.status == status_filter)
    stmt = (
        stmt.options(selectinload(Order.items))
        .order_by(Order.issued_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    total = (await db.execute(count_stmt)).scalar_one()
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows), total


async def add_item(
    db: AsyncSession,
    *,
    organization_id: str,
    order_id: str,
    line: OrderItemInput,
) -> Order:
    order = await get_order(db, organization_id=organization_id, order_id=order_id)
    if order.status in ("paid", "void"):
        raise ConflictError(f"No se puede modificar orden '{order.status}'")
    item, _, _ = await _resolve_item(db, organization_id=organization_id, line=line)
    item.order_id = order.id
    db.add(item)
    await db.flush()
    await db.refresh(order, ["items"])
    _recompute_order_totals(order)
    _recompute_status(order)
    await db.flush()
    return order


async def remove_item(
    db: AsyncSession,
    *,
    organization_id: str,
    order_id: str,
    item_id: str,
) -> Order:
    order = await get_order(db, organization_id=organization_id, order_id=order_id)
    if order.status in ("paid", "void"):
        raise ConflictError(f"No se puede modificar orden '{order.status}'")
    item = next((i for i in order.items if i.id == item_id), None)
    if item is None:
        raise NotFoundError("Línea no encontrada")
    await db.delete(item)
    await db.flush()
    await db.refresh(order, ["items"])
    _recompute_order_totals(order)
    _recompute_status(order)
    await db.flush()
    return order


async def void_order(
    db: AsyncSession, *, organization_id: str, order_id: str
) -> Order:
    order = await get_order(db, organization_id=organization_id, order_id=order_id)
    if order.status == "void":
        return order
    if order.paid_amount > Decimal("0"):
        raise ConflictError("No se puede anular orden con pagos confirmados")
    order.status = "void"
    await db.flush()
    return order


# ------------------- Payments -------------------


async def record_payment(
    db: AsyncSession,
    *,
    organization_id: str,
    order_id: str,
    payload: PaymentCreate,
    received_by: str,
    cash_session_id: str | None,
) -> Payment:
    order = await get_order(db, organization_id=organization_id, order_id=order_id)
    if order.status == "void":
        raise ConflictError("Orden anulada")
    if order.total == Decimal("0"):
        raise ConflictError("Orden sin items — agrega líneas antes de cobrar")

    remaining = order.total - order.paid_amount
    if payload.amount > remaining:
        raise ConflictError(
            f"El monto ({payload.amount}) excede el saldo pendiente ({remaining})"
        )

    payment = Payment(
        organization_id=organization_id,
        order_id=order.id,
        cash_session_id=cash_session_id,
        method=payload.method,
        amount=payload.amount,
        reference=payload.reference,
        received_by=received_by,
        received_at=datetime.now(tz=timezone.utc),
        status="confirmed",
    )
    db.add(payment)
    order.paid_amount = _q(order.paid_amount + payload.amount)
    order.cash_session_id = cash_session_id or order.cash_session_id
    _recompute_status(order)
    await db.flush()
    return payment


# ------------------- Cash session -------------------


async def get_active_cash_session(
    db: AsyncSession, *, organization_id: str, user_id: str
) -> CashSession | None:
    result = await db.execute(
        select(CashSession).where(
            CashSession.organization_id == organization_id,
            CashSession.user_id == user_id,
            CashSession.closed_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def open_cash_session(
    db: AsyncSession,
    *,
    organization_id: str,
    user_id: str,
    branch_id: str | None,
    opening_balance: Decimal,
) -> CashSession:
    if await get_active_cash_session(db, organization_id=organization_id, user_id=user_id):
        raise ConflictError("Ya hay una caja abierta para este usuario")
    session = CashSession(
        organization_id=organization_id,
        branch_id=branch_id,
        user_id=user_id,
        opened_at=datetime.now(tz=timezone.utc),
        opening_balance=opening_balance,
    )
    db.add(session)
    await db.flush()
    return session


async def close_cash_session(
    db: AsyncSession,
    *,
    organization_id: str,
    cash_session_id: str,
    user_id: str,
    closing_balance_declared: Decimal,
    notes: str | None,
) -> CashSession:
    cash = await db.get(CashSession, cash_session_id)
    if cash is None or cash.organization_id != organization_id:
        raise NotFoundError("Caja no encontrada")
    if cash.user_id != user_id:
        raise ConflictError("Solo el usuario dueño de la caja puede cerrarla")
    if cash.closed_at is not None:
        raise ConflictError("La caja ya está cerrada")

    # Calcula el saldo esperado: opening + sum(pagos en efectivo durante la sesión)
    cash_payments_total = (
        await db.execute(
            select(func.coalesce(func.sum(Payment.amount), Decimal("0"))).where(
                Payment.cash_session_id == cash.id,
                Payment.method == "cash",
                Payment.status == "confirmed",
            )
        )
    ).scalar_one()
    calculated = cash.opening_balance + cash_payments_total
    cash.closed_at = datetime.now(tz=timezone.utc)
    cash.closing_balance_declared = closing_balance_declared
    cash.closing_balance_calculated = calculated
    cash.difference = closing_balance_declared - calculated
    cash.notes = notes
    await db.flush()
    return cash
