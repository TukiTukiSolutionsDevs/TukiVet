# TukiVet API

Backend FastAPI para la gestión de la veterinaria.

## Stack

- Python 3.12 + FastAPI 0.115
- PostgreSQL 16 + SQLAlchemy 2 async + Alembic
- Redis 7 + ARQ (colas async)
- MinIO / S3 (storage)
- pytest + ruff + mypy

## Quickstart

Desde la raíz del repo:

```bash
cp .env.example .env       # ajustar valores
make up                     # levanta postgres + redis + minio + api
make migrate                # aplica migraciones
make test                   # corre tests
curl http://localhost:8000/healthz
```

OpenAPI interactiva: <http://localhost:8000/docs>

## Estructura

Ver [`docs/ARQUITECTURA.md`](../../docs/ARQUITECTURA.md) en la raíz del repo.
