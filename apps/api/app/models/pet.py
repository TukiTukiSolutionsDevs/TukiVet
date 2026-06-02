"""Modelo Pet (mascota) + PetOwner + PetWeightHistory."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.customer import Customer


class Pet(Base, IDMixin, TimestampMixin):
    """Mascota registrada en la organización."""

    __tablename__ = "pet"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    species: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    breed_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("breed.id"))
    breed_name: Mapped[str | None] = mapped_column(String(100))
    sex: Mapped[str] = mapped_column(
        String(10), nullable=False, default="unknown", server_default="unknown"
    )
    birth_date: Mapped[date | None] = mapped_column(Date)
    birth_date_estimated: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    color: Mapped[str | None] = mapped_column(String(100))
    distinguishing_marks: Mapped[str | None] = mapped_column(Text)
    microchip: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    tattoo: Mapped[str | None] = mapped_column(String(50))
    sterilized: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    sterilization_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active"
    )
    deceased_date: Mapped[date | None] = mapped_column(Date)
    deceased_reason: Mapped[str | None] = mapped_column(Text)
    alerts: Mapped[list[Any] | None] = mapped_column(JSONB)
    chronic_conditions: Mapped[list[Any] | None] = mapped_column(JSONB)
    current_weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    current_weight_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    pet_owners: Mapped[list[PetOwner]] = relationship(
        back_populates="pet",
        cascade="all, delete-orphan",
    )
    weights: Mapped[list[PetWeightHistory]] = relationship(
        back_populates="pet",
        cascade="all, delete-orphan",
    )


class PetOwner(Base, TimestampMixin):
    """Relación M:N entre customer y pet con un rol."""

    __tablename__ = "pet_owner"

    customer_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("customer.id", ondelete="CASCADE"),
        primary_key=True,
    )
    pet_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("pet.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="primary", server_default="primary"
    )

    customer: Mapped[Customer] = relationship(back_populates="pet_owners")
    pet: Mapped[Pet] = relationship(back_populates="pet_owners")


class PetWeightHistory(Base, IDMixin):
    """Histórico longitudinal de pesos."""

    __tablename__ = "pet_weight_history"

    pet_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("pet.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    recorded_by: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))
    notes: Mapped[str | None] = mapped_column(Text)

    pet: Mapped[Pet] = relationship(back_populates="weights")
