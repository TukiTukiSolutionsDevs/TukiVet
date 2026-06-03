"""Puerto abstracto para envío de mensajes."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class MessageRequest:
    channel: str  # whatsapp | sms | email
    to: str
    body: str
    template_code: str | None = None
    template_variables: dict[str, str] = field(default_factory=dict)


@dataclass
class MessageResponse:
    provider_message_id: str
    status: str  # sent | failed
    error: str | None = None


class MessagingProvider(ABC):
    @abstractmethod
    async def send(self, request: MessageRequest) -> MessageResponse: ...
