"""Servicios de reportes y KPIs.

Define los 10 KPIs estándar de un PIMS adaptados al contexto Perú.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import and_, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Appointment,
    Customer,
    ElectronicDocument,
    Encounter,
    InventoryLot,
    Order,
    Payment,
    Pet,
    Product,
    User,
    VaccineAdministration,
)
from app.schemas.reports import FinancialReport, KPIs, RevenueByCategoryRow


async def compute_kpis(
    db: AsyncSession,
    *,
    organization_id: str,
    window_days: int = 30,
) -> KPIs:
    today = date.today()
    period_start = today - timedelta(days=window_days)
    one_year_ago = today - timedelta(days=365)
    period_start_dt = datetime.combine(period_start, datetime.min.time(), tzinfo=timezone.utc)

    # Active patients (12 meses)
    active_patients_stmt = (
        select(func.count(distinct(Encounter.pet_id)))
        .where(
            Encounter.organization_id == organization_id,
            Encounter.started_at >= datetime.combine(one_year_ago, datetime.min.time(), tzinfo=timezone.utc),
        )
    )
    active_patients = (await db.execute(active_patients_stmt)).scalar_one() or 0

    # Active clients (12 meses)
    active_clients_stmt = (
        select(func.count(distinct(Encounter.customer_id)))
        .where(
            Encounter.organization_id == organization_id,
            Encounter.started_at >= datetime.combine(one_year_ago, datetime.min.time(), tzinfo=timezone.utc),
        )
    )
    active_clients = (await db.execute(active_clients_stmt)).scalar_one() or 0

    # Encuentros últimos N días
    encounters_30d_stmt = select(func.count(Encounter.id)).where(
        Encounter.organization_id == organization_id,
        Encounter.started_at >= period_start_dt,
    )
    encounters_30d = (await db.execute(encounters_30d_stmt)).scalar_one() or 0

    # Revenue + ACT (Average Transaction Charge) en órdenes pagadas últimos N días
    revenue_stmt = select(
        func.coalesce(func.sum(Order.total), Decimal("0")),
        func.count(Order.id),
    ).where(
        Order.organization_id == organization_id,
        Order.status == "paid",
        Order.issued_at >= period_start_dt,
    )
    revenue_total, paid_orders = (await db.execute(revenue_stmt)).one()
    revenue_total = revenue_total or Decimal("0")
    act = (revenue_total / Decimal(paid_orders)) if paid_orders else Decimal("0")

    # Revenue per vet
    revenue_per_vet_stmt = (
        select(User.id, User.full_name, func.coalesce(func.sum(Order.total), Decimal("0")))
        .join(Encounter, Encounter.veterinarian_id == User.id)
        .join(Order, Order.encounter_id == Encounter.id)
        .where(
            Order.organization_id == organization_id,
            Order.status == "paid",
            Order.issued_at >= period_start_dt,
        )
        .group_by(User.id, User.full_name)
    )
    revenue_per_vet: dict[str, Decimal] = {}
    for _uid, name, total in (await db.execute(revenue_per_vet_stmt)).all():
        revenue_per_vet[name] = total

    # Appointments + no-show rate
    appts_stmt = (
        select(
            Appointment.status, func.count(Appointment.id)
        )
        .where(
            Appointment.organization_id == organization_id,
            Appointment.starts_at >= period_start_dt,
        )
        .group_by(Appointment.status)
    )
    by_status: dict[str, int] = {
        status_: count for status_, count in (await db.execute(appts_stmt)).all()
    }
    total_appts = sum(by_status.values()) or 0
    no_show = by_status.get("no_show", 0)
    no_show_rate = (
        (Decimal(no_show) / Decimal(total_appts)) * Decimal("100")
        if total_appts
        else Decimal("0")
    ).quantize(Decimal("0.01"))

    # Vaccine compliance (% mascotas activas con al menos una vacuna en último año)
    vaccinated_stmt = select(func.count(distinct(VaccineAdministration.pet_id))).where(
        VaccineAdministration.organization_id == organization_id,
        VaccineAdministration.administered_at >= datetime.combine(
            one_year_ago, datetime.min.time(), tzinfo=timezone.utc
        ),
    )
    vaccinated = (await db.execute(vaccinated_stmt)).scalar_one() or 0
    total_active_pets_stmt = select(func.count(Pet.id)).where(
        Pet.organization_id == organization_id,
        Pet.status == "active",
        Pet.deleted_at.is_(None),
    )
    total_active_pets = (await db.execute(total_active_pets_stmt)).scalar_one() or 0
    vaccines_compliance = (
        (Decimal(vaccinated) / Decimal(total_active_pets)) * Decimal("100")
        if total_active_pets
        else Decimal("0")
    ).quantize(Decimal("0.01"))

    # Inventario: valor + alertas
    inv_value_stmt = select(
        func.coalesce(func.sum(InventoryLot.current_qty * InventoryLot.unit_cost), Decimal("0"))
    ).where(
        InventoryLot.organization_id == organization_id,
        InventoryLot.status == "active",
    )
    inventory_value = ((await db.execute(inv_value_stmt)).scalar_one() or Decimal("0")).quantize(
        Decimal("0.01")
    )

    expiring_count_stmt = select(func.count(InventoryLot.id)).where(
        InventoryLot.organization_id == organization_id,
        InventoryLot.status == "active",
        InventoryLot.current_qty > 0,
        InventoryLot.expiry_date.isnot(None),
        InventoryLot.expiry_date <= today + timedelta(days=30),
    )
    expiring_count = (await db.execute(expiring_count_stmt)).scalar_one() or 0

    # Low stock count: products bajo reorder point
    low_stock_subq = (
        select(InventoryLot.product_id, func.sum(InventoryLot.current_qty).label("qty"))
        .where(
            InventoryLot.organization_id == organization_id,
            InventoryLot.status == "active",
        )
        .group_by(InventoryLot.product_id)
        .subquery()
    )
    low_stock_stmt = (
        select(func.count(Product.id))
        .outerjoin(low_stock_subq, low_stock_subq.c.product_id == Product.id)
        .where(
            Product.organization_id == organization_id,
            Product.deleted_at.is_(None),
            Product.active.is_(True),
            Product.reorder_point.isnot(None),
            and_(func.coalesce(low_stock_subq.c.qty, Decimal("0")) <= Product.reorder_point),
        )
    )
    low_stock_count = (await db.execute(low_stock_stmt)).scalar_one() or 0

    return KPIs(
        active_patients=int(active_patients),
        active_clients=int(active_clients),
        total_encounters_last_30d=int(encounters_30d),
        average_transaction_charge=act.quantize(Decimal("0.01")),
        revenue_last_30d=revenue_total.quantize(Decimal("0.01")),
        revenue_per_vet_last_30d=revenue_per_vet,
        appointments_last_30d=total_appts,
        no_show_rate_pct=no_show_rate,
        vaccines_compliance_pct=vaccines_compliance,
        inventory_value=inventory_value,
        expiring_lots_count=int(expiring_count),
        low_stock_count=int(low_stock_count),
        period_start=period_start,
        period_end=today,
    )


async def financial_report(
    db: AsyncSession,
    *,
    organization_id: str,
    start: date,
    end: date,
) -> FinancialReport:
    start_dt = datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc)
    end_dt = datetime.combine(end, datetime.max.time(), tzinfo=timezone.utc)

    # Revenue totals (de órdenes pagadas)
    totals_stmt = select(
        func.coalesce(func.sum(Order.total), Decimal("0")),
        func.coalesce(func.sum(Order.igv_amount), Decimal("0")),
        func.coalesce(func.sum(Order.subtotal), Decimal("0")),
    ).where(
        Order.organization_id == organization_id,
        Order.status == "paid",
        Order.issued_at >= start_dt,
        Order.issued_at <= end_dt,
    )
    gross, igv, net = (await db.execute(totals_stmt)).one()

    # Payments by method
    by_method_stmt = (
        select(Payment.method, func.coalesce(func.sum(Payment.amount), Decimal("0")))
        .where(
            Payment.organization_id == organization_id,
            Payment.status == "confirmed",
            Payment.received_at >= start_dt,
            Payment.received_at <= end_dt,
        )
        .group_by(Payment.method)
    )
    payments_by_method: dict[str, Decimal] = {
        m: (amt or Decimal("0")).quantize(Decimal("0.01"))
        for m, amt in (await db.execute(by_method_stmt)).all()
    }

    # Documents
    docs_stmt = (
        select(ElectronicDocument.type, func.count(ElectronicDocument.id))
        .where(
            ElectronicDocument.organization_id == organization_id,
            ElectronicDocument.issued_at >= start_dt,
            ElectronicDocument.issued_at <= end_dt,
        )
        .group_by(ElectronicDocument.type)
    )
    doc_counts: dict[str, int] = {
        t: int(c) for t, c in (await db.execute(docs_stmt)).all()
    }
    cancelled_stmt = select(func.count(ElectronicDocument.id)).where(
        ElectronicDocument.organization_id == organization_id,
        ElectronicDocument.status == "cancelled",
        ElectronicDocument.issued_at >= start_dt,
        ElectronicDocument.issued_at <= end_dt,
    )
    cancelled = (await db.execute(cancelled_stmt)).scalar_one() or 0

    # Revenue por categoría de producto/servicio (simplificado: por type de doc)
    revenue_by_category = [
        RevenueByCategoryRow(
            category="Comprobantes emitidos",
            count=sum(doc_counts.values()),
            total=(gross or Decimal("0")).quantize(Decimal("0.01")),
        )
    ]

    return FinancialReport(
        period_start=start,
        period_end=end,
        gross_revenue=(gross or Decimal("0")).quantize(Decimal("0.01")),
        igv_collected=(igv or Decimal("0")).quantize(Decimal("0.01")),
        net_revenue=(net or Decimal("0")).quantize(Decimal("0.01")),
        payments_by_method=payments_by_method,
        revenue_by_category=revenue_by_category,
        invoices_emitted=doc_counts.get("01", 0),
        boletas_emitted=doc_counts.get("03", 0),
        cancelled_documents=int(cancelled),
    )


async def customer_count(db: AsyncSession, *, organization_id: str) -> int:
    result = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.organization_id == organization_id,
            Customer.deleted_at.is_(None),
        )
    )
    return result.scalar_one() or 0
