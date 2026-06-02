# Roadmap — Backend Veterinaria SaaS

Última actualización: 2026-06-01
Estado: **borrador para aprobación**

Plan por sprints quincenales. Cada sprint termina con: código en `main`, tests pasando, PR documentado, demo funcional (cuando aplica).

---

## Sprint 0 — Bootstrap (1 semana)

**Objetivo**: repo funcional, esqueleto, CI, contenedores corriendo localmente.

- [ ] Inicializar repo git, estructura `apps/api`, `docs/`, `infra/`
- [ ] `docker-compose.yml` con Postgres 16, Redis 7, MinIO
- [ ] FastAPI hello world + healthcheck
- [ ] Alembic configurado + primera migración (tabla `health`)
- [ ] `pyproject.toml` con deps base (fastapi, sqlalchemy, alembic, pydantic, httpx, pytest)
- [ ] GitHub Actions: lint (ruff), type-check (mypy), tests (pytest)
- [ ] `.env.example` + carga de config con pydantic-settings
- [ ] README con quickstart
- [ ] Logging estructurado JSON (uvicorn + loguru o structlog)

**Entrega**: `docker compose up` levanta todo, `curl /health` responde, `pytest` corre.

---

## Sprint 1 — Identity & Multi-tenant (2 semanas)

**Objetivo**: usuarios, organizaciones, autenticación, RBAC, RLS Postgres.

- [ ] Modelo: `organization`, `branch`, `user`, `role`, `user_role`, `permission`
- [ ] Migración con seed: roles default (owner, vet, tech, reception, accountant, customer)
- [ ] Auth endpoints: `/auth/register-org`, `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout`
- [ ] JWT con refresh tokens (access 15m, refresh 7d)
- [ ] Argon2id hashing
- [ ] Middleware: extrae `tenant_id` del JWT, inyecta en request context
- [ ] Decorator `@require_role("vet", "owner")` + `@require_permission("encounters:write")`
- [ ] **Row Level Security** en Postgres: política `current_setting('app.tenant_id')`
- [ ] Tabla `audit_log` + helper para auditar acciones
- [ ] Tests: 80% cobertura en servicio de auth + tests E2E del flujo

**Entrega**: puedo registrar una clínica, crear usuarios con roles, login, los tokens funcionan, RLS bloquea cross-tenant.

---

## Sprint 2 — Clientes y Pacientes (2 semanas)

**Objetivo**: gestión completa de tutores y mascotas con búsqueda rápida.

- [ ] Modelos: `customer`, `pet`, `pet_owner` (M:N)
- [ ] CRUD clientes con validación de DNI/RUC (formato + dígito verificador)
- [ ] Endpoint `/customers/validate-doc` consulta API gratuita gov.pe
- [ ] CRUD mascotas + peso histórico (JSONB serie temporal)
- [ ] Búsqueda full-text con Postgres `tsvector`: nombre cliente, mascota, teléfono, microchip
- [ ] Endpoint `/search?q=...` ultra-rápido (<50ms)
- [ ] Soft-delete con `deleted_at`
- [ ] Auditoría de cambios sensibles
- [ ] Tests E2E

**Entrega**: registro un cliente con su mascota, los busco por chip, valido un RUC contra SUNAT.

---

## Sprint 3 — Historia Clínica + SOAP (2 semanas)

**Objetivo**: el módulo más crítico. SOAP, signos vitales, lista de problemas.

- [ ] Modelos: `encounter`, `soap_note`, `vital_sign`, `problem`, `attachment`
- [ ] CRUD encuentro con estados: `open → in_progress → closed → amended`
- [ ] Endpoint para signos vitales con timestamp
- [ ] SOAP estructurado (JSONB) + plantillas por tipo de consulta
- [ ] Adjuntos: upload a MinIO/S3, scan con ClamAV opcional, tipos permitidos
- [ ] Generación PDF del encuentro (WeasyPrint o ReportLab)
- [ ] Inmutabilidad: SOAP cerrado no se modifica, sólo se "enmienda" con razón firmada
- [ ] Auditoría completa
- [ ] Tests

**Entrega**: vet abre encuentro, llena SOAP, lo cierra, descarga PDF.

---

## Sprint 4 — Vacunas + Catálogos (1 semana)

**Objetivo**: protocolos de vacunación y certificados.

- [ ] Modelos: `vaccine_catalog`, `vaccine_administration`, `species`, `breed`
- [ ] Seed: catálogo SENASA-compatible (rabia, parvo, triple felina, etc.)
- [ ] Protocolo por especie/edad (puppy schedule, adult schedule)
- [ ] Endpoint para registrar vacuna aplicada (con lote + sitio + próxima dosis calculada)
- [ ] Generación de certificado de vacunación PDF
- [ ] Listar vacunas vencidas / próximas a vencer (KPI)
- [ ] Tests

