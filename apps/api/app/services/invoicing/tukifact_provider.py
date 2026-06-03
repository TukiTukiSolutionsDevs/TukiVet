"""Adaptador real para TukiFact (https://api.tukifact.net.pe/v1).

API REST documentada en https://app.tukifact.com.pe/developers
- Bearer token (TF_test_* sandbox / TF_live_* prod)
- POST /v1/documents para emitir
- POST /v1/documents/:id/void para anular
- GET /v1/documents/:id/status para consultar
- Webhooks con HMAC en header X-TukiFact-Signature
"""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

import httpx

from app.services.invoicing.provider import (
    EmitDocumentRequest,
    EmitDocumentResponse,
    InvoiceProvider,
)


class TukiFactProvider(InvoiceProvider):
    """Cliente HTTP contra la API REST de TukiFact."""

    def __init__(
        self,
        *,
        api_key: str,
        environment: str = "sandbox",
        webhook_secret: str | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        if environment == "production":
            self._base_url = "https://api.tukifact.net.pe/v1"
        else:
            self._base_url = "https://sandbox.tukifact.net.pe/v1"
        self._api_key = api_key
        self._webhook_secret = webhook_secret or ""
        self._timeout = timeout_seconds

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _to_tukifact_payload(self, req: EmitDocumentRequest) -> dict[str, Any]:
        return {
            "type": req.type,
            "series": req.series,
            "customer": {
                "documentType": req.customer_document_type,
                "documentNumber": req.customer_document_number,
                "name": req.customer_name,
                "address": req.customer_address or "",
            },
            "items": [
                {
                    "description": it.description,
                    "quantity": float(it.quantity),
                    "unitPrice": float(it.unit_price),
                    "igv": float(it.igv_amount),
                }
                for it in req.items
            ],
            "currency": req.currency,
            **req.extra,
        }

    async def emit_document(self, payload: EmitDocumentRequest) -> EmitDocumentResponse:
        body = self._to_tukifact_payload(payload)
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(
                f"{self._base_url}/documents", headers=self._headers(), json=body
            )
        data = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            return EmitDocumentResponse(
                provider_id="",
                status="rejected",
                sunat_code=str(resp.status_code),
                sunat_message=str(data),
                raw_response=data,
            )
        d = data.get("data") if isinstance(data, dict) else {}
        if not isinstance(d, dict):
            d = data if isinstance(data, dict) else {}
        return EmitDocumentResponse(
            provider_id=str(d.get("id", "")),
            status=str(d.get("status", "pending")),
            sunat_code=d.get("cdrCode"),
            sunat_message=d.get("message"),
            raw_response=data,
        )

    async def void_document(self, provider_id: str, reason: str) -> EmitDocumentResponse:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(
                f"{self._base_url}/documents/{provider_id}/void",
                headers=self._headers(),
                json={"reason": reason},
            )
        data = resp.json() if resp.content else {}
        return EmitDocumentResponse(
            provider_id=provider_id,
            status="cancelled" if resp.status_code < 400 else "rejected",
            sunat_code=None,
            sunat_message=str(data) if resp.status_code >= 400 else "Anulado",
            raw_response=data if isinstance(data, dict) else {},
        )

    async def get_status(self, provider_id: str) -> str:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.get(
                f"{self._base_url}/documents/{provider_id}/status",
                headers=self._headers(),
            )
        if resp.status_code >= 400:
            return "unknown"
        data = resp.json() or {}
        d = data.get("data") if isinstance(data, dict) else {}
        return str(d.get("sunatStatus", "pending")) if isinstance(d, dict) else "pending"

    def verify_webhook(self, signature: str, payload_bytes: bytes) -> bool:
        if not self._webhook_secret:
            return False
        expected = hmac.new(
            self._webhook_secret.encode(), payload_bytes, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def pdf_url(self, provider_id: str) -> str:
        return f"{self._base_url}/documents/{provider_id}/pdf"

    def xml_url(self, provider_id: str) -> str:
        return f"{self._base_url}/documents/{provider_id}/xml"


def parse_webhook_payload(raw: bytes) -> dict[str, Any]:
    """Helper para parsear el cuerpo del webhook de TukiFact."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}
