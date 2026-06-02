"""Tests E2E del módulo de vacunación."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


async def _setup_pet(client: AsyncClient, customer_payload: dict, pet_payload: dict) -> str:
    c = await client.post("/api/v1/customers", json=customer_payload)
    customer_id = c.json()["id"]
    p = await client.post("/api/v1/pets", json={**pet_payload, "customer_id": customer_id})
    return p.json()["id"]


async def _create_vaccine(client: AsyncClient, **overrides: object) -> dict:
    payload: dict[str, object] = {
        "name": "Antirrábica Canina",
        "species": "dog",
        "manufacturer": "Zoetis",
        "default_booster_interval_days": 365,
        "is_rabies": True,
        "active": True,
    }
    payload.update(overrides)
    r = await client.post("/api/v1/vaccines/catalog", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.integration
class TestCatalog:
    async def test_create_and_list(self, auth_client: AsyncClient) -> None:
        await _create_vaccine(auth_client)
        await _create_vaccine(
            auth_client, name="Sextuple Canina", is_rabies=False, default_booster_interval_days=365
        )
        r = await auth_client.get("/api/v1/vaccines/catalog")
        assert r.status_code == 200
        body = r.json()
        names = {v["name"] for v in body}
        assert "Antirrábica Canina" in names
        assert "Sextuple Canina" in names

    async def test_filter_by_species(self, auth_client: AsyncClient) -> None:
        await _create_vaccine(auth_client)  # dog
        await _create_vaccine(auth_client, name="Triple Felina", species="cat", is_rabies=False)
        r = await auth_client.get("/api/v1/vaccines/catalog", params={"species": "cat"})
        names = {v["name"] for v in r.json()}
        assert "Triple Felina" in names
        assert "Antirrábica Canina" not in names

    async def test_update_catalog(self, auth_client: AsyncClient) -> None:
        v = await _create_vaccine(auth_client)
        r = await auth_client.put(
            f"/api/v1/vaccines/catalog/{v['id']}",
            json={"default_booster_interval_days": 730},
        )
        assert r.status_code == 200
        assert r.json()["default_booster_interval_days"] == 730


@pytest.mark.integration
class TestAdministration:
    async def test_record_calculates_next_dose(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        vaccine = await _create_vaccine(auth_client)  # 365 días default

        applied_at = datetime(2026, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
        r = await auth_client.post(
            "/api/v1/vaccines/administrations",
            json={
                "pet_id": pet_id,
                "vaccine_id": vaccine["id"],
                "administered_at": applied_at.isoformat(),
                "lot_number": "ZL2026-001",
                "site_of_application": "MSD subcutáneo",
                "dose_number": 1,
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["next_dose_due_date"] == "2027-06-01"
        assert body["vaccine_name"] == "Antirrábica Canina"

    async def test_record_with_explicit_next_dose(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        vaccine = await _create_vaccine(auth_client)
        r = await auth_client.post(
            "/api/v1/vaccines/administrations",
            json={
                "pet_id": pet_id,
                "vaccine_id": vaccine["id"],
                "next_dose_due_date": "2026-09-01",
            },
        )
        assert r.status_code == 201
        assert r.json()["next_dose_due_date"] == "2026-09-01"

    async def test_list_pet_history(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        v1 = await _create_vaccine(auth_client)
        v2 = await _create_vaccine(
            auth_client, name="Sextuple", is_rabies=False, default_booster_interval_days=365
        )
        await auth_client.post(
            "/api/v1/vaccines/administrations",
            json={"pet_id": pet_id, "vaccine_id": v1["id"]},
        )
        await auth_client.post(
            "/api/v1/vaccines/administrations",
            json={"pet_id": pet_id, "vaccine_id": v2["id"]},
        )
        r = await auth_client.get(f"/api/v1/vaccines/pets/{pet_id}/vaccines")
        assert r.status_code == 200
        assert len(r.json()) == 2


@pytest.mark.integration
class TestDueList:
    async def test_due_lists_overdue_vaccines(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        vaccine = await _create_vaccine(auth_client)
        past_due = date.today() - timedelta(days=10)
        await auth_client.post(
            "/api/v1/vaccines/administrations",
            json={
                "pet_id": pet_id,
                "vaccine_id": vaccine["id"],
                "next_dose_due_date": past_due.isoformat(),
            },
        )
        r = await auth_client.get("/api/v1/vaccines/due")
        assert r.status_code == 200
        body = r.json()
        assert len(body) == 1
        row = body[0]
        assert row["pet_id"] == pet_id
        assert row["days_overdue"] == 10

    async def test_due_respects_window(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        vaccine = await _create_vaccine(auth_client)
        far_future = date.today() + timedelta(days=180)
        await auth_client.post(
            "/api/v1/vaccines/administrations",
            json={
                "pet_id": pet_id,
                "vaccine_id": vaccine["id"],
                "next_dose_due_date": far_future.isoformat(),
            },
        )
        r = await auth_client.get("/api/v1/vaccines/due", params={"days_window": 30})
        # next_dose 180 días en el futuro, ventana 30 → no debe listar
        assert r.json() == []
