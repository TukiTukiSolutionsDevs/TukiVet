"""Servicios de lista de problemas (POMR)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.models import Pet, Problem
from app.schemas.problem import ProblemCreate, ProblemUpdate


async def _ensure_pet(db: AsyncSession, organization_id: str, pet_id: str) -> Pet:
    pet = await db.get(Pet, pet_id)
    if pet is None or pet.organization_id != organization_id or pet.deleted_at is not None:
        raise NotFoundError("Mascota no encontrada")
    return pet


async def list_problems(
    db: AsyncSession,
    *,
    organization_id: str,
    pet_id: str,
    status_filter: str | None = None,
) -> list[Problem]:
    await _ensure_pet(db, organization_id, pet_id)
    stmt = select(Problem).where(
        Problem.organization_id == organization_id,
        Problem.pet_id == pet_id,
        Problem.deleted_at.is_(None),
    )
    if status_filter:
        stmt = stmt.where(Problem.status == status_filter)
    stmt = stmt.order_by(Problem.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_problem(
    db: AsyncSession,
    *,
    organization_id: str,
    pet_id: str,
    payload: ProblemCreate,
    encounter_id: str | None = None,
) -> Problem:
    await _ensure_pet(db, organization_id, pet_id)
    problem = Problem(
        organization_id=organization_id,
        pet_id=pet_id,
        description=payload.description,
        code=payload.code,
        status=payload.status,
        onset_date=payload.onset_date,
        notes=payload.notes,
        created_by_encounter_id=encounter_id,
    )
    db.add(problem)
    await db.flush()
    return problem


async def update_problem(
    db: AsyncSession,
    *,
    organization_id: str,
    problem_id: str,
    payload: ProblemUpdate,
) -> Problem:
    problem = await db.get(Problem, problem_id)
    if (
        problem is None
        or problem.organization_id != organization_id
        or problem.deleted_at is not None
    ):
        raise NotFoundError("Problema no encontrado")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(problem, field, value)

    # Auto-set resolved_date cuando se marca como resolved
    if data.get("status") == "resolved" and problem.resolved_date is None:
        problem.resolved_date = datetime.now(tz=timezone.utc).date()

    await db.flush()
    return problem


async def soft_delete_problem(
    db: AsyncSession,
    *,
    organization_id: str,
    problem_id: str,
) -> Problem:
    problem = await db.get(Problem, problem_id)
    if (
        problem is None
        or problem.organization_id != organization_id
        or problem.deleted_at is not None
    ):
        raise NotFoundError("Problema no encontrado")
    problem.deleted_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return problem