**Entrega**: registro una vacuna, descargo certificado PDF, listo vacunas vencidas.

---

## Sprint 5 — Inventario (2 semanas)

**Objetivo**: control de stock con lotes y vencimientos.

- [ ] Modelos: `product`, `lot`, `inventory_movement`, `supplier`
- [ ] CRUD productos con categorías (medicamento, vacuna, alimento, accesorio, insumo)
- [ ] Movimientos: compra (con factura del proveedor), venta (auto desde ticket), ajuste, merma, transferencia
- [ ] Costo promedio ponderado
- [ ] FIFO para dispensación
- [ ] Alertas: stock bajo, vencimiento ≤60d/30d/7d, vencidos
- [ ] Reorder point sugerido
- [ ] Tests

**Entrega**: registro compras, vendo productos, el stock baja, recibo alerta de vencimiento.

---

## Sprint 6 — Citas + Calendario (1 semana)

**Objetivo**: agendamiento por recurso.

- [ ] Modelos: `appointment`, `appointment_type`, `resource` (vet/sala/equipo)
- [ ] Calendar API: disponibilidad por recurso/día/hora
- [ ] Bloqueos (cierre, almuerzo, vacaciones)
- [ ] Endpoint para crear cita (con validación de disponibilidad)
- [ ] No-show tracking
- [ ] Tests

**Entrega**: pido disponibilidad de un vet, agendo una cita, no permite doble booking.

---

## Sprint 7 — Recetas + Dispensación (1 semana)

**Objetivo**: prescripciones con cálculo automático y descuento de stock.

- [ ] Modelo: `prescription`, `prescription_item`
- [ ] Cálculo de dosis por peso (mg/kg → ml o tabletas)
- [ ] Dispensación: descuenta stock del lote (FIFO), marca como entregado
- [ ] Registro especial para sustancias controladas (bitácora con testigo)
- [ ] PDF de la receta
- [ ] Tests

**Entrega**: prescribo un antibiótico, calculo dosis para 25kg, dispenso desde el lote.

---

## Sprint 8 — POS + Órdenes (2 semanas)

**Objetivo**: ticket de venta con servicios y productos.

- [ ] Modelos: `service_catalog`, `order`, `order_item`, `payment`, `cash_session`
- [ ] CRUD servicios con precio + IGV
- [ ] Crear orden con líneas mixtas (servicio + producto)
- [ ] Descuentos por línea y por total
- [ ] Métodos de pago: efectivo, tarjeta presencial, transferencia, crédito
- [ ] Apertura/cierre de caja por usuario y turno
- [ ] Reporte cuadre de caja
- [ ] Auto-cargo: cuando un encuentro se cierra, propone líneas (consulta + vacuna + receta)
- [ ] Tests

**Entrega**: armo un ticket con 1 consulta + 1 vacuna aplicada + 1 receta dispensada, cobro en efectivo, cierro caja.

---

## Sprint 9 — Facturación Electrónica SUNAT (2 semanas) ⚠️ CRÍTICO

**Objetivo**: integración Nubefact y emisión de comprobantes UBL 2.1.

- [ ] Modelo: `electronic_document`, `customer_fiscal`
- [ ] Cliente HTTP a Nubefact (sandbox + producción)
- [ ] Servicio `EmitirBoleta`, `EmitirFactura`, `EmitirNotaCredito`, `EmitirNotaDebito`
- [ ] Persistir XML firmado + CDR + hash SHA-256 en S3
- [ ] Manejo de estados: pendiente, aceptado, rechazado, anulado
- [ ] Reintentos asíncronos en cola para envíos fallidos
- [ ] Webhook desde Nubefact para confirmaciones tardías
- [ ] Generación de PDF del comprobante
- [ ] Endpoint público de consulta de comprobante por QR
- [ ] Tests de contrato contra sandbox

**Entrega**: pago una orden, se emite boleta SUNAT, recibo CDR, descargo PDF.

---

## Sprint 10 — Pagos Online (Culqi) (1 semana)

**Objetivo**: cobros online con tarjeta y Yape/Plin.

- [ ] Integración Culqi: SDK Python + checkout
- [ ] Crear cargo (PaymentIntent) desde orden pendiente
- [ ] Webhook de confirmación de Culqi
- [ ] Vincular pago confirmado a la orden, auto-emisión de comprobante
- [ ] Reembolsos
- [ ] Idempotencia
- [ ] Tests

**Entrega**: genero link de pago, el cliente paga con Yape, la orden se cierra, se emite boleta.

---

## Sprint 11 — WhatsApp Recordatorios (1 semana)

**Objetivo**: comunicación automatizada vía Twilio WhatsApp.

