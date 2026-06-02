"""Modelos de inventario: producto, lote, movimiento, proveedor."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    pass


class Supplier(Base, IDMixin, TimestampMixin):
    """Proveedor de productos para la veterinaria."""

    __tablename__ = "supplier"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ruc: Mapped[str | None] = mapped_column(String(11))
    contact_name: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(500))
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Product(Base, IDMixin, TimestampMixin):
    """Producto del catálogo (medicamento, alimento, accesorio, insumo)."""

    __tablename__ = "product"
    __table_args__ = (UniqueConstraint("organization_id", "sku", name="uq_product_org_sku"),)

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sku: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    subcategory: Mapped[str | None] = mapped_column(String(100))
    presentation: Mapped[str | None] = mapped_column(String(100))
    active_ingredient: Mapped[str | None] = mapped_column(String(255))
    manufacturer: Mapped[str | None] = mapped_column(String(150))
    is_controlled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    barcode: Mapped[str | None] = mapped_column(String(50), index=True)
    unit: Mapped[str] = mapped_column(
        String(20), nullable=False, default="unidad", server_default="unidad"
    )
    reorder_point: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    reorder_qty: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    sale_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    sale_price_includes_igv: Mapped[bool] = mapped_column(
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

    lots: Mapped[list[InventoryLot]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class InventoryLot(Base, IDMixin, TimestampMixin):
    """Lote físico de un producto con fecha de vencimiento."""

    __tablename__ = "inventory_lot"
    __table_args__ = (
        UniqueConstraint("product_id", "lot_number", name="uq_lot_product_number"),
        CheckConstraint("current_qty >= 0", name="ck_inventory_lot_current_qty_non_negative"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("product.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lot_number: Mapped[str] = mapped_column(String(50), nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, index=True)
    received_at: Mapped[date | None] = mapped_column(Date)
    supplier_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("supplier.id"))
    unit_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 4), nullable=False, default=Decimal("0.0000")
    )
    initial_qty: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0")
    )
    current_qty: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0")
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active"
    )

    product: Mapped[Product] = relationship(back_populates="lots")


class InventoryMovement(Base, IDMixin):
    """Movimiento de inventario (compra, venta, ajuste, merma)."""

    __tablename__ = "inventory_movement"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("product.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lot_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("inventory_lot.id"))
    type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    reference_type: Mapped[str | None] = mapped_column(String(50))
    reference_id: Mapped[str | None] = mapped_column(String(26))
    reason: Mapped[str | None] = mapped_column(Text)
    performed_by: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))
    witness_user_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
