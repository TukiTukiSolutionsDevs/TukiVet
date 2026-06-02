# Propuesta — SaaS Veterinario "TukiVet" (working name)

Última actualización: 2026-06-01
Estado: **borrador para aprobación**

---

## 1. Visión

Un SaaS de gestión integral para clínicas veterinarias del Perú, cloud-first, multi-tenant, con **facturación electrónica SUNAT nativa**, **WhatsApp Business** para recordatorios y comunicación, **Yape/Plin/Culqi** como métodos de pago, y UX moderna pensada para que un veterinario complete un SOAP en <3 minutos.

**Target inicial**: clínica veterinaria pequeña/mediana en Lima (1–5 veterinarios, hospitalización limitada). Escalable a multi-sede y hospitales medianos en V2.

**Modelo de negocio**: SaaS con plan por sede/usuario + comisión sobre comprobantes electrónicos emitidos sobre cierto umbral, opcional plan "transaccional" para clínicas chicas.

---

## 2. Stakeholders y roles

| Rol | Acceso clave | Comentario |
|---|---|---|
| **Super-admin (operador SaaS)** | Multi-tenant, billing, métricas globales | Tú (operador del SaaS) |
| **Owner de clínica** | Tenant completo: usuarios, finanzas, config | Dueño/a de la veterinaria |
| **Veterinario** | Historia clínica, prescripciones, cirugía, kardex | Vet titular |
| **Asistente/técnico vet.** | Signos vitales, kardex (ejecución), inventario | Personal técnico |
| **Recepción** | Citas, clientes, cobros, caja | Front desk |
| **Contador** | Reportes financieros, export contable, comprobantes | Externo o interno |
| **Cliente (tutor)** | Portal: sus mascotas, historial, agenda, pagos | Dueño de la mascota |

---

## 3. Alcance MVP (Sprint 1–10) vs. V2 vs. V3

### MVP (lo que vamos a construir primero, 1 tenant + multi-tenant ready)

**Núcleo clínico**
- [x] Multi-tenancy (organización = clínica, sedes opcional)
- [x] RBAC (los 7 roles definidos)
- [x] Auth (email+password, magic link al WhatsApp, sesiones, recuperación)
- [x] Gestión de clientes (DNI/RUC con validación SUNAT vía API gratuita)
- [x] Gestión de mascotas (multi-pet por cliente, microchip opcional)
- [x] Búsqueda global ultra-rápida (cliente, mascota, chip, teléfono, RUC)
- [x] Historia clínica con SOAP + plantillas
- [x] Signos vitales y peso histórico (con gráfica)
- [x] Lista de problemas (POMR)
- [x] Adjuntos al expediente (imágenes, PDFs)
- [x] Vacunación con protocolo por especie + certificado PDF + recordatorios
- [x] Recetas con cálculo de dosis por peso + dispensación
- [x] Agendamiento por recurso (vet/sala) con calendario
- [x] Recordatorios automáticos (WhatsApp + email)

**Operación**
- [x] Inventario con lotes, vencimientos, alertas, FIFO
- [x] POS / facturación con líneas (servicios + productos)
- [x] **Emisión de comprobantes electrónicos SUNAT** vía Nubefact (boleta, factura, NC, ND)
- [x] Caja diaria (apertura/cierre, conciliación)
- [x] **Pagos online**: Culqi (tarjeta + Yape + Plin) — link de pago
- [x] Múltiples métodos: efectivo, tarjeta presencial, Yape/Plin, transferencia, crédito

**Cliente y comunicación**
- [x] Portal del cliente (web responsive)
- [x] WhatsApp Business para recordatorios (Twilio)
- [x] Plantillas HSM: confirmación cita, recordatorio vacuna, NPS, factura

**Backoffice**
- [x] Dashboard de KPIs (10 KPIs definidos en INVESTIGACION.md §2.4)
- [x] Reportes: ingresos por servicio/producto/vet, márgenes, vacunas al día
- [x] Auditoría completa (quién modificó qué y cuándo)
- [x] Export contable (Excel + formato PLE SUNAT)

