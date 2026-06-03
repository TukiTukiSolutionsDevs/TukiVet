"""Comprobantes electrónicos SUNAT y eventos de TukiFact."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class ElectronicDocument(Base, IDMixin, TimestampMixin):
    """Factura / boleta / NC / ND electrónica emitida vía TukiFact."""

    __tablename__ = "electronic_document"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "series", "number", name="uq_electronic_document_series_number"
        ),
    )

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("order.id"), index=True
    )
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # 01, 03, 07, 08
    series: Mapped[str] = mapped_column(String(4), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    customer_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("customer.id"))
    customer_document_type: Mapped[str] = mapped_column(String(10), nullable=False)
    customer_document_number: Mapped[str] = mapped_column(String(20), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_address: Mapped[str | None] = mapped_column(String(500))
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="PEN", server_default="PEN"
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    igv_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending", index=True
    )
    tukifact_id: Mapped[str | None] = mapped_column(String(100), index=True)
    tukifact_status: Mapped[str | None] = mapped_column(String(20))
    sunat_code: Mapped[str | None] = mapped_column(String(10))
    sunat_message: Mapped[str | None] = mapped_column(Text)
    referenced_document_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("electronic_document.id")
    )
    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    raw_request: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    raw_response: Mapped[dict[str, Any] | None] = mapped_column(JSONB)


class DocumentSeriesCounter(Base, IDMixin):
    """Contador de correlativos por (org, tipo, serie)."""

    __tablename__ = "document_series_counter"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "type", "series", name="uq_series_counter_org_type_series"
        ),
    )

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    series: Mapped[str] = mapped_column(String(4), nullable=False)
    next_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class ElectronicDocumentEvent(Base, IDMixin):
    """Bitácora de eventos del comprobante (webhooks, intentos)."""

    __tablename__ = "electronic_document_event"

    electronic_document_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("electronic_document.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
