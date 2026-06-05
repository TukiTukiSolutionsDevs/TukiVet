"""Engine y session factory de SQLAlchemy async."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

log = structlog.get_logger()


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _json_serializer(value: Any) -> str:
    return json.dumps(value, default=_json_default)


def _create_engine() -> AsyncEngine:
    return create_async_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        future=True,
        json_serializer=_json_serializer,
    )


engine: AsyncEngine = _create_engine()
SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncIterator[AsyncSession]:
    """Dependency injection — yields una sesión por request."""
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def ping_db(*, raise_on_error: bool = True) -> bool:
    """Verifica conectividad con la DB ejecutando `SELECT 1`."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        log.warning("db.ping_failed", error=str(exc))
        if raise_on_error:
            raise
        return False


async def close_engine() -> None:
    """Cierra el engine. Llamar en shutdown."""
    await engine.dispose()
