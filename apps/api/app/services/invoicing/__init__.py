"""Servicios de facturación electrónica con adapter abstracto.

Provider real: TukiFact (https://api.tukifact.net.pe/v1).
Provider de tests: Mock.

Selección via settings.tukifact_environment.
"""

from app.services.invoicing.provider import (
    EmitDocumentRequest,
    EmitDocumentResponse,
    InvoiceProvider,
)

__all__ = ["EmitDocumentRequest", "EmitDocumentResponse", "InvoiceProvider"]
