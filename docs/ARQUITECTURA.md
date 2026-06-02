# Arquitectura — TukiVet Backend

Última actualización: 2026-06-01

---

## 1. Visión arquitectónica

Monolito modular Python (FastAPI), single-database (Postgres), con colas async (ARQ + Redis) para tareas que no deben bloquear request HTTP.

**Por qué monolito modular y no microservicios**:
- Una sola veterinaria, equipo pequeño (1–2 devs).
- Microservicios prematuros = costo operacional sin beneficio.
- Modular = código organizado por dominios; si crece, se extraen servicios.

---

## 2. Capas

```
┌─────────────────────────────────────────────────────────┐
│  HTTP layer — FastAPI routers (app/api/)               │
│    • Schemas Pydantic (request/response)               │
│    • Auth/permission deps                              │
│    • Rate limiting                                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Application services (app/services/)                  │
│    • Orquestación de casos de uso                      │
│    • Transacciones                                     │
│    • Publica eventos de dominio                        │
└─────────────────────────────────────────────────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
┌────────────┐  ┌──────────────────┐  ┌────────────────┐
│ Repositorios│  │ Adapters         │  │ Workers/Tasks  │
│ (SQLAlchemy)│  │ (TukiFact, Twilio│  │ (ARQ jobs)     │
│             │  │  S3, RUC API)    │  │                │
└────────────┘  └──────────────────┘  └────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
   ┌──────────┐     ┌──────────┐       ┌──────────┐
   │ Postgres │     │ External │       │  Redis   │
   │          │     │ APIs     │       │ (queue)  │
   └──────────┘     └──────────┘       └──────────┘
```

---

## 3. Estructura del proyecto

