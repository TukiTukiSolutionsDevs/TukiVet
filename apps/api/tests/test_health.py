"""Pruebas de los endpoints de salud."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.unit
async def test_healthz_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.unit
async def test_readyz_returns_status(client: AsyncClient) -> None:
    response = await client.get("/readyz")
    assert response.status_code == 200
    body = response.json()
    assert "status" in body
    assert "db" in body
