"""Modelos comerciales: ServiceCatalog, Order, OrderItem, Payment, CashSession."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    pass


class ServiceCatalog(Base, IDMixin, TimestampMixin):
    """Servicios facturables (consultas, cirugías, vacunaciones)."""

    __tablename__ = "service_catalog"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    base_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    price_includes_igv: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    igv_affected: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    sunat_code: Mapped[str | None] = mapped_column(String(20))
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Order(Base, IDMixin, TimestampMixin):
    """Ticket de venta."""

    __tablename__ = "order"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("branch.id"))
    encounter_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("encounter.id"), index=True
    )
    customer_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("customer.id"), nullable=False, index=True
    )
    cash_session_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("cash_session.id"), index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", server_default="draft", index=True
    )
    number: Mapped[int | None] = mapped_column(Integer)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    igv_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))

    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    payments: Mapped[list[Payment]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )

    @property
    def balance(self) -> Decimal:
        return self.total - self.paid_amount


class OrderItem(Base, IDMixin):
    """Línea de orden: un servicio o un producto."""

    __tablename__ = "order_item"
    __table_args__ = (
        CheckConstraint(
            "(product_id IS NULL) <> (service_id IS NULL)",
            name="ck_order_item_one_of_product_or_service",
        ),
    )

    order_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("order.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("product.id"))
    service_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("service_catalog.id"))
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0"), server_default="0"
    )
    igv_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    lot_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("inventory_lot.id"))
    reference_type: Mapped[str | None] = mapped_column(String(50))
    reference_id: Mapped[str | None] = mapped_column(String(26))

    order: Mapped[Order] = relationship(back_populates="items")


class Payment(Base, IDMixin):
    """Pago manual aplicado a una orden."""

    __tablename__ = "payment"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("order.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cash_session_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("cash_session.id")
    )
    method: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(100))
    voucher_image_key: Mapped[str | None] = mapped_column(String(500))
    received_by: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="confirmed", server_default="confirmed"
    )

    order: Mapped[Order] = relationship(back_populates="payments")


class CashSession(Base, IDMixin, TimestampMixin):
    """Apertura/cierre de caja por usuario y turno."""

    __tablename__ = "cash_session"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("branch.id"))
    user_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("user.id"), nullable=False, index=True
    )
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    opening_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0"), server_default="0"
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closing_balance_declared: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    closing_balance_calculated: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    difference: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    notes: Mapped[str | None] = mapped_column(Text)
