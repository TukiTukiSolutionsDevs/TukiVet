"""Tests E2E del módulo de citas."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


async def _get_owner_id(auth_client: AsyncClient) -> str:
    me = await auth_client.get("/api/v1/auth/me")
    return me.json()["id"]


async def _setup(
    client: AsyncClient, customer_payload: dict, pet_payload: dict
) -> tuple[str, str]:
    c = await client.post("/api/v1/customers", json=customer_payload)
    customer_id = c.json()["id"]
    p = await client.post("/api/v1/pets", json={**pet_payload, "customer_id": customer_id})
    return customer_id, p.json()["id"]


async def _build_appt_payload(
    auth_client: AsyncClient,
    customer_id: str,
    pet_id: str,
    starts_at: datetime,
    minutes: int = 30,
) -> dict:
    owner_id = await _get_owner_id(auth_client)
    return {
        "customer_id": customer_id,
        "pet_id": pet_id,
        "veterinarian_id": owner_id,
        "type": "consultation",
        "starts_at": starts_at.isoformat(),
        "ends_at": (starts_at + timedelta(minutes=minutes)).isoformat(),
    }


@pytest.mark.integration
class TestCreate:
    async def test_create_appointment(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup(auth_client, sample_customer_payload, sample_pet_payload)
        start = datetime.now(tz=timezone.utc).replace(microsecond=0) + timedelta(days=1)
        payload = await _build_appt_payload(auth_client, customer_id, pet_id, start)
        r = await auth_client.post("/api/v1/appointments", json=payload)
        assert r.status_code == 201, r.text
        assert r.json()["status"] == "scheduled"

    async def test_overlapping_vet_returns_409(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup(auth_client, sample_customer_payload, sample_pet_payload)
        start = datetime.now(tz=timezone.utc).replace(microsecond=0) + timedelta(days=1)
        payload = await _build_appt_payload(auth_client, customer_id, pet_id, start, minutes=30)
        a = await auth_client.post("/api/v1/appointments", json=payload)
        assert a.status_code == 201

        # Solapamiento parcial con el mismo vet
        overlap_start = start + timedelta(minutes=15)
        overlap_payload = await _build_appt_payload(
            auth_client, customer_id, pet_id, overlap_start, minutes=30
        )
        b = await auth_client.post("/api/v1/appointments", json=overlap_payload)
        assert b.status_code == 409

    async def test_back_to_back_appointments_allowed(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup(auth_client, sample_customer_payload, sample_pet_payload)
        start = datetime.now(tz=timezone.utc).replace(microsecond=0) + timedelta(days=1)
        payload1 = await _build_appt_payload(auth_client, customer_id, pet_id, start, minutes=30)
        await auth_client.post("/api/v1/appointments", json=payload1)
        # Empieza justo cuando termina la anterior
        payload2 = await _build_appt_payload(
            auth_client, customer_id, pet_id, start + timedelta(minutes=30), minutes=30
        )
        b = await auth_client.post("/api/v1/appointments", json=payload2)
        assert b.status_code == 201

    async def test_invalid_range_returns_422(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup(auth_client, sample_customer_payload, sample_pet_payload)
        owner_id = await _get_owner_id(auth_client)
        now = datetime.now(tz=timezone.utc).replace(microsecond=0)
        r = await auth_client.post(
            "/api/v1/appointments",
            json={
                "customer_id": customer_id,
                "pet_id": pet_id,
                "veterinarian_id": owner_id,
                "starts_at": (now + timedelta(hours=2)).isoformat(),
                "ends_at": (now + timedelta(hours=1)).isoformat(),
            },
        )
        assert r.status_code == 422


@pytest.mark.integration
class TestLifecycle:
    async def _make(self, client: AsyncClient, cust: dict, pet: dict) -> str:
        customer_id, pet_id = await _setup(client, cust, pet)
        start = datetime.now(tz=timezone.utc).replace(microsecond=0) + timedelta(days=1)
        payload = await _build_appt_payload(client, customer_id, pet_id, start)
        r = await client.post("/api/v1/appointments", json=payload)
        return r.json()["id"]

    async def test_confirm_start_complete(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        appt_id = await self._make(auth_client, sample_customer_payload, sample_pet_payload)
        c = await auth_client.post(f"/api/v1/appointments/{appt_id}/confirm")
        assert c.json()["status"] == "confirmed"
        s = await auth_client.post(f"/api/v1/appointments/{appt_id}/start")
        assert s.json()["status"] == "in_progress"
        cp = await auth_client.post(f"/api/v1/appointments/{appt_id}/complete")
        assert cp.json()["status"] == "completed"

    async def test_cancel_with_reason(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        appt_id = await self._make(auth_client, sample_customer_payload, sample_pet_payload)
        r = await auth_client.post(
            f"/api/v1/appointments/{appt_id}/cancel",
            json={"reason": "Dueño no puede asistir"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"
        assert r.json()["cancel_reason"] == "Dueño no puede asistir"

    async def test_no_show(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        appt_id = await self._make(auth_client, sample_customer_payload, sample_pet_payload)
        r = await auth_client.post(f"/api/v1/appointments/{appt_id}/no-show")
        assert r.status_code == 200
        assert r.json()["status"] == "no_show"

    async def test_cannot_confirm_twice(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        appt_id = await self._make(auth_client, sample_customer_payload, sample_pet_payload)
        await auth_client.post(f"/api/v1/appointments/{appt_id}/confirm")
        r = await auth_client.post(f"/api/v1/appointments/{appt_id}/confirm")
        assert r.status_code == 409


@pytest.mark.integration
class TestListing:
    async def test_filter_by_date_range(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id, pet_id = await _setup(auth_client, sample_customer_payload, sample_pet_payload)
        base = datetime.now(tz=timezone.utc).replace(microsecond=0) + timedelta(days=1)
        for hour in (8, 10, 14):
            p = await _build_appt_payload(
                auth_client, customer_id, pet_id, base.replace(hour=hour, minute=0)
            )
            await auth_client.post("/api/v1/appointments", json=p)

        r = await auth_client.get(
            "/api/v1/appointments",
            params={
                "starts_at_from": base.replace(hour=9, minute=0).isoformat(),
                "starts_at_to": base.replace(hour=12, minute=0).isoformat(),
            },
        )
        assert r.status_code == 200
        assert r.json()["total"] == 1
