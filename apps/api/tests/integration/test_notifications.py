"""Tests E2E del módulo de notificaciones (con ConsoleProvider en dev)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestTemplates:
    async def test_seed_defaults_creates_templates(self, auth_client: AsyncClient) -> None:
        r = await auth_client.post("/api/v1/notifications/templates/seed-defaults")
        assert r.status_code == 201, r.text
        assert r.json()["created"] >= 5

        listing = await auth_client.get("/api/v1/notifications/templates")
        codes = {t["code"] for t in listing.json()}
        assert "vet_vaccine_due" in codes
        assert "vet_appointment_reminder_24h" in codes

    async def test_seed_is_idempotent(self, auth_client: AsyncClient) -> None:
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")
        again = await auth_client.post("/api/v1/notifications/templates/seed-defaults")
        # Segunda vez no crea ninguna nueva
        assert again.json()["created"] == 0

    async def test_create_custom_template(self, auth_client: AsyncClient) -> None:
        r = await auth_client.post(
            "/api/v1/notifications/templates",
            json={
                "code": "vet_custom_promo",
                "name": "Promo mensual",
                "channel": "whatsapp",
                "body": "Hola {{nombre}}, este mes {{promo}}.",
                "variables": ["nombre", "promo"],
            },
        )
        assert r.status_code == 201


@pytest.mark.integration
class TestSend:
    async def test_send_to_safe_recipient(self, auth_client: AsyncClient) -> None:
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")
        # SAFE_RECIPIENTS default incluye +51999999999
        r = await auth_client.post(
            "/api/v1/notifications/send",
            json={
                "template_code": "vet_vaccine_due",
                "channel": "whatsapp",
                "recipient": "+51999999999",
                "variables": {
                    "pet": "Toby",
                    "vaccine": "Antirrábica",
                    "due_date": "2026-07-01",
                },
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        # ConsoleProvider devuelve 'sent' (no envía real)
        assert body["status"] == "sent"
        assert body["template_code"] == "vet_vaccine_due"

    async def test_send_to_blocked_recipient_returns_blocked_safe_mode(
        self, auth_client: AsyncClient
    ) -> None:
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")
        r = await auth_client.post(
            "/api/v1/notifications/send",
            json={
                "template_code": "vet_vaccine_due",
                "channel": "whatsapp",
                "recipient": "+51900000001",
                "variables": {"pet": "X", "vaccine": "Y", "due_date": "2026-07-01"},
            },
        )
        assert r.status_code == 201
        body = r.json()
        assert body["status"] == "blocked_safe_mode"

    async def test_list_notifications(self, auth_client: AsyncClient) -> None:
        await auth_client.post("/api/v1/notifications/templates/seed-defaults")
        await auth_client.post(
            "/api/v1/notifications/send",
            json={
                "template_code": "vet_appointment_reminder_24h",
                "channel": "whatsapp",
                "recipient": "+51999999999",
                "variables": {"pet": "Toby", "when": "10:00"},
            },
        )
        listing = await auth_client.get("/api/v1/notifications")
        assert listing.status_code == 200
        assert len(listing.json()) >= 1
