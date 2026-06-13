"""pet_document table

Revision ID: 20260612_000000
Revises: 20260601_110000
Create Date: 2026-06-12
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260612_000000"
down_revision: str | Sequence[str] | None = "20260601_110000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pet_document",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column(
            "organization_id",
            sa.String(26),
            sa.ForeignKey("organization.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "pet_id",
            sa.String(26),
            sa.ForeignKey("pet.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "uploaded_by",
            sa.String(26),
            sa.ForeignKey("user.id"),
            nullable=False,
        ),
        sa.Column(
            "encounter_id",
            sa.String(26),
            sa.ForeignKey("encounter.id"),
            nullable=True,
        ),
        sa.Column("file_key", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column(
            "category",
            sa.String(50),
            nullable=False,
            server_default="other",
        ),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_pet_document_organization_id", "pet_document", ["organization_id"])
    op.create_index("ix_pet_document_pet_id", "pet_document", ["pet_id"])
    op.create_index("ix_pet_document_encounter_id", "pet_document", ["encounter_id"])
    op.create_index("ix_pet_document_category", "pet_document", ["category"])


def downgrade() -> None:
    op.drop_table("pet_document")
