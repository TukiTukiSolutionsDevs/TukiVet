"""inventory: supplier, product, inventory_lot, inventory_movement

Revision ID: 20260601_050000
Revises: 20260601_040000
Create Date: 2026-06-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260601_050000"
down_revision: str | Sequence[str] | None = "20260601_040000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "supplier",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("ruc", sa.String(11), nullable=True),
        sa.Column("contact_name", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
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
            name="fk_supplier_organization_id_organization",
        ),
    )
    op.create_index("ix_supplier_organization_id", "supplier", ["organization_id"])

    op.create_table(
        "product",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("sku", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("subcategory", sa.String(100), nullable=True),
        sa.Column("presentation", sa.String(100), nullable=True),
        sa.Column("active_ingredient", sa.String(255), nullable=True),
        sa.Column("manufacturer", sa.String(150), nullable=True),
        sa.Column(
            "is_controlled", sa.Boolean, nullable=False, server_default=sa.text("false")
        ),
        sa.Column("barcode", sa.String(50), nullable=True),
        sa.Column("unit", sa.String(20), nullable=False, server_default="unidad"),
        sa.Column("reorder_point", sa.Numeric(10, 2), nullable=True),
        sa.Column("reorder_qty", sa.Numeric(10, 2), nullable=True),
        sa.Column("sale_price", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column(
            "sale_price_includes_igv",
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
            name="fk_product_organization_id_organization",
        ),
        sa.UniqueConstraint("organization_id", "sku", name="uq_product_org_sku"),
    )
    op.create_index("ix_product_organization_id", "product", ["organization_id"])
    op.create_index("ix_product_name", "product", ["name"])
    op.create_index("ix_product_category", "product", ["category"])
    op.create_index("ix_product_barcode", "product", ["barcode"])

    op.create_table(
        "inventory_lot",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("product_id", sa.String(26), nullable=False),
        sa.Column("lot_number", sa.String(50), nullable=False),
        sa.Column("expiry_date", sa.Date, nullable=True),
        sa.Column("received_at", sa.Date, nullable=True),
        sa.Column("supplier_id", sa.String(26), nullable=True),
        sa.Column(
            "unit_cost", sa.Numeric(12, 4), nullable=False, server_default="0.0000"
        ),
        sa.Column("initial_qty", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("current_qty", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
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
            name="fk_inventory_lot_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["product.id"],
            ondelete="CASCADE",
            name="fk_inventory_lot_product_id_product",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"], ["supplier.id"], name="fk_inventory_lot_supplier_id_supplier"
        ),
        sa.UniqueConstraint("product_id", "lot_number", name="uq_lot_product_number"),
        sa.CheckConstraint(
            "current_qty >= 0", name="ck_inventory_lot_current_qty_non_negative"
        ),
    )
    op.create_index("ix_inventory_lot_organization_id", "inventory_lot", ["organization_id"])
    op.create_index("ix_inventory_lot_product_id", "inventory_lot", ["product_id"])
    op.create_index("ix_inventory_lot_expiry_date", "inventory_lot", ["expiry_date"])

    op.create_table(
        "inventory_movement",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("product_id", sa.String(26), nullable=False),
        sa.Column("lot_id", sa.String(26), nullable=True),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("unit_cost", sa.Numeric(12, 4), nullable=True),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("reference_id", sa.String(26), nullable=True),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("performed_by", sa.String(26), nullable=True),
        sa.Column("witness_user_id", sa.String(26), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_inventory_movement_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["product.id"],
            ondelete="CASCADE",
            name="fk_inventory_movement_product_id_product",
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"], ["inventory_lot.id"], name="fk_inventory_movement_lot_id_inventory_lot"
        ),
        sa.ForeignKeyConstraint(
            ["performed_by"], ["user.id"], name="fk_inventory_movement_performed_by_user"
        ),
        sa.ForeignKeyConstraint(
            ["witness_user_id"], ["user.id"], name="fk_inventory_movement_witness_user"
        ),
    )
    op.create_index(
        "ix_inventory_movement_organization_id", "inventory_movement", ["organization_id"]
    )
    op.create_index("ix_inventory_movement_product_id", "inventory_movement", ["product_id"])
    op.create_index("ix_inventory_movement_type", "inventory_movement", ["type"])


def downgrade() -> None:
    op.drop_index("ix_inventory_movement_type", table_name="inventory_movement")
    op.drop_index("ix_inventory_movement_product_id", table_name="inventory_movement")
    op.drop_index("ix_inventory_movement_organization_id", table_name="inventory_movement")
    op.drop_table("inventory_movement")
    op.drop_index("ix_inventory_lot_expiry_date", table_name="inventory_lot")
    op.drop_index("ix_inventory_lot_product_id", table_name="inventory_lot")
    op.drop_index("ix_inventory_lot_organization_id", table_name="inventory_lot")
    op.drop_table("inventory_lot")
    op.drop_index("ix_product_barcode", table_name="product")
    op.drop_index("ix_product_category", table_name="product")
    op.drop_index("ix_product_name", table_name="product")
    op.drop_index("ix_product_organization_id", table_name="product")
    op.drop_table("product")
    op.drop_index("ix_supplier_organization_id", table_name="supplier")
    op.drop_table("supplier")
