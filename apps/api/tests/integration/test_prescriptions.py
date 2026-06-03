"""Tests E2E del módulo de recetas + dispensación FIFO."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient


async def _setup_pet(
    client: AsyncClient, customer: dict, pet: dict
) -> tuple[str, str]:
    c = await client.post("/api/v1/customers", json=customer)
    customer_id = c.json()["id"]
    p = await client.post("/api/v1/pets", json={**pet, "customer_id": customer_id})
    pet_id = p.json()["id"]
    # registrar peso para que dose calc funcione
    await client.post(f"/api/v1/pets/{pet_id}/weights", json={"weight_kg": "20.00"})
    return customer_id, pet_id


async def _make_product(client: AsyncClient) -> dict:
    r = await client.post(
        "/api/v1/inventory/products",
        json={
            "sku": "AMOX-500",
            "name": "Amoxicilina 500mg",
            "category": "medication",
            "active_ingredient": "Amoxicilina",
            "presentation": "Tableta 500mg",
            "unit": "tableta",
            "sale_price": "1.50",
        },
    )
    return r.json()


async def _stock(client: AsyncClient, product_id: str, qty: str, lot: str = "L1") -> dict:
    r = await client.post(
        "/api/v1/inventory/lots",
        json={
            "product_id": product_id,
            "lot_number": lot,
            "expiry_date": (date.today() + timedelta(days=365)).isoformat(),
            "initial_qty": qty,
        },
    )
    return r.json()


@pytest.mark.integration
class TestDoseCalculation:
    async def test_dose_math(self, auth_client: AsyncClient) -> None:
        # 20 kg × 15 mg/kg = 300 mg total ; presentación 500mg/tableta → 0.6 tabletas
        r = await auth_client.post(
            "/api/v1/prescriptions/calculate-dose",
            json={
                "weight_kg": "20.00",
                "dose_mg_per_kg": "15.000",
                "presentation_mg_per_unit": "500.0000",
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert Decimal(body["total_dose_mg"]) == Decimal("300.00000")
        assert Decimal(body["units_per_dose"]) == Decimal("0.6")


@pytest.mark.integration
class TestCreatePrescription:
    async def test_create_with_product_link(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        _, pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        product = await _make_product(auth_client)
        await _stock(auth_client, product["id"], "50")

        r = await auth_client.post(
            "/api/v1/prescriptions",
            json={
                "pet_id": pet_id,
                "diagnosis": "Otitis externa",
                "items": [
                    {
                        "product_id": product["id"],
                        "medication_name": "Amoxicilina 500mg",
                        "dose_mg_per_kg": "15.000",
                        "presentation": "Tableta 500mg",
                        "quantity": "14",
                        "frequency": "Cada 12h",
                        "duration_days": 7,
                        "route": "oral",
                    }
                ],
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["status"] == "issued"
        assert len(body["items"]) == 1
        item = body["items"][0]
        # total_dose_mg debe auto-calcular: 20 kg × 15 mg/kg = 300
        assert Decimal(item["total_dose_mg"]) == Decimal("300.000")

    async def test_create_freeform_item(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        _, pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        r = await auth_client.post(
            "/api/v1/prescriptions",
            json={
                "pet_id": pet_id,
                "items": [
                    {
                        "medication_name": "Suero glucosado 5%",
                        "quantity": "1",
                        "instructions": "Aplicar 250ml IV cada 8h",
                    }
                ],
            },
        )
        assert r.status_code == 201
        assert r.json()["items"][0]["product_id"] is None


@pytest.mark.integration
class TestDispense:
    async def test_dispense_decrements_stock_fifo(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        _, pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        product = await _make_product(auth_client)
        # dos lotes — el más antiguo (expiry más temprano) debe usarse primero
        await _stock(auth_client, product["id"], "5", lot="L-OLD")
        await _stock(auth_client, product["id"], "20", lot="L-NEW")

        presc = (
            await auth_client.post(
                "/api/v1/prescriptions",
                json={
                    "pet_id": pet_id,
                    "items": [
                        {
                            "product_id": product["id"],
                            "medication_name": "Amoxicilina 500mg",
                            "quantity": "10",
                        }
                    ],
                },
            )
        ).json()
        item_id = presc["items"][0]["id"]

        r = await auth_client.post(
            f"/api/v1/prescriptions/{presc['id']}/items/{item_id}/dispense",
            json={"quantity": "10"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert Decimal(body["dispensed_qty"]) == Decimal("10.00")

        # available_qty del producto: 5 + 20 = 25, menos 10 = 15
        prod = await auth_client.get(f"/api/v1/inventory/products/{product['id']}")
        assert prod.json()["available_qty"] == "15.00"

    async def test_dispense_partial_marks_status(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        _, pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        product = await _make_product(auth_client)
        await _stock(auth_client, product["id"], "20")

        presc = (
            await auth_client.post(
                "/api/v1/prescriptions",
                json={
                    "pet_id": pet_id,
                    "items": [
                        {
                            "product_id": product["id"],
                            "medication_name": "Amoxicilina",
                            "quantity": "14",
                        }
                    ],
                },
            )
        ).json()
        item_id = presc["items"][0]["id"]
        await auth_client.post(
            f"/api/v1/prescriptions/{presc['id']}/items/{item_id}/dispense",
            json={"quantity": "7"},
        )
        full = await auth_client.get(f"/api/v1/prescriptions/{presc['id']}")
        assert full.json()["status"] == "dispensed_partial"

        await auth_client.post(
            f"/api/v1/prescriptions/{presc['id']}/items/{item_id}/dispense",
            json={"quantity": "7"},
        )
        again = await auth_client.get(f"/api/v1/prescriptions/{presc['id']}")
        assert again.json()["status"] == "dispensed_full"

    async def test_dispense_excess_returns_409(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        _, pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        product = await _make_product(auth_client)
        await _stock(auth_client, product["id"], "50")
        presc = (
            await auth_client.post(
                "/api/v1/prescriptions",
                json={
                    "pet_id": pet_id,
                    "items": [
                        {
                            "product_id": product["id"],
                            "medication_name": "Amoxicilina",
                            "quantity": "5",
                        }
                    ],
                },
            )
        ).json()
        item_id = presc["items"][0]["id"]
        r = await auth_client.post(
            f"/api/v1/prescriptions/{presc['id']}/items/{item_id}/dispense",
            json={"quantity": "10"},
        )
        assert r.status_code == 409

    async def test_controlled_substance_requires_witness(
        self,
        auth_client: AsyncClient,
        sample_customer_payload: dict,
        sample_pet_payload: dict,
    ) -> None:
        _, pet_id = await _setup_pet(auth_client, sample_customer_payload, sample_pet_payload)
        presc = (
            await auth_client.post(
                "/api/v1/prescriptions",
                json={
                    "pet_id": pet_id,
                    "items": [
                        {
                            "medication_name": "Ketamina",
                            "quantity": "2",
                            "is_controlled": True,
                        }
                    ],
                },
            )
        ).json()
        item_id = presc["items"][0]["id"]

        # Sin testigo → 409
        no_witness = await auth_client.post(
            f"/api/v1/prescriptions/{presc['id']}/items/{item_id}/dispense",
            json={"quantity": "1"},
        )
        assert no_witness.status_code == 409
