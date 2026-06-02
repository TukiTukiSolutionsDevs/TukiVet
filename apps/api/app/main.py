"""Entrypoint de la aplicación FastAPI."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.config import settings
from app.core.logging import configure_logging
from app.db.session import close_engine, ping_db

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Setup y teardown global de la app."""
    configure_logging(level=settings.log_level)
    log.info(
        "api.startup",
        env=settings.environment,
        version=settings.version,
        debug=settings.debug,
    )
    if not settings.is_development:
        await ping_db()
    yield
    log.info("api.shutdown")
    await close_engine()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version=settings.version,
        description="API de gestión veterinaria — TukiVet",
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.get("/healthz", tags=["health"], summary="Liveness probe")
    async def healthz() -> dict[str, str]:
        """Indica que el proceso está vivo. No verifica dependencias externas."""
        return {"status": "ok"}

    @app.get("/readyz", tags=["health"], summary="Readiness probe")
    async def readyz() -> dict[str, object]:
        """Verifica conectividad con dependencias críticas (DB)."""
        db_ok = await ping_db(raise_on_error=False)
        return {"status": "ready" if db_ok else "degraded", "db": db_ok}

    app.include_router(api_router, prefix="/api/v1")

    # Silenciar logger ruidoso de uvicorn.access (lo manejamos via middleware más adelante).
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    return app


app = create_app()
