"""Adaptador mock — para tests y desarrollo sin red.

Comportamiento determinista:
- emit_document → siempre 'accepted' con provider_id deterministico (mock_<hash>)
- void_document → 'accepted'
- get_status → 'accepted'
- pdf_url/xml_url → URLs ficticias
"""

from __future__ import annotations

import hashlib
from typing import Any

from app.services.invoicing.provider import (
    EmitDocumentRequest,
    EmitDocumentResponse,
    InvoiceProvider,
)


class MockInvoiceProvider(InvoiceProvider):
    def _build_id(self, prefix: str, payload: object) -> str:
        h = hashlib.sha256(str(payload).encode()).hexdigest()[:12]
        return f"{prefix}_{h}"

    async def emit_document(self, payload: EmitDocumentRequest) -> EmitDocumentResponse:
        provider_id = self._build_id("doc", payload)
        raw: dict[str, Any] = {
            "data": {
                "id": provider_id,
                "type": payload.type,
                "series": payload.series,
                "number": payload.number,
                "status": "accepted",
            },
        }
        return EmitDocumentResponse(
            provider_id=provider_id,
            status="accepted",
            sunat_code="0",
            sunat_message="Aceptado (mock)",
            raw_response=raw,
        )

    async def void_document(self, provider_id: str, reason: str) -> EmitDocumentResponse:
        return EmitDocumentResponse(
            provider_id=provider_id,
            status="cancelled",
            sunat_code="0",
            sunat_message=f"Anulado (mock): {reason}",
            raw_response={"id": provider_id, "voided": True, "reason": reason},
        )

    async def get_status(self, provider_id: str) -> str:
        return "accepted"

    def verify_webhook(self, signature: str, payload_bytes: bytes) -> bool:
        return True  # Mock acepta todo

    def pdf_url(self, provider_id: str) -> str:
        return f"https://sandbox.tukifact.net.pe/v1/documents/{provider_id}/pdf"

    def xml_url(self, provider_id: str) -> str:
        return f"https://sandbox.tukifact.net.pe/v1/documents/{provider_id}/xml"
