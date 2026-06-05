# Roadmap — TukiVet

Última actualización: **2026-06-02**

Plan global del producto. Estado por sprint con commit hash. Sprints futuros sin fecha — orden sugerido.

---

## Fase 1 — Backend MVP ✅ COMPLETADA (13 sprints)

| # | Sprint | Estado | Commit |
|---|---|---|---|
| 0 | Bootstrap (FastAPI + Postgres + Docker + CI) | ✅ | `844f2f1` |
| 1 | Identity + RBAC (41 permisos, 5 roles, JWT, audit_log) | ✅ | `1d648e9` |
| 2 | Customers + Pets + DNI/RUC + búsqueda | ✅ | `9a84d2e` |
| 3 | Historia clínica + SOAP + signos vitales + POMR | ✅ | `194cf47` |
| 4 | Vacunas + administraciones + due-list | ✅ | `70ee302` |
| 5 | Inventario + lotes + FIFO + alertas | ✅ | `2193c12` |
| 6 | Citas + calendario por recurso | ✅ | `4e5fe32` |
| 7 | Recetas + dosis mg/kg + dispensación | ✅ | `e18377e` |
| 8 | POS + caja + pagos manuales + IGV SUNAT | ✅ | `7deeefe` |
| 9 | TukiFact integration (adapter + webhooks) | ✅ | `c82ae8d` |
| 10 | WhatsApp Twilio + plantillas + safe-mode | ✅ | `0c36909` |
| 11 | Portal cliente + ARCO Ley 29733 | ✅ | `17bc9f3` |
| 12 | Reports/KPIs + DESIGN.md + LEY_29733.md | ✅ | `9253a8c` |

**Métrica**: 129 archivos Python, 12 migraciones, ~90 endpoints, ~70 tests E2E.

---

## Fase 2 — Validación + Hardening (2 sprints) ⏳ EN CURSO

### Sprint V0 — Smoke test real ✅ COMPLETO (`022e735`)
**Objetivo**: levantar todo, correr los tests, arreglar lo que rompa.

- [x] `make up` exitoso, todos los contenedores healthy
- [x] `make migrate` aplica las 12 migraciones sin errores
- [x] `make test` con tukivet_test DB — **141/141 passing (100%)**
- [ ] Smoke E2E manual del flujo completo (pendiente — automatizable)
- [x] 12 bugs documentados y corregidos:
  - infra: alembic.ini bind mount, FK names >63 chars
  - config: pydantic-settings v2 `NoDecode` para listas separadas por coma
  - API: `response_model=None` en 4 endpoints 204
  - DB: `json_serializer` global con Decimal/date para JSONB
  - vaccine_service: relación in-memory para evitar `MissingGreenlet`
  - portal: 401 (no 404) en `consume_magic_link` cuando no hay org
  - tests: `loop_scope='session'` via hook (pytest-asyncio 0.24 quirk)
  - notifications endpoint seed-defaults: status_code 201
  - test helpers: service codes únicos via uuid; name min_length=2
  - test_inventory: comparar `Decimal` en vez de string formato

### Sprint V1 — Production hardening
- [ ] Sentry SDK integrado en `app/main.py`
- [ ] Rate limiting Redis-backed real (estructura en `app/core/ratelimit.py`)
- [ ] Performance review con `EXPLAIN ANALYZE` sobre queries críticas (búsqueda, due-list, KPIs)
- [ ] Índices adicionales según resultados
- [ ] Health check con verificación de Redis + S3
- [ ] Backup script (pg_dump cifrado a B2/S3-compatible)
- [ ] Smoke test post-restore documentado
- [ ] Documentar SLA, RTO, RPO en `docs/OPERACIONES.md`

**Entrega**: backend listo para conectar con TukiFact y Twilio reales.

---

## Fase 3 — Frontend MVP con Cloud Design (~9 sprints) ⏳ EN CURSO

Insumo: `docs/DESIGN.md` + bundle Claude Design (15 screens prototipadas).

