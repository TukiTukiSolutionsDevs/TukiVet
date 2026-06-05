"""electronic_document + series counter + events

Revision ID: 20260601_090000
Revises: 20260601_080000
Create Date: 2026-06-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260601_090000"
down_revision: str | Sequence[str] | None = "20260601_080000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "electronic_document",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("order_id", sa.String(26), nullable=True),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("series", sa.String(4), nullable=False),
        sa.Column("number", sa.Integer, nullable=False),
        sa.Column("customer_id", sa.String(26), nullable=True),
        sa.Column("customer_document_type", sa.String(10), nullable=False),
        sa.Column("customer_document_number", sa.String(20), nullable=False),
        sa.Column("customer_name", sa.String(255), nullable=False),
        sa.Column("customer_address", sa.String(500), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="PEN"),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("igv_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("tukifact_id", sa.String(100), nullable=True),
        sa.Column("tukifact_status", sa.String(20), nullable=True),
        sa.Column("sunat_code", sa.String(10), nullable=True),
        sa.Column("sunat_message", sa.Text, nullable=True),
        sa.Column("referenced_document_id", sa.String(26), nullable=True),
        sa.Column("cancellation_reason", sa.Text, nullable=True),
        sa.Column("raw_request", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("raw_response", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
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
            name="fk_electronic_document_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"], ["order.id"], name="fk_electronic_document_order_id_order"
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"], ["customer.id"], name="fk_electronic_document_customer_id_customer"
        ),
        sa.ForeignKeyConstraint(
            ["referenced_document_id"],
            ["electronic_document.id"],
            name="fk_electronic_document_referenced_id",
        ),
        sa.UniqueConstraint(
            "organization_id", "series", "number", name="uq_electronic_document_series_number"
        ),
    )
    op.create_index(
        "ix_electronic_document_organization_id", "electronic_document", ["organization_id"]
    )
    op.create_index("ix_electronic_document_order_id", "electronic_document", ["order_id"])
    op.create_index("ix_electronic_document_status", "electronic_document", ["status"])
    op.create_index("ix_electronic_document_tukifact_id", "electronic_document", ["tukifact_id"])

    op.create_table(
        "document_series_counter",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("series", sa.String(4), nullable=False),
        sa.Column("next_number", sa.Integer, nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_document_series_counter_organization_id_organization",
        ),
        sa.UniqueConstraint(
            "organization_id", "type", "series", name="uq_series_counter_org_type_series"
        ),
    )

    op.create_table(
        "electronic_document_event",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("electronic_document_id", sa.String(26), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["electronic_document_id"],
            ["electronic_document.id"],
            ondelete="CASCADE",
            name="fk_electronic_document_event_doc_id",
        ),
    )
    op.create_index(
        "ix_electronic_document_event_electronic_document_id",
        "electronic_document_event",
        ["electronic_document_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_electronic_document_event_electronic_document_id",
        table_name="electronic_document_event",
    )
    op.drop_table("electronic_document_event")
    op.drop_table("document_series_counter")
    op.drop_index("ix_electronic_document_tukifact_id", table_name="electronic_document")
    op.drop_index("ix_electronic_document_status", table_name="electronic_document")
    op.drop_index("ix_electronic_document_order_id", table_name="electronic_document")
    op.drop_index("ix_electronic_document_organization_id", table_name="electronic_document")
    op.drop_table("electronic_document")