**Compliance**
- [x] Consentimientos digitales (Ley 29733 + uso clínico)
- [x] Derechos ARCO (endpoints de descarga, rectificación, eliminación)
- [x] Registro de banco de datos (documento a generar para ANPD)
- [x] Backups automáticos cifrados

### V2 (post-MVP, 3–6 meses después)

- Hospitalización completa con **flowboard** y **kardex**
- Cirugía con consentimiento + hoja anestésica + hoja quirúrgica
- Laboratorio: pedidos + captura de resultados
- Multi-sede (1 organización → N sedes con consolidación)
- Wellness plans (suscripciones mensuales)
- AI SOAP dictation (LLM con audio)
- Mobile app del cliente (React Native) — nativa
- Telemedicina (video con VCPR docs)
- Boarding / pensión
- Grooming / peluquería

### V3 (futuro)

- DICOM viewer integrado
- Integración directa con IDEXX / Antech labs in-house
- Marketplace de productos para mascotas (e-commerce dentro del portal)
- Pharmacy delivery
- API pública / marketplace de integraciones
- App móvil del vet en campo

---

## 4. Arquitectura técnica

### 4.1 Stack propuesto (reutilizable de TukiJuris)

**Backend**
- **Python 3.12** + **FastAPI** — async, fast, type-hints, ecosistema maduro
- **PostgreSQL 16** — base relacional, JSONB para campos flexibles, full-text search nativo
- **SQLAlchemy 2.x** + **Alembic** — ORM async + migraciones
- **Redis 7** — cache, rate limiting, colas de tareas
- **Celery** o **ARQ** — colas async para tareas pesadas (envío WhatsApp, generación PDF, sync SUNAT)
- **Pydantic v2** — validación y serialización
- **MinIO / S3-compatible** — object storage (imágenes, PDFs, XMLs SUNAT)

**Frontend (V2, no ahora)**
- **Next.js 15** + **TypeScript** — para landing pública + portal cliente + intranet
- **Tailwind CSS** + **shadcn/ui** — sistema de diseño
- Cloud Design generará el `DESIGN.md` para el frontend

**Infraestructura**
- **Docker** + **docker-compose** local
- Despliegue: contenedores en VPS (Hetzner / Digital Ocean) o **Fly.io** / **Render** para empezar
- **GitHub Actions** para CI/CD
- **Sentry** para observabilidad de errores
- **OpenTelemetry** opcional para tracing

**Servicios externos**
- **Nubefact** OSE para facturación electrónica SUNAT (~S/70/mes)
- **Culqi** pasarela de pagos (tarjeta + Yape + Plin)
- **Twilio WhatsApp Business API**
- **Resend** o **SES** para email transaccional
- **SUNAT consulta RUC/DNI** (API gratuita gov.pe + RENIEC vía intermediario para validación de DNI)

### 4.2 Multi-tenancy

Estrategia **schema-per-tenant** descartada (operación costosa con muchos tenants). Estrategia elegida:

- **Single schema + tenant_id en cada tabla**
- Middleware de FastAPI inyecta `tenant_id` actual desde JWT/sesión
- **Row Level Security (RLS) de Postgres** activado como segunda barrera
- Cada query async tiene contexto de tenant — imposible "olvidarse" del filtro
- Asset isolation: prefijo `tenant_{id}/` en S3

### 4.3 Estructura del repo

```
Veterinaria/
├── docs/
│   ├── INVESTIGACION.md          (este es el marco)
│   ├── PROPUESTA.md              (este archivo)
│   ├── ROADMAP.md                (plan de sprints)
│   ├── ARQUITECTURA.md           (detalle técnico — V1 después de aprobar)
│   ├── MODELO_DATOS.md           (entidades y relaciones — V1 después)
│   └── DESIGN.md                 (para Stitch / Cloud Design — al final del backend)
├── apps/
│   ├── api/                      ← backend FastAPI (lo que construimos primero)
│   │   ├── app/
│   │   │   ├── api/              (routers HTTP)
│   │   │   ├── core/             (config, security, deps)
│   │   │   ├── models/           (SQLAlchemy)
│   │   │   ├── schemas/          (Pydantic)
│   │   │   ├── services/         (lógica de negocio)
│   │   │   ├── integrations/     (Nubefact, Culqi, Twilio)
│   │   │   └── workers/          (Celery/ARQ tasks)
│   │   ├── alembic/
│   │   ├── tests/                (pytest)
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   └── web/                      ← Next.js (después de DESIGN.md)
├── infra/
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── .env.example
├── .github/workflows/
└── README.md
```

