"""orders + payments + cash + service_catalog

Revision ID: 20260601_080000
Revises: 20260601_070000
Create Date: 2026-06-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260601_080000"
down_revision: str | Sequence[str] | None = "20260601_070000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "service_catalog",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("code", sa.String(30), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column(
            "base_price", sa.Numeric(12, 2), nullable=False, server_default="0.00"
        ),
        sa.Column(
            "price_includes_igv",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "igv_affected", sa.Boolean, nullable=False, server_default=sa.text("true")
        ),
        sa.Column("sunat_code", sa.String(20), nullable=True),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
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
            name="fk_service_catalog_organization_id_organization",
        ),
    )
    op.create_index(
        "ix_service_catalog_organization_id", "service_catalog", ["organization_id"]
    )

    op.create_table(
        "cash_session",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("branch_id", sa.String(26), nullable=True),
        sa.Column("user_id", sa.String(26), nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "opening_balance", sa.Numeric(12, 2), nullable=False, server_default="0"
        ),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closing_balance_declared", sa.Numeric(12, 2), nullable=True),
        sa.Column("closing_balance_calculated", sa.Numeric(12, 2), nullable=True),
        sa.Column("difference", sa.Numeric(12, 2), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
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
            name="fk_cash_session_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branch.id"], name="fk_cash_session_branch_id_branch"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["user.id"], name="fk_cash_session_user_id_user"
        ),
    )
    op.create_index("ix_cash_session_organization_id", "cash_session", ["organization_id"])
    op.create_index("ix_cash_session_user_id", "cash_session", ["user_id"])

    op.create_table(
        "order",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("branch_id", sa.String(26), nullable=True),
        sa.Column("encounter_id", sa.String(26), nullable=True),
        sa.Column("customer_id", sa.String(26), nullable=False),
        sa.Column("cash_session_id", sa.String(26), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("number", sa.Integer, nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("igv_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column(
            "discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"
        ),
        sa.Column("total", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("paid_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by", sa.String(26), nullable=True),
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
            name="fk_order_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(["branch_id"], ["branch.id"], name="fk_order_branch_id_branch"),
        sa.ForeignKeyConstraint(
            ["encounter_id"], ["encounter.id"], name="fk_order_encounter_id_encounter"
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"], ["customer.id"], name="fk_order_customer_id_customer"
        ),
        sa.ForeignKeyConstraint(
            ["cash_session_id"],
            ["cash_session.id"],
            name="fk_order_cash_session_id_cash_session",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"], name="fk_order_created_by_user"),
    )
    op.create_index("ix_order_organization_id", "order", ["organization_id"])
    op.create_index("ix_order_customer_id", "order", ["customer_id"])
    op.create_index("ix_order_encounter_id", "order", ["encounter_id"])
    op.create_index("ix_order_cash_session_id", "order", ["cash_session_id"])
    op.create_index("ix_order_status", "order", ["status"])

    op.create_table(
        "order_item",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("order_id", sa.String(26), nullable=False),
        sa.Column("product_id", sa.String(26), nullable=True),
        sa.Column("service_id", sa.String(26), nullable=True),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_pct", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("igv_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("lot_id", sa.String(26), nullable=True),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("reference_id", sa.String(26), nullable=True),
        sa.CheckConstraint(
            "(product_id IS NULL) <> (service_id IS NULL)",
            name="ck_order_item_one_of_product_or_service",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["order.id"],
            ondelete="CASCADE",
            name="fk_order_item_order_id_order",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"], ["product.id"], name="fk_order_item_product_id_product"
        ),
        sa.ForeignKeyConstraint(
            ["service_id"], ["service_catalog.id"], name="fk_order_item_service_id_service_catalog"
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"], ["inventory_lot.id"], name="fk_order_item_lot_id_inventory_lot"
        ),
    )
    op.create_index("ix_order_item_order_id", "order_item", ["order_id"])

    op.create_table(
        "payment",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("order_id", sa.String(26), nullable=False),
        sa.Column("cash_session_id", sa.String(26), nullable=True),
        sa.Column("method", sa.String(30), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("reference", sa.String(100), nullable=True),
        sa.Column("voucher_image_key", sa.String(500), nullable=True),
        sa.Column("received_by", sa.String(26), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="confirmed"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_payment_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["order.id"],
            ondelete="CASCADE",
            name="fk_payment_order_id_order",
        ),
        sa.ForeignKeyConstraint(
            ["cash_session_id"],
            ["cash_session.id"],
            name="fk_payment_cash_session_id_cash_session",
        ),
        sa.ForeignKeyConstraint(
            ["received_by"], ["user.id"], name="fk_payment_received_by_user"
        ),
    )
    op.create_index("ix_payment_organization_id", "payment", ["organization_id"])
    op.create_index("ix_payment_order_id", "payment", ["order_id"])
    op.create_index("ix_payment_method", "payment", ["method"])


def downgrade() -> None:
    op.drop_index("ix_payment_method", table_name="payment")
    op.drop_index("ix_payment_order_id", table_name="payment")
    op.drop_index("ix_payment_organization_id", table_name="payment")
    op.drop_table("payment")
    op.drop_index("ix_order_item_order_id", table_name="order_item")
    op.drop_table("order_item")
    op.drop_index("ix_order_status", table_name="order")
    op.drop_index("ix_order_cash_session_id", table_name="order")
    op.drop_index("ix_order_encounter_id", table_name="order")
    op.drop_index("ix_order_customer_id", table_name="order")
    op.drop_index("ix_order_organization_id", table_name="order")
    op.drop_table("order")
    op.drop_index("ix_cash_session_user_id", table_name="cash_session")
    op.drop_index("ix_cash_session_organization_id", table_name="cash_session")
    op.drop_table("cash_session")
    op.drop_index("ix_service_catalog_organization_id", table_name="service_catalog")
    op.drop_table("service_catalog")
