"""Vacunas: catálogo, administraciones y protocolos por especie."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    pass


class VaccineCatalog(Base, IDMixin, TimestampMixin):
    """Catálogo de vacunas disponibles en la organización."""

    __tablename__ = "vaccine_catalog"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    species: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    manufacturer: Mapped[str | None] = mapped_column(String(150))
    protects_against: Mapped[str | None] = mapped_column(Text)
    default_booster_interval_days: Mapped[int | None] = mapped_column(Integer)
    is_rabies: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class VaccineAdministration(Base, IDMixin, TimestampMixin):
    """Aplicación concreta de una vacuna a una mascota."""

    __tablename__ = "vaccine_administration"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pet_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("pet.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vaccine_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("vaccine_catalog.id"), nullable=False
    )
    encounter_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("encounter.id"), index=True
    )
    administered_by: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))
    administered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    lot_number: Mapped[str | None] = mapped_column(String(50))
    expiry_date: Mapped[date | None] = mapped_column(Date)
    site_of_application: Mapped[str | None] = mapped_column(String(100))
    dose_number: Mapped[int | None] = mapped_column(Integer)
    next_dose_due_date: Mapped[date | None] = mapped_column(Date, index=True)
    certificate_number: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="administered", server_default="administered"
    )

    vaccine: Mapped[VaccineCatalog] = relationship()
