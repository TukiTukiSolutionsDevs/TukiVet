"""Tests E2E del módulo de reportes."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient


async def _customer(client: AsyncClient, payload: dict) -> str:
    return (await client.post("/api/v1/customers", json=payload)).json()["id"]


@pytest.mark.integration
class TestKPIs:
    async def test_empty_org_returns_zeros(self, auth_client: AsyncClient) -> None:
        r = await auth_client.get("/api/v1/reports/kpis")
        assert r.status_code == 200
        body = r.json()
        assert body["active_patients"] == 0
        assert Decimal(body["revenue_last_30d"]) == Decimal("0.00")
        assert body["period_start"]

    async def test_kpis_with_activity(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        customer_id = await _customer(auth_client, sample_customer_payload)
        pet = (
            await auth_client.post(
                "/api/v1/pets",
                json={**sample_pet_payload, "customer_id": customer_id},
            )
        ).json()
        # encuentro
        await auth_client.post(
            "/api/v1/encounters",
            json={"pet_id": pet["id"], "customer_id": customer_id},
        )
        # orden pagada
        service = (
            await auth_client.post(
                "/api/v1/orders/services",
                json={
                    "code": "CONS",
                    "name": "Consulta",
                    "category": "consultation",
                    "base_price": "118.00",
                },
            )
        ).json()
        order = (
            await auth_client.post(
                "/api/v1/orders",
                json={
                    "customer_id": customer_id,
                    "items": [{"service_id": service["id"], "quantity": "1"}],
                },
            )
        ).json()
        await auth_client.post(
            f"/api/v1/orders/{order['id']}/payments",
            json={"method": "cash", "amount": "118.00"},
        )

        r = await auth_client.get("/api/v1/reports/kpis")
        body = r.json()
        assert body["active_patients"] >= 1
        assert body["total_encounters_last_30d"] >= 1
        assert Decimal(body["revenue_last_30d"]) >= Decimal("118.00")


@pytest.mark.integration
class TestFinancial:
    async def test_financial_report_range(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        customer_id = await _customer(auth_client, sample_customer_payload)
        service = (
            await auth_client.post(
                "/api/v1/orders/services",
                json={
                    "code": "X",
                    "name": "S",
                    "category": "consultation",
                    "base_price": "59.00",
                },
            )
        ).json()
        order = (
            await auth_client.post(
                "/api/v1/orders",
                json={
                    "customer_id": customer_id,
                    "items": [{"service_id": service["id"], "quantity": "1"}],
                },
            )
        ).json()
        await auth_client.post(
            f"/api/v1/orders/{order['id']}/payments",
            json={"method": "yape", "amount": "59.00"},
        )

        start = (date.today() - timedelta(days=7)).isoformat()
        end = date.today().isoformat()
        r = await auth_client.get(
            "/api/v1/reports/financial", params={"start": start, "end": end}
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert Decimal(body["gross_revenue"]) == Decimal("59.00")
        assert Decimal(body["payments_by_method"]["yape"]) == Decimal("59.00")
