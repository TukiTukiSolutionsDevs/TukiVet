"""Routers de la API v1."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.customers import router as customers_router
from app.api.v1.encounters import router as encounters_router
from app.api.v1.pets import router as pets_router
from app.api.v1.problems import router as problems_router
from app.api.v1.users import router as users_router
from app.api.v1.vaccines import router as vaccines_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(customers_router, prefix="/customers", tags=["customers"])
api_router.include_router(pets_router, prefix="/pets", tags=["pets"])
api_router.include_router(encounters_router, prefix="/encounters", tags=["encounters"])
# problems_router incluye sus propios prefijos (/pets/{id}/problems y /problems/{id})
api_router.include_router(problems_router, tags=["problems"])
api_router.include_router(vaccines_router, prefix="/vaccines", tags=["vaccines"])
