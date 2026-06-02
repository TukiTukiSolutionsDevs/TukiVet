"""Servicios para clientes (tutores)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.models import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


async def list_customers(
    db: AsyncSession,
    *,
    organization_id: str,
    q: str | None = None,
    document_number: str | None = None,
    page: int = 1,
    page_size: int = 20,
    include_deleted: bool = False,
) -> tuple[list[Customer], int]:
    stmt = select(Customer).where(Customer.organization_id == organization_id)
    count_stmt = select(func.count(Customer.id)).where(Customer.organization_id == organization_id)
    if not include_deleted:
        stmt = stmt.where(Customer.deleted_at.is_(None))
        count_stmt = count_stmt.where(Customer.deleted_at.is_(None))
    if document_number:
        stmt = stmt.where(Customer.document_number == document_number.strip())
        count_stmt = count_stmt.where(Customer.document_number == document_number.strip())
    if q:
        like = f"%{q.lower()}%"
        condition = or_(
            func.lower(Customer.first_name).like(like),
            func.lower(Customer.last_name).like(like),
            func.lower(func.coalesce(Customer.business_name, "")).like(like),
            Customer.phone_primary.like(f"%{q}%"),
            Customer.document_number.like(f"%{q}%"),
        )
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    stmt = stmt.order_by(Customer.last_name.asc(), Customer.first_name.asc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows), total


async def get_customer(
    db: AsyncSession, *, organization_id: str, customer_id: str
) -> Customer:
    customer = await db.get(Customer, customer_id)
    if (
        customer is None
        or customer.organization_id != organization_id
        or customer.deleted_at is not None
    ):
        raise NotFoundError("Cliente no encontrado")
    return customer


async def create_customer(
    db: AsyncSession,
    *,
    organization_id: str,
    payload: CustomerCreate,
) -> Customer:
    existing = await db.execute(
        select(Customer).where(
            Customer.organization_id == organization_id,
            Customer.document_type == payload.document_type,
            Customer.document_number == payload.document_number.strip(),
            Customer.deleted_at.is_(None),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("Ya existe un cliente con ese documento")

    customer = Customer(
        organization_id=organization_id,
        document_type=payload.document_type,
        document_number=payload.document_number.strip(),
        first_name=payload.first_name,
        last_name=payload.last_name,
        business_name=payload.business_name,
        email=payload.email,
        phone_primary=payload.phone_primary,
        phone_secondary=payload.phone_secondary,
        whatsapp_opted_in=payload.whatsapp_opted_in,
        email_opted_in=payload.email_opted_in,
        address=payload.address,
        district=payload.district,
        city=payload.city,
        birth_date=payload.birth_date,
        referral_source=payload.referral_source,
        notes=payload.notes,
    )
    db.add(customer)
    await db.flush()
    return customer


async def update_customer(
    db: AsyncSession,
    *,
    organization_id: str,
    customer_id: str,
    payload: CustomerUpdate,
) -> Customer:
    customer = await get_customer(db, organization_id=organization_id, customer_id=customer_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(customer, field, value)
    await db.flush()
    return customer


async def soft_delete_customer(
    db: AsyncSession,
    *,
    organization_id: str,
    customer_id: str,
) -> Customer:
    customer = await get_customer(db, organization_id=organization_id, customer_id=customer_id)
    customer.deleted_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return customer
