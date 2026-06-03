"""Schemas Pydantic para comprobantes electrónicos."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import Field

from app.schemas.common import ORMModel

DocType = Literal["01", "03", "07", "08"]


class EmitInvoiceRequest(ORMModel):
    order_id: str
    doc_type: DocType | None = Field(
        default=None,
        description="01=Factura, 03=Boleta. Si no se envía, se infiere por documento del cliente.",
    )


class VoidInvoiceRequest(ORMModel):
    reason: str = Field(min_length=10, max_length=500)


class ElectronicDocumentRead(ORMModel):
    id: str
    organization_id: str
    order_id: str | None
    type: str
    series: str
    number: int
    customer_id: str | None
    customer_document_type: str
    customer_document_number: str
    customer_name: str
    customer_address: str | None
    issued_at: datetime
    currency: str
    subtotal: Decimal
    igv_amount: Decimal
    total: Decimal
    status: str
    tukifact_id: str | None
    tukifact_status: str | None
    sunat_code: str | None
    sunat_message: str | None
    cancellation_reason: str | None
    pdf_url: str | None = None
    xml_url: str | None = None
