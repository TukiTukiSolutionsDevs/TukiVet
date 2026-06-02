"""Tests E2E del módulo de encuentros + SOAP + signos vitales."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _setup_customer_and_pet(
    client: AsyncClient, customer_payload: dict, pet_payload: dict
) -> tuple[str, str]:
    c = await client.post("/api/v1/customers", json=customer_payload)
    customer_id = c.json()["id"]
    p = await client.post("/api/v1/pets", json={**pet_payload, "customer_id": customer_id})
    return customer_id, p.json()["id"]


async def _create_encounter(client: AsyncClient, pet_id: str, customer_id: str) -> dict:
    r = await client.post(
        "/api/v1/encounters",
        json={"pet_id": pet_id, "customer_id": customer_id, "chief_complaint": "Tos"},
    )
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.integration
class TestCreateEncounter:
    async def test_creates_encounter_in_draft(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup_customer_and_pet(
            auth_client, sample_customer_payload, sample_pet_payload
        )
        body = await _create_encounter(auth_client, pet_id, customer_id)
        assert body["status"] == "draft"
        assert body["type"] == "consultation"
        assert body["chief_complaint"] == "Tos"

    async def test_create_with_unknown_pet_returns_404(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        c = await auth_client.post("/api/v1/customers", json=sample_customer_payload)
        customer_id = c.json()["id"]
        r = await auth_client.post(
            "/api/v1/encounters",
            json={
                "pet_id": "01HXXX000000000000000000NO",
                "customer_id": customer_id,
            },
        )
        assert r.status_code == 404


@pytest.mark.integration
class TestSoap:
    async def test_update_soap_advances_status(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup_customer_and_pet(
            auth_client, sample_customer_payload, sample_pet_payload
        )
        enc = await _create_encounter(auth_client, pet_id, customer_id)

        soap_payload = {
            "subjective": {"chief_complaint": "Tos seca de 3 días", "history": "..."},
            "objective": {
                "general_appearance": "Activo, alerta",
                "systems": {"respiratory": "Tos seca, sin disnea"},
            },
            "assessment": [
                {"description": "Traqueobronquitis infecciosa canina", "type": "presumptive"}
            ],
            "plan": {
                "treatments": ["Antitusivo 3 días", "Hidratación"],
                "next_visit": "En 7 días",
            },
        }
        r = await auth_client.put(f"/api/v1/encounters/{enc['id']}/soap", json=soap_payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["subjective"]["chief_complaint"] == "Tos seca de 3 días"
        assert len(body["assessment"]) == 1

        # status del encuentro debe haber pasado a in_progress
        enc_after = await auth_client.get(f"/api/v1/encounters/{enc['id']}")
        assert enc_after.json()["status"] == "in_progress"

    async def test_get_soap_returns_empty_by_default(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup_customer_and_pet(
            auth_client, sample_customer_payload, sample_pet_payload
        )
        enc = await _create_encounter(auth_client, pet_id, customer_id)
        r = await auth_client.get(f"/api/v1/encounters/{enc['id']}/soap")
        assert r.status_code == 200
        body = r.json()
        assert body["subjective"] == {}
        assert body["assessment"] == []
        assert body["version"] == 1


@pytest.mark.integration
class TestVitals:
    async def test_add_vitals_advances_status(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup_customer_and_pet(
            auth_client, sample_customer_payload, sample_pet_payload
        )
        enc = await _create_encounter(auth_client, pet_id, customer_id)

        r = await auth_client.post(
            f"/api/v1/encounters/{enc['id']}/vitals",
            json={
                "temperature_c": "38.5",
                "heart_rate_bpm": 90,
                "respiratory_rate": 24,
                "weight_kg": "12.50",
                "body_condition_score": 5,
                "mucous_membranes": "rosadas húmedas",
            },
        )
        assert r.status_code == 201, r.text
        assert r.json()["temperature_c"] == "38.5"
        assert r.json()["heart_rate_bpm"] == 90

        listing = await auth_client.get(f"/api/v1/encounters/{enc['id']}/vitals")
        assert len(listing.json()) == 1

    async def test_invalid_temperature_returns_422(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup_customer_and_pet(
            auth_client, sample_customer_payload, sample_pet_payload
        )
        enc = await _create_encounter(auth_client, pet_id, customer_id)
        r = await auth_client.post(
            f"/api/v1/encounters/{enc['id']}/vitals",
            json={"temperature_c": "55.0"},
        )
        assert r.status_code == 422


@pytest.mark.integration
class TestCloseAndAmend:
    async def test_close_makes_immutable(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup_customer_and_pet(
            auth_client, sample_customer_payload, sample_pet_payload
        )
        enc = await _create_encounter(auth_client, pet_id, customer_id)
        await auth_client.put(
            f"/api/v1/encounters/{enc['id']}/soap",
            json={"subjective": {"chief_complaint": "Test"}},
        )
        close = await auth_client.post(f"/api/v1/encounters/{enc['id']}/close")
        assert close.status_code == 200
        assert close.json()["status"] == "closed"

        # No se puede modificar el SOAP después
        r = await auth_client.put(
            f"/api/v1/encounters/{enc['id']}/soap",
            json={"subjective": {"chief_complaint": "Cambiado"}},
        )
        assert r.status_code == 409

        # Tampoco se puede cerrar de nuevo
        again = await auth_client.post(f"/api/v1/encounters/{enc['id']}/close")
        assert again.status_code == 409

    async def test_amend_creates_amendment(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup_customer_and_pet(
            auth_client, sample_customer_payload, sample_pet_payload
        )
        enc = await _create_encounter(auth_client, pet_id, customer_id)
        await auth_client.put(
            f"/api/v1/encounters/{enc['id']}/soap",
            json={"subjective": {"chief_complaint": "Original"}},
        )
        await auth_client.post(f"/api/v1/encounters/{enc['id']}/close")

        # Enmienda
        r = await auth_client.post(
            f"/api/v1/encounters/{enc['id']}/amend",
            json={
                "reason": "Se corrigió por error en el diagnóstico inicial",
                "soap_update": {
                    "subjective": {"chief_complaint": "Corregido"},
                },
            },
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "amended"

        soap = await auth_client.get(f"/api/v1/encounters/{enc['id']}/soap")
        body = soap.json()
        assert body["subjective"]["chief_complaint"] == "Corregido"
        assert body["version"] == 2


@pytest.mark.integration
class TestProblems:
    async def test_add_and_list_problems(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup_customer_and_pet(
            auth_client, sample_customer_payload, sample_pet_payload
        )
        r = await auth_client.post(
            f"/api/v1/pets/{pet_id}/problems",
            json={
                "description": "Otitis externa recurrente",
                "status": "chronic",
                "onset_date": "2025-12-01",
            },
        )
        assert r.status_code == 201, r.text
        problem_id = r.json()["id"]

        listing = await auth_client.get(f"/api/v1/pets/{pet_id}/problems")
        assert listing.status_code == 200
        assert len(listing.json()) == 1

        # marcar como resuelto
        up = await auth_client.put(
            f"/api/v1/problems/{problem_id}", json={"status": "resolved"}
        )
        assert up.status_code == 200
        body = up.json()
        assert body["status"] == "resolved"
        assert body["resolved_date"] is not None
