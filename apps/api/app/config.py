"""Configuración de la aplicación cargada desde variables de entorno."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Environment = Literal["development", "test", "staging", "production"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


class Settings(BaseSettings):
    """Configuración global de TukiVet.

    Todos los valores vienen de variables de entorno (`.env` en dev,
    secretos del runtime en prod). Ver `.env.example` para la lista completa.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App / meta ----
    project_name: str = "TukiVet API"
    version: str = "0.0.1"
    environment: Environment = "development"
    debug: bool = False
    log_level: LogLevel = "INFO"

    # ---- Database / Redis ----
    database_url: str = "postgresql+asyncpg://tukivet:tukivet_dev@localhost:5432/tukivet"
    redis_url: str = "redis://localhost:6379/0"

    # ---- Security ----
    secret_key: SecretStr = SecretStr("dev-secret-replace-in-production-32chars-min")
    access_token_minutes: int = 15
    refresh_token_days: int = 7

    # ---- CORS ----
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, value: object) -> object:
        if isinstance(value, str):
            return [o.strip() for o in value.split(",") if o.strip()]
        return value

    # ---- Object storage (S3 / MinIO) ----
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: SecretStr = SecretStr("minioadmin")
    s3_secret_key: SecretStr = SecretStr("minioadmin")
    s3_bucket: str = "tukivet-dev"
    s3_region: str = "us-east-1"

    # ---- TukiFact (facturación electrónica SUNAT) ----
    tukifact_api_key: SecretStr = SecretStr("TF_test_replace_me")
    tukifact_environment: Literal["sandbox", "production"] = "sandbox"
    tukifact_webhook_secret: SecretStr = SecretStr("")

    # ---- Twilio WhatsApp ----
    twilio_account_sid: SecretStr = SecretStr("")
    twilio_auth_token: SecretStr = SecretStr("")
    twilio_whatsapp_from: str = ""

    # ---- Modo seguro de comunicaciones ----
    safe_recipients_only: bool = True
    safe_recipients: Annotated[list[str], NoDecode] = Field(default_factory=list)

    @field_validator("safe_recipients", mode="before")
    @classmethod
    def _split_safe(cls, value: object) -> object:
        if isinstance(value, str):
            return [r.strip() for r in value.split(",") if r.strip()]
        return value

    # ---- Observability ----
    sentry_dsn: str = ""

    # ---- AI / LLM ----
    openai_api_key: SecretStr = SecretStr("")
    ai_model: str = "gpt-4o-mini"

    # ---- Feature flags ----
    enable_online_payments: bool = False
    enable_ai_soap: bool = False

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Devuelve la instancia singleton de configuración."""
    return Settings()


settings = get_settings()
