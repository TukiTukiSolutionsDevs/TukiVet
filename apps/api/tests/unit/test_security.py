"""Tests unitarios de password hashing y JWT."""

from __future__ import annotations

import jwt
import pytest

from app.core.security import (
    JWT_ALGORITHM,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    needs_rehash,
    verify_password,
)


@pytest.mark.unit
class TestPasswordHashing:
    def test_hash_returns_argon2_string(self) -> None:
        h = hash_password("hola-mundo-secreto-123")
        assert h.startswith("$argon2id$")
        assert len(h) > 50

    def test_verify_correct_password(self) -> None:
        h = hash_password("la-clave-correcta")
        assert verify_password("la-clave-correcta", h) is True

    def test_verify_wrong_password(self) -> None:
        h = hash_password("clave-buena")
        assert verify_password("clave-mala", h) is False

    def test_verify_against_invalid_hash_returns_false(self) -> None:
        assert verify_password("x", "no-es-un-hash") is False

    def test_two_hashes_of_same_password_differ(self) -> None:
        a = hash_password("misma-clave")
        b = hash_password("misma-clave")
        assert a != b
        assert verify_password("misma-clave", a)
        assert verify_password("misma-clave", b)

    def test_needs_rehash_returns_bool(self) -> None:
        h = hash_password("clave")
        assert needs_rehash(h) in (True, False)


@pytest.mark.unit
class TestJWT:
    def test_access_token_round_trip(self) -> None:
        token, exp = create_access_token(
            user_id="01HZZZZZZZZZZZZZZZZZZZZZZZ",
            organization_id="01ORGORGORGORGORGORGORGORG",
            role_codes=["owner"],
            permission_codes=["user:read", "user:write"],
        )
        assert exp.tzinfo is not None
        payload = decode_token(token, expected_type="access")
        assert payload["sub"] == "01HZZZZZZZZZZZZZZZZZZZZZZZ"
        assert payload["org"] == "01ORGORGORGORGORGORGORGORG"
        assert payload["type"] == "access"
        assert payload["roles"] == ["owner"]
        assert "user:write" in payload["perms"]
        assert "exp" in payload
        assert "jti" in payload

    def test_refresh_token_round_trip(self) -> None:
        token, jti, exp = create_refresh_token(user_id="01USER")
        assert exp.tzinfo is not None
        payload = decode_token(token, expected_type="refresh")
        assert payload["sub"] == "01USER"
        assert payload["type"] == "refresh"
        assert payload["jti"] == jti

    def test_decode_rejects_tampered_token(self) -> None:
        token, _ = create_access_token(
            user_id="u",
            organization_id="o",
            role_codes=[],
            permission_codes=[],
        )
        tampered = token[:-2] + ("AA" if token[-2:] != "AA" else "BB")
        with pytest.raises(jwt.PyJWTError):
            decode_token(tampered)

    def test_decode_wrong_type_raises(self) -> None:
        token, _ = create_access_token(
            user_id="u",
            organization_id="o",
            role_codes=[],
            permission_codes=[],
        )
        with pytest.raises(jwt.PyJWTError):
            decode_token(token, expected_type="refresh")

    def test_algorithm_is_hs256(self) -> None:
        assert JWT_ALGORITHM == "HS256"
