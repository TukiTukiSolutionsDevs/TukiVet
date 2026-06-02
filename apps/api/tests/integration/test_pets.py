"""Tests E2E del módulo de mascotas."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _create_customer(client: AsyncClient, payload: dict) -> str:
    r = await client.post("/api/v1/customers", json=payload)
    assert r.status_code == 201, r.text
    return r.json()["id"]


@pytest.mark.integration
class TestCreatePet:
    async def test_create_pet_with_customer(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        payload = {**sample_pet_payload, "customer_id": customer_id}
        r = await auth_client.post("/api/v1/pets", json=payload)
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["name"] == "Toby"
        assert body["species"] == "dog"
        assert body["status"] == "active"

    async def test_create_pet_with_microchip(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        payload = {
            **sample_pet_payload,
            "customer_id": customer_id,
            "microchip": "982000123456789",
        }
        r = await auth_client.post("/api/v1/pets", json=payload)
        assert r.status_code == 201, r.text
        assert r.json()["microchip"] == "982000123456789"

    async def test_create_pet_with_duplicate_microchip_returns_409(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        chip = "982000999111222"
        payload = {**sample_pet_payload, "customer_id": customer_id, "microchip": chip}
        a = await auth_client.post("/api/v1/pets", json=payload)
        assert a.status_code == 201

        b_payload = {**payload, "name": "Otro"}
        b = await auth_client.post("/api/v1/pets", json=b_payload)
        assert b.status_code == 409

    async def test_create_pet_with_invalid_chip_returns_422(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        bad = {**sample_pet_payload, "customer_id": customer_id, "microchip": "ABC123"}
        r = await auth_client.post("/api/v1/pets", json=bad)
        assert r.status_code == 422

    async def test_create_pet_without_customer_returns_404(
        self,
        auth_client: AsyncClient,
        sample_pet_payload: dict,
    ) -> None:
        payload = {**sample_pet_payload, "customer_id": "01HXXX000000000000000000NO"}
        r = await auth_client.post("/api/v1/pets", json=payload)
        assert r.status_code == 404


@pytest.mark.integration
class TestListSearchPet:
    async def test_search_by_microchip(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        chip = "982000123456789"
        await auth_client.post(
            "/api/v1/pets",
            json={**sample_pet_payload, "customer_id": customer_id, "microchip": chip},
        )
        r = await auth_client.get("/api/v1/pets", params={"microchip": chip})
        assert r.status_code == 200
        assert r.json()["total"] == 1

    async def test_filter_by_species(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        await auth_client.post(
            "/api/v1/pets",
            json={**sample_pet_payload, "customer_id": customer_id},
        )
        await auth_client.post(
            "/api/v1/pets",
            json={
                **sample_pet_payload,
                "name": "Mishi",
                "species": "cat",
                "customer_id": customer_id,
            },
        )
        r = await auth_client.get("/api/v1/pets", params={"species": "cat"})
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 1
        assert body["items"][0]["species"] == "cat"

    async def test_list_pets_of_customer(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        await auth_client.post(
            "/api/v1/pets",
            json={**sample_pet_payload, "customer_id": customer_id},
        )
        r = await auth_client.get(f"/api/v1/customers/{customer_id}/pets")
        assert r.status_code == 200
        body = r.json()
        assert len(body) == 1
        assert body[0]["name"] == "Toby"


@pytest.mark.integration
class TestWeights:
    async def test_record_weight_updates_current(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        pet = (
            await auth_client.post(
                "/api/v1/pets",
                json={**sample_pet_payload, "customer_id": customer_id},
            )
        ).json()

        r = await auth_client.post(
            f"/api/v1/pets/{pet['id']}/weights",
            json={"weight_kg": "25.50", "notes": "Control mensual"},
        )
        assert r.status_code == 201, r.text
        assert r.json()["weight_kg"] == "25.50"

        # current_weight_kg debe haberse actualizado en el pet
        updated = await auth_client.get(f"/api/v1/pets/{pet['id']}")
        body = updated.json()
        assert body["current_weight_kg"] == "25.50"

    async def test_list_weights_returns_history_desc(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        pet = (
            await auth_client.post(
                "/api/v1/pets",
                json={**sample_pet_payload, "customer_id": customer_id},
            )
        ).json()
        for w in ("10.00", "12.50", "15.00"):
            await auth_client.post(
                f"/api/v1/pets/{pet['id']}/weights", json={"weight_kg": w}
            )

        r = await auth_client.get(f"/api/v1/pets/{pet['id']}/weights")
        assert r.status_code == 200
        body = r.json()
        assert len(body) == 3


@pytest.mark.integration
class TestUpdatePet:
    async def test_mark_pet_deceased(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _create_customer(auth_client, sample_customer_payload)
        pet = (
            await auth_client.post(
                "/api/v1/pets",
                json={**sample_pet_payload, "customer_id": customer_id},
            )
        ).json()
        r = await auth_client.put(
            f"/api/v1/pets/{pet['id']}",
            json={
                "status": "deceased",
                "deceased_date": "2026-05-30",
                "deceased_reason": "Edad avanzada",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "deceased"
        assert body["deceased_date"] == "2026-05-30"
