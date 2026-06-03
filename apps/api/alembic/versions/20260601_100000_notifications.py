"""notifications + message_template

Revision ID: 20260601_100000
Revises: 20260601_090000
Create Date: 2026-06-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260601_100000"
down_revision: str | Sequence[str] | None = "20260601_090000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "message_template",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("locale", sa.String(10), nullable=False, server_default="es_PE"),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("variables", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("provider_template_id", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="approved"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_message_template_organization_id_organization",
        ),
        sa.UniqueConstraint(
            "organization_id", "code", "channel", name="uq_message_template_org_code_channel"
        ),
    )
    op.create_index("ix_message_template_organization_id", "message_template", ["organization_id"])

    op.create_table(
        "notification",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("template_code", sa.String(100), nullable=True),
        sa.Column("template_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("body_preview", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("provider", sa.String(50), nullable=True),
        sa.Column("provider_message_id", sa.String(100), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("related_type", sa.String(50), nullable=True),
        sa.Column("related_id", sa.String(26), nullable=True),
        sa.Column("cost_estimate", sa.Numeric(10, 4), nullable=True),
        sa.Column("customer_id", sa.String(26), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_notification_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"], ["customer.id"], name="fk_notification_customer_id_customer"
        ),
    )
    op.create_index("ix_notification_organization_id", "notification", ["organization_id"])
    op.create_index("ix_notification_recipient", "notification", ["recipient"])
    op.create_index("ix_notification_status", "notification", ["status"])
    op.create_index("ix_notification_customer_id", "notification", ["customer_id"])


def downgrade() -> None:
    op.drop_index("ix_notification_customer_id", table_name="notification")
    op.drop_index("ix_notification_status", table_name="notification")
    op.drop_index("ix_notification_recipient", table_name="notification")
    op.drop_index("ix_notification_organization_id", table_name="notification")
    op.drop_table("notification")
    op.drop_index("ix_message_template_organization_id", table_name="message_template")
    op.drop_table("message_template")