### Sprint F0 — Design system + Next.js bootstrap ✅ COMPLETO (`5eb418d`)
- [x] `apps/web/` Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui
- [x] Design tokens del bundle → `globals.css` (paleta teal/naranja, Geist, warm canvas, dark mode)
- [x] Cliente HTTP con interceptor JWT + refresh rotation automático
- [x] Auth provider + tokenStore en localStorage + login/registerOrg/logout
- [x] Shell completo: Sidebar oscuro con 13 items + Topbar con theme toggle
- [x] Dashboard funcional contra `GET /api/v1/reports/kpis` (8 KPI cards reales)
- [x] 12 placeholders para el resto del NAV
- [x] Smoke E2E verificado: register-org → login → dashboard con KPIs reales

### Sprint F1 — Landing + Auth + Dashboard ✅ COMPLETO
- [x] Landing pública en `/` con 8 secciones (hero, banda, servicios, equipo, sobre, ubicación, testimonios, footer)
- [x] `PublicHeader` con CTAs dinámicos (Ingresar/Registrar o Ir a la app si auth)
- [x] `/register` wizard 3 pasos (Veterinaria → Sede → Owner) contra `POST /api/v1/auth/register-org`
- [x] `/login` y `/dashboard` ya cubiertos en F0

### Sprint F2 — Pacientes (tutores + mascotas) ✅ COMPLETO
- [x] Lista de pacientes con filtros (especie, microchip) + búsqueda con debounce + paginación + URL-sync de `?q=`
- [x] Detalle de mascota con 6 tabs (Resumen, Encuentros, Vacunas, Recetas, Peso, Documentos)
- [x] Tab Peso con gráfico SVG nativo + formulario inline para registrar nuevo peso
- [x] Wizard "Nuevo tutor + mascota" (2 pasos, selecciona o crea tutor → datos de mascota)
- [x] Topbar search wired: `⌘K` enfoca el input, Enter → `/pacientes?q=…`
- [x] UI primitive nueva: `Tabs` (Base UI flavor)

### Sprint F3 — Encuentros + SOAP editor (pantalla crítica)
- [ ] Lista de encuentros con filtros
- [ ] Editor SOAP bipartito (info contextual izq + S/O/A/P der)
- [ ] Auto-save cada 30s
- [ ] Signos vitales inline
- [ ] Cerrar + amend (con razón obligatoria)
- [ ] Atajos de teclado

### Sprint F4 — Vacunas + Recetas
- [ ] Catálogo de vacunas
- [ ] Registrar aplicación
- [ ] Due-list con "Enviar WhatsApp" inline
- [ ] Editor de recetas con calculadora de dosis embebida
- [ ] Dispense con testigo si controlado

### Sprint F5 — Inventario + POS + Caja
- [ ] Productos + Lotes + Movimientos
- [ ] Alertas low-stock + expiring
- [ ] POS bipartito (composer + cobro)
- [ ] Apertura/cierre de caja con conciliación visible

### Sprint F6 — Comprobantes + Agenda
- [ ] Lista de comprobantes con timeline de webhooks
- [ ] Anular comprobante
- [ ] Calendario semanal/día con drag-to-reschedule
- [ ] Modal de nueva cita con auto-complete

### Sprint F7 — Reportes + Comunicaciones + Config
- [ ] Dashboard de KPIs con gráficos (Recharts)
- [ ] Reporte financiero con export CSV/Excel
- [ ] Editor de plantillas WhatsApp con preview
- [ ] Configuración (org, usuarios, roles, integraciones)

### Sprint F8 — Portal cliente
- [ ] Login con magic link
- [ ] Dashboard de mascotas
- [ ] Historial + descarga de certificados
- [ ] Sección "Mi cuenta" con ARCO endpoints

### Sprint F9 — QA + a11y + responsive
- [ ] Lighthouse audit (objetivo: 90+ en accessibility)
- [ ] Responsive: desktop + tablet horizontal (iPad)
- [ ] Tests E2E con Playwright (al menos el flujo crítico)

---

## Fase 4 — Deploy a producción (~3 sprints)