### 4.4 Decisiones técnicas clave

- **Async everywhere**: FastAPI + SQLAlchemy async + httpx async. Latencia baja con muchos tenants.
- **Event-driven dentro del backend**: dominio publica eventos (`EncuentroCerrado`, `ComprobanteEmitido`, `VacunaRegistrada`) → handlers asíncronos disparan side-effects (WhatsApp, recordatorios, recalcular KPIs). Usamos **dispatcher in-process** con tabla `outbox` para garantía at-least-once.
- **Idempotencia**: todos los endpoints de creación aceptan header `Idempotency-Key`.
- **Versionado de API**: `/api/v1/...` desde el día 1.
- **Auditoría**: tabla `audit_log` central + triggers Postgres para tablas críticas (historia clínica, comprobantes).
- **Inmutabilidad clínica**: la historia clínica nunca se borra, sólo se "anula con nota". Soft-delete con motivo.
- **Documentos firmados (Nubefact)**: XML + CDR se persisten en S3 con hash SHA-256 en BD.

### 4.5 Seguridad

- HTTPS forzado.
- JWT con refresh tokens (cortos, 15min/7d).
- Rate limiting en Redis (por IP + por tenant).
- Hashing de password con **argon2id**.
- CSP + headers de seguridad.
- Inputs validados con Pydantic estricto.
- SQL via ORM (sin string concatenation).
- Auditoría de accesos a historia clínica.
- Cifrado at-rest (Postgres + S3).
- Cifrado de campos sensibles (DNI, teléfono, email) opcional con `pgcrypto`.

### 4.6 Testing

- **pytest** + **pytest-asyncio** + **httpx AsyncClient** para tests de integración.
- **factory-boy** para fixtures.
- Cobertura objetivo: ≥80% en `services/` y ≥70% en `api/`.
- Tests por capa:
  - Unit (servicios puros, sin DB)
  - Integration (con DB de prueba, container Postgres en CI)
  - Contract (verificar contrato con Nubefact / Culqi en sandbox)
  - E2E mínimo (flujo "nuevo paciente → consulta → boleta → pago")

---

## 5. Modelo de datos (alto nivel)

Detalle completo en `MODELO_DATOS.md` (se escribirá tras aprobación). Entidades principales:

### Tenant / org
- `organization` (clínica)
- `branch` (sede; 1 org → N sedes)
- `user` (usuario del sistema)
- `role`, `user_role`, `permission`
- `audit_log`

### Clientes y pacientes
- `customer` (tutor / dueño) — DNI/RUC, teléfono, email, dirección, consentimientos
- `pet` (mascota) — especie, raza, sexo, fecha nacimiento, microchip, peso histórico (JSONB)
- `pet_owner` (M:N customer ↔ pet con rol: dueño principal, contacto secundario)

### Historia clínica
- `encounter` (visita / encuentro clínico) — pet, vet, fecha, motivo, status
- `soap_note` (1:1 con encounter) — subjetivo, objetivo, assessment, plan (JSONB estructurado)
- `vital_sign` (signos vitales por encuentro)
- `problem` (lista de problemas POMR)
- `attachment` (archivos del expediente)

### Vacunas, recetas, lab
- `vaccine_catalog`, `vaccine_administration` (con lote, fecha, próximo refuerzo)
- `medication_catalog`, `prescription`, `prescription_item`
- `lab_order`, `lab_result`

### Inventario
- `product` (catálogo: medicamento, vacuna, alimento, accesorio)
- `lot` (lote con vencimiento)
- `inventory_movement` (compra, venta, ajuste, merma)
- `supplier`

