"""Tests E2E del flujo completo de autenticación."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestRegisterOrg:
    async def test_register_creates_org_and_returns_tokens(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        response = await client.post("/api/v1/auth/register-org", json=sample_org_payload)
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["organization"]["ruc"] == "20612345678"
        assert body["branch"]["is_main"] is True
        assert body["owner"]["email"] == "jaime@patitas.pe"
        assert "owner" in body["owner"]["role_codes"]
        assert body["tokens"]["access_token"]
        assert body["tokens"]["refresh_token"]
        assert body["tokens"]["token_type"] == "Bearer"
        assert body["tokens"]["expires_in"] > 0

    async def test_register_second_time_returns_409(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        first = await client.post("/api/v1/auth/register-org", json=sample_org_payload)
        assert first.status_code == 201
        # Cambia datos sensibles para evitar choque con unique constraints aunque sea segundo intento
        payload2 = {
            **sample_org_payload,
            "organization": {**sample_org_payload["organization"], "ruc": "20987654321"},
            "owner": {**sample_org_payload["owner"], "email": "otro@patitas.pe"},
        }
        second = await client.post("/api/v1/auth/register-org", json=payload2)
        assert second.status_code == 409

    async def test_register_with_invalid_ruc_returns_422(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        bad = {
            **sample_org_payload,
            "organization": {**sample_org_payload["organization"], "ruc": "12345"},
        }
        response = await client.post("/api/v1/auth/register-org", json=bad)
        assert response.status_code == 422

    async def test_register_with_short_password_returns_422(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        bad = {
            **sample_org_payload,
            "owner": {**sample_org_payload["owner"], "password": "abc"},
        }
        response = await client.post("/api/v1/auth/register-org", json=bad)
        assert response.status_code == 422


@pytest.mark.integration
class TestLogin:
    async def _register(self, client: AsyncClient, payload: dict) -> dict:
        r = await client.post("/api/v1/auth/register-org", json=payload)
        assert r.status_code == 201
        return r.json()

    async def test_login_with_valid_credentials_succeeds(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        await self._register(client, sample_org_payload)
        r = await client.post(
            "/api/v1/auth/login",
            json={
                "email": sample_org_payload["owner"]["email"],
                "password": sample_org_payload["owner"]["password"],
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["access_token"]
        assert body["refresh_token"]

    async def test_login_with_wrong_password_returns_401(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        await self._register(client, sample_org_payload)
        r = await client.post(
            "/api/v1/auth/login",
            json={
                "email": sample_org_payload["owner"]["email"],
                "password": "WRONG-WRONG-WRONG-123",
            },
        )
        assert r.status_code == 401

    async def test_login_with_unknown_email_returns_401(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        await self._register(client, sample_org_payload)
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@nowhere.pe", "password": "what-ever-123"},
        )
        assert r.status_code == 401


@pytest.mark.integration
class TestMe:
    async def test_me_returns_user_with_permissions(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        reg = (
            await client.post("/api/v1/auth/register-org", json=sample_org_payload)
        ).json()
        token = reg["tokens"]["access_token"]
        r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == sample_org_payload["owner"]["email"]
        assert body["organization"]["ruc"] == "20612345678"
        assert "user:write" in body["permissions"]
        assert "owner" in body["role_codes"]

    async def test_me_without_token_returns_401(self, client: AsyncClient) -> None:
        r = await client.get("/api/v1/auth/me")
        assert r.status_code == 401

    async def test_me_with_invalid_token_returns_401(self, client: AsyncClient) -> None:
        r = await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
        )
        assert r.status_code == 401


@pytest.mark.integration
class TestRefreshAndLogout:
    async def test_refresh_rotates_tokens(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        reg = (
            await client.post("/api/v1/auth/register-org", json=sample_org_payload)
        ).json()
        refresh = reg["tokens"]["refresh_token"]

        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
        assert r.status_code == 200, r.text
        new_tokens = r.json()
        assert new_tokens["refresh_token"] != refresh
        assert new_tokens["access_token"]

        # El refresh viejo ya no debe funcionar
        again = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
        assert again.status_code == 401

    async def test_logout_revokes_refresh(
        self, client: AsyncClient, sample_org_payload: dict
    ) -> None:
        reg = (
            await client.post("/api/v1/auth/register-org", json=sample_org_payload)
        ).json()
        refresh = reg["tokens"]["refresh_token"]

        r = await client.post("/api/v1/auth/logout", json={"refresh_token": refresh})
        assert r.status_code == 204

        again = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
        assert again.status_code == 401

    async def test_logout_with_invalid_token_is_idempotent(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/auth/logout", json={"refresh_token": "garbage"})
        assert r.status_code == 204
