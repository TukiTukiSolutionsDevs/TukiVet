"""Orquestación de emisión de comprobantes electrónicos."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import ConflictError, NotFoundError
from app.models import (
    Customer,
    DocumentSeriesCounter,
    ElectronicDocument,
    ElectronicDocumentEvent,
    Order,
    OrderItem,
)
from app.services.invoicing import EmitDocumentRequest, InvoiceProvider
from app.services.invoicing.mock_provider import MockInvoiceProvider
from app.services.invoicing.provider import EmitItem
from app.services.invoicing.tukifact_provider import TukiFactProvider

DocType = Literal["01", "03", "07", "08"]
DEFAULT_SERIES = {"01": "F001", "03": "B001", "07": "FC01", "08": "FD01"}


def get_invoice_provider() -> InvoiceProvider:
    """Selecciona provider según config. Mock si no hay API key."""
    api_key = settings.tukifact_api_key.get_secret_value()
    if not api_key or api_key == "TF_test_replace_me":
        return MockInvoiceProvider()
    return TukiFactProvider(
        api_key=api_key,
        environment=settings.tukifact_environment,
        webhook_secret=settings.tukifact_webhook_secret.get_secret_value() or None,
    )


async def _next_series_number(
    db: AsyncSession,
    *,
    organization_id: str,
    doc_type: str,
    series: str,
) -> int:
    counter = await db.execute(
        select(DocumentSeriesCounter).where(
            DocumentSeriesCounter.organization_id == organization_id,
            DocumentSeriesCounter.type == doc_type,
            DocumentSeriesCounter.series == series,
        )
    )
    row = counter.scalar_one_or_none()
    if row is None:
        row = DocumentSeriesCounter(
            organization_id=organization_id,
            type=doc_type,
            series=series,
            next_number=1,
        )
        db.add(row)
        await db.flush()
    number = row.next_number
    row.next_number += 1
    return number


def _infer_doc_type(customer: Customer) -> DocType:
    """Si cliente tiene RUC → factura (01); si DNI → boleta (03)."""
    return "01" if customer.document_type.upper() == "RUC" else "03"


def _tukifact_customer_type(document_type: str) -> str:
    """Convierte 'DNI'/'RUC' al código TukiFact (1/6)."""
    mapping = {"DNI": "1", "RUC": "6", "CE": "4", "PASSPORT": "7"}
    return mapping.get(document_type.upper(), "0")


async def emit_invoice(
    db: AsyncSession,
    *,
    organization_id: str,
    order_id: str,
    doc_type: DocType | None = None,
    provider: InvoiceProvider | None = None,
) -> ElectronicDocument:
    """Emite comprobante electrónico para una orden pagada."""
    if provider is None:
        provider = get_invoice_provider()

    order = await db.get(Order, order_id)
    if order is None or order.organization_id != organization_id:
        raise NotFoundError("Orden no encontrada")
    if order.status != "paid":
        raise ConflictError(
            f"Solo se factura orden pagada (estado actual: {order.status})"
        )

    customer = await db.get(Customer, order.customer_id)
    if customer is None or customer.organization_id != organization_id:
        raise NotFoundError("Cliente no encontrado")

    resolved_type: DocType = doc_type or _infer_doc_type(customer)
    series = DEFAULT_SERIES[resolved_type]
    number = await _next_series_number(
        db, organization_id=organization_id, doc_type=resolved_type, series=series
    )

    # Carga items
    items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
    items = list(items_result.scalars().all())

    customer_name = (
        customer.business_name or f"{customer.first_name} {customer.last_name}".strip()
    )

    req = EmitDocumentRequest(
        type=resolved_type,
        series=series,
        number=number,
        customer_document_type=_tukifact_customer_type(customer.document_type),
        customer_document_number=customer.document_number,
        customer_name=customer_name,
        customer_address=customer.address,
        items=[
            EmitItem(
                description=i.description,
                quantity=i.quantity,
                unit_price=i.unit_price,
                igv_amount=i.igv_amount,
            )
            for i in items
        ],
        subtotal=order.subtotal,
        igv_amount=order.igv_amount,
        total=order.total,
    )

    doc = ElectronicDocument(
        organization_id=organization_id,
        order_id=order.id,
        type=resolved_type,
        series=series,
        number=number,
        customer_id=customer.id,
        customer_document_type=customer.document_type,
        customer_document_number=customer.document_number,
        customer_name=customer_name,
        customer_address=customer.address,
        issued_at=datetime.now(tz=timezone.utc),
        subtotal=order.subtotal,
        igv_amount=order.igv_amount,
        total=order.total,
        status="pending",
        raw_request=req.__dict__ | {"items": [i.__dict__ for i in req.items]},
    )
    db.add(doc)
    await db.flush()

    try:
        response = await provider.emit_document(req)
    except Exception as exc:  # pragma: no cover (network)
        db.add(
            ElectronicDocumentEvent(
                electronic_document_id=doc.id,
                event_type="emission_error",
                data={"error": str(exc)},
                occurred_at=datetime.now(tz=timezone.utc),
            )
        )
        doc.status = "rejected"
        doc.sunat_message = str(exc)
        await db.flush()
        return doc

    doc.tukifact_id = response.provider_id
    doc.tukifact_status = response.status
    doc.sunat_code = response.sunat_code
    doc.sunat_message = response.sunat_message
    doc.raw_response = response.raw_response
    doc.status = "accepted" if response.status == "accepted" else (
        "rejected" if response.status == "rejected" else "pending"
    )

    db.add(
        ElectronicDocumentEvent(
            electronic_document_id=doc.id,
            event_type="emitted",
            data={"status": response.status, "provider_id": response.provider_id},
            occurred_at=datetime.now(tz=timezone.utc),
        )
    )
    await db.flush()
    return doc


async def get_document(
    db: AsyncSession, *, organization_id: str, document_id: str
) -> ElectronicDocument:
    doc = await db.get(ElectronicDocument, document_id)
    if doc is None or doc.organization_id != organization_id:
        raise NotFoundError("Comprobante no encontrado")
    return doc


async def list_documents(
    db: AsyncSession,
    *,
    organization_id: str,
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[ElectronicDocument], int]:
    stmt = select(ElectronicDocument).where(
        ElectronicDocument.organization_id == organization_id
    )
    count_stmt = select(func.count(ElectronicDocument.id)).where(
        ElectronicDocument.organization_id == organization_id
    )
    if status_filter:
        stmt = stmt.where(ElectronicDocument.status == status_filter)
        count_stmt = count_stmt.where(ElectronicDocument.status == status_filter)
    stmt = (
        stmt.order_by(ElectronicDocument.issued_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    total = (await db.execute(count_stmt)).scalar_one()
    rows = list((await db.execute(stmt)).scalars().all())
    return rows, total


async def void_document(
    db: AsyncSession,
    *,
    organization_id: str,
    document_id: str,
    reason: str,
    provider: InvoiceProvider | None = None,
) -> ElectronicDocument:
    if provider is None:
        provider = get_invoice_provider()

    doc = await get_document(
        db, organization_id=organization_id, document_id=document_id
    )
    if doc.status == "cancelled":
        return doc
    if doc.tukifact_id is None:
        raise ConflictError("El comprobante no fue emitido al provider")

    response = await provider.void_document(doc.tukifact_id, reason)
    doc.status = "cancelled" if response.status == "cancelled" else doc.status
    doc.cancellation_reason = reason
    db.add(
        ElectronicDocumentEvent(
            electronic_document_id=doc.id,
            event_type="voided",
            data=response.raw_response,
            occurred_at=datetime.now(tz=timezone.utc),
        )
    )
    await db.flush()
    return doc


async def apply_webhook_event(
    db: AsyncSession,
    *,
    event_type: str,
    provider_id: str,
    new_status: str | None,
    payload: dict[str, object],
) -> ElectronicDocument | None:
    """Aplica un evento de webhook a un documento por tukifact_id."""
    result = await db.execute(
        select(ElectronicDocument).where(ElectronicDocument.tukifact_id == provider_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        return None
    if new_status:
        doc.tukifact_status = new_status
        if new_status == "accepted":
            doc.status = "accepted"
        elif new_status == "rejected":
            doc.status = "rejected"
    db.add(
        ElectronicDocumentEvent(
            electronic_document_id=doc.id,
            event_type=event_type,
            data=payload,
            occurred_at=datetime.now(tz=timezone.utc),
        )
    )
    await db.flush()
    return doc


# Helper para tests / DI
_provider_override: InvoiceProvider | None = None


def set_provider_override(provider: InvoiceProvider | None) -> None:
    global _provider_override
    _provider_override = provider


def get_provider_for_request() -> InvoiceProvider:
    """En tests podemos forzar el mock. Sino, usa get_invoice_provider()."""
    return _provider_override or get_invoice_provider()


# La función auxiliar `Decimal` se mantiene importada por compatibilidad de tipos en runtime.
_ = Decimal
