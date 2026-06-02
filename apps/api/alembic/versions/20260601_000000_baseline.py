"""baseline empty migration

Revision ID: 20260601_000000
Revises:
Create Date: 2026-06-01

Esta migración baseline no crea tablas. Sirve como ancla del historial
de migraciones; las próximas (Sprint 1 en adelante) crearán las tablas.
"""

from __future__ import annotations

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260601_000000"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