- [ ] Integración Twilio WhatsApp Business API
- [ ] Modelos: `notification`, `template`
- [ ] Cola async para envíos (ARQ/Celery)
- [ ] Plantillas: confirmación cita, recordatorio 24h, recordatorio vacuna vencida, NPS, recibo
- [ ] Worker periódico: cada noche revisa vacunas vencidas → encola WhatsApp
- [ ] Opt-out por cliente
- [ ] Tests

**Entrega**: cita programada → 24h antes el cliente recibe WhatsApp con confirmación.

---

## Sprint 12 — Portal del Cliente (1 semana)

**Objetivo**: API del portal cliente (web frontend va después).

- [ ] Auth cliente: magic link al WhatsApp + clave opcional
- [ ] Endpoints: `/portal/me`, `/portal/pets`, `/portal/pets/{id}/history`, `/portal/appointments`, `/portal/payments-pending`
- [ ] Self-service: actualizar datos, descargar certificados, pagar saldos
- [ ] Derechos ARCO: descargar mis datos, solicitar eliminación
- [ ] Tests

**Entrega**: el cliente entra al portal, ve sus mascotas y su historial.

---

## Sprint 13 — Reportes y KPIs (1 semana)

**Objetivo**: dashboards y exports.

- [ ] Endpoint `/reports/kpis` con los 10 KPIs definidos
- [ ] Cache con Redis (refresh cada 1h)
- [ ] Reporte financiero por rango de fechas (ingresos, egresos, margen)
- [ ] Export Excel + formato PLE SUNAT
- [ ] Tests

**Entrega**: dashboard responde en <500ms, contador exporta Excel listo para SUNAT.

---

## Sprint 14 — Cumplimiento Ley 29733 + Hardening (1 semana)

**Objetivo**: cierre legal y security review.

- [ ] Endpoints ARCO (acceso, rectificación, cancelación, oposición)
- [ ] Consentimientos firmados con hash + timestamp en BD
- [ ] Documento generador del Registro de Banco de Datos para ANPD
- [ ] Penetration test interno (OWASP top 10)
- [ ] Backups cifrados automáticos a S3
- [ ] Plan de continuidad documentado
- [ ] Cifrado de columnas sensibles con pgcrypto

**Entrega**: cumplimiento Ley 29733 cerrado, backup probado, registro ANPD generado.

---

## Sprint 15 — Pulido + DESIGN.md (1 semana)

**Objetivo**: cierre del backend MVP y handoff al frontend.

- [ ] Doc OpenAPI revisada y limpia
- [ ] README final del backend
- [ ] **`DESIGN.md`** generado: descripción de pantallas, flujos, componentes que el frontend debe tener (insumo para Cloud Design / Stitch)
- [ ] Postman / Insomnia collection exportada
- [ ] Smoke tests E2E del flujo completo end-to-end (registro → consulta → boleta → WhatsApp)
- [ ] Métricas de performance documentadas

**Entrega**: backend MVP listo para producción, DESIGN.md listo para que generes el frontend.

---

## Resumen de fechas (estimado, ritmo solo)

| Sprint | Semanas | Acumulado |
|---|---|---|
| 0 — Bootstrap | 1 | 1 |
| 1 — Identity + Multi-tenant | 2 | 3 |
| 2 — Clientes y pacientes | 2 | 5 |
| 3 — Historia clínica + SOAP | 2 | 7 |
| 4 — Vacunas | 1 | 8 |
| 5 — Inventario | 2 | 10 |
| 6 — Citas | 1 | 11 |
| 7 — Recetas | 1 | 12 |
| 8 — POS / Órdenes | 2 | 14 |
| 9 — SUNAT (crítico) | 2 | 16 |
| 10 — Culqi pagos | 1 | 17 |
| 11 — WhatsApp | 1 | 18 |
| 12 — Portal cliente | 1 | 19 |
| 13 — Reportes / KPIs | 1 | 20 |
| 14 — Ley 29733 + Hardening | 1 | 21 |
| 15 — Pulido + DESIGN.md | 1 | 22 |

**Total MVP backend**: ~22 semanas calendar (~5 meses) con dedicación full-time individual. Con AI assistance puede reducirse 30–40%.

---

## Criterios de salida de MVP

Backend MVP se considera **completo** cuando:

1. Una clínica real puede operar end-to-end: cliente nuevo → consulta → SOAP cerrado → factura emitida a SUNAT con CDR → pago Culqi → recordatorio WhatsApp.
2. ≥80% cobertura en `services/`, ≥70% en `api/`.
3. OpenAPI documentado.
4. Hardening security review pasado.
5. Backups probados (restauración exitosa).
6. Cumplimiento Ley 29733 cerrado (consentimientos, ARCO, registro ANPD).
7. `DESIGN.md` listo para Cloud Design.
