"""appointments: room, appointment, time_off

Revision ID: 20260601_060000
Revises: 20260601_050000
Create Date: 2026-06-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260601_060000"
down_revision: str | Sequence[str] | None = "20260601_050000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "room",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("branch_id", sa.String(26), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("type", sa.String(50), nullable=False, server_default="consultation"),
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
            name="fk_room_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(["branch_id"], ["branch.id"], name="fk_room_branch_id_branch"),
    )
    op.create_index("ix_room_organization_id", "room", ["organization_id"])

    op.create_table(
        "appointment",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("branch_id", sa.String(26), nullable=True),
        sa.Column("pet_id", sa.String(26), nullable=True),
        sa.Column("customer_id", sa.String(26), nullable=False),
        sa.Column("veterinarian_id", sa.String(26), nullable=False),
        sa.Column("room_id", sa.String(26), nullable=True),
        sa.Column("type", sa.String(50), nullable=False, server_default="consultation"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_by_user_id", sa.String(26), nullable=True),
        sa.Column("cancel_reason", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("source", sa.String(20), nullable=False, server_default="staff"),
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
            name="fk_appointment_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branch.id"], name="fk_appointment_branch_id_branch"
        ),
        sa.ForeignKeyConstraint(["pet_id"], ["pet.id"], name="fk_appointment_pet_id_pet"),
        sa.ForeignKeyConstraint(
            ["customer_id"], ["customer.id"], name="fk_appointment_customer_id_customer"
        ),
        sa.ForeignKeyConstraint(
            ["veterinarian_id"], ["user.id"], name="fk_appointment_veterinarian_id_user"
        ),
        sa.ForeignKeyConstraint(["room_id"], ["room.id"], name="fk_appointment_room_id_room"),
        sa.ForeignKeyConstraint(
            ["cancelled_by_user_id"],
            ["user.id"],
            name="fk_appointment_cancelled_by_user_id_user",
        ),
    )
    op.create_index("ix_appointment_organization_id", "appointment", ["organization_id"])
    op.create_index("ix_appointment_pet_id", "appointment", ["pet_id"])
    op.create_index("ix_appointment_customer_id", "appointment", ["customer_id"])
    op.create_index("ix_appointment_veterinarian_id", "appointment", ["veterinarian_id"])
    op.create_index("ix_appointment_starts_at", "appointment", ["starts_at"])
    op.create_index("ix_appointment_status", "appointment", ["status"])

    op.create_table(
        "time_off",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("user_id", sa.String(26), nullable=True),
        sa.Column("room_id", sa.String(26), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
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
            name="fk_time_off_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], name="fk_time_off_user_id_user"),
        sa.ForeignKeyConstraint(["room_id"], ["room.id"], name="fk_time_off_room_id_room"),
    )
    op.create_index("ix_time_off_organization_id", "time_off", ["organization_id"])
    op.create_index("ix_time_off_user_id", "time_off", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_time_off_user_id", table_name="time_off")
    op.drop_index("ix_time_off_organization_id", table_name="time_off")
    op.drop_table("time_off")
    op.drop_index("ix_appointment_status", table_name="appointment")
    op.drop_index("ix_appointment_starts_at", table_name="appointment")
    op.drop_index("ix_appointment_veterinarian_id", table_name="appointment")
    op.drop_index("ix_appointment_customer_id", table_name="appointment")
    op.drop_index("ix_appointment_pet_id", table_name="appointment")
    op.drop_index("ix_appointment_organization_id", table_name="appointment")
    op.drop_table("appointment")
    op.drop_index("ix_room_organization_id", table_name="room")
    op.drop_table("room")
