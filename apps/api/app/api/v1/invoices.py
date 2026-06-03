"""Endpoints de comprobantes electrónicos (TukiFact)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, status

from app.api.deps import CurrentUser, DBSession, require_permission
from app.core.audit import audit
from app.schemas.common import Page
from app.schemas.invoice import (
    ElectronicDocumentRead,
    EmitInvoiceRequest,
    VoidInvoiceRequest,
)
from app.services import invoice_service

router = APIRouter()


def _enrich(doc) -> ElectronicDocumentRead:  # type: ignore[no-untyped-def]
    item = ElectronicDocumentRead.model_validate(doc)
    if doc.tukifact_id:
        provider = invoice_service.get_provider_for_request()
        item.pdf_url = provider.pdf_url(doc.tukifact_id)
        item.xml_url = provider.xml_url(doc.tukifact_id)
    return item


@router.post(
    "",
    response_model=ElectronicDocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir comprobante electrónico (TukiFact)",
    dependencies=[Depends(require_permission("invoice:emit"))],
)
async def emit(
    payload: EmitInvoiceRequest,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> ElectronicDocumentRead:
    provider = invoice_service.get_provider_for_request()
    doc = await invoice_service.emit_invoice(
        db,
        organization_id=current_user.organization_id,
        order_id=payload.order_id,
        doc_type=payload.doc_type,
        provider=provider,
    )
    await audit(
        db,
        action="invoice.emitted",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="electronic_document",
        target_id=doc.id,
        after={
            "type": doc.type,
            "series": doc.series,
            "number": doc.number,
            "status": doc.status,
        },
    )
    await db.commit()
    return _enrich(doc)


@router.get(
    "",
    response_model=Page[ElectronicDocumentRead],
    dependencies=[Depends(require_permission("invoice:read"))],
)
async def list_documents(
    current_user: CurrentUser,
    db: DBSession,
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
) -> Page[ElectronicDocumentRead]:
    rows, total = await invoice_service.list_documents(
        db,
        organization_id=current_user.organization_id,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )
    return Page[ElectronicDocumentRead](
        items=[_enrich(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{document_id}",
    response_model=ElectronicDocumentRead,
    dependencies=[Depends(require_permission("invoice:read"))],
)
async def get_document(
    document_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> ElectronicDocumentRead:
    doc = await invoice_service.get_document(
        db, organization_id=current_user.organization_id, document_id=document_id
    )
    return _enrich(doc)


@router.post(
    "/{document_id}/void",
    response_model=ElectronicDocumentRead,
    summary="Anular comprobante",
    dependencies=[Depends(require_permission("invoice:void"))],
)
async def void_document(
    document_id: str,
    payload: VoidInvoiceRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> ElectronicDocumentRead:
    provider = invoice_service.get_provider_for_request()
    doc = await invoice_service.void_document(
        db,
        organization_id=current_user.organization_id,
        document_id=document_id,
        reason=payload.reason,
        provider=provider,
    )
    await audit(
        db,
        action="invoice.voided",
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        target_type="electronic_document",
        target_id=doc.id,
        after={"reason": payload.reason},
    )
    await db.commit()
    return _enrich(doc)
