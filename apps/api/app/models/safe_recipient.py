"""Números de teléfono en lista blanca para modo safe-recipients."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin


class SafeRecipient(Base, IDMixin):
    __tablename__ = "safe_recipient"

    organization_id: Mapped[str] = mapped_column(
        String(26), nullable=False, index=True
    )
    phone_number: Mapped[str] = mapped_column(String(30), nullable=False)
    label: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
