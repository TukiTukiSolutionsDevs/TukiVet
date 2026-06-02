"""Helper para registrar entradas de auditoría."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def audit(
    db: AsyncSession,
    *,
    action: str,
    organization_id: str | None = None,
    actor_user_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    """Inserta una entrada de auditoría en la misma transacción.

    No hace commit — el caller decide. Devuelve la fila para encadenar si hace falta.
    """
    entry = AuditLog(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before=before,
        after=after,
        ip=ip,
        user_agent=user_agent,
    )
    db.add(entry)
    return entry
