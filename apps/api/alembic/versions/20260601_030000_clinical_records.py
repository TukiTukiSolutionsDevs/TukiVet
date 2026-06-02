"""clinical records: encounter, SOAP, vitals, amendments, problems

Revision ID: 20260601_030000
Revises: 20260601_020000
Create Date: 2026-06-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260601_030000"
down_revision: str | Sequence[str] | None = "20260601_020000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "encounter",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("branch_id", sa.String(26), nullable=True),
        sa.Column("pet_id", sa.String(26), nullable=False),
        sa.Column("customer_id", sa.String(26), nullable=False),
        sa.Column("veterinarian_id", sa.String(26), nullable=True),
        sa.Column("type", sa.String(30), nullable=False, server_default="consultation"),
        sa.Column("chief_complaint", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "total_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"
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
            name="fk_encounter_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(["branch_id"], ["branch.id"], name="fk_encounter_branch_id_branch"),
        sa.ForeignKeyConstraint(
            ["pet_id"], ["pet.id"], ondelete="CASCADE", name="fk_encounter_pet_id_pet"
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"], ["customer.id"], name="fk_encounter_customer_id_customer"
        ),
        sa.ForeignKeyConstraint(
            ["veterinarian_id"], ["user.id"], name="fk_encounter_veterinarian_id_user"
        ),
    )
    op.create_index("ix_encounter_organization_id", "encounter", ["organization_id"])
    op.create_index("ix_encounter_branch_id", "encounter", ["branch_id"])
    op.create_index("ix_encounter_pet_id", "encounter", ["pet_id"])
    op.create_index("ix_encounter_veterinarian_id", "encounter", ["veterinarian_id"])
    op.create_index("ix_encounter_status", "encounter", ["status"])

    op.create_table(
        "soap_note",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("encounter_id", sa.String(26), nullable=False),
        sa.Column(
            "subjective",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "objective",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "assessment",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "plan",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("template_id", sa.String(26), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "is_current", sa.Boolean, nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["encounter_id"],
            ["encounter.id"],
            ondelete="CASCADE",
            name="fk_soap_note_encounter_id_encounter",
        ),
        sa.UniqueConstraint("encounter_id", name="uq_soap_note_encounter"),
    )
    op.create_index("ix_soap_note_encounter_id", "soap_note", ["encounter_id"])

    op.create_table(
        "vital_sign",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("encounter_id", sa.String(26), nullable=False),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("temperature_c", sa.Numeric(4, 1), nullable=True),
        sa.Column("heart_rate_bpm", sa.Integer, nullable=True),
        sa.Column("respiratory_rate", sa.Integer, nullable=True),
        sa.Column("weight_kg", sa.Numeric(6, 2), nullable=True),
        sa.Column("body_condition_score", sa.Integer, nullable=True),
        sa.Column("mucous_membranes", sa.String(50), nullable=True),
        sa.Column("capillary_refill_seconds", sa.Numeric(3, 1), nullable=True),
        sa.Column("hydration_status", sa.String(50), nullable=True),
        sa.Column("pain_score", sa.Integer, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("recorded_by", sa.String(26), nullable=True),
        sa.ForeignKeyConstraint(
            ["encounter_id"],
            ["encounter.id"],
            ondelete="CASCADE",
            name="fk_vital_sign_encounter_id_encounter",
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by"], ["user.id"], name="fk_vital_sign_recorded_by_user"
        ),
    )
    op.create_index("ix_vital_sign_encounter_id", "vital_sign", ["encounter_id"])

    op.create_table(
        "encounter_amendment",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("encounter_id", sa.String(26), nullable=False),
        sa.Column("amended_by_user_id", sa.String(26), nullable=False),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column("before_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("after_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["encounter_id"],
            ["encounter.id"],
            ondelete="CASCADE",
            name="fk_encounter_amendment_encounter_id_encounter",
        ),
        sa.ForeignKeyConstraint(
            ["amended_by_user_id"],
            ["user.id"],
            name="fk_encounter_amendment_amended_by_user_id_user",
        ),
    )
    op.create_index(
        "ix_encounter_amendment_encounter_id", "encounter_amendment", ["encounter_id"]
    )

    op.create_table(
        "problem",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("pet_id", sa.String(26), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("onset_date", sa.Date, nullable=True),
        sa.Column("resolved_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by_encounter_id", sa.String(26), nullable=True),
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
            name="fk_problem_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["pet_id"], ["pet.id"], ondelete="CASCADE", name="fk_problem_pet_id_pet"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_encounter_id"],
            ["encounter.id"],
            name="fk_problem_created_by_encounter_id_encounter",
        ),
    )
    op.create_index("ix_problem_organization_id", "problem", ["organization_id"])
    op.create_index("ix_problem_pet_id", "problem", ["pet_id"])


def downgrade() -> None:
    op.drop_index("ix_problem_pet_id", table_name="problem")
    op.drop_index("ix_problem_organization_id", table_name="problem")
    op.drop_table("problem")
    op.drop_index("ix_encounter_amendment_encounter_id", table_name="encounter_amendment")
    op.drop_table("encounter_amendment")
    op.drop_index("ix_vital_sign_encounter_id", table_name="vital_sign")
    op.drop_table("vital_sign")
    op.drop_index("ix_soap_note_encounter_id", table_name="soap_note")
    op.drop_table("soap_note")
    op.drop_index("ix_encounter_status", table_name="encounter")
    op.drop_index("ix_encounter_veterinarian_id", table_name="encounter")
    op.drop_index("ix_encounter_pet_id", table_name="encounter")
    op.drop_index("ix_encounter_branch_id", table_name="encounter")
    op.drop_index("ix_encounter_organization_id", table_name="encounter")
    op.drop_table("encounter")
