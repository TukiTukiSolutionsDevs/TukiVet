"""Modelos de agenda: Appointment, Room, TimeOff."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    pass


class Room(Base, IDMixin, TimestampMixin):
    """Consultorio / sala / equipo asignable a citas."""

    __tablename__ = "room"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("branch.id"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="consultation", server_default="consultation"
    )
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Appointment(Base, IDMixin, TimestampMixin):
    """Cita agendada."""

    __tablename__ = "appointment"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("branch.id"))
    pet_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("pet.id"), index=True
    )
    customer_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("customer.id"), nullable=False, index=True
    )
    veterinarian_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("user.id"), nullable=False, index=True
    )
    room_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("room.id"))
    type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="consultation", server_default="consultation"
    )
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="scheduled", server_default="scheduled", index=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_by_user_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))
    cancel_reason: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(
        String(20), nullable=False, default="staff", server_default="staff"
    )


class TimeOff(Base, IDMixin, TimestampMixin):
    """Bloqueo de agenda (vacaciones, almuerzo, mantenimiento)."""

    __tablename__ = "time_off"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"), index=True)
    room_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("room.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255))
