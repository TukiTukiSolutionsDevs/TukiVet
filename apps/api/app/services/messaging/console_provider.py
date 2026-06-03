"""Provider de desarrollo: imprime el mensaje a logs y no envía nada real."""

from __future__ import annotations

import uuid

import structlog

from app.services.messaging.provider import MessageRequest, MessageResponse, MessagingProvider

log = structlog.get_logger()


class ConsoleMessagingProvider(MessagingProvider):
    async def send(self, request: MessageRequest) -> MessageResponse:
        message_id = f"console-{uuid.uuid4().hex[:8]}"
        log.info(
            "messaging.console.send",
            to=request.to,
            channel=request.channel,
            template=request.template_code,
            body_preview=request.body[:120],
            message_id=message_id,
        )
        return MessageResponse(provider_message_id=message_id, status="sent")
