"""Endpoints de la lista de problemas (POMR) por mascota."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.schemas.problem import ProblemCreate, ProblemRead, ProblemUpdate
from app.services import problem_service

router = APIRouter()


@router.get(
    "/pets/{pet_id}/problems",
    response_model=list[ProblemRead],
    summary="Lista de problemas (POMR) de una mascota",
    dependencies=[Depends(require_permission("pet:read"))],
)
async def list_problems(
    pet_id: str,
    current_user: CurrentUser,
    db: DBSession,
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[ProblemRead]:
    problems = await problem_service.list_problems(
        db,
        organization_id=current_user.organization_id,
        pet_id=pet_id,
        status_filter=status_filter,
    )
    return [ProblemRead.model_validate(p) for p in problems]


@router.post(
    "/pets/{pet_id}/problems",
    response_model=ProblemRead,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar problema a la lista POMR",
    dependencies=[Depends(require_permission("encounter:write"))],
)
async def create_problem(
    pet_id: str,
    payload: ProblemCreate,
    current_user: CurrentUser,
    db: DBSession,
    encounter_id: str | None = Query(default=None),
) -> ProblemRead:
    problem = await problem_service.create_problem(
        db,
        organization_id=current_user.organization_id,
        pet_id=pet_id,
        payload=payload,
        encounter_id=encounter_id,
    )
    await db.commit()
    return ProblemRead.model_validate(problem)


@router.put(
    "/problems/{problem_id}",
    response_model=ProblemRead,
    summary="Actualizar problema (status, resolución, etc.)",
    dependencies=[Depends(require_permission("encounter:write"))],
)
async def update_problem(
    problem_id: str,
    payload: ProblemUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> ProblemRead:
    problem = await problem_service.update_problem(
        db,
        organization_id=current_user.organization_id,
        problem_id=problem_id,
        payload=payload,
    )
    await db.commit()
    return ProblemRead.model_validate(problem)


@router.delete(
    "/problems/{problem_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Eliminar (soft) problema",
    dependencies=[Depends(require_permission("encounter:write"))],
)
async def delete_problem(
    problem_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    await problem_service.soft_delete_problem(
        db,
        organization_id=current_user.organization_id,
        problem_id=problem_id,
    )
    await db.commit()
