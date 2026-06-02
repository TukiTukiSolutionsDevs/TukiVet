"""initial auth + organization tables

Revision ID: 20260601_010000
Revises: 20260601_000000
Create Date: 2026-06-01

Crea las tablas de identidad: organization, branch, user, role, permission,
role_permission, user_role, refresh_token, audit_log. Siembra el catálogo
global de permisos.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.core.permissions import PERMISSIONS

# revision identifiers, used by Alembic.
revision: str = "20260601_010000"
down_revision: str | Sequence[str] | None = "20260601_000000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organization",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("legal_name", sa.String(255), nullable=False),
        sa.Column("trade_name", sa.String(255), nullable=False),
        sa.Column("ruc", sa.String(11), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("ruc", name="uq_organization_ruc"),
    )
    op.create_index("ix_organization_ruc", "organization", ["ruc"])

    op.create_table(
        "branch",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("is_main", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("timezone", sa.String(50), nullable=False, server_default="America/Lima"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_branch_organization_id_organization",
        ),
    )
    op.create_index("ix_branch_organization_id", "branch", ["organization_id"])

    op.create_table(
        "user",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("professional_id", sa.String(50), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_user_organization_id_organization",
        ),
        sa.UniqueConstraint("email", name="uq_user_email"),
    )
    op.create_index("ix_user_organization_id", "user", ["organization_id"])
    op.create_index("ix_user_email", "user", ["email"])

    op.create_table(
        "permission",
        sa.Column("code", sa.String(100), primary_key=True),
        sa.Column("description", sa.String(500), nullable=False),
    )

    op.create_table(
        "role",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_role_organization_id_organization",
        ),
        sa.UniqueConstraint("organization_id", "code", name="uq_role_org_code"),
    )
    op.create_index("ix_role_organization_id", "role", ["organization_id"])

    op.create_table(
        "role_permission",
        sa.Column("role_id", sa.String(26), nullable=False),
        sa.Column("permission_code", sa.String(100), nullable=False),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["role.id"],
            ondelete="CASCADE",
            name="fk_role_permission_role_id_role",
        ),
        sa.ForeignKeyConstraint(
            ["permission_code"],
            ["permission.code"],
            ondelete="CASCADE",
            name="fk_role_permission_permission_code_permission",
        ),
        sa.PrimaryKeyConstraint("role_id", "permission_code", name="pk_role_permission"),
    )

    op.create_table(
        "user_role",
        sa.Column("user_id", sa.String(26), nullable=False),
        sa.Column("role_id", sa.String(26), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["user.id"], ondelete="CASCADE", name="fk_user_role_user_id_user"
        ),
        sa.ForeignKeyConstraint(
            ["role_id"], ["role.id"], ondelete="CASCADE", name="fk_user_role_role_id_role"
        ),
        sa.PrimaryKeyConstraint("user_id", "role_id", name="pk_user_role"),
    )

    op.create_table(
        "refresh_token",
        sa.Column("jti", sa.String(26), primary_key=True),
        sa.Column("user_id", sa.String(26), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_jti", sa.String(26), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"], ["user.id"], ondelete="CASCADE", name="fk_refresh_token_user_id_user"
        ),
    )
    op.create_index("ix_refresh_token_user_id", "refresh_token", ["user_id"])

    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=True),
        sa.Column("actor_user_id", sa.String(26), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(100), nullable=True),
        sa.Column("target_id", sa.String(26), nullable=True),
        sa.Column("before", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("after", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_log_organization_id", "audit_log", ["organization_id"])
    op.create_index("ix_audit_log_action", "audit_log", ["action"])
    op.create_index("ix_audit_log_target_id", "audit_log", ["target_id"])
    op.create_index("ix_audit_log_created_at", "audit_log", ["created_at"])

    # Seed: catálogo global de permisos
    permission_table = sa.table(
        "permission",
        sa.column("code", sa.String),
        sa.column("description", sa.String),
    )
    op.bulk_insert(
        permission_table,
        [{"code": code, "description": desc} for code, desc in PERMISSIONS.items()],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_log_created_at", table_name="audit_log")
    op.drop_index("ix_audit_log_target_id", table_name="audit_log")
    op.drop_index("ix_audit_log_action", table_name="audit_log")
    op.drop_index("ix_audit_log_organization_id", table_name="audit_log")
    op.drop_table("audit_log")
    op.drop_index("ix_refresh_token_user_id", table_name="refresh_token")
    op.drop_table("refresh_token")
    op.drop_table("user_role")
    op.drop_table("role_permission")
    op.drop_index("ix_role_organization_id", table_name="role")
    op.drop_table("role")
    op.drop_table("permission")
    op.drop_index("ix_user_email", table_name="user")
    op.drop_index("ix_user_organization_id", table_name="user")
    op.drop_table("user")
    op.drop_index("ix_branch_organization_id", table_name="branch")
    op.drop_table("branch")
    op.drop_index("ix_organization_ruc", table_name="organization")
    op.drop_table("organization")
