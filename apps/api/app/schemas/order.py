"""Schemas Pydantic para órdenes, pagos y caja."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import ORMModel

ServiceCategory = Literal[
    "consultation",
    "vaccination",
    "surgery",
    "imaging",
    "lab",
    "grooming",
    "boarding",
    "other",
]
OrderStatus = Literal["draft", "open", "paid", "partially_paid", "void"]
PaymentMethod = Literal["cash", "yape", "plin", "transfer", "pos_card", "credit", "other"]


# ----- Service catalog -----


class ServiceCatalogCreate(ORMModel):
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=2, max_length=255)
    category: ServiceCategory
    base_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0"))
    price_includes_igv: bool = True
    igv_affected: bool = True
    sunat_code: str | None = Field(default=None, max_length=20)
    active: bool = True


class ServiceCatalogUpdate(ORMModel):
    name: str | None = None
    category: ServiceCategory | None = None
    base_price: Decimal | None = Field(default=None, ge=Decimal("0"))
    price_includes_igv: bool | None = None
    igv_affected: bool | None = None
    sunat_code: str | None = None
    active: bool | None = None


class ServiceCatalogRead(ORMModel):
    id: str
    organization_id: str
    code: str
    name: str
    category: str
    base_price: Decimal
    price_includes_igv: bool
    igv_affected: bool
    sunat_code: str | None
    active: bool


# ----- Orders -----


class OrderItemInput(ORMModel):
    product_id: str | None = None
    service_id: str | None = None
    description: str | None = Field(default=None, max_length=500)
    quantity: Decimal = Field(gt=Decimal("0"))
    unit_price: Decimal | None = Field(default=None, ge=Decimal("0"))
    discount_pct: Decimal = Field(default=Decimal("0"), ge=Decimal("0"), le=Decimal("100"))
    reference_type: str | None = None
    reference_id: str | None = None

    @model_validator(mode="after")
    def _exactly_one(self) -> OrderItemInput:
        if (self.product_id is None) == (self.service_id is None):
            raise ValueError("Cada línea debe tener product_id O service_id (no ambos)")
        return self


class OrderCreate(ORMModel):
    customer_id: str
    encounter_id: str | None = None
    notes: str | None = None
    items: list[OrderItemInput] = Field(default_factory=list)


class OrderItemRead(ORMModel):
    id: str
    order_id: str
    product_id: str | None
    service_id: str | None
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_pct: Decimal
    igv_amount: Decimal
    subtotal: Decimal
    total: Decimal
    lot_id: str | None
    reference_type: str | None
    reference_id: str | None


class OrderRead(ORMModel):
    id: str
    organization_id: str
    branch_id: str | None
    encounter_id: str | None
    customer_id: str
    cash_session_id: str | None
    status: str
    number: int | None
    issued_at: datetime
    subtotal: Decimal
    igv_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    paid_amount: Decimal
    balance: Decimal | None = None
    notes: str | None
    created_by: str | None
    items: list[OrderItemRead] = Field(default_factory=list)


# ----- Payments -----


class PaymentCreate(ORMModel):
    method: PaymentMethod
    amount: Decimal = Field(gt=Decimal("0"))
    reference: str | None = Field(default=None, max_length=100)


class PaymentRead(ORMModel):
    id: str
    organization_id: str
    order_id: str
    cash_session_id: str | None
    method: str
    amount: Decimal
    reference: str | None
    received_by: str | None
    received_at: datetime
    status: str


# ----- Cash session -----


class CashSessionOpen(ORMModel):
    opening_balance: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    branch_id: str | None = None


class CashSessionClose(ORMModel):
    closing_balance_declared: Decimal = Field(ge=Decimal("0"))
    notes: str | None = None


class CashSessionRead(ORMModel):
    id: str
    organization_id: str
    branch_id: str | None
    user_id: str
    opened_at: datetime
    opening_balance: Decimal
    closed_at: datetime | None
    closing_balance_declared: Decimal | None
    closing_balance_calculated: Decimal | None
    difference: Decimal | None
    notes: str | None
