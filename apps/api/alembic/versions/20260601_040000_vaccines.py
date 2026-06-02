"""vaccines: catalog + administrations + seed

Revision ID: 20260601_040000
Revises: 20260601_030000
Create Date: 2026-06-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260601_040000"
down_revision: str | Sequence[str] | None = "20260601_030000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "vaccine_catalog",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("species", sa.String(50), nullable=False),
        sa.Column("manufacturer", sa.String(150), nullable=True),
        sa.Column("protects_against", sa.Text, nullable=True),
        sa.Column("default_booster_interval_days", sa.Integer, nullable=True),
        sa.Column(
            "is_rabies", sa.Boolean, nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "active", sa.Boolean, nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            ondelete="CASCADE",
            name="fk_vaccine_catalog_organization_id_organization",
        ),
    )
    op.create_index("ix_vaccine_catalog_organization_id", "vaccine_catalog", ["organization_id"])
    op.create_index("ix_vaccine_catalog_species", "vaccine_catalog", ["species"])

    op.create_table(
        "vaccine_administration",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("pet_id", sa.String(26), nullable=False),
        sa.Column("vaccine_id", sa.String(26), nullable=False),
        sa.Column("encounter_id", sa.String(26), nullable=True),
        sa.Column("administered_by", sa.String(26), nullable=True),
        sa.Column("administered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lot_number", sa.String(50), nullable=True),
        sa.Column("expiry_date", sa.Date, nullable=True),
        sa.Column("site_of_application", sa.String(100), nullable=True),
        sa.Column("dose_number", sa.Integer, nullable=True),
        sa.Column("next_dose_due_date", sa.Date, nullable=True),
        sa.Column("certificate_number", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "status", sa.String(20), nullable=False, server_default="administered"
        ),
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
            name="fk_vaccine_administration_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["pet_id"],
            ["pet.id"],
            ondelete="CASCADE",
            name="fk_vaccine_administration_pet_id_pet",
        ),
        sa.ForeignKeyConstraint(
            ["vaccine_id"],
            ["vaccine_catalog.id"],
            name="fk_vaccine_administration_vaccine_id_vaccine_catalog",
        ),
        sa.ForeignKeyConstraint(
            ["encounter_id"],
            ["encounter.id"],
            name="fk_vaccine_administration_encounter_id_encounter",
        ),
        sa.ForeignKeyConstraint(
            ["administered_by"],
            ["user.id"],
            name="fk_vaccine_administration_administered_by_user",
        ),
    )
    op.create_index(
        "ix_vaccine_administration_organization_id",
        "vaccine_administration",
        ["organization_id"],
    )
    op.create_index("ix_vaccine_administration_pet_id", "vaccine_administration", ["pet_id"])
    op.create_index(
        "ix_vaccine_administration_encounter_id", "vaccine_administration", ["encounter_id"]
    )
    op.create_index(
        "ix_vaccine_administration_next_dose_due_date",
        "vaccine_administration",
        ["next_dose_due_date"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_vaccine_administration_next_dose_due_date", table_name="vaccine_administration"
    )
    op.drop_index("ix_vaccine_administration_encounter_id", table_name="vaccine_administration")
    op.drop_index("ix_vaccine_administration_pet_id", table_name="vaccine_administration")
    op.drop_index(
        "ix_vaccine_administration_organization_id", table_name="vaccine_administration"
    )
    op.drop_table("vaccine_administration")
    op.drop_index("ix_vaccine_catalog_species", table_name="vaccine_catalog")
    op.drop_index("ix_vaccine_catalog_organization_id", table_name="vaccine_catalog")
    op.drop_table("vaccine_catalog")
