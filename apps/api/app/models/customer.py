"""Modelo Customer (tutor/dueño de la mascota)."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.pet import PetOwner


class Customer(Base, IDMixin, TimestampMixin):
    """Tutor / dueño. Su DNI/RUC + organización es unique."""

    __tablename__ = "customer"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "document_type",
            "document_number",
            name="uq_customer_org_doc",
        ),
    )

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_type: Mapped[str] = mapped_column(String(10), nullable=False)
    document_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    business_name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    phone_primary: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    phone_secondary: Mapped[str | None] = mapped_column(String(20))
    whatsapp_opted_in: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    email_opted_in: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    address: Mapped[str | None] = mapped_column(String(500))
    district: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str] = mapped_column(
        String(100), nullable=False, default="Lima", server_default="Lima"
    )
    birth_date: Mapped[date | None] = mapped_column(Date)
    referral_source: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    pet_owners: Mapped[list[PetOwner]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )

    @property
    def display_name(self) -> str:
        if self.business_name:
            return self.business_name
        return f"{self.first_name} {self.last_name}".strip()
