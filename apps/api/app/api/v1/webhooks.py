"""Endpoints públicos de webhooks (TukiFact, etc.)."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.api.deps import DBSession
from app.services import invoice_service

router = APIRouter()


@router.post(
    "/tukifact",
    status_code=status.HTTP_200_OK,
    summary="Webhook entrante de TukiFact (document.accepted / document.rejected)",
)
async def tukifact_webhook(
    request: Request,
    db: DBSession,
    x_tukifact_signature: str | None = Header(default=None, alias="X-TukiFact-Signature"),
) -> dict[str, str]:
    body = await request.body()
    provider = invoice_service.get_provider_for_request()

    if x_tukifact_signature and not provider.verify_webhook(x_tukifact_signature, body):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firma inválida")

    payload = {}
    try:
        import json
        payload = json.loads(body) if body else {}
    except json.JSONDecodeError:
        payload = {}

    event_type = str(payload.get("event", "unknown"))
    data = payload.get("data") or {}
    provider_id = str(data.get("id") or data.get("document_id") or "")
    new_status = data.get("status")

    if not provider_id:
        # Aceptamos el webhook pero no aplicamos cambios sin id
        return {"status": "noop"}

    doc = await invoice_service.apply_webhook_event(
        db,
        event_type=event_type,
        provider_id=provider_id,
        new_status=new_status,
        payload=payload,
    )
    await db.commit()
    return {"status": "ok", "document_found": str(bool(doc))}
