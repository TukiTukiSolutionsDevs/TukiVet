"""Adaptadores de mensajería: WhatsApp (Twilio) + Console (dev)."""

from app.services.messaging.provider import MessageRequest, MessageResponse, MessagingProvider

__all__ = ["MessageRequest", "MessageResponse", "MessagingProvider"]
