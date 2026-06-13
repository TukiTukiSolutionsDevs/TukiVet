"""safe_recipient table

Revision ID: 20260613_000000
Revises: 20260612_000000
Create Date: 2026-06-13
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260613_000000"
down_revision: str | Sequence[str] | None = "20260612_000000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "safe_recipient",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column(
            "organization_id",
            sa.String(26),
            sa.ForeignKey("organization.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("phone_number", sa.String(30), nullable=False),
        sa.Column("label", sa.String(100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_safe_recipient_organization_id", "safe_recipient", ["organization_id"]
    )


def downgrade() -> None:
    op.drop_table("safe_recipient")
