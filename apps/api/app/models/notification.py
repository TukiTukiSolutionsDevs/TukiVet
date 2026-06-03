"""Notification log y catálogo de plantillas (HSM WhatsApp / email)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class MessageTemplate(Base, IDMixin, TimestampMixin):
    """Plantilla para mensajes salientes (WhatsApp HSM o email)."""

    __tablename__ = "message_template"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "code", "channel", name="uq_message_template_org_code_channel"
        ),
    )

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    locale: Mapped[str] = mapped_column(
        String(10), nullable=False, default="es_PE", server_default="es_PE"
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[list[Any] | None] = mapped_column(JSONB)
    provider_template_id: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="approved", server_default="approved"
    )


class Notification(Base, IDMixin, TimestampMixin):
    """Log de cada envío (entregable + outbox simultáneamente)."""

    __tablename__ = "notification"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    template_code: Mapped[str | None] = mapped_column(String(100))
    template_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    body_preview: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="queued", server_default="queued", index=True
    )
    provider: Mapped[str | None] = mapped_column(String(50))
    provider_message_id: Mapped[str | None] = mapped_column(String(100))
    error_message: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    related_type: Mapped[str | None] = mapped_column(String(50))
    related_id: Mapped[str | None] = mapped_column(String(26))
    cost_estimate: Mapped[Decimal | None] = mapped_column(Numeric(10, 4))
    customer_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("customer.id"), index=True
    )
