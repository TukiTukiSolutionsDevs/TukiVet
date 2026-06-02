"""Catálogo de razas por especie."""

from __future__ import annotations

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin


class Breed(Base, IDMixin):
    """Raza pre-cargada en el catálogo (canino, felino, etc.)."""

    __tablename__ = "breed"
    __table_args__ = (UniqueConstraint("species", "name_es", name="uq_breed_species_name"),)

    species: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name_es: Mapped[str] = mapped_column(String(100), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(100))
