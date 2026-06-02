"""Modelos del encuentro clínico, SOAP, signos vitales y enmiendas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Encounter(Base, IDMixin, TimestampMixin):
    """Visita / encuentro clínico de una mascota."""

    __tablename__ = "encounter"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("branch.id"), index=True
    )
    pet_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("pet.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("customer.id"), nullable=False
    )
    veterinarian_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("user.id"), index=True
    )
    type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="consultation", server_default="consultation"
    )
    chief_complaint: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", server_default="draft", index=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )

    veterinarian: Mapped[User | None] = relationship()
    soap_note: Mapped[SoapNote | None] = relationship(
        back_populates="encounter",
        cascade="all, delete-orphan",
        uselist=False,
    )
    vital_signs: Mapped[list[VitalSign]] = relationship(
        back_populates="encounter", cascade="all, delete-orphan"
    )
    amendments: Mapped[list[EncounterAmendment]] = relationship(
        back_populates="encounter", cascade="all, delete-orphan"
    )

    @property
    def is_closed(self) -> bool:
        return self.status in ("closed", "amended")


class SoapNote(Base, IDMixin, TimestampMixin):
    """Nota SOAP del encuentro. JSONB para flexibilidad."""

    __tablename__ = "soap_note"

    encounter_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("encounter.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    subjective: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    objective: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    assessment: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    plan: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    template_id: Mapped[str | None] = mapped_column(String(26))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    is_current: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    encounter: Mapped[Encounter] = relationship(back_populates="soap_note")


class VitalSign(Base, IDMixin):
    """Signos vitales tomados en un encuentro."""

    __tablename__ = "vital_sign"

    encounter_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("encounter.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    temperature_c: Mapped[Decimal | None] = mapped_column(Numeric(4, 1))
    heart_rate_bpm: Mapped[int | None] = mapped_column(Integer)
    respiratory_rate: Mapped[int | None] = mapped_column(Integer)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    body_condition_score: Mapped[int | None] = mapped_column(Integer)
    mucous_membranes: Mapped[str | None] = mapped_column(String(50))
    capillary_refill_seconds: Mapped[Decimal | None] = mapped_column(Numeric(3, 1))
    hydration_status: Mapped[str | None] = mapped_column(String(50))
    pain_score: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    recorded_by: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))

    encounter: Mapped[Encounter] = relationship(back_populates="vital_signs")


class EncounterAmendment(Base, IDMixin):
    """Registro inmutable de cualquier enmienda hecha sobre un encounter cerrado."""

    __tablename__ = "encounter_amendment"

    encounter_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("encounter.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amended_by_user_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("user.id"), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    before_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    after_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    encounter: Mapped[Encounter] = relationship(back_populates="amendments")
