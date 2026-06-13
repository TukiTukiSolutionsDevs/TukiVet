"""Modelo PetDocument — archivos adjuntos a mascotas."""

from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class PetDocument(Base, IDMixin, TimestampMixin):
    """Archivo adjunto a una mascota (examen, imagen, certificado, etc.)."""

    __tablename__ = "pet_document"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pet_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("pet.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by: Mapped[str] = mapped_column(
        String(26), ForeignKey("user.id"), nullable=False
    )
    encounter_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("encounter.id"), nullable=True, index=True
    )
    file_key: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="other",
        server_default="other",
        index=True,
    )
    description: Mapped[str | None] = mapped_column(Text)
