"""Tests de RBAC sobre el endpoint de usuarios."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, payload: dict) -> dict:
    r = await client.post("/api/v1/auth/register-org", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.integration
async def test_owner_can_create_vet(client: AsyncClient, sample_org_payload: dict) -> None:
    reg = await _register(client, sample_org_payload)
    owner_token = reg["tokens"]["access_token"]

    new_user_payload = {
        "email": "vet1@patitas.pe",
        "password": "VeterinarioFelipe-2026",
        "full_name": "Felipe Veterinario",
        "role_codes": ["vet"],
    }
    r = await client.post(
        "/api/v1/users",
        json=new_user_payload,
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "vet1@patitas.pe"
    assert "vet" in body["role_codes"]


@pytest.mark.integration
async def test_listing_users_requires_permission(
    client: AsyncClient, sample_org_payload: dict
) -> None:
    reg = await _register(client, sample_org_payload)
    owner_token = reg["tokens"]["access_token"]

    # crea un usuario reception (sin user:read pero sí customer:write etc)
    await client.post(
        "/api/v1/users",
        json={
            "email": "reception@patitas.pe",
            "password": "RecepciónSegura-2026",
            "full_name": "Recepción Uno",
            "role_codes": ["reception"],
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    # login con esa cuenta
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "reception@patitas.pe", "password": "RecepciónSegura-2026"},
    )
    assert login.status_code == 200
    rec_token = login.json()["access_token"]

    # recepción NO tiene user:read → 403
    r = await client.get(
        "/api/v1/users", headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert r.status_code == 403

    # owner sí lo puede listar
    r2 = await client.get(
        "/api/v1/users", headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert r2.status_code == 200
    emails = {u["email"] for u in r2.json()}
    assert sample_org_payload["owner"]["email"] in emails
    assert "reception@patitas.pe" in emails


@pytest.mark.integration
async def test_create_user_without_permission_returns_403(
    client: AsyncClient, sample_org_payload: dict
) -> None:
    reg = await _register(client, sample_org_payload)
    owner_token = reg["tokens"]["access_token"]

    # Crea un veterinario que NO tiene user:write
    await client.post(
        "/api/v1/users",
        json={
            "email": "vetnoperm@patitas.pe",
            "password": "VetSinPermisos-2026",
            "full_name": "Vet Sin Permisos",
            "role_codes": ["vet"],
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "vetnoperm@patitas.pe", "password": "VetSinPermisos-2026"},
    )
    vet_token = login.json()["access_token"]

    # Vet intenta crear otro usuario → 403
    r = await client.post(
        "/api/v1/users",
        json={
            "email": "hacker@patitas.pe",
            "password": "Hacker-Pass-Permission-2026",
            "full_name": "Hack Er",
            "role_codes": ["owner"],
        },
        headers={"Authorization": f"Bearer {vet_token}"},
    )
    assert r.status_code == 403
