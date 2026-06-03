"""customer portal + consent + arco

Revision ID: 20260601_110000
Revises: 20260601_100000
Create Date: 2026-06-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260601_110000"
down_revision: str | Sequence[str] | None = "20260601_100000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customer_credential",
        sa.Column("customer_id", sa.String(26), primary_key=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column(
            "magic_link_email_enabled",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "magic_link_whatsapp_enabled",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customer.id"],
            ondelete="CASCADE",
            name="fk_customer_credential_customer_id_customer",
        ),
    )

    op.create_table(
        "customer_magic_link",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("customer_id", sa.String(26), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("sent_to", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customer.id"],
            ondelete="CASCADE",
            name="fk_customer_magic_link_customer_id_customer",
        ),
    )
    op.create_index(
        "ix_customer_magic_link_customer_id", "customer_magic_link", ["customer_id"]
    )
    op.create_index("ix_customer_magic_link_token_hash", "customer_magic_link", ["token_hash"])

    op.create_table(
        "customer_session",
        sa.Column("jti", sa.String(26), primary_key=True),
        sa.Column("customer_id", sa.String(26), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customer.id"],
            ondelete="CASCADE",
            name="fk_customer_session_customer_id_customer",
        ),
    )
    op.create_index("ix_customer_session_customer_id", "customer_session", ["customer_id"])

    op.create_table(
        "consent",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("customer_id", sa.String(26), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("version", sa.String(20), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("document_storage_key", sa.String(500), nullable=True),
        sa.Column("body_hash", sa.String(64), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_consent_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customer.id"],
            ondelete="CASCADE",
            name="fk_consent_customer_id_customer",
        ),
    )
    op.create_index("ix_consent_organization_id", "consent", ["organization_id"])
    op.create_index("ix_consent_customer_id", "consent", ["customer_id"])

    op.create_table(
        "data_subject_request",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("customer_id", sa.String(26), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("response", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("handled_by", sa.String(26), nullable=True),
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
            name="fk_data_subject_request_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customer.id"],
            ondelete="CASCADE",
            name="fk_data_subject_request_customer_id_customer",
        ),
        sa.ForeignKeyConstraint(
            ["handled_by"], ["user.id"], name="fk_data_subject_request_handled_by_user"
        ),
    )
    op.create_index(
        "ix_data_subject_request_organization_id",
        "data_subject_request",
        ["organization_id"],
    )
    op.create_index(
        "ix_data_subject_request_customer_id", "data_subject_request", ["customer_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_data_subject_request_customer_id", table_name="data_subject_request")
    op.drop_index(
        "ix_data_subject_request_organization_id", table_name="data_subject_request"
    )
    op.drop_table("data_subject_request")
    op.drop_index("ix_consent_customer_id", table_name="consent")
    op.drop_index("ix_consent_organization_id", table_name="consent")
    op.drop_table("consent")
    op.drop_index("ix_customer_session_customer_id", table_name="customer_session")
    op.drop_table("customer_session")
    op.drop_index("ix_customer_magic_link_token_hash", table_name="customer_magic_link")
    op.drop_index("ix_customer_magic_link_customer_id", table_name="customer_magic_link")
    op.drop_table("customer_magic_link")
    op.drop_table("customer_credential")
