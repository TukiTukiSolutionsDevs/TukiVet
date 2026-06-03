"""Portal del cliente: credenciales, sesiones, consentimientos, derechos ARCO."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class CustomerCredential(Base, TimestampMixin):
    """Credenciales del cliente para el portal externo."""

    __tablename__ = "customer_credential"

    customer_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("customer.id", ondelete="CASCADE"),
        primary_key=True,
    )
    password_hash: Mapped[str | None] = mapped_column(String(255))
    magic_link_email_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    magic_link_whatsapp_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CustomerMagicLink(Base, IDMixin):
    """Token efímero para login del portal cliente."""

    __tablename__ = "customer_magic_link"

    customer_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("customer.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    sent_to: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class CustomerSession(Base):
    """Refresh tokens persistidos del portal cliente."""

    __tablename__ = "customer_session"

    jti: Mapped[str] = mapped_column(String(26), primary_key=True)
    customer_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("customer.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(500))


class Consent(Base, IDMixin):
    """Consentimientos firmados (Ley 29733 y consentimientos clínicos)."""

    __tablename__ = "consent"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("customer.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(500))
    document_storage_key: Mapped[str | None] = mapped_column(String(500))
    body_hash: Mapped[str] = mapped_column(String(64), nullable=False)


class DataSubjectRequest(Base, IDMixin, TimestampMixin):
    """Pedidos ARCO de Ley 29733."""

    __tablename__ = "data_subject_request"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("customer.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    response: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    handled_by: Mapped[str | None] = mapped_column(String(26), ForeignKey("user.id"))