### Comercial
- `appointment` (cita)
- `service_catalog` (servicios facturables: consulta, vacuna aplicada, cirugía, etc.)
- `order` (ticket / orden de venta)
- `order_item`
- `payment`
- `cash_session` (apertura/cierre de caja)

### SUNAT
- `electronic_document` (boleta / factura / NC / ND) — con XML firmado, CDR, status
- `customer_fiscal` (RUC / DNI con razón social)

### Comunicación
- `notification` (WhatsApp / email / SMS — log de envíos)
- `template` (plantillas HSM aprobadas + de email)
- `consent` (consentimientos firmados con timestamp y hash)

---

## 6. Endpoints / API (alto nivel)

Bajo `/api/v1/`:

- **Auth**: `/auth/login`, `/auth/refresh`, `/auth/magic-link/whatsapp`, `/auth/me`, `/auth/logout`
- **Org**: `/org`, `/org/branches`, `/org/users`, `/org/roles`
- **Clientes**: `/customers`, `/customers/{id}`, `/customers/{id}/pets`, `/customers/validate-doc` (DNI/RUC)
- **Mascotas**: `/pets/{id}`, `/pets/{id}/history`, `/pets/{id}/weights`, `/pets/{id}/vaccines`
- **Encuentros**: `/encounters`, `/encounters/{id}/soap`, `/encounters/{id}/close`
- **Vacunas**: `/vaccines/catalog`, `/vaccines/{id}/certificate.pdf`
- **Recetas**: `/prescriptions`
- **Inventario**: `/inventory/products`, `/inventory/lots`, `/inventory/movements`
- **Citas**: `/appointments`, `/appointments/availability`
- **Órdenes/POS**: `/orders`, `/orders/{id}/payments`, `/orders/{id}/invoice` (emite SUNAT)
- **Comprobantes**: `/documents/{id}/xml`, `/documents/{id}/pdf`, `/documents/{id}/cdr`
- **Caja**: `/cash-sessions`
- **KPIs**: `/reports/kpis`, `/reports/financial`, `/reports/vaccines-due`
- **Portal cliente**: `/portal/me`, `/portal/pets`, `/portal/appointments`, `/portal/payments`
- **Webhooks externos**: `/webhooks/culqi`, `/webhooks/nubefact`, `/webhooks/twilio`
- **Admin (super-admin)**: `/admin/tenants`, `/admin/billing`

---

## 7. Próximos pasos

Una vez aprobada esta propuesta:

1. Escribir `ARQUITECTURA.md` (detalle: capas, patrones, ADRs)
2. Escribir `MODELO_DATOS.md` (esquema completo con DDL referencial)
3. Definir `ROADMAP.md` con sprints concretos
4. Iniciar **Sprint 0**: bootstrap del repo, Docker, CI, esqueleto FastAPI + Alembic + Postgres + auth básico
5. Sprint 1+: módulos por orden de dependencia (ver ROADMAP)

---

## 8. Preguntas para resolver antes de codear

1. **¿Multi-tenant desde MVP o single-tenant primero?**
   - **Recomendación**: multi-tenant ready (esquema con `tenant_id`), arrancando con 1 cliente real. Refactorizar después es carísimo.
2. **¿Stack confirmado FastAPI + Postgres?** Coincide con TukiJuris (reutilizas conocimiento, patrones, despliegue).
3. **¿Hay clínica piloto / cliente 0?** Define velocidad y decisiones (qué módulos primero).
4. **¿Facturación electrónica SUNAT desde MVP?** Recomendación: **sí**, Nubefact desde semana 4.
5. **¿Pagos online (Culqi) desde MVP?** Recomendación: **sí**, semana 6.
6. **¿WhatsApp Business desde MVP?** Recomendación: **sí**, semana 8 (necesita verificación Meta + plantillas aprobadas, toma 2–4 semanas).
7. **¿Branding / nombre del producto?** Working name "TukiVet" (encaja con TukiJuris/TukiTuki Solutions). Confirmar.
8. **¿Hosting elegido?** Hetzner VPS, Fly.io, Render, AWS, GCP — define costos y latencia.
9. **¿Quién será el dueño del producto a nivel comercial?** ¿Tú directo, o estás construyendo para un cliente externo?
