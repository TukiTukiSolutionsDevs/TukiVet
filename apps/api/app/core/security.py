"""Primitivas de seguridad: hashing de contraseñas + JWT."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import settings
from app.db.base import new_ulid

# Argon2id con parámetros razonables (OWASP recommends time_cost=2, memory_cost=64MB).
_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=64 * 1024,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)

JWT_ALGORITHM = "HS256"
TokenType = Literal["access", "refresh", "reset"]
RESET_TOKEN_TTL_MINUTES = 30


def hash_password(plain: str) -> str:
    """Devuelve el hash argon2id de la contraseña."""
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica contraseña contra el hash. False si no coincide."""
    try:
        _hasher.verify(hashed, plain)
        return True
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def needs_rehash(hashed: str) -> bool:
    """True si los parámetros del hash quedaron obsoletos."""
    return _hasher.check_needs_rehash(hashed)


def _build_token(
    *,
    subject: str,
    token_type: TokenType,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    """Construye un JWT genérico. Retorna (token, jti, expires_at)."""
    now = datetime.now(tz=timezone.utc)
    expires_at = now + expires_delta
    jti = new_ulid()
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": jti,
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(
        payload,
        settings.secret_key.get_secret_value(),
        algorithm=JWT_ALGORITHM,
    )
    return token, jti, expires_at


def create_access_token(
    *,
    user_id: str,
    organization_id: str,
    role_codes: list[str],
    permission_codes: list[str],
) -> tuple[str, datetime]:
    """Token de acceso (vida corta)."""
    token, _, expires_at = _build_token(
        subject=user_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_minutes),
        extra_claims={
            "org": organization_id,
            "roles": role_codes,
            "perms": permission_codes,
        },
    )
    return token, expires_at


def create_password_reset_token(*, user_id: str) -> tuple[str, datetime]:
    """Token de reset de contraseña (TTL corto). Para single-use, rotar password_hash invalida claims."""
    token, _, expires_at = _build_token(
        subject=user_id,
        token_type="reset",
        expires_delta=timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
    )
    return token, expires_at


def create_refresh_token(*, user_id: str) -> tuple[str, str, datetime]:
    """Token de refresh (vida larga). Retorna (token, jti, expires_at) — el jti se persiste."""
    return _build_token(
        subject=user_id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_days),
    )


def decode_token(token: str, *, expected_type: TokenType | None = None) -> dict[str, Any]:
    """Valida firma + expiración y devuelve el payload. Lanza jwt.PyJWTError si inválido."""
    payload = jwt.decode(
        token,
        settings.secret_key.get_secret_value(),
        algorithms=[JWT_ALGORITHM],
    )
    if expected_type and payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"expected {expected_type} token, got {payload.get('type')}")
    return payload
