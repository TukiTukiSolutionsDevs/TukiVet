"""Schemas Pydantic para notificaciones y plantillas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import ORMModel

Channel = Literal["whatsapp", "sms", "email"]


class TemplateCreate(ORMModel):
    code: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=2, max_length=255)
    channel: Channel
    body: str = Field(min_length=10)
    locale: str = Field(default="es_PE", max_length=10)
    variables: list[str] = Field(default_factory=list)


class TemplateRead(ORMModel):
    id: str
    organization_id: str
    code: str
    name: str
    channel: str
    locale: str
    body: str
    variables: list[str] | None
    status: str


class SendMessageRequest(ORMModel):
    channel: Channel = "whatsapp"
    recipient: str = Field(min_length=5, max_length=100)
    template_code: str = Field(min_length=2, max_length=100)
    variables: dict[str, str] = Field(default_factory=dict)
    customer_id: str | None = None


class NotificationRead(ORMModel):
    id: str
    organization_id: str
    channel: str
    recipient: str
    template_code: str | None
    body_preview: str | None
    status: str
    provider: str | None
    provider_message_id: str | None
    error_message: str | None
    sent_at: datetime | None
    delivered_at: datetime | None
    related_type: str | None
    related_id: str | None
    customer_id: str | None
