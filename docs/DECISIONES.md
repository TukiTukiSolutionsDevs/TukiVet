# Decisiones confirmadas — TukiVet

Última actualización: 2026-06-01
Este documento es la **fuente única de verdad** sobre decisiones de producto y arquitectura. Si algo en `PROPUESTA.md` o `ROADMAP.md` contradice a este archivo, **este gana**.

---

## D1. Modelo de despliegue — single-tenant "promovible"

**Decisión**: el sistema se construye para **una sola veterinaria** (la de Jaime el amigo), pero el código se estructura como si fuera multi-tenant. Concretamente:

- Existen las entidades `organization` y `branch` desde el día 1.
- Toda query relevante filtra por `organization_id` (no necesariamente `tenant_id`).
- **NO** se implementa middleware de tenant injection ni Row Level Security (RLS) ahora.
- Si en el futuro queremos convertirlo en SaaS multi-tenant, agregar RLS + middleware es ~1 sprint, no requiere migración de datos significativa.

**Por qué**: el usuario fue claro — sólo es para la veterinaria de su amigo. Sobre-ingeniería con RLS multi-tenant agrega complejidad innecesaria. Pero romper el modelo a futuro (si se decide vender el SaaS) sería peor; por eso conservamos los `org_id` y la estructura jerárquica.

---

## D2. Stack técnico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | Python + FastAPI | 3.12 / FastAPI 0.115+ |
| ORM | SQLAlchemy async | 2.0+ |
| Migrations | Alembic | última |
| DB | PostgreSQL | 16 |
| Cache / rate-limit / colas | Redis | 7 |
| Cola async | **ARQ** (Redis-native, más liviano que Celery) | última |
| Object storage | MinIO local / S3-compatible en prod | última |
| Validación | Pydantic v2 | última |
| Auth | JWT con argon2id, refresh tokens | — |
| Tests | pytest + pytest-asyncio + factory-boy + testcontainers | última |
| Lint / format | ruff + ruff format | última |
| Type check | mypy strict | última |
| Containers | Docker + docker-compose | — |
| CI | GitHub Actions | — |
| Observability | structlog + Sentry | — |
| Frontend | Next.js 15 + TypeScript + Tailwind + shadcn/ui | se hace al final con Cloud Design |

---

## D3. Facturación electrónica — TukiFact

**Decisión**: integración con **TukiFact** (servicio propio del usuario, `tukifact.com.pe`).

### Contrato TukiFact (resumen, fuente: app.tukifact.com.pe/developers)

- **Base URL**:
  - Sandbox: `https://sandbox.tukifact.net.pe/v1` (keys `TF_test_*`)
  - Prod: `https://api.tukifact.net.pe/v1` (keys `TF_live_*`)
- **Auth**: `Authorization: Bearer TF_xxx`
- **Rate limit**: headers `X-RateLimit-*`. Plan Free: 100 req/h.
- **SDK Python oficial**: `pip install tukifact` — clase `TukiFact`, soporta sync y async, reintentos con backoff.
- **Endpoints clave**:
  - `POST /v1/documents` — emite (factura, boleta, NC, ND)
  - `GET /v1/documents/:id` — consulta
  - `GET /v1/documents/:id/pdf` — descarga PDF
  - `GET /v1/documents/:id/xml` — descarga XML firmado
  - `GET /v1/documents/:id/status` — estado SUNAT
  - `POST /v1/documents/:id/void` — anula
  - `POST /v1/webhooks` — registra webhook (eventos: `document.accepted`, `document.rejected`)
- **Payload mínimo**:
  ```json
  {
    "type": "01",
    "series": "F001",
    "customer": { "documentType": "6", "documentNumber": "20100066603", "name": "...", "address": "..." },
    "items": [{ "description": "...", "quantity": 1, "unitPrice": 1000.00, "igv": 180.00 }]
  }
  ```
- **Errores notables**: `422` (rechazo SUNAT en XML), `429` (rate limit), `503` (SUNAT abajo, reintentar).

### Patrón de integración

- **Port**: `InvoiceProvider` (interfaz abstracta en `services/invoicing/provider.py`).
- **Adapter por defecto**: `TukiFactProvider` (usando el SDK Python).
- **Adapter dev**: `MockInvoiceProvider` (para tests, devuelve respuestas determinísticas).
- **Feature flag** en config para alternar.
- Webhooks de TukiFact se reciben en `POST /api/v1/webhooks/tukifact` con verificación HMAC.

### Cuándo se conecta

El stub queda listo desde el día 1 (Sprint 8). **La conexión a TukiFact real ocurre al final del MVP** (Sprint 12, integración + smoke test contra sandbox). En desarrollo se usa `MockInvoiceProvider`.

---

## D4. Pagos — manuales primero, Culqi diferido

**Decisión**: el módulo de pagos en MVP registra **pagos manuales**:

| Método | Cómo se registra |
|---|---|
| Efectivo | Monto + nº de billetes opcional |
| Yape | Monto + foto/captura opcional + nº de operación |
| Plin | Monto + nº de operación |
| Transferencia bancaria | Monto + banco + nº de operación |
| Tarjeta presencial (POS físico Izipay/Niubiz) | Monto + nº de voucher |
| Crédito (cuenta cliente) | Monto + fecha de vencimiento |

