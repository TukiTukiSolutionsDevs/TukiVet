"""Tests E2E del módulo de inventario."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from httpx import AsyncClient


async def _make_product(client: AsyncClient, **overrides: object) -> dict:
    payload: dict[str, object] = {
        "sku": "MED-001",
        "name": "Amoxicilina 500mg",
        "category": "medication",
        "presentation": "Tableta 500mg",
        "active_ingredient": "Amoxicilina",
        "unit": "tableta",
        "sale_price": "1.50",
        "reorder_point": "20",
    }
    payload.update(overrides)
    r = await client.post("/api/v1/inventory/products", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


async def _make_lot(client: AsyncClient, product_id: str, **overrides: object) -> dict:
    payload: dict[str, object] = {
        "product_id": product_id,
        "lot_number": "L-2026-001",
        "expiry_date": (date.today() + timedelta(days=365)).isoformat(),
        "unit_cost": "0.40",
        "initial_qty": "100",
    }
    payload.update(overrides)
    r = await client.post("/api/v1/inventory/lots", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.integration
class TestProducts:
    async def test_create_and_list(self, auth_client: AsyncClient) -> None:
        await _make_product(auth_client)
        r = await auth_client.get("/api/v1/inventory/products")
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    async def test_duplicate_sku_returns_409(self, auth_client: AsyncClient) -> None:
        await _make_product(auth_client)
        bad = await auth_client.post(
            "/api/v1/inventory/products",
            json={
                "sku": "MED-001",
                "name": "Otro nombre",
                "category": "medication",
                "sale_price": "1.50",
            },
        )
        assert bad.status_code == 409

    async def test_search_by_active_ingredient(self, auth_client: AsyncClient) -> None:
        await _make_product(auth_client)
        r = await auth_client.get(
            "/api/v1/inventory/products", params={"q": "amoxi"}
        )
        assert r.json()["total"] >= 1


@pytest.mark.integration
class TestLots:
    async def test_receive_lot_creates_movement(self, auth_client: AsyncClient) -> None:
        product = await _make_product(auth_client)
        lot = await _make_lot(auth_client, product["id"])
        assert lot["initial_qty"] == "100.00"
        assert lot["current_qty"] == "100.00"

        # available_qty del product debería ser 100
        r = await auth_client.get(f"/api/v1/inventory/products/{product['id']}")
        assert r.json()["available_qty"] == "100.00"

    async def test_duplicate_lot_number_returns_409(self, auth_client: AsyncClient) -> None:
        product = await _make_product(auth_client)
        await _make_lot(auth_client, product["id"])
        r = await auth_client.post(
            "/api/v1/inventory/lots",
            json={
                "product_id": product["id"],
                "lot_number": "L-2026-001",
                "initial_qty": "50",
            },
        )
        assert r.status_code == 409


@pytest.mark.integration
class TestMovements:
    async def test_adjustment_can_decrease_stock(self, auth_client: AsyncClient) -> None:
        product = await _make_product(auth_client)
        lot = await _make_lot(auth_client, product["id"])
        r = await auth_client.post(
            "/api/v1/inventory/movements",
            json={
                "product_id": product["id"],
                "lot_id": lot["id"],
                "type": "adjustment",
                "quantity": "-5",
                "reason": "Conteo físico — diferencia",
            },
        )
        assert r.status_code == 201, r.text

        # Verifica que current_qty bajó
        lots_resp = await auth_client.get(f"/api/v1/inventory/products/{product['id']}/lots")
        assert lots_resp.json()[0]["current_qty"] == "95.00"

    async def test_negative_movement_exceeding_stock_returns_409(
        self, auth_client: AsyncClient
    ) -> None:
        product = await _make_product(auth_client)
        lot = await _make_lot(auth_client, product["id"])
        r = await auth_client.post(
            "/api/v1/inventory/movements",
            json={
                "product_id": product["id"],
                "lot_id": lot["id"],
                "type": "waste",
                "quantity": "-200",
            },
        )
        assert r.status_code == 409


@pytest.mark.integration
class TestAlerts:
    async def test_low_stock_listed(self, auth_client: AsyncClient) -> None:
        product = await _make_product(auth_client, reorder_point="50")
        await _make_lot(auth_client, product["id"], initial_qty="30")
        r = await auth_client.get("/api/v1/inventory/alerts/low-stock")
        assert r.status_code == 200
        body = r.json()
        assert any(p["product_id"] == product["id"] for p in body)

    async def test_expiring_lots_listed(self, auth_client: AsyncClient) -> None:
        product = await _make_product(auth_client)
        soon = (date.today() + timedelta(days=15)).isoformat()
        await _make_lot(auth_client, product["id"], expiry_date=soon)
        r = await auth_client.get(
            "/api/v1/inventory/alerts/expiring", params={"days_window": 30}
        )
        assert r.status_code == 200
        body = r.json()
        assert any(row["product_id"] == product["id"] for row in body)
