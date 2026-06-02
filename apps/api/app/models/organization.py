"""Modelos de organización y sede."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Organization(Base, IDMixin, TimestampMixin):
    """Empresa/clínica. En el MVP single-tenant hay sólo una fila."""

    __tablename__ = "organization"

    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    trade_name: Mapped[str] = mapped_column(String(255), nullable=False)
    ruc: Mapped[str] = mapped_column(String(11), nullable=False, unique=True, index=True)
    address: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    settings: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    branches: Mapped[list[Branch]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    users: Mapped[list[User]] = relationship(back_populates="organization")


class Branch(Base, IDMixin, TimestampMixin):
    """Sede física de la organización."""

    __tablename__ = "branch"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(20))
    is_main: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    timezone: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="America/Lima",
        server_default="America/Lima",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    organization: Mapped[Organization] = relationship(back_populates="branches")
