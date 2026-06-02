"""Lista de problemas (POMR) por mascota."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    pass


class Problem(Base, IDMixin, TimestampMixin):
    """Problema clínico (POMR — Problem-Oriented Medical Record) de una mascota."""

    __tablename__ = "problem"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pet_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("pet.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50))  # VeNom / SNOMED-CT
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active"
    )
    onset_date: Mapped[date | None] = mapped_column(Date)
    resolved_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_encounter_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("encounter.id")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
