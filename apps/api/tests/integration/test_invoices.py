"""Tests E2E del módulo de facturación electrónica (con MockInvoiceProvider)."""

from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient


async def _setup_paid_order(
    auth_client: AsyncClient,
    customer_payload: dict,
    *,
    customer_doc_type: str = "DNI",
    customer_doc_number: str = "12345678",
    customer_business_name: str | None = None,
) -> dict:
    customer_payload = {
        **customer_payload,
        "document_type": customer_doc_type,
        "document_number": customer_doc_number,
        "business_name": customer_business_name,
    }
    customer = (await auth_client.post("/api/v1/customers", json=customer_payload)).json()

    service = (
        await auth_client.post(
            "/api/v1/orders/services",
            json={
                "code": "CONS",
                "name": "Consulta general",
                "category": "consultation",
                "base_price": "118.00",
                "price_includes_igv": True,
            },
        )
    ).json()

    order = (
        await auth_client.post(
            "/api/v1/orders",
            json={
                "customer_id": customer["id"],
                "items": [{"service_id": service["id"], "quantity": "1"}],
            },
        )
    ).json()

    await auth_client.post(
        f"/api/v1/orders/{order['id']}/payments",
        json={"method": "cash", "amount": "118.00"},
    )
    final_order = (await auth_client.get(f"/api/v1/orders/{order['id']}")).json()
    assert final_order["status"] == "paid"
    return final_order


@pytest.mark.integration
class TestEmit:
    async def test_emit_boleta_for_dni_customer(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        order = await _setup_paid_order(auth_client, sample_customer_payload)
        r = await auth_client.post(
            "/api/v1/invoices", json={"order_id": order["id"]}
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["type"] == "03"  # boleta para DNI
        assert body["series"] == "B001"
        assert body["number"] == 1
        assert body["status"] == "accepted"
        assert body["tukifact_id"]  # mock devuelve id
        assert body["pdf_url"].endswith(f"/{body['tukifact_id']}/pdf")
        assert Decimal(body["total"]) == Decimal("118.00")

    async def test_emit_factura_for_ruc_customer(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        order = await _setup_paid_order(
            auth_client,
            sample_customer_payload,
            customer_doc_type="RUC",
            customer_doc_number="20100066603",
            customer_business_name="Empresa Cliente SAC",
        )
        r = await auth_client.post(
            "/api/v1/invoices", json={"order_id": order["id"]}
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["type"] == "01"  # factura para RUC
        assert body["series"] == "F001"
        assert body["customer_name"] == "Empresa Cliente SAC"

    async def test_correlative_increments(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        # Primera boleta
        order1 = await _setup_paid_order(auth_client, sample_customer_payload)
        r1 = await auth_client.post("/api/v1/invoices", json={"order_id": order1["id"]})
        assert r1.json()["number"] == 1

        # Segunda boleta (otro cliente para evitar dedup DNI)
        order2 = await _setup_paid_order(
            auth_client,
            sample_customer_payload,
            customer_doc_number="87654321",
        )
        r2 = await auth_client.post("/api/v1/invoices", json={"order_id": order2["id"]})
        assert r2.json()["number"] == 2

    async def test_emit_unpaid_order_returns_409(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        customer = (
            await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        ).json()
        service = (
            await auth_client.post(
                "/api/v1/orders/services",
                json={
                    "code": "X",
                    "name": "Servicio X",
                    "category": "consultation",
                    "base_price": "100.00",
                },
            )
        ).json()
        order = (
            await auth_client.post(
                "/api/v1/orders",
                json={
                    "customer_id": customer["id"],
                    "items": [{"service_id": service["id"], "quantity": "1"}],
                },
            )
        ).json()

        r = await auth_client.post("/api/v1/invoices", json={"order_id": order["id"]})
        assert r.status_code == 409


@pytest.mark.integration
class TestVoidAndList:
    async def test_void_document(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        order = await _setup_paid_order(auth_client, sample_customer_payload)
        doc = (
            await auth_client.post("/api/v1/invoices", json={"order_id": order["id"]})
        ).json()
        v = await auth_client.post(
            f"/api/v1/invoices/{doc['id']}/void",
            json={"reason": "Comprobante emitido por error"},
        )
        assert v.status_code == 200
        assert v.json()["status"] == "cancelled"

    async def test_list_documents_paginated(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        order = await _setup_paid_order(auth_client, sample_customer_payload)
        await auth_client.post("/api/v1/invoices", json={"order_id": order["id"]})
        r = await auth_client.get("/api/v1/invoices")
        assert r.status_code == 200
        body = r.json()
        assert body["total"] >= 1


@pytest.mark.integration
class TestWebhook:
    async def test_webhook_updates_status(
        self,
        client: AsyncClient,  # cliente NO autenticado para simular webhook real
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        order = await _setup_paid_order(auth_client, sample_customer_payload)
        doc = (
            await auth_client.post("/api/v1/invoices", json={"order_id": order["id"]})
        ).json()

        # Webhook entrante de TukiFact
        r = await client.post(
            "/api/v1/webhooks/tukifact",
            json={
                "event": "document.accepted",
                "data": {"id": doc["tukifact_id"], "status": "accepted"},
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["document_found"] == "True"
