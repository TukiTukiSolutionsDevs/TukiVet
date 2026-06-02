"""Schemas Pydantic para inventario."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import Field

from app.schemas.common import ORMModel

ProductCategory = Literal["medication", "vaccine", "food", "accessory", "supply", "service"]
LotStatus = Literal["active", "depleted", "expired", "recalled"]
MovementType = Literal["purchase", "sale", "dispensation", "adjustment", "waste", "transfer"]


# ----- Supplier -----


class SupplierCreate(ORMModel):
    name: str = Field(min_length=2, max_length=255)
    ruc: str | None = Field(default=None, min_length=11, max_length=11)
    contact_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None, max_length=500)


class SupplierUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    contact_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    active: bool | None = None


class SupplierRead(ORMModel):
    id: str
    organization_id: str
    name: str
    ruc: str | None
    contact_name: str | None
    phone: str | None
    email: str | None
    address: str | None
    active: bool


# ----- Product -----


class ProductCreate(ORMModel):
    sku: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=2, max_length=255)
    category: ProductCategory
    subcategory: str | None = Field(default=None, max_length=100)
    presentation: str | None = Field(default=None, max_length=100)
    active_ingredient: str | None = Field(default=None, max_length=255)
    manufacturer: str | None = Field(default=None, max_length=150)
    is_controlled: bool = False
    barcode: str | None = Field(default=None, max_length=50)
    unit: str = Field(default="unidad", max_length=20)
    reorder_point: Decimal | None = Field(default=None, ge=Decimal("0"))
    reorder_qty: Decimal | None = Field(default=None, ge=Decimal("0"))
    sale_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0"))
    sale_price_includes_igv: bool = True
    igv_affected: bool = True
    sunat_code: str | None = Field(default=None, max_length=20)
    active: bool = True


class ProductUpdate(ORMModel):
    name: str | None = None
    category: ProductCategory | None = None
    subcategory: str | None = None
    presentation: str | None = None
    active_ingredient: str | None = None
    manufacturer: str | None = None
    is_controlled: bool | None = None
    barcode: str | None = None
    unit: str | None = None
    reorder_point: Decimal | None = None
    reorder_qty: Decimal | None = None
    sale_price: Decimal | None = Field(default=None, ge=Decimal("0"))
    sale_price_includes_igv: bool | None = None
    igv_affected: bool | None = None
    sunat_code: str | None = None
    active: bool | None = None


class ProductRead(ORMModel):
    id: str
    organization_id: str
    sku: str
    name: str
    category: str
    subcategory: str | None
    presentation: str | None
    active_ingredient: str | None
    manufacturer: str | None
    is_controlled: bool
    barcode: str | None
    unit: str
    reorder_point: Decimal | None
    reorder_qty: Decimal | None
    sale_price: Decimal
    sale_price_includes_igv: bool
    igv_affected: bool
    sunat_code: str | None
    active: bool
    available_qty: Decimal | None = None


# ----- Lot -----


class LotCreate(ORMModel):
    product_id: str
    lot_number: str = Field(min_length=1, max_length=50)
    expiry_date: date | None = None
    received_at: date | None = None
    supplier_id: str | None = None
    unit_cost: Decimal = Field(default=Decimal("0.0000"), ge=Decimal("0"))
    initial_qty: Decimal = Field(gt=Decimal("0"))


class LotRead(ORMModel):
    id: str
    organization_id: str
    product_id: str
    lot_number: str
    expiry_date: date | None
    received_at: date | None
    supplier_id: str | None
    unit_cost: Decimal
    initial_qty: Decimal
    current_qty: Decimal
    status: str


# ----- Movement -----


class MovementCreate(ORMModel):
    product_id: str
    lot_id: str | None = None
    type: MovementType
    quantity: Decimal = Field(description="Cantidad signed: + ingresa, - sale")
    unit_cost: Decimal | None = None
    reference_type: str | None = None
    reference_id: str | None = None
    reason: str | None = None
    witness_user_id: str | None = None


class MovementRead(ORMModel):
    id: str
    organization_id: str
    product_id: str
    lot_id: str | None
    type: str
    quantity: Decimal
    unit_cost: Decimal | None
    reference_type: str | None
    reference_id: str | None
    reason: str | None
    performed_by: str | None
    witness_user_id: str | None


# ----- Alerts -----


class StockAlertRow(ORMModel):
    product_id: str
    sku: str
    name: str
    category: str
    available_qty: Decimal
    reorder_point: Decimal | None


class ExpiringLotRow(ORMModel):
    lot_id: str
    product_id: str
    product_name: str
    lot_number: str
    expiry_date: date
    days_until_expiry: int
    current_qty: Decimal
