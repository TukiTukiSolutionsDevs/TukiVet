"""Puerto abstracto para emisión de comprobantes electrónicos."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any


@dataclass
class EmitItem:
    description: str
    quantity: Decimal
    unit_price: Decimal
    igv_amount: Decimal


@dataclass
class EmitDocumentRequest:
    """Payload a enviar al provider (TukiFact). Tipo SUNAT: 01=Factura, 03=Boleta."""

    type: str  # 01 | 03 | 07 | 08
    series: str
    number: int
    customer_document_type: str  # 1=DNI, 6=RUC
    customer_document_number: str
    customer_name: str
    customer_address: str | None
    items: list[EmitItem]
    subtotal: Decimal
    igv_amount: Decimal
    total: Decimal
    currency: str = "PEN"
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class EmitDocumentResponse:
    provider_id: str          # doc_xxx en TukiFact
    status: str               # accepted | rejected | pending
    sunat_code: str | None    # CDR code
    sunat_message: str | None
    raw_response: dict[str, Any]


class InvoiceProvider(ABC):
    """Adaptador para emisión de comprobantes electrónicos."""

    @abstractmethod
    async def emit_document(self, payload: EmitDocumentRequest) -> EmitDocumentResponse:
        ...

    @abstractmethod
    async def void_document(self, provider_id: str, reason: str) -> EmitDocumentResponse:
        ...

    @abstractmethod
    async def get_status(self, provider_id: str) -> str:
        ...

    @abstractmethod
    def verify_webhook(self, signature: str, payload_bytes: bytes) -> bool:
        ...

    @abstractmethod
    def pdf_url(self, provider_id: str) -> str:
        ...

    @abstractmethod
    def xml_url(self, provider_id: str) -> str:
        ...