```
Veterinaria/
├── docs/
├── apps/
│   └── api/
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py                      # FastAPI app + lifespan
│       │   ├── config.py                    # pydantic-settings
│       │   ├── api/
│       │   │   ├── deps.py                  # dependencies (auth, db, current_user)
│       │   │   ├── middleware.py            # request_id, audit, rate-limit
│       │   │   └── v1/
│       │   │       ├── __init__.py
│       │   │       ├── auth.py
│       │   │       ├── users.py
│       │   │       ├── customers.py
│       │   │       ├── pets.py
│       │   │       ├── encounters.py
│       │   │       ├── vaccines.py
│       │   │       ├── prescriptions.py
│       │   │       ├── inventory.py
│       │   │       ├── appointments.py
│       │   │       ├── orders.py
│       │   │       ├── payments.py
│       │   │       ├── invoices.py          # documento electrónico
│       │   │       ├── reports.py
│       │   │       ├── portal.py            # cliente externo
│       │   │       └── webhooks.py          # entrantes (TukiFact, Twilio)
│       │   ├── core/
│       │   │   ├── security.py              # JWT, argon2
│       │   │   ├── permissions.py           # RBAC checks
│       │   │   ├── audit.py                 # audit logger
│       │   │   ├── events.py                # event dispatcher
│       │   │   ├── errors.py                # exception types
│       │   │   └── ratelimit.py             # Redis-backed
│       │   ├── db/
│       │   │   ├── base.py                  # Base = DeclarativeBase
│       │   │   ├── session.py               # async engine + session factory
│       │   │   └── types.py                 # custom types (e.g. JSONB serializers)
│       │   ├── models/                      # SQLAlchemy ORM
│       │   │   ├── organization.py
│       │   │   ├── user.py
│       │   │   ├── customer.py
│       │   │   ├── pet.py
│       │   │   ├── encounter.py
│       │   │   ├── vaccine.py
│       │   │   ├── prescription.py
│       │   │   ├── inventory.py
│       │   │   ├── appointment.py
│       │   │   ├── order.py
│       │   │   ├── payment.py
│       │   │   ├── invoice.py
│       │   │   ├── audit_log.py
│       │   │   ├── notification.py
│       │   │   └── attachment.py
│       │   ├── schemas/                     # Pydantic v2
│       │   │   └── ... (mismas categorías)
│       │   ├── services/                    # lógica de negocio
│       │   │   ├── auth_service.py
│       │   │   ├── customer_service.py
│       │   │   ├── pet_service.py
│       │   │   ├── encounter_service.py
│       │   │   ├── vaccine_service.py
│       │   │   ├── prescription_service.py
│       │   │   ├── inventory_service.py
│       │   │   ├── appointment_service.py
│       │   │   ├── order_service.py
│       │   │   ├── payment_service.py
│       │   │   ├── invoicing/
│       │   │   │   ├── provider.py          # ABC InvoiceProvider
│       │   │   │   ├── tukifact_provider.py
│       │   │   │   └── mock_provider.py
│       │   │   ├── messaging/
│       │   │   │   ├── provider.py          # ABC MessagingProvider
│       │   │   │   ├── twilio_provider.py
│       │   │   │   └── console_provider.py  # dev
│       │   │   ├── storage/
│       │   │   │   ├── provider.py          # ABC StorageProvider
│       │   │   │   └── s3_provider.py
│       │   │   └── doc_validation/
│       │   │       └── peru.py              # validar DNI/RUC con dígito verificador
│       │   ├── repositories/                # consultas complejas
│       │   │   └── ...
│       │   ├── workers/                     # ARQ jobs
│       │   │   ├── __init__.py
│       │   │   ├── settings.py              # ARQ worker config
│       │   │   ├── invoicing_jobs.py        # emit_invoice, retry_failed
│       │   │   ├── messaging_jobs.py        # send_whatsapp, send_email
│       │   │   ├── reminder_jobs.py         # schedule reminders
│       │   │   └── reports_jobs.py          # KPI refresh
│       │   ├── tasks/
│       │   │   └── scheduler.py             # cron-like: vacunas vencidas, etc.
│       │   ├── pdf/
│       │   │   ├── medical_record.py        # PDF SOAP
│       │   │   ├── vaccine_cert.py          # PDF certificado vacunación
│       │   │   ├── prescription.py
│       │   │   └── templates/
│       │   ├── integrations/
│       │   │   ├── peru_gov.py              # consulta RUC/DNI gov.pe
│       │   │   └── ...
│       │   └── utils/
│       │       ├── ids.py                   # ULID generator
│       │       ├── pagination.py
│       │       └── time.py
│       ├── alembic/
│       │   ├── env.py
│       │   ├── script.py.mako
│       │   └── versions/
│       ├── tests/
│       │   ├── conftest.py                  # fixtures, testcontainers Postgres
│       │   ├── factories.py                 # factory-boy
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       ├── Dockerfile
│       ├── Dockerfile.dev
│       ├── pyproject.toml
│       ├── ruff.toml
│       └── alembic.ini
├── infra/
│   ├── docker-compose.yml                   # dev local
│   ├── docker-compose.prod.yml              # prod (VPS)
│   └── caddy/
│       └── Caddyfile                        # ejemplo
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Decisiones técnicas (ADRs resumidos)

### ADR-001 — Identificadores: ULID en lugar de UUID v4
**Decisión**: usar **ULID** (26 chars, ordenados temporalmente) para PKs.
**Por qué**: ordenados por tiempo de creación, mejor para índices Postgres, legibles. Compatible con UUID (mismo tamaño binario).
**Impacto**: tipo `String(26)` en SQLAlchemy o `UUID` (los 16 bytes).

### ADR-002 — Async desde el principio
**Decisión**: SQLAlchemy 2.0 async, httpx async, ARQ async.
**Por qué**: latencia baja con I/O bloqueante (TukiFact, Twilio, S3).

### ADR-003 — Inmutabilidad clínica
**Decisión**: cerrado un `encounter` o `vaccine_administration`, no se modifica. Para corregir, se emite **enmienda** firmada con motivo y queda historial.
**Por qué**: requisito médico-legal. Trazabilidad ante reclamos.

### ADR-004 — Soft delete para entidades de negocio
**Decisión**: `deleted_at TIMESTAMP NULL`. Filtrado automático en repos.
**Excepciones**: `audit_log`, `electronic_document` y `payment` nunca se borran (hard-keep).

### ADR-005 — Auditoría centralizada
**Decisión**: tabla `audit_log` (actor, action, target_type, target_id, before, after, ip, timestamp) + triggers Postgres en tablas críticas.
**Por qué**: cumplimiento Ley 29733 y debugging.

### ADR-006 — Outbox pattern para side-effects
**Decisión**: cuando un caso de uso produce side-effects (enviar WhatsApp, emitir factura, refrescar KPI), se inserta una fila en `outbox` dentro de la misma transacción. Un worker ARQ procesa la outbox.
**Por qué**: at-least-once garantizado, sin dependencia de RPC en línea.

### ADR-007 — Adapter pattern para integraciones externas
**Decisión**: cada integración tiene una **interfaz** (ABC en `provider.py`) y al menos dos implementaciones (real + mock).
**Por qué**: tests determinísticos sin red, swap de provider sin tocar dominio.

### ADR-008 — Idempotencia en endpoints de mutación
**Decisión**: endpoints `POST` que generan recursos cobrables o emitibles aceptan header `Idempotency-Key`. Servidor guarda el primer resultado, devuelve mismo resultado en retries.
**Por qué**: clientes reintentan; evitar duplicar facturas, pagos.

### ADR-009 — `Decimal` para todo el dinero
**Decisión**: nunca `float`. Postgres `NUMERIC(12, 2)` para montos; `Decimal` en Python.
**Por qué**: precisión. SUNAT no perdona redondeo.

### ADR-010 — Tiempo en UTC, timezone Lima en presentación
**Decisión**: BD guarda `TIMESTAMP WITH TIME ZONE` en UTC. Conversión a `America/Lima` sólo en capa de presentación (PDFs, respuestas web si aplica).
**Por qué**: estándar; evita bugs de DST (Lima no tiene DST pero la regla general aplica).

### ADR-011 — Eventos de dominio in-process
**Decisión**: dispatcher in-process con tabla `outbox`. No usamos broker externo (Kafka, RabbitMQ).
**Por qué**: KISS. Si necesitamos broker en el futuro, el outbox ya está listo para drenar a uno.

### ADR-012 — Cifrado de columnas sensibles con pgcrypto
**Decisión**: DNI, teléfono, dirección de clientes cifrados con `pgcrypto` (función `pgp_sym_encrypt` con clave en env). Búsqueda por hash.
**Por qué**: defensa en profundidad para Ley 29733. Costo: ~10% overhead de query.

---

## 5. Modelo de eventos de dominio

Eventos publicados por servicios, consumidos por handlers async:

| Evento | Productor | Consumidores |
|---|---|---|
| `EncounterClosed` | `EncounterService.close()` | `AutoChargeHandler` (propone cargos), `MetricsHandler` |
| `VaccineAdministered` | `VaccineService.register()` | `ReminderScheduler` (refuerzo), `PortalNotifier` |
| `OrderPaid` | `PaymentService.confirm()` | `InvoiceEmissionHandler` (TukiFact), `OrderClosing` |
| `InvoiceEmitted` | `TukiFactProvider` (via webhook) | `OrderClosing`, `CustomerNotifier` (WhatsApp) |
| `InvoiceRejected` | `TukiFactProvider` | `AlertHandler` (notifica admin) |
| `AppointmentScheduled` | `AppointmentService.create()` | `ReminderScheduler` (24h before) |
| `AppointmentCancelled` | `AppointmentService.cancel()` | `ReminderScheduler` (cancel pending) |
| `LowStockDetected` | scheduler nightly | `AlertHandler` |
| `ExpiringLotDetected` | scheduler nightly | `AlertHandler` |
| `VaccinesDueDetected` | scheduler nightly | `CustomerNotifier` (WhatsApp) |

---

## 6. Seguridad

| Vector | Medida |
|---|---|
| Brute force login | Rate limit 5/min/IP + lockout temporal |
| Token leak | Refresh rotation, blacklist en Redis al logout |
| SQL injection | ORM (sin string concatenation), inputs Pydantic |
| XSS (en PDFs y emails) | escapado en templates Jinja2 |
| CSRF | API stateless con JWT en Authorization header (no cookies cross-site) |
| Privilege escalation | Decorator `@require_permission` en cada endpoint mutating |
| Data exfil | Audit log de accesos a `customer`, `pet`, `encounter` |
| At-rest | Cifrado disco VPS + pgcrypto en columnas sensibles |
| In-transit | TLS 1.3 en Caddy/Traefik |
| Secrets | env vars en VPS, no en repo. `.env` en `.gitignore` |
| File uploads | tamaño máx + tipo MIME validado + ClamAV opcional |
| Webhook spoofing | HMAC verification (TukiFact secret, Twilio signature) |

---

## 7. Performance objetivos

| Endpoint | Latencia p95 objetivo |
|---|---|
| `/search?q=...` (global) | <100 ms |
| `/encounters/{id}` (con SOAP) | <150 ms |
| `/reports/kpis` | <500 ms (cacheado 1h) |
| `/orders` POST (con auto-cargo) | <300 ms |
| `/invoices` POST (TukiFact async) | <200 ms (devuelve 202, completa async) |
| `/portal/pets/{id}/history` | <250 ms |

---

## 8. Observabilidad

- **Logs**: structlog → JSON → stdout. En prod, agregados con Loki o Vector si se quiere.
- **Errors**: Sentry SDK.
- **Métricas básicas**: middleware que cuenta requests/duración por endpoint, expuestas en `/metrics` (Prometheus format, opcional).
- **Tracing**: OpenTelemetry **opcional** post-MVP.
- **Health**: `/healthz` (liveness) + `/readyz` (readiness: db + redis).

---

## 9. Despliegue (alto nivel)

```
[Internet]
    │ TLS
    ▼
