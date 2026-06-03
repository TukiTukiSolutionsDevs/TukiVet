"""Modelos Prescription y PrescriptionItem."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    pass


class Prescription(Base, IDMixin, TimestampMixin):
    """Receta clínica (cabecera)."""

    __tablename__ = "prescription"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    encounter_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("encounter.id"), index=True
    )
    pet_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("pet.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prescribed_by: Mapped[str] = mapped_column(
        String(26), ForeignKey("user.id"), nullable=False
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    diagnosis: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="issued", server_default="issued", index=True
    )

    items: Mapped[list[PrescriptionItem]] = relationship(
        back_populates="prescription", cascade="all, delete-orphan"
    )


class PrescriptionItem(Base, IDMixin):
    """Línea de receta."""

    __tablename__ = "prescription_item"

    prescription_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("prescription.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("product.id"))
    medication_name: Mapped[str] = mapped_column(String(255), nullable=False)
    active_ingredient: Mapped[str | None] = mapped_column(String(255))
    dose_mg_per_kg: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    total_dose_mg: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    presentation: Mapped[str | None] = mapped_column(String(100))
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    frequency: Mapped[str | None] = mapped_column(String(100))
    duration_days: Mapped[int | None] = mapped_column(Integer)
    route: Mapped[str | None] = mapped_column(String(50))
    instructions: Mapped[str | None] = mapped_column(Text)
    dispensed_qty: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0"), server_default="0"
    )
    dispensed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dispensed_by: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))
    lot_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("inventory_lot.id"))
    is_controlled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    witness_user_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))

    prescription: Mapped[Prescription] = relationship(back_populates="items")
