"""Tests E2E del módulo POS / orders / pagos / caja."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient


async def _customer(auth_client: AsyncClient, payload: dict) -> str:
    r = await auth_client.post("/api/v1/customers", json=payload)
    return r.json()["id"]


async def _service(auth_client: AsyncClient, **overrides: object) -> dict:
    payload: dict[str, object] = {
        "code": "CONS-GEN",
        "name": "Consulta general",
        "category": "consultation",
        "base_price": "59.00",
        "price_includes_igv": True,
    }
    payload.update(overrides)
    r = await auth_client.post("/api/v1/orders/services", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


async def _product_with_stock(auth_client: AsyncClient, sku: str = "MED-A") -> dict:
    p = await auth_client.post(
        "/api/v1/inventory/products",
        json={
            "sku": sku,
            "name": "Antibiótico",
            "category": "medication",
            "sale_price": "11.80",
            "sale_price_includes_igv": True,
        },
    )
    prod = p.json()
    await auth_client.post(
        "/api/v1/inventory/lots",
        json={
            "product_id": prod["id"],
            "lot_number": "L1",
            "expiry_date": (date.today() + timedelta(days=365)).isoformat(),
            "initial_qty": "100",
        },
    )
    return prod


@pytest.mark.integration
class TestServiceCatalog:
    async def test_create_and_list(self, auth_client: AsyncClient) -> None:
        await _service(auth_client)
        await _service(auth_client, code="VAC-APL", name="Aplicación de vacuna", base_price="20")
        r = await auth_client.get("/api/v1/orders/services")
        assert r.status_code == 200
        codes = {s["code"] for s in r.json()}
        assert {"CONS-GEN", "VAC-APL"}.issubset(codes)


@pytest.mark.integration
class TestOrderTotals:
    async def test_order_with_service_calculates_igv_inclusive(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        customer_id = await _customer(auth_client, sample_customer_payload)
        service = await _service(auth_client)  # 59.00 incluyendo IGV

        r = await auth_client.post(
            "/api/v1/orders",
            json={
                "customer_id": customer_id,
                "items": [
                    {"service_id": service["id"], "quantity": "1"},
                ],
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        # 59 con IGV → igv = 59*18/118 = 9.00 ; subtotal = 50
        assert Decimal(body["igv_amount"]) == Decimal("9.00")
        assert Decimal(body["subtotal"]) == Decimal("50.00")
        assert Decimal(body["total"]) == Decimal("59.00")
        assert body["status"] == "open"
        assert Decimal(body["balance"]) == Decimal("59.00")

    async def test_mixed_order_with_product_and_service(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        customer_id = await _customer(auth_client, sample_customer_payload)
        service = await _service(auth_client, base_price="100.00")
        product = await _product_with_stock(auth_client)

        r = await auth_client.post(
            "/api/v1/orders",
            json={
                "customer_id": customer_id,
                "items": [
                    {"service_id": service["id"], "quantity": "1"},
                    {"product_id": product["id"], "quantity": "2"},
                ],
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        # service: 100 incl IGV (igv=15.25, subtotal=84.75)
        # product: 11.80 incl IGV × 2 = 23.60 (igv=3.60, subtotal=20.00)
        assert Decimal(body["total"]) == Decimal("123.60")
        assert Decimal(body["igv_amount"]) == Decimal("18.85")  # 15.25 + 3.60
        assert len(body["items"]) == 2

    async def test_discount_applies(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        customer_id = await _customer(auth_client, sample_customer_payload)
        service = await _service(auth_client, base_price="100.00")
        r = await auth_client.post(
            "/api/v1/orders",
            json={
                "customer_id": customer_id,
                "items": [{"service_id": service["id"], "quantity": "1", "discount_pct": "10"}],
            },
        )
        # 100 × 0.9 = 90 → igv 13.73 subtotal 76.27 total 90
        assert Decimal(r.json()["total"]) == Decimal("90.00")


@pytest.mark.integration
class TestPayments:
    async def test_partial_then_full_payment(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        customer_id = await _customer(auth_client, sample_customer_payload)
        service = await _service(auth_client, base_price="100.00")
        order = (
            await auth_client.post(
                "/api/v1/orders",
                json={
                    "customer_id": customer_id,
                    "items": [{"service_id": service["id"], "quantity": "1"}],
                },
            )
        ).json()

        p1 = await auth_client.post(
            f"/api/v1/orders/{order['id']}/payments",
            json={"method": "yape", "amount": "40.00", "reference": "Yape #12345"},
        )
        assert p1.status_code == 201, p1.text
        again = await auth_client.get(f"/api/v1/orders/{order['id']}")
        assert again.json()["status"] == "partially_paid"

        await auth_client.post(
            f"/api/v1/orders/{order['id']}/payments",
            json={"method": "cash", "amount": "60.00"},
        )
        final = await auth_client.get(f"/api/v1/orders/{order['id']}")
        assert final.json()["status"] == "paid"

    async def test_overpayment_returns_409(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        customer_id = await _customer(auth_client, sample_customer_payload)
        service = await _service(auth_client, base_price="50.00")
        order = (
            await auth_client.post(
                "/api/v1/orders",
                json={
                    "customer_id": customer_id,
                    "items": [{"service_id": service["id"], "quantity": "1"}],
                },
            )
        ).json()
        r = await auth_client.post(
            f"/api/v1/orders/{order['id']}/payments",
            json={"method": "cash", "amount": "100.00"},
        )
        assert r.status_code == 409


@pytest.mark.integration
class TestVoidAndItems:
    async def test_add_and_remove_item(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        customer_id = await _customer(auth_client, sample_customer_payload)
        service = await _service(auth_client, base_price="59.00")
        order = (
            await auth_client.post(
                "/api/v1/orders",
                json={"customer_id": customer_id, "items": []},
            )
        ).json()
        # add
        add = await auth_client.post(
            f"/api/v1/orders/{order['id']}/items",
            json={"service_id": service["id"], "quantity": "1"},
        )
        assert add.status_code == 200
        assert Decimal(add.json()["total"]) == Decimal("59.00")
        # remove
        item_id = add.json()["items"][0]["id"]
        rem = await auth_client.delete(f"/api/v1/orders/{order['id']}/items/{item_id}")
        assert Decimal(rem.json()["total"]) == Decimal("0.00")

    async def test_void_after_payment_is_blocked(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        customer_id = await _customer(auth_client, sample_customer_payload)
        service = await _service(auth_client)
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
            f"/api/v1/orders/{order['id']}/payments", json={"method": "cash", "amount": "30.00"}
        )
        v = await auth_client.post(f"/api/v1/orders/{order['id']}/void")
        assert v.status_code == 409


@pytest.mark.integration
class TestCashSession:
    async def test_open_close_calculates_difference(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
    ) -> None:
        # Abre caja
        opened = await auth_client.post(
            "/api/v1/cash-sessions/open", json={"opening_balance": "100.00"}
        )
        assert opened.status_code == 201
        cash_id = opened.json()["id"]

        # Cobra una orden en efectivo
        customer_id = await _customer(auth_client, sample_customer_payload)
        service = await _service(auth_client, base_price="80.00")
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
            json={"method": "cash", "amount": "80.00"},
        )

        # Cierra caja con 180 declarado (100 inicial + 80 efectivo)
        closed = await auth_client.post(
            f"/api/v1/cash-sessions/{cash_id}/close",
            json={"closing_balance_declared": "180.00"},
        )
        assert closed.status_code == 200
        body = closed.json()
        assert Decimal(body["closing_balance_calculated"]) == Decimal("180.00")
        assert Decimal(body["difference"]) == Decimal("0.00")

    async def test_cannot_open_two_sessions(self, auth_client: AsyncClient) -> None:
        a = await auth_client.post("/api/v1/cash-sessions/open", json={})
        assert a.status_code == 201
        b = await auth_client.post("/api/v1/cash-sessions/open", json={})
        assert b.status_code == 409