### Sprint D0 — Infra del VPS
- [ ] Provisión del VPS (Docker, firewall, ufw, fail2ban)
- [ ] Caddy o Traefik con TLS automático
- [ ] DNS apuntando a `tukivet.com.pe` (o el dominio elegido)
- [ ] Secrets management (env vars, no en repo)

### Sprint D1 — CI/CD deploy
- [ ] GitHub Actions: build + push imágenes a GHCR
- [ ] SSH deploy con `docker compose pull && up -d`
- [ ] Smoke health-check post-deploy
- [ ] Rollback documentado

### Sprint D2 — Observabilidad + Backups
- [ ] Sentry, Loki o equivalente para logs
- [ ] Métricas Prometheus opcionales
- [ ] Backup diario probado (restauración exitosa)
- [ ] Runbook de incidentes en `docs/OPERACIONES.md`

### Sprint D3 — Onboarding cliente piloto
- [ ] Migrar datos del sistema actual (si tienen)
- [ ] Capacitar al equipo de la veterinaria (2-3 sesiones)
- [ ] Soporte cercano primeras 4 semanas
- [ ] Recolección de feedback con NPS interno

---

## Fase 5 — V2: Features avanzados (~10 sprints, opt-in según demanda del cliente)

| # | Feature | Valor | Esfuerzo |
|---|---|---|---|
| V2.1 | Hospitalización + flowboard digital en vivo (WebSocket) | Alto si la clínica hospitaliza | Alto |
| V2.2 | Cirugía: planificación + consentimiento informado firmado + hoja anestésica + hoja quirúrgica | Alto | Alto |
| V2.3 | Laboratorio: pedidos + captura de resultados + tendencias longitudinales | Alto | Medio |
| V2.4 | Imágenes: upload de Rx/eco a S3, viewer básico, anotaciones | Medio | Medio |
| V2.5 | Wellness plans (suscripciones mensuales con paquetes prepagados) | Alto (recurring revenue) | Alto |
| V2.6 | AI SOAP dictation: audio → transcript → SOAP estructurado con LLM | Muy diferencial | Medio |
| V2.7 | Multi-sede + RLS Postgres + consolidación | Alto si crece a 2+ sedes | Alto |
| V2.8 | Mobile app del cliente (React Native) | Medio (web responsive cubre) | Alto |
| V2.9 | Telemedicina: video + documentación VCPR | Medio post-COVID | Medio |
| V2.10 | Boarding / pensión + grooming | Si la veterinaria los ofrece | Medio |
| V2.11 | Culqi online (pagos por link) | Si quieren cobrar online | Bajo |

---

## Fase 6 — V3: Diferenciadores premium

| # | Feature | Comentario |
|---|---|---|
| V3.1 | DICOM viewer integrado | Para hospitales medianos |
| V3.2 | Integración IDEXX VetConnect / Antech labs | Caro pero diferencial |
| V3.3 | API pública + marketplace de integraciones | Habilita ecosistema |
| V3.4 | Pharmacy delivery integrado | Genera ARPU extra |
| V3.5 | App móvil del vet en campo (offline-first) | Casos especiales |
| V3.6 | Marketplace de productos para mascotas | E-commerce dentro del portal |
| V3.7 | Convertir a SaaS multi-tenant comercial | Si Jaime decide venderlo |

---

## Criterios de salida por fase

**Backend MVP** ✅ Cumplido.

**Frontend MVP** (Fase 3):
- [ ] Los 14 screens de DESIGN.md generados y funcionales.
- [ ] Lighthouse ≥90 accessibility.
- [ ] Flujo E2E completo manual: registro → consulta → SOAP → POS → comprobante → WhatsApp.

**Producción** (Fase 4):
- [ ] Sistema corriendo en VPS con TLS.
- [ ] Backups probados.
- [ ] 1 cliente piloto operando con datos reales.
- [ ] Ley 29733 cumplida (`docs/LEY_29733.md` checklist).

**V2**: opt-in por feature según demanda real del cliente piloto y prospects siguientes.

---

## Cómo retomar el trabajo en una sesión nueva

Ver `docs/CONTINUAR.md` — contiene el prompt template a usar.
