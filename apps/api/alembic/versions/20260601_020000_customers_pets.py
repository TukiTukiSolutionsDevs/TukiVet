"""customers + pets + breeds

Revision ID: 20260601_020000
Revises: 20260601_010000
Create Date: 2026-06-01

Crea las tablas de clientes (tutores) y mascotas:
- customer
- pet
- pet_owner (M:N)
- pet_weight_history
- breed (catálogo)

Siembra ~30 razas comunes en Perú.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260601_020000"
down_revision: str | Sequence[str] | None = "20260601_010000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_BREEDS: list[tuple[str, str]] = [
    # Caninos
    ("dog", "Mestizo"),
    ("dog", "Labrador Retriever"),
    ("dog", "Golden Retriever"),
    ("dog", "Yorkshire Terrier"),
    ("dog", "Poodle"),
    ("dog", "Pug"),
    ("dog", "Chihuahua"),
    ("dog", "Schnauzer"),
    ("dog", "Pastor Alemán"),
    ("dog", "Bulldog Francés"),
    ("dog", "Bulldog Inglés"),
    ("dog", "Shih Tzu"),
    ("dog", "Beagle"),
    ("dog", "Border Collie"),
    ("dog", "Husky Siberiano"),
    ("dog", "Rottweiler"),
    ("dog", "Dálmata"),
    ("dog", "Boxer"),
    ("dog", "Doberman"),
    ("dog", "Pinscher"),
    ("dog", "Maltés"),
    ("dog", "Cocker Spaniel"),
    ("dog", "Pekinés"),
    ("dog", "Akita"),
    ("dog", "Perro Sin Pelo del Perú"),
    # Felinos
    ("cat", "Mestizo"),
    ("cat", "Persa"),
    ("cat", "Siamés"),
    ("cat", "Maine Coon"),
    ("cat", "Bengala"),
    ("cat", "British Shorthair"),
    ("cat", "Ragdoll"),
    ("cat", "Sphynx"),
    ("cat", "Angora"),
    # Otros
    ("rabbit", "Mestizo"),
    ("rabbit", "Holland Lop"),
    ("bird", "Periquito"),
    ("bird", "Canario"),
    ("bird", "Loro"),
    ("rodent", "Hámster"),
    ("rodent", "Cobaya"),
]


def upgrade() -> None:
    op.create_table(
        "breed",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("species", sa.String(50), nullable=False),
        sa.Column("name_es", sa.String(100), nullable=False),
        sa.Column("name_en", sa.String(100), nullable=True),
        sa.UniqueConstraint("species", "name_es", name="uq_breed_species_name"),
    )
    op.create_index("ix_breed_species", "breed", ["species"])

    op.create_table(
        "customer",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("document_type", sa.String(10), nullable=False),
        sa.Column("document_number", sa.String(20), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("business_name", sa.String(255), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone_primary", sa.String(20), nullable=False),
        sa.Column("phone_secondary", sa.String(20), nullable=True),
        sa.Column(
            "whatsapp_opted_in",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "email_opted_in",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("district", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=False, server_default="Lima"),
        sa.Column("birth_date", sa.Date, nullable=True),
        sa.Column("referral_source", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
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
            name="fk_customer_organization_id_organization",
        ),
        sa.UniqueConstraint(
            "organization_id", "document_type", "document_number", name="uq_customer_org_doc"
        ),
    )
    op.create_index("ix_customer_organization_id", "customer", ["organization_id"])
    op.create_index("ix_customer_document_number", "customer", ["document_number"])
    op.create_index("ix_customer_phone_primary", "customer", ["phone_primary"])
    op.create_index("ix_customer_email", "customer", ["email"])

    op.create_table(
        "pet",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("organization_id", sa.String(26), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("species", sa.String(50), nullable=False),
        sa.Column("breed_id", sa.String(26), nullable=True),
        sa.Column("breed_name", sa.String(100), nullable=True),
        sa.Column("sex", sa.String(10), nullable=False, server_default="unknown"),
        sa.Column("birth_date", sa.Date, nullable=True),
        sa.Column(
            "birth_date_estimated",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("color", sa.String(100), nullable=True),
        sa.Column("distinguishing_marks", sa.Text, nullable=True),
        sa.Column("microchip", sa.String(20), nullable=True),
        sa.Column("tattoo", sa.String(50), nullable=True),
        sa.Column(
            "sterilized",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("sterilization_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("deceased_date", sa.Date, nullable=True),
        sa.Column("deceased_reason", sa.Text, nullable=True),
        sa.Column("alerts", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "chronic_conditions", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column("current_weight_kg", sa.Numeric(6, 2), nullable=True),
        sa.Column("current_weight_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("photo_url", sa.String(500), nullable=True),
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
            name="fk_pet_organization_id_organization",
        ),
        sa.ForeignKeyConstraint(["breed_id"], ["breed.id"], name="fk_pet_breed_id_breed"),
        sa.UniqueConstraint("microchip", name="uq_pet_microchip"),
    )
    op.create_index("ix_pet_organization_id", "pet", ["organization_id"])
    op.create_index("ix_pet_name", "pet", ["name"])
    op.create_index("ix_pet_species", "pet", ["species"])
    op.create_index("ix_pet_microchip", "pet", ["microchip"])

    op.create_table(
        "pet_owner",
        sa.Column("customer_id", sa.String(26), nullable=False),
        sa.Column("pet_id", sa.String(26), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="primary"),
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
            name="fk_pet_owner_customer_id_customer",
        ),
        sa.ForeignKeyConstraint(
            ["pet_id"], ["pet.id"], ondelete="CASCADE", name="fk_pet_owner_pet_id_pet"
        ),
        sa.PrimaryKeyConstraint("customer_id", "pet_id", name="pk_pet_owner"),
    )

    op.create_table(
        "pet_weight_history",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("pet_id", sa.String(26), nullable=False),
        sa.Column("weight_kg", sa.Numeric(6, 2), nullable=False),
        sa.Column(
            "measured_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("recorded_by", sa.String(26), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.ForeignKeyConstraint(
            ["pet_id"], ["pet.id"], ondelete="CASCADE", name="fk_pet_weight_history_pet_id_pet"
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by"], ["user.id"], name="fk_pet_weight_history_recorded_by_user"
        ),
    )
    op.create_index("ix_pet_weight_history_pet_id", "pet_weight_history", ["pet_id"])
    op.create_index("ix_pet_weight_history_measured_at", "pet_weight_history", ["measured_at"])

    # Seed razas
    from ulid import ULID

    breed_table = sa.table(
        "breed",
        sa.column("id", sa.String),
        sa.column("species", sa.String),
        sa.column("name_es", sa.String),
    )
    op.bulk_insert(
        breed_table,
        [{"id": str(ULID()), "species": sp, "name_es": name} for sp, name in _BREEDS],
    )


def downgrade() -> None:
    op.drop_index("ix_pet_weight_history_measured_at", table_name="pet_weight_history")
    op.drop_index("ix_pet_weight_history_pet_id", table_name="pet_weight_history")
    op.drop_table("pet_weight_history")
    op.drop_table("pet_owner")
    op.drop_index("ix_pet_microchip", table_name="pet")
    op.drop_index("ix_pet_species", table_name="pet")
    op.drop_index("ix_pet_name", table_name="pet")
    op.drop_index("ix_pet_organization_id", table_name="pet")
    op.drop_table("pet")
    op.drop_index("ix_customer_email", table_name="customer")
    op.drop_index("ix_customer_phone_primary", table_name="customer")
    op.drop_index("ix_customer_document_number", table_name="customer")
    op.drop_index("ix_customer_organization_id", table_name="customer")
    op.drop_table("customer")
    op.drop_index("ix_breed_species", table_name="breed")
    op.drop_table("breed")
