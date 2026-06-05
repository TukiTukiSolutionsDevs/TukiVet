"""Fixtures globales de pytest.

Estrategia:
- Engine session-scoped: crea esquema una vez, siembra catálogo de permisos.
- Fixture `db` function-scoped: abre conexión + transacción + savepoint, rollback al final.
- Fixture `client` function-scoped: override de `get_db` para que el endpoint use la misma sesión.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.permissions import PERMISSIONS
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Permission

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://tukivet:tukivet_dev@localhost:5432/tukivet_test",
    ),
)


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Force all async tests to share the session-scoped event loop.

    pytest-asyncio 0.24 lacks `asyncio_default_test_loop_scope`; without this
    hook each test runs in its own loop while the engine fixture lives in the
    session loop, producing "Future attached to a different loop" errors.
    """
    import inspect

    session_marker = pytest.mark.asyncio(loop_scope="session")
    for item in items:
        if not hasattr(item, "own_markers"):
            continue
        func = getattr(item, "function", None)
        if func is None or not inspect.iscoroutinefunction(func):
            continue
        item.own_markers = [m for m in item.own_markers if m.name != "asyncio"]
        item.add_marker(session_marker)


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def engine() -> AsyncIterator[AsyncEngine]:
    """Engine compartido — crea esquema una vez por suite."""
    from app.db.session import _json_serializer

    eng = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        json_serializer=_json_serializer,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    # Siembra catálogo global de permisos
    Session = async_sessionmaker(eng, expire_on_commit=False)
    async with Session() as session:
        for code, desc in PERMISSIONS.items():
            session.add(Permission(code=code, description=desc))
        await session.commit()
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def db(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """Sesión transaccional. Todo cambio se revierte al final del test."""
    connection = await engine.connect()
    transaction = await connection.begin()
    Session = async_sessionmaker(bind=connection, expire_on_commit=False, autoflush=False)
    session = Session()
    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()


@pytest_asyncio.fixture(loop_scope="session")
async def client(db: AsyncSession) -> AsyncIterator[AsyncClient]:
    """Cliente HTTP que comparte la sesión transaccional con los endpoints."""

    async def _override_get_db() -> AsyncIterator[AsyncSession]:
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(loop_scope="session")
async def auth_client(
    client: AsyncClient, sample_org_payload: dict
) -> AsyncIterator[AsyncClient]:
    """Cliente HTTP ya autenticado como owner (auto-registra la org)."""
    r = await client.post("/api/v1/auth/register-org", json=sample_org_payload)
    if r.status_code != 201:
        raise AssertionError(f"register-org falló en fixture: {r.status_code} {r.text}")
    token = r.json()["tokens"]["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client


@pytest.fixture
def sample_customer_payload() -> dict[str, object]:
    """Payload válido para POST /api/v1/customers."""
    return {
        "document_type": "DNI",
        "document_number": "12345678",
        "first_name": "María",
        "last_name": "García",
        "phone_primary": "+51999111222",
        "email": "maria@example.pe",
        "address": "Calle Las Flores 100",
        "district": "Miraflores",
        "city": "Lima",
    }


@pytest.fixture
def sample_pet_payload() -> dict[str, object]:
    """Payload válido para POST /api/v1/pets (sin customer_id; lo agrega el test)."""
    return {
        "name": "Toby",
        "species": "dog",
        "breed_name": "Labrador Retriever",
        "sex": "male",
        "color": "amarillo",
        "sterilized": False,
    }


@pytest.fixture
def sample_org_payload() -> dict[str, object]:
    """Payload válido para POST /api/v1/auth/register-org."""
    return {
        "organization": {
            "legal_name": "Veterinaria Patitas Felices SAC",
            "trade_name": "Patitas Felices",
            "ruc": "20612345678",
            "address": "Av. Larco 123, Miraflores",
            "phone": "+5119991234",
            "email": "contacto@patitas.pe",
        },
        "branch": {
            "name": "Sede principal",
            "address": "Av. Larco 123, Miraflores",
            "phone": "+5119991234",
            "timezone": "America/Lima",
        },
        "owner": {
            "email": "jaime@patitas.pe",
            "password": "SuperSecret-Pass-2026",
            "full_name": "Jaime Pérez",
            "phone": "+51999111222",
            "professional_id": "CMVP-12345",
            "role_codes": [],
        },
    }
