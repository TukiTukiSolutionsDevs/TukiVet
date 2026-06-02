"""Engine y session factory de SQLAlchemy async."""

from __future__ import annotations

from collections.abc import AsyncIterator

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


def _create_engine() -> AsyncEngine:
    return create_async_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        future=True,
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
