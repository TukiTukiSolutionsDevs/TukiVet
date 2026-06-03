"""prescriptions + items

Revision ID: 20260601_070000
Revises: 20260601_060000
Create Date: 2026-06-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260601_070000"
down_revision: str | Sequence[str] | None = "20260601_060000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "prescription",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("encounter_id", sa.String(26), nullable=True),
        sa.Column("pet_id", sa.String(26), nullable=False),
        sa.Column("prescribed_by", sa.String(26), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("diagnosis", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="issued"),
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
            name="fk_prescription_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["encounter_id"],
            ["encounter.id"],
            name="fk_prescription_encounter_id_encounter",
        ),
        sa.ForeignKeyConstraint(
            ["pet_id"], ["pet.id"], ondelete="CASCADE", name="fk_prescription_pet_id_pet"
        ),
        sa.ForeignKeyConstraint(
            ["prescribed_by"], ["user.id"], name="fk_prescription_prescribed_by_user"
        ),
    )
    op.create_index("ix_prescription_organization_id", "prescription", ["organization_id"])
    op.create_index("ix_prescription_encounter_id", "prescription", ["encounter_id"])
    op.create_index("ix_prescription_pet_id", "prescription", ["pet_id"])
    op.create_index("ix_prescription_status", "prescription", ["status"])

    op.create_table(
        "prescription_item",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("prescription_id", sa.String(26), nullable=False),
        sa.Column("product_id", sa.String(26), nullable=True),
        sa.Column("medication_name", sa.String(255), nullable=False),
        sa.Column("active_ingredient", sa.String(255), nullable=True),
        sa.Column("dose_mg_per_kg", sa.Numeric(8, 3), nullable=True),
        sa.Column("total_dose_mg", sa.Numeric(10, 3), nullable=True),
        sa.Column("presentation", sa.String(100), nullable=True),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("frequency", sa.String(100), nullable=True),
        sa.Column("duration_days", sa.Integer, nullable=True),
        sa.Column("route", sa.String(50), nullable=True),
        sa.Column("instructions", sa.Text, nullable=True),
        sa.Column(
            "dispensed_qty", sa.Numeric(10, 2), nullable=False, server_default="0"
        ),
        sa.Column("dispensed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dispensed_by", sa.String(26), nullable=True),
        sa.Column("lot_id", sa.String(26), nullable=True),
        sa.Column(
            "is_controlled", sa.Boolean, nullable=False, server_default=sa.text("false")
        ),
        sa.Column("witness_user_id", sa.String(26), nullable=True),
        sa.ForeignKeyConstraint(
            ["prescription_id"],
            ["prescription.id"],
            ondelete="CASCADE",
            name="fk_prescription_item_prescription_id_prescription",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"], ["product.id"], name="fk_prescription_item_product_id_product"
        ),
        sa.ForeignKeyConstraint(
            ["dispensed_by"], ["user.id"], name="fk_prescription_item_dispensed_by_user"
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"], ["inventory_lot.id"], name="fk_prescription_item_lot_id_inventory_lot"
        ),
        sa.ForeignKeyConstraint(
            ["witness_user_id"], ["user.id"], name="fk_prescription_item_witness_user"
        ),
    )
    op.create_index(
        "ix_prescription_item_prescription_id", "prescription_item", ["prescription_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_prescription_item_prescription_id", table_name="prescription_item")
    op.drop_table("prescription_item")
    op.drop_index("ix_prescription_status", table_name="prescription")
    op.drop_index("ix_prescription_pet_id", table_name="prescription")
    op.drop_index("ix_prescription_encounter_id", table_name="prescription")
    op.drop_index("ix_prescription_organization_id", table_name="prescription")
    op.drop_table("prescription")
