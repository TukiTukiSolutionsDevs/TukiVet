"""Tests E2E del portal del cliente."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _setup_customer_with_pet(
    auth_client: AsyncClient,
    sample_customer_payload: dict,
    sample_pet_payload: dict,
) -> tuple[str, str]:
    c = await auth_client.post("/api/v1/customers", json=sample_customer_payload)
    customer_id = c.json()["id"]
    p = await auth_client.post(
        "/api/v1/pets", json={**sample_pet_payload, "customer_id": customer_id}
    )
    return customer_id, p.json()["id"]


@pytest.mark.integration
class TestMagicLink:
    async def test_magic_link_for_existing_customer(
        self,
        auth_client: AsyncClient,
        client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        await _setup_customer_with_pet(auth_client, sample_customer_payload, sample_pet_payload)
        # Asegura plantillas seed
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")

        # Pide magic link (cliente NO autenticado)
        r = await client.post(
            "/api/v1/portal/auth/magic-link",
            json={
                "document_type": sample_customer_payload["document_type"],
                "document_number": sample_customer_payload["document_number"],
                "channel": "whatsapp",
            },
        )
        assert r.status_code == 202, r.text
        body = r.json()
        assert "dev_token" in body  # en dev devolvemos el token
        token = body["dev_token"]

        # Consume el token → tokens
        consume = await client.post("/api/v1/portal/auth/consume", json={"token": token})
        assert consume.status_code == 200, consume.text
        tokens = consume.json()
        assert tokens["access_token"]
        assert tokens["refresh_token"]

    async def test_magic_link_for_unknown_returns_404(self, client: AsyncClient) -> None:
        r = await client.post(
            "/api/v1/portal/auth/magic-link",
            json={"document_type": "DNI", "document_number": "99999999"},
        )
        assert r.status_code == 404

    async def test_consume_invalid_token_returns_401(
        self, client: AsyncClient
    ) -> None:
        r = await client.post(
            "/api/v1/portal/auth/consume", json={"token": "totally-bogus-token-xxxx"}
        )
        assert r.status_code == 401


@pytest.mark.integration
class TestPortalSelfService:
    async def _login(
        self,
        client: AsyncClient,
        sample_customer_payload: dict,
    ) -> str:
        link = (
            await client.post(
                "/api/v1/portal/auth/magic-link",
                json={
                    "document_type": sample_customer_payload["document_type"],
                    "document_number": sample_customer_payload["document_number"],
                },
            )
        ).json()
        tokens = (
            await client.post(
                "/api/v1/portal/auth/consume", json={"token": link["dev_token"]}
            )
        ).json()
        return tokens["access_token"]

    async def test_me_and_pets(
        self,
        auth_client: AsyncClient,
        client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        await _setup_customer_with_pet(auth_client, sample_customer_payload, sample_pet_payload)
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")

        access = await self._login(client, sample_customer_payload)
        h = {"Authorization": f"Bearer {access}"}

        me = await client.get("/api/v1/portal/me", headers=h)
        assert me.status_code == 200
        assert me.json()["document_number"] == sample_customer_payload["document_number"]

        pets = await client.get("/api/v1/portal/pets", headers=h)
        assert pets.status_code == 200
        assert len(pets.json()) == 1
        assert pets.json()[0]["name"] == sample_pet_payload["name"]

    async def test_pet_history(
        self,
        auth_client: AsyncClient,
        client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup_customer_with_pet(
            auth_client, sample_customer_payload, sample_pet_payload
        )
        # Crea un encuentro
        await auth_client.post(
            "/api/v1/encounters",
            json={"pet_id": pet_id, "customer_id": customer_id, "chief_complaint": "Tos"},
        )
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")

        access = await self._login(client, sample_customer_payload)
        h = {"Authorization": f"Bearer {access}"}

        hist = await client.get(f"/api/v1/portal/pets/{pet_id}/history", headers=h)
        assert hist.status_code == 200
        body = hist.json()
        assert len(body["encounters"]) >= 1

    async def test_data_export(
        self,
        auth_client: AsyncClient,
        client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        await _setup_customer_with_pet(auth_client, sample_customer_payload, sample_pet_payload)
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")
        access = await self._login(client, sample_customer_payload)
        h = {"Authorization": f"Bearer {access}"}
        r = await client.get("/api/v1/portal/data-export", headers=h)
        assert r.status_code == 200
        body = r.json()
        assert "customer" in body
        assert "pets" in body
        assert len(body["pets"]) == 1


@pytest.mark.integration
class TestARCOAndConsent:
    async def _login(
        self,
        client: AsyncClient,
        sample_customer_payload: dict,
    ) -> str:
        link = (
            await client.post(
                "/api/v1/portal/auth/magic-link",
                json={
                    "document_type": sample_customer_payload["document_type"],
                    "document_number": sample_customer_payload["document_number"],
                },
            )
        ).json()
        tokens = (
            await client.post(
                "/api/v1/portal/auth/consume", json={"token": link["dev_token"]}
            )
        ).json()
        return tokens["access_token"]

    async def test_submit_arco_access(
        self,
        auth_client: AsyncClient,
        client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        await _setup_customer_with_pet(auth_client, sample_customer_payload, sample_pet_payload)
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")
        access = await self._login(client, sample_customer_payload)
        h = {"Authorization": f"Bearer {access}"}
        r = await client.post(
            "/api/v1/portal/data-requests",
            json={"type": "access", "description": "Solicito ver mis datos"},
            headers=h,
        )
        assert r.status_code == 201, r.text
        assert r.json()["status"] == "pending"
        assert r.json()["type"] == "access"

    async def test_submit_consent(
        self,
        auth_client: AsyncClient,
        client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        await _setup_customer_with_pet(auth_client, sample_customer_payload, sample_pet_payload)
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")
        access = await self._login(client, sample_customer_payload)
        h = {"Authorization": f"Bearer {access}"}
        r = await client.post(
            "/api/v1/portal/consents",
            json={
                "type": "data_processing",
                "version": "1.0",
                "body": "Acepto el tratamiento de mis datos personales conforme a Ley 29733...",
            },
            headers=h,
        )
        assert r.status_code == 201
        assert r.json()["body_hash"]
