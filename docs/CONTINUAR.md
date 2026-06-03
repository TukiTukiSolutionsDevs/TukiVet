# Cómo continuar TukiVet en una sesión nueva

Este documento te da el **prompt template** para arrancar cualquier sesión nueva (Claude Code, otro agente, otro dev humano) y retomar el trabajo sin perder contexto.

---

## Prompt template — copiar y pegar

Reemplaza la línea `[MI OBJETIVO HOY ES: ...]` con lo que querés hacer en esta sesión.

```markdown
Estoy trabajando en TukiVet, un SaaS de gestión veterinaria para Perú.
Soy Jaime Andrés (TukiTuki Solutions SAC, RUC 20613614509).

## Contexto del proyecto

- **Repo**: `/Users/soulkin/Documents/Veterinaria`
- **Estado**: Backend MVP completo (Sprint 0-12, 13 commits en `main`)
- **Producto**: gestión integral para una veterinaria en Perú (mi amigo).
- **Modelo**: single-tenant promovible (existe `organization` y `branch`
  como entidades; no hay RLS ni middleware tenant_id por ahora).

## Stack confirmado

- Python 3.12, FastAPI 0.115, SQLAlchemy 2.0 async, Alembic
- Postgres 16, Redis 7, MinIO (S3-compatible)
- pydantic 2.9, structlog, argon2-cffi, pyjwt, python-ulid, ARQ
- pytest + ruff + mypy + GitHub Actions
- Frontend pendiente: Next.js 15 + TS + Tailwind + shadcn/ui

## Documentación canónica — LEE EN ESTE ORDEN antes de codear

1. `docs/DECISIONES.md` ← **fuente única de verdad**. Si algo contradice
   a este archivo, este gana.
2. `docs/ROADMAP.md` — qué está hecho, qué sigue, fases V2/V3.
3. `docs/ARQUITECTURA.md` — 12 ADRs, capas, patrones.
4. `docs/MODELO_DATOS.md` — esquema de BD detallado.
5. `docs/DESIGN.md` — handoff para Cloud Design / frontend.
6. `docs/LEY_29733.md` — cumplimiento ANPD.

## Patrones establecidos — RESPETAR

- **Modelos** en `app/models/*.py`: ULID PK string(26), TimestampMixin,
  soft-delete con `deleted_at`. Importar todo en `models/__init__.py`.
- **Schemas** Pydantic v2 en `app/schemas/*.py` con `ORMModel`
  (from_attributes=True).
- **Services** en `app/services/*.py` con lógica de negocio. NO commitean —
  lo hace el endpoint con `await db.commit()`.
- **Routers** en `app/api/v1/*.py` usando `Annotated` + `Depends`.
  Permisos vía `dependencies=[Depends(require_permission("dominio:accion"))]`.
- **Migraciones** escritas manualmente en `alembic/versions/2026...py`
  (NO autogenerate, queremos control de índices y seeds).
- **Tests** integration en `tests/integration/` con fixtures de `conftest.py`:
  `auth_client`, `client`, `sample_customer_payload`, `sample_pet_payload`.
- **Adapter pattern** para integraciones externas (TukiFact, Twilio):
  ABC port en `provider.py` + real + mock. Selección por config.
- **Audit log** en cada acción mutante via `app.core.audit.audit(...)`.
- **Dinero**: siempre `Decimal`, nunca `float`. Postgres `NUMERIC(12,2)`.
- **Idempotency**: endpoints `POST` que generan recursos cobrables
  aceptan header `Idempotency-Key`.

## Decisiones críticas (resumen rápido)

- **TukiFact** (servicio del propio Jaime, tukifact.com.pe) es el OSE
  de facturación electrónica. Adapter listo en
  `app/services/invoicing/`. Conectar real con `TUKIFACT_API_KEY` y
  `TUKIFACT_ENVIRONMENT` en `.env`.
- **Pagos manuales** primero (efectivo, Yape, Plin, transfer, POS).
  Culqi diferido a post-MVP (feature flag `ENABLE_ONLINE_PAYMENTS`).
- **WhatsApp** vía **Twilio**. En dev: `SAFE_RECIPIENTS_ONLY=true` con
  whitelist en `SAFE_RECIPIENTS`. Plantillas seed en
  `app.services.notification_service.DEFAULT_TEMPLATES`.
- **Deploy** en VPS propio del usuario con Docker + Caddy/Traefik.

## Lo que falta (orden sugerido — ver ROADMAP.md para detalle)

1. **Fase 2 — Validación + Hardening** (2 sprints): `make up`/`test`
   reales, Sentry, rate-limit, backups.
2. **Fase 3 — Frontend MVP** (~8 sprints) con Cloud Design / Stitch.
   Insumo: `docs/DESIGN.md` con las 14 pantallas, design system, mapa
   endpoints.
3. **Fase 4 — Deploy** (~3 sprints): VPS + CI/CD + observabilidad +
   onboarding cliente piloto.
4. **Fase 5 — V2** (~10 sprints opt-in): hospitalización, cirugía, lab,
   wellness plans, AI SOAP, multi-sede, mobile app, telemedicina,
   boarding/grooming, Culqi online.
5. **Fase 6 — V3** (diferenciadores premium): DICOM, IDEXX/Antech,
   API pública, marketplace, app móvil del vet.

## Setup local

```bash
cd /Users/soulkin/Documents/Veterinaria
cp .env.example .env   # ajustar TUKIFACT_API_KEY y TWILIO_* si vas a integrar real
make up                 # postgres + redis + minio + api
make migrate            # aplica las 12 migraciones
make test               # ~70 tests deberían pasar
open http://localhost:8000/docs
```

## Pendientes operativos del usuario (Jaime)

1. **Trámite Meta WhatsApp Business** (2-4 semanas, bloquea WhatsApp prod).
2. **API key real de TukiFact** (sandbox para empezar).
3. **Entrevista con el amigo dueño de la veterinaria** — 10 preguntas en
   `docs/DECISIONES.md §D9` para validar workflow.
4. **Cumplimiento Ley 29733**: ver `docs/LEY_29733.md` checklist.
5. **Specs del VPS** cuando estés listo para Fase 4.

---

## MI OBJETIVO HOY ES

[MI OBJETIVO HOY ES: <describe acá lo que querés hacer en esta sesión.
Sé específico: "arrancar Sprint V0", "implementar V2.1 Hospitalización",
"setup frontend con Next.js 15", etc.>]

## Reglas para ti, agente

- NO empezar a codear sin leer al menos `DECISIONES.md` y `ROADMAP.md`.
- Si vas a tocar BD: lee `MODELO_DATOS.md`, escribe migración manual.
- Si vas a integrar servicio externo: adapter pattern (port + real + mock).
- Commitea por sprint con mensaje descriptivo. Una línea por feature/cambio.
- Si encontrás un patrón que no calza con lo establecido, pregúntame
  antes de cambiarlo globalmente.
- Tests E2E en `tests/integration/test_*.py` con `auth_client` fixture.
- Si hay decisiones nuevas que tomar (producto, arquitectura),
  documentarlas en `docs/DECISIONES.md` antes de codear.
- Trabajá en español Perú para mensajes de usuario, código en inglés.
```

---

## Tips para usar el prompt

- **Sé específico en "MI OBJETIVO HOY ES"**. Cuanto más concreto, mejor.
  - ❌ "Sigue con el proyecto"
  - ✅ "Arrancá Sprint V0 — Smoke test real. Probá `make up`, `make migrate` y `make test`. Si algo falla, debugea y arregla. Reportame todo lo que encuentres."
  - ✅ "Implementá V2.1 Hospitalización. Lee primero ROADMAP.md y DESIGN.md. Diseñá los modelos (HospitalizationStay, KardexEntry, MedicalOrder), define endpoints, escribe migración, tests. Commitea cuando termines."

- **Si retomás después de mucho tiempo**, agregá al prompt:
  > Hace [N] semanas que no toco esto. Antes de codear, hacé `git log
  > --oneline -20` y `make test` para verificar que nada se rompió con
  > deps actualizadas.

- **Si la sesión nueva no es Claude Code, sino otro agente o un dev**,
  pegale el prompt completo y el agente sabrá leer la documentación.

- **Si necesitás onboarding profundo** y no querés explicar cada cosa,
  decile al agente:
  > Antes de hacer nada, leé los 6 documentos en `docs/` en orden y
  > resumime: (1) qué hace el sistema, (2) cuáles son las decisiones
  > clave, (3) qué patrones debo respetar, (4) qué falta hacer.

---

## Memoria persistente (Engram, Meridian, etc.)

Si tu agente tiene memoria persistente, también está guardado en:
- `tukivet_progreso` — estado de sprints y commits
- `proyecto_veterinaria` — contexto inicial del proyecto
- `productos_tukituki` — portafolio (TukiJuris, TukiFact, TukiVet)

El agente puede llamar a `mem_search "tukivet"` para retomar contexto.
