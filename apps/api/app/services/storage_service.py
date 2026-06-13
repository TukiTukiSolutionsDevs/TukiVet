"""Servicio de almacenamiento de objetos (MinIO / S3)."""

from __future__ import annotations

import asyncio
import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import settings


def _make_client(endpoint_url: str) -> "boto3.client":  # type: ignore[name-defined]
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.s3_access_key.get_secret_value(),
        aws_secret_access_key=settings.s3_secret_key.get_secret_value(),
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


def _ensure_bucket(s3: object) -> None:
    try:
        s3.head_bucket(Bucket=settings.s3_bucket)  # type: ignore[attr-defined]
    except ClientError:
        s3.create_bucket(Bucket=settings.s3_bucket)  # type: ignore[attr-defined]


async def upload_file(
    file_content: bytes,
    original_filename: str,
    content_type: str,
    folder: str = "documents",
) -> str:
    """Sube un archivo a MinIO. Retorna el object key."""
    safe_name = original_filename.replace(" ", "_")
    key = f"{folder}/{uuid.uuid4().hex}/{safe_name}"

    def _upload() -> None:
        s3 = _make_client(settings.s3_endpoint)
        _ensure_bucket(s3)
        s3.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=file_content,
            ContentType=content_type,
        )

    await asyncio.to_thread(_upload)
    return key


async def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Genera URL pre-firmada para descarga directa."""
    public_endpoint = getattr(settings, "s3_public_url", settings.s3_endpoint)

    def _presign() -> str:
        s3 = _make_client(public_endpoint)
        return s3.generate_presigned_url(  # type: ignore[return-value]
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    return await asyncio.to_thread(_presign)


async def delete_file(key: str) -> None:
    """Elimina un archivo de MinIO."""

    def _delete() -> None:
        s3 = _make_client(settings.s3_endpoint)
        s3.delete_object(Bucket=settings.s3_bucket, Key=key)

    await asyncio.to_thread(_delete)