**Culqi**: queda como `OnlinePaymentProvider` con feature flag `ENABLE_ONLINE_PAYMENTS=false` por default. La integración (Culqi.charge.create, webhooks) queda **en backlog post-MVP** — no se construye ahora.

**Por qué**: el usuario dijo "incluye Culqi pero aún no se usará, primero estaremos con Yape/Plin también". Diseñamos el módulo `Payment` con `method` extensible, sin acoplar a un provider específico. Cuando se quiera activar Culqi, es 1 sprint extra.

---

## D5. WhatsApp Business — Twilio desde MVP

**Decisión**: Twilio como BSP de WhatsApp. Integración desde Sprint 9 del nuevo roadmap.

**Acción del usuario (Jaime) en paralelo**: arrancar **ya** los trámites con Meta para:
1. Crear el portfolio empresarial (Meta Business Portfolio) de la veterinaria.
2. Verificar la cuenta de WhatsApp Business asociada.
3. Solicitar aprobación de las plantillas HSM iniciales:
   - `vet_appointment_reminder_24h` (recordatorio cita 24h antes)
   - `vet_appointment_confirmation` (confirmación al agendar)
   - `vet_vaccine_due` (vacuna vencida o próxima a vencer)
   - `vet_invoice_receipt` (envío de comprobante)
   - `vet_nps_followup` (encuesta NPS post-visita)

Esto toma **2–4 semanas** y bloquea el go-live si no se inicia temprano.

---

## D6. Hosting — VPS propio del usuario

**Decisión**: el sistema se despliega en el VPS del usuario al final del MVP.

- En desarrollo: `docker-compose` local (Postgres + Redis + MinIO + API).
- En producción: imágenes Docker construidas por GitHub Actions, pushed a registry (GHCR), desplegadas en el VPS via `docker compose pull && docker compose up -d`.
- Reverse proxy en el VPS: **Caddy** o **Traefik** (a definir según lo que ya tenga el usuario).
- SSL automático con Let's Encrypt.
- Backups: pg_dump diario cifrado a un bucket S3-compatible (Backblaze B2 o similar, costo bajo).

**Información requerida del usuario al llegar al deploy**: specs del VPS (CPU, RAM, disco), distribución Linux, dominio asignado a TukiVet, si ya tiene Caddy/Traefik corriendo.

---

## D7. Nombre y branding

**Working name**: **TukiVet**. Encaja con la familia de productos TukiTuki Solutions SAC (TukiJuris, TukiFact, TukiVet).
Dominio sugerido a registrar: `tukivet.com.pe` (no validado todavía).

---

## D8. Roadmap actualizado (resumen)

Backend MVP en **12 sprints (~18 semanas)** en lugar de 15. Cambios respecto a la v1:

| Cambio | Razón |
|---|---|
| Eliminado: middleware multi-tenant + RLS | Por D1 — single-tenant promovible |
| Eliminado: super-admin tenant management | Por D1 |
| Eliminado: Sprint dedicado a Culqi online | Por D4 — diferido a post-MVP |
| Simplificado: Sprint de facturación a integración TukiFact (con SDK Python) | Más simple que escribir cliente Nubefact desde cero |
| Mantenido: WhatsApp en MVP | Por D5 |

Detalle completo en `ROADMAP.md` (actualizado).

---

## D9. Entrevista al cliente piloto (acción pendiente)

**Acción**: el usuario (Jaime) coordina entrevista con su amigo (dueño de la veterinaria) para validar:

1. ¿Cuántos veterinarios trabajan? ¿Atienden simultáneamente?
2. ¿Hospitalizan? ¿Cuántas jaulas/camas? ¿Cuántos pacientes/día en hospitalización?
3. ¿Hacen cirugía? ¿Qué tipo (rutina vs. especializada)?
4. ¿Hacen laboratorio in-house o sólo envían a externo?
5. ¿Tienen imágenes (Rx, eco)? ¿Quieren guardarlas en el sistema?
6. ¿Hacen pensionado/grooming?
7. ¿Cómo cobran hoy? ¿Pre o post consulta? ¿Manejan crédito a clientes habituales?
8. ¿Cómo se comunican con el dueño hoy? (WhatsApp manual, llamadas)
9. ¿Tienen sistema actual? Si sí, ¿qué los está obligando a cambiar?
10. ¿Cuántas mascotas activas estimadas en la base? (importante para dimensionar BD)

Este input puede reordenar los sprints 5–12, no los 0–4. Lo trabajamos cuando esté el módulo de clientes y mascotas.

---

## D10. Comunicación de pruebas / desarrollo

**Decisión**: durante el desarrollo, todos los WhatsApp/email/SMS se envían a una "blocklist" — sólo a números/emails de prueba del usuario y del equipo. En producción se levanta el bloqueo.

Esto se controla con env `SAFE_RECIPIENTS_ONLY=true` (default) y `SAFE_RECIPIENTS=+51999XXXXXX,...`.
