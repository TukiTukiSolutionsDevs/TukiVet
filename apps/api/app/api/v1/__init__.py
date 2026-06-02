"""Routers de la API v1.

Los módulos de cada dominio (clientes, mascotas, encuentros, etc.) se irán
agregando aquí conforme avanzan los sprints.
"""

from __future__ import annotations

from fastapi import APIRouter

api_router = APIRouter()

# Routers por dominio (agregar conforme se construyen):
# from app.api.v1.auth import router as auth_router
# api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
