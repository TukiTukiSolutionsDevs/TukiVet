"""Tests unitarios de validación de documentos peruanos."""

from __future__ import annotations

import pytest

from app.services import peru_doc


@pytest.mark.unit
class TestDNI:
    def test_valid_dni(self) -> None:
        assert peru_doc.is_valid_dni("12345678") is True
        assert peru_doc.is_valid_dni("00000001") is True

    def test_invalid_dni_length(self) -> None:
        assert peru_doc.is_valid_dni("1234567") is False
        assert peru_doc.is_valid_dni("123456789") is False
        assert peru_doc.is_valid_dni("") is False

    def test_invalid_dni_chars(self) -> None:
        assert peru_doc.is_valid_dni("1234567a") is False
        assert peru_doc.is_valid_dni("abcdefgh") is False
        assert peru_doc.is_valid_dni("12345 78") is False


@pytest.mark.unit
class TestRUC:
    def test_valid_rucs(self) -> None:
        # 20100066603 es un RUC real válido (referencia en docs TukiFact)
        assert peru_doc.is_valid_ruc("20100066603") is True

    def test_invalid_length(self) -> None:
        assert peru_doc.is_valid_ruc("2010006660") is False
        assert peru_doc.is_valid_ruc("201000666031") is False

    def test_invalid_prefix(self) -> None:
        # Sólo 1 y 2 son prefijos válidos para RUC peruano
        assert peru_doc.is_valid_ruc("30100066603") is False
        assert peru_doc.is_valid_ruc("90100066603") is False

    def test_invalid_check_digit(self) -> None:
        # Cambia el último dígito → debe fallar
        assert peru_doc.is_valid_ruc("20100066604") is False
        assert peru_doc.is_valid_ruc("20100066605") is False

    def test_non_numeric(self) -> None:
        assert peru_doc.is_valid_ruc("2010006660A") is False


@pytest.mark.unit
class TestDetect:
    def test_detect_dni(self) -> None:
        assert peru_doc.detect_document_type("12345678") == "DNI"

    def test_detect_ruc(self) -> None:
        assert peru_doc.detect_document_type("20100066603") == "RUC"

    def test_detect_invalid(self) -> None:
        assert peru_doc.detect_document_type("123") is None
        assert peru_doc.detect_document_type("") is None
        assert peru_doc.detect_document_type("12345678901234") is None


@pytest.mark.unit
class TestValidate:
    def test_validate_routes_correctly(self) -> None:
        assert peru_doc.validate("DNI", "12345678") is True
        assert peru_doc.validate("RUC", "20100066603") is True
        assert peru_doc.validate("dni", "12345678") is True  # case-insensitive
        assert peru_doc.validate("CE", "ABC12345") is True
        assert peru_doc.validate("PASSPORT", "PA1234567") is True

    def test_validate_rejects_unknown_type(self) -> None:
        assert peru_doc.validate("XYZ", "12345678") is False
