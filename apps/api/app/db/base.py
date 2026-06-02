"""Base declarativa de SQLAlchemy y utilidades compartidas."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, MetaData, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from ulid import ULID

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base declarativa de todos los modelos."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def new_ulid() -> str:
    """Genera un ULID nuevo (26 chars) en formato string."""
    return str(ULID())


class TimestampMixin:
    """Agrega `created_at` y `updated_at` con valores automáticos."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )


class IDMixin:
    """Agrega `id` como ULID string."""

    id: Mapped[str] = mapped_column(
        String(26),
        primary_key=True,
        default=new_ulid,
    )
