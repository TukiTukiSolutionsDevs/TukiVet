"""Twilio WhatsApp/SMS provider (HTTP directo, sin SDK)."""

from __future__ import annotations

import httpx

from app.services.messaging.provider import MessageRequest, MessageResponse, MessagingProvider


class TwilioWhatsAppProvider(MessagingProvider):
    """Cliente Twilio WhatsApp Business API.

    Endpoint: https://api.twilio.com/2010-04-01/Accounts/{Sid}/Messages.json
    Auth: HTTP Basic con (AccountSid, AuthToken)
    """

    def __init__(
        self,
        *,
        account_sid: str,
        auth_token: str,
        whatsapp_from: str,
        timeout_seconds: float = 30.0,
    ) -> None:
        self._account_sid = account_sid
        self._auth_token = auth_token
        # Twilio espera 'whatsapp:+51...' como From
        self._from = whatsapp_from
        self._timeout = timeout_seconds

    def _normalize_to(self, to: str) -> str:
        if to.startswith("whatsapp:"):
            return to
        return f"whatsapp:{to}"

    async def send(self, request: MessageRequest) -> MessageResponse:
        if not all([self._account_sid, self._auth_token, self._from]):
            return MessageResponse(
                provider_message_id="",
                status="failed",
                error="Twilio no configurado (faltan credenciales)",
            )
        url = (
            f"https://api.twilio.com/2010-04-01/Accounts/{self._account_sid}/Messages.json"
        )
        data = {
            "From": self._from,
            "To": self._normalize_to(request.to),
            "Body": request.body,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(
                url, data=data, auth=(self._account_sid, self._auth_token)
            )
        body = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            return MessageResponse(
                provider_message_id=str(body.get("sid", "")),
                status="failed",
                error=str(body.get("message", body)),
            )
        return MessageResponse(
            provider_message_id=str(body.get("sid", "")),
            status="sent",
        )
