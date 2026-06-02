"""Validación de documentos de identidad peruanos: DNI y RUC."""

from __future__ import annotations

from typing import Literal

DocType = Literal["DNI", "RUC", "CE", "PASSPORT"]

_RUC_FACTORS: tuple[int, ...] = (5, 4, 3, 2, 7, 6, 5, 4, 3, 2)


def is_valid_dni(value: str) -> bool:
    """DNI peruano: exactamente 8 dígitos numéricos."""
    return value.isdigit() and len(value) == 8


def is_valid_ruc(value: str) -> bool:
    """RUC peruano: 11 dígitos con check digit válido y prefijo permitido."""
    if not value.isdigit() or len(value) != 11:
        return False
    if value[0] not in ("1", "2"):
        return False
    total = sum(int(d) * f for d, f in zip(value[:10], _RUC_FACTORS, strict=False))
    check = (11 - (total % 11)) % 10
    return check == int(value[10])


def detect_document_type(value: str) -> DocType | None:
    """Detecta tipo de documento por formato. None si no calza."""
    if not value:
        return None
    if is_valid_dni(value):
        return "DNI"
    if is_valid_ruc(value):
        return "RUC"
    return None


def validate(document_type: str, document_number: str) -> bool:
    """Valida un par (tipo, número) según el tipo declarado."""
    dt = document_type.upper()
    if dt == "DNI":
        return is_valid_dni(document_number)
    if dt == "RUC":
        return is_valid_ruc(document_number)
    if dt in ("CE", "PASSPORT"):
        # Carnet de extranjería y pasaporte: validación mínima de longitud y caracteres.
        return 5 <= len(document_number) <= 20 and document_number.isalnum()
    return False
