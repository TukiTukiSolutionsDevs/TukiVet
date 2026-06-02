"""Excepciones HTTP comunes del dominio."""

from __future__ import annotations

from fastapi import HTTPException, status


class AppError(HTTPException):
    """Base para errores controlados de la app."""


class UnauthorizedError(AppError):
    def __init__(self, detail: str = "Credenciales inválidas") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenError(AppError):
    def __init__(self, detail: str = "No autorizado") -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class NotFoundError(AppError):
    def __init__(self, detail: str = "No encontrado") -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ConflictError(AppError):
    def __init__(self, detail: str = "Conflicto con el estado actual") -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class ValidationError(AppError):
    def __init__(self, detail: str = "Datos inválidos") -> None:
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
