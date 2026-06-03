"""Schemas Pydantic para reportes y KPIs."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.schemas.common import ORMModel


class KPIs(ORMModel):
    active_patients: int
    active_clients: int
    total_encounters_last_30d: int
    average_transaction_charge: Decimal
    revenue_last_30d: Decimal
    revenue_per_vet_last_30d: dict[str, Decimal]
    appointments_last_30d: int
    no_show_rate_pct: Decimal
    vaccines_compliance_pct: Decimal
    inventory_value: Decimal
    expiring_lots_count: int
    low_stock_count: int
    period_start: date
    period_end: date


class RevenueByCategoryRow(ORMModel):
    category: str
    count: int
    total: Decimal


class FinancialReport(ORMModel):
    period_start: date
    period_end: date
    gross_revenue: Decimal
    igv_collected: Decimal
    net_revenue: Decimal
    payments_by_method: dict[str, Decimal]
    revenue_by_category: list[RevenueByCategoryRow]
    invoices_emitted: int
    boletas_emitted: int
    cancelled_documents: int
