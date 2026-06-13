"""AI-assisted clinical suggestion endpoints."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.config import get_settings
from app.models.user import User
from app.services.ai_service import suggest_soap

router = APIRouter()


class SoapSuggestionRequest(BaseModel):
    chief_complaint: str = ""
    species: str = "canine"
    breed: str | None = None
    age_years: float | None = None
    weight_kg: str | None = None
    vitals: dict[str, Any] = {}
    problems: list[str] = []
    existing_soap: dict[str, Any] = {}


class SoapSuggestionResponse(BaseModel):
    subjective: dict[str, Any] = {}
    objective: dict[str, Any] = {}
    assessment: list[str] = []
    plan: dict[str, Any] = {}
    diagnostic_suggestions: list[str] = []
    red_flags: list[str] = []
    mock: bool = False


@router.post("/suggest-soap", response_model=SoapSuggestionResponse)
async def suggest_soap_endpoint(
    payload: SoapSuggestionRequest,
    _current_user: User = Depends(get_current_user),
) -> SoapSuggestionResponse:
    settings = get_settings()
    if not settings.enable_ai_soap:
        raise HTTPException(status_code=403, detail="AI SOAP suggestions are not enabled.")

    result = await suggest_soap(
        chief_complaint=payload.chief_complaint,
        species=payload.species,
        breed=payload.breed,
        age_years=payload.age_years,
        weight_kg=payload.weight_kg,
        vitals=payload.vitals,
        problems=payload.problems,
        existing_soap=payload.existing_soap,
    )

    return SoapSuggestionResponse(
        subjective=result.get("subjective", {}),
        objective=result.get("objective", {}),
        assessment=result.get("assessment", []),
        plan=result.get("plan", {}),
        diagnostic_suggestions=result.get("diagnostic_suggestions", []),
        red_flags=result.get("red_flags", []),
        mock=result.get("_mock", False),
    )
