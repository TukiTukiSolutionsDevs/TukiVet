# TukiVet — Backend de gestión veterinaria

Sistema integral para una clínica veterinaria en Perú: gestión de clientes y mascotas, historia clínica electrónica con SOAP, vacunas, recetas, inventario con lotes y vencimientos, citas, POS, facturación electrónica SUNAT (vía [TukiFact](https://tukifact.com.pe)), recordatorios por WhatsApp y portal del cliente.

**Estado actual**: Sprint 0 completado — esqueleto del backend listo, sin lógica de negocio aún.

## Stack

- **Python 3.12** + **FastAPI** 0.115 (async)
- **PostgreSQL 16** + **SQLAlchemy 2.0** async + **Alembic**
- **Redis 7** + **ARQ** para colas async
- **MinIO** (S3-compatible) para storage
- **Docker** + **docker-compose** para dev y deploy
- **pytest** + **ruff** + **mypy** + **GitHub Actions** CI

## Quickstart

```bash
# 1. Configurar entorno
cp .env.example .env

# 2. Levantar stack local (postgres + redis + minio + api)
make up

# 3. Aplicar migraciones
make migrate

# 4. Smoke test
curl http://localhost:8000/healthz
# → {"status": "ok"}

# 5. OpenAPI interactiva
open http://localhost:8000/docs

# 6. Tests
make test
```

Todos los comandos disponibles: `make help`.

## Estructura

```
Veterinaria/
├── docs/                  Documentación canónica (leer en este orden)
│   ├── DECISIONES.md      ← FUENTE DE VERDAD sobre decisiones de producto
│   ├── ARQUITECTURA.md    ← capas, ADRs, patrones técnicos
│   ├── MODELO_DATOS.md    ← esquema de BD detallado
│   ├── ROADMAP.md         ← plan de sprints
│   ├── PROPUESTA.md       ← visión y alcance (drafted antes que DECISIONES)
│   └── INVESTIGACION.md   ← análisis de mercado y marco regulatorio
├── apps/
│   └── api/               Backend FastAPI
│       ├── app/           Código de la app
│       ├── alembic/       Migraciones
│       ├── tests/
│       ├── pyproject.toml
│       ├── Dockerfile
│       └── Dockerfile.dev
├── infra/
│   └── docker-compose.yml Stack local
├── .github/workflows/     CI
├── .env.example
└── Makefile               Atajos de desarrollo
```

## Documentación

Si te incorporás al proyecto, leé en este orden:

1. [`docs/DECISIONES.md`](docs/DECISIONES.md) — qué se decidió y por qué.
2. [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — arquitectura técnica, ADRs.
3. [`docs/MODELO_DATOS.md`](docs/MODELO_DATOS.md) — esquema de BD.
4. [`docs/ROADMAP.md`](docs/ROADMAP.md) — qué sigue.

## Estado actual

**Backend MVP completo** — 13 sprints en `main`. ~90 endpoints, ~70 tests E2E, 12 migraciones.

Próximas fases (ver [`docs/ROADMAP.md`](docs/ROADMAP.md)):

- **Fase 2** — Validación + hardening (2 sprints)
- **Fase 3** — Frontend MVP con Cloud Design (~8 sprints) basado en [`docs/DESIGN.md`](docs/DESIGN.md)
- **Fase 4** — Deploy al VPS (~3 sprints)
- **Fase 5** — V2 features (hospitalización, cirugía, lab, AI SOAP, multi-sede, mobile app)
- **Fase 6** — V3 features (DICOM, IDEXX, API pública)

## Continuar el trabajo en sesión nueva

Ver [`docs/CONTINUAR.md`](docs/CONTINUAR.md) — contiene el prompt template
listo para copy-paste en cualquier agente o sesión nueva.

## Licencia

Proprietary — TukiTuki Solutions SAC (RUC 20613614509).