[Caddy en VPS]    ←  Let's Encrypt cert
    │
    ├── /api/*  → [api container :8000]
    ├── /portal → [api container :8000]
    └── /admin  → [api container :8000]

[api container]
    │
    ├── [postgres container] :5432
    ├── [redis container] :6379
    ├── [arq-worker container]
    └── [arq-scheduler container]

[backups job] — cron en host VPS, pg_dump → B2/S3
```

Imágenes Docker construidas por CI (GitHub Actions), pushed a GHCR, pull en VPS via webhook deploy o script SSH.

---

## 10. Riesgos técnicos identificados

| Riesgo | Mitigación |
|---|---|
| TukiFact / SUNAT abajo en momento de venta | Outbox: la venta se completa, la emisión queda en cola con reintentos exponenciales (1m, 5m, 15m, 1h, 6h, 24h) |
| Twilio template rejected por Meta | Diseñar plantillas con anticipación, copy claro y conforme a políticas Meta (no marketing en utility, etc.) |
| Crecimiento de datos clínicos > 100k registros | Postgres maneja millones tranquilo; índices correctos en `encounter(pet_id, date)`, `customer(doc_number)`, `audit_log(timestamp)` |
| Imágenes pesadas (Rx, eco) | S3-compatible storage, no en BD. Compresión opcional cliente |
| Inconsistencia entre stock y dispensación | Transacciones DB serializables en operaciones de stock. Constraints check_constraint en cantidades. |
| Bug en cálculo de IGV/totales | Tests propiedad-basados (Hypothesis) sobre la calculadora de totales |
| Caída del VPS único | Backups diarios + plan de restauración documentado. SLA es "best effort", no enterprise. |
