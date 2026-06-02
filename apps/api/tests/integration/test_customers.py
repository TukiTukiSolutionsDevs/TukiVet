"""Tests E2E del módulo de clientes."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestValidateDocument:
    async def test_validate_dni_ok(self, auth_client: AsyncClient) -> None:
        r = await auth_client.post(
            "/api/v1/customers/validate-doc",
            json={"document_type": "DNI", "document_number": "12345678"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["valid"] is True
        assert body["detected_type"] == "DNI"

    async def test_validate_ruc_ok(self, auth_client: AsyncClient) -> None:
        r = await auth_client.post(
            "/api/v1/customers/validate-doc",
            json={"document_type": "RUC", "document_number": "20100066603"},
        )
        assert r.status_code == 200
        assert r.json()["valid"] is True

    async def test_validate_dni_bad(self, auth_client: AsyncClient) -> None:
        r = await auth_client.post(
            "/api/v1/customers/validate-doc",
            json={"document_type": "DNI", "document_number": "1234"},
        )
        assert r.status_code == 200
        assert r.json()["valid"] is False


@pytest.mark.integration
class TestCreateCustomer:
    async def test_create_customer_ok(
        self, auth_client: AsyncClient, sample_customer_payload: dict
    ) -> None:
        r = await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["document_number"] == "12345678"
        assert body["first_name"] == "María"
        assert body["whatsapp_opted_in"] is True

    async def test_create_customer_duplicate_doc_returns_409(
        self, auth_client: AsyncClient, sample_customer_payload: dict
    ) -> None:
        a = await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        assert a.status_code == 201
        b = await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        assert b.status_code == 409

    async def test_create_customer_invalid_dni_returns_422(
        self, auth_client: AsyncClient, sample_customer_payload: dict
    ) -> None:
        bad = {**sample_customer_payload, "document_number": "1234"}
        r = await auth_client.post("/api/v1/customers", json=bad)
        assert r.status_code == 422

    async def test_create_customer_invalid_ruc_returns_422(
        self, auth_client: AsyncClient, sample_customer_payload: dict
    ) -> None:
        bad = {
            **sample_customer_payload,
            "document_type": "RUC",
            "document_number": "12345678901",
        }
        r = await auth_client.post("/api/v1/customers", json=bad)
        assert r.status_code == 422


@pytest.mark.integration
class TestListSearchCustomers:
    async def test_list_returns_paginated(
        self, auth_client: AsyncClient, sample_customer_payload: dict
    ) -> None:
        await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        r = await auth_client.get("/api/v1/customers")
        assert r.status_code == 200
        body = r.json()
        assert body["total"] >= 1
        assert body["page"] == 1
        assert any(c["document_number"] == "12345678" for c in body["items"])

    async def test_search_by_name(
        self, auth_client: AsyncClient, sample_customer_payload: dict
    ) -> None:
        await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        r = await auth_client.get("/api/v1/customers", params={"q": "maría"})
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    async def test_search_by_document_number(
        self, auth_client: AsyncClient, sample_customer_payload: dict
    ) -> None:
        await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        r = await auth_client.get(
            "/api/v1/customers", params={"document_number": "12345678"}
        )
        assert r.status_code == 200
        assert r.json()["total"] == 1


@pytest.mark.integration
class TestUpdateAndDeleteCustomer:
    async def test_update_customer(
        self, auth_client: AsyncClient, sample_customer_payload: dict
    ) -> None:
        created = (
            await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        ).json()
        r = await auth_client.put(
            f"/api/v1/customers/{created['id']}",
            json={"phone_primary": "+51988777666", "city": "Arequipa"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["phone_primary"] == "+51988777666"
        assert body["city"] == "Arequipa"

    async def test_soft_delete_customer(
        self, auth_client: AsyncClient, sample_customer_payload: dict
    ) -> None:
        created = (
            await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        ).json()
        r = await auth_client.delete(f"/api/v1/customers/{created['id']}")
        assert r.status_code == 204
        # Después del soft-delete, no se encuentra
        check = await auth_client.get(f"/api/v1/customers/{created['id']}")
        assert check.status_code == 404
