# Cómo continuar TukiVet en una sesión nueva

Este documento te da el **prompt template** para arrancar cualquier sesión
nueva y retomar el trabajo sin perder contexto, más el estado actualizado del
roadmap.

Última actualización: **2026-06-04** — Sprint F6 (Comprobantes + Agenda) cerrado.

---

## Estado actual (de un vistazo)

| Fase | Estado | Commit clave |
|---|---|---|
| Backend MVP (Sprint 0-12) | ✅ COMPLETA | `9253a8c` |
| V0 — Smoke + framework hardening | ✅ COMPLETA | `022e735` |
| F0 — Bootstrap Next.js + auth + Dashboard | ✅ COMPLETA | `5eb418d` |
| F1 — Landing pública + Register wizard | ✅ COMPLETA | `c0cc475` |
| F2 — Pacientes (lista + detalle con tabs) | ✅ COMPLETA | `f238a91` |
| F3 — Encuentros + SOAP editor (crítica) | ✅ COMPLETA | `4ac50e9` |
| F4 — Vacunas + Recetas | ✅ COMPLETA | `0abe8cb` |
| F5 — Inventario + POS + Caja | ✅ COMPLETA | _commit previo_ |
| **F6 — Comprobantes + Agenda** | ✅ COMPLETA | _este sprint_ |
| F7 — Reportes + Comunicaciones + Config | ⏳ siguiente | — |
| F7 — Reportes + Comunicaciones + Config | ⏳ | — |
| F8 — Portal cliente | ⏳ | — |
| F9 — QA + a11y + responsive | ⏳ | — |
| V1 — Production hardening backend | ⏳ paralelo | — |
| D0-D3 — Deploy VPS | ⏳ | — |

Backend: 141/141 tests, ~90 endpoints. Frontend: landing + auth + dashboard +
Pacientes + Encuentros + Vacunas + Recetas + Inventario + POS y caja +
**Comprobantes (lista + drawer con timeline + void) + Agenda (calendario semanal
+ nueva cita + estados)** + 5 placeholders.

---

## Prompt template — copiar y pegar

Reemplaza `[MI OBJETIVO HOY ES: ...]` con lo que querés hacer.

```markdown
Estoy trabajando en TukiVet, un SaaS de gestión veterinaria para Perú.
Soy Jaime Andrés (TukiTuki Solutions SAC, RUC 20613614509).

## Contexto del proyecto

- **Repo**: `/Users/soulkin/Documents/Veterinaria`
- **Estado**: Backend MVP + V0 + Sprint F0 + Sprint F1 frontend cerrados
  (~19 commits en `main`, 141/141 tests pasando, login + register + dashboard
  conectados al backend real).
- **Modelo**: single-tenant promovible (org + branch como entidades; sin RLS).

## Stack

**Backend** (puerto 8000):
- Python 3.12 · FastAPI 0.115 · SQLAlchemy 2.0 async · Alembic
- Postgres 16 · Redis 7 · MinIO · ARQ
- pydantic v2 · argon2-cffi · pyjwt · python-ulid · structlog

**Frontend** (`apps/web`, puerto 3000):
- Next.js 16.2 (App Router + Turbopack) · React 19 · TypeScript
- Tailwind v4 · shadcn/ui (Base UI flavor, slate base)
- @tanstack/react-query · next-themes · lucide-react · sonner
- Auth: tokenStore localStorage + AuthProvider + refresh rotation
- Estructura:
  - `src/app/page.tsx` — landing pública 8 secciones
  - `src/app/login/page.tsx` — login
  - `src/app/register/page.tsx` — wizard 3 pasos (org → sede → owner)
  - `src/app/(app)/<screen>/page.tsx` — pantallas autenticadas con shell
  - `src/app/(app)/pacientes/page.tsx` — lista con búsqueda + filtros
  - `src/app/(app)/pacientes/[petId]/page.tsx` — detalle con 6 tabs
  - `src/app/(app)/pacientes/_components/{new-patient-dialog,weight-chart}.tsx`
  - `src/app/(app)/encuentros/page.tsx` — lista con chips de filtro
  - `src/app/(app)/encuentros/[encounterId]/page.tsx` — bipartite SOAP
  - `src/app/(app)/encuentros/_components/{new-encounter-dialog,soap-editor,vital-signs-form,problems-list,amend-dialog}.tsx`
  - `src/app/(app)/inventario/page.tsx` — tabs (Productos / Alertas / Proveedores) + dialogs
  - `src/app/(app)/inventario/_components/{products-tab,alerts-tab,suppliers-tab,new-product-dialog,receive-lot-dialog,adjustment-dialog}.tsx`
  - `src/app/(app)/pos/page.tsx` — composer + totales + caja
  - `src/app/(app)/pos/_components/{cash-session-bar,customer-picker,item-picker,payment-dialog}.tsx`
  - `src/app/(app)/comprobantes/page.tsx` — tabla con filtro + paginación
  - `src/app/(app)/comprobantes/_components/invoice-detail-dialog.tsx` — timeline + void
  - `src/app/(app)/agenda/page.tsx` — week navigator + vet chips
  - `src/app/(app)/agenda/_components/{week-view,new-appointment-dialog,appointment-detail-dialog}.tsx`
  - `src/components/shell/{sidebar,topbar,nav,placeholder-screen}.tsx`
  - `src/components/ui/tabs.tsx` — Base UI tabs wrapper
  - `src/components/marketing/public-header.tsx`
  - `src/lib/{api,auth-api,customers-api,pets-api,encounters-api,inventory-api,orders-api,invoices-api,appointments-api,users-api,vaccines-api,prescriptions-api,reports-api,notifications-api,pagination,storage,format,env,utils}.ts`
  - `src/contexts/auth-context.tsx`

## Documentación canónica — LEE EN ESTE ORDEN antes de codear

1. `docs/DECISIONES.md` ← fuente única de verdad
2. `docs/ROADMAP.md` — qué está hecho, qué sigue
3. `docs/ARQUITECTURA.md` — 12 ADRs y patrones backend
4. `docs/MODELO_DATOS.md` — esquema BD
5. `docs/DESIGN.md` — handoff para frontend (14 screens + tokens)
6. `docs/LEY_29733.md` — cumplimiento ANPD

## Patrones a respetar

**Backend:**
- Modelos: ULID PK str(26), `TimestampMixin`, soft-delete `deleted_at`
- Schemas: Pydantic v2 `ORMModel` (from_attributes=True)
- Services: lógica async **sin commit** (el endpoint commitea)
- Routers: `Annotated + Depends + require_permission("dom:acción")`
- Migraciones: manuales (no autogenerate)
- Tests integration con fixture `auth_client`
- Adapter pattern para integraciones (port + real + mock)
- Audit log en cada acción mutante
- Dinero: `Decimal` siempre, nunca `float`

**Frontend:**
- Tokens del bundle Claude Design en `src/app/globals.css` (paleta teal
  `#2DB39A` primario, naranja `#F4A261` acento, Geist Sans, warm canvas)
- Cliente HTTP único: `src/lib/api.ts` con `apiFetch<T>(...)` + ApiError
- Tipos por dominio en `src/lib/<dominio>-api.ts` (auth, reports, …)
- Auth: `useAuth()` desde `@/contexts/auth-context`
- Botón shadcn de Base UI **no soporta `asChild`** — para enlaces usar
  `<Link className={buttonVariants({...})}>`
- Toasts con `import { toast } from "sonner"`
- React Query keys: `["dominio", "subresource", ...args]`
- Formularios: state local + zod inline o `validateStep()` puro
- Idiomas: UI en español Perú; código y comentarios en inglés
- Mobile-first; placeholders con `<PlaceholderScreen />`

## Setup local

```bash
# Backend
cd /Users/soulkin/Documents/Veterinaria
make up                 # postgres + redis + minio + api (8000)
make migrate            # 12 migraciones
make test               # 141/141 should pass
open http://localhost:8000/docs

# Frontend (terminal aparte)
cd apps/web
npm install             # si es la primera vez
npm run dev             # http://localhost:3000
```

## Credenciales demo

Backend single-tenant: solo acepta UNA organización. Si ya existe la demo,
NO podrás crear otra hasta limpiar la BD:

- Org: TukiVet Demo SAC · RUC `20612345678`
- Owner: `demo@tukivet.pe` · `DemoSecret-2026`
- Rol: `owner` (41 permisos)

Para resetear demo: `make down && docker volume rm tukivet_pgdata && make up && make migrate`.

## Documentos vivos en el repo

- `docs/ROADMAP.md` — fases y sprints con commit hashes
- `docs/CONTINUAR.md` — este archivo (prompt + estado)

## MI OBJETIVO HOY ES

[MI OBJETIVO HOY ES: <describe acá lo que querés hacer en esta sesión.
Sé específico: "Sprint F2 — pantalla de Pacientes con lista filtrable + búsqueda
global + detalle con tabs", "V1 hardening: integrar Sentry + rate-limit Redis",
etc.>]

## Reglas para ti, agente

- NO empezar a codear sin leer al menos `DECISIONES.md` y `ROADMAP.md`.
- Si vas a tocar BD: lee `MODELO_DATOS.md`, escribe migración manual,
  agrega tests integration.
- Si vas a integrar servicio externo: adapter pattern (port + real + mock).
- Si vas a sumar pantalla frontend: reusa shell `(app)/layout.tsx`,
  consume backend real (NO mocks), usa react-query, sigue tokens
  existentes de `globals.css`.
- Commitea por sprint con mensaje descriptivo. Una línea por feature/cambio.
- No hagas `git push` salvo que te lo pida explícitamente.
- Tests E2E backend en `tests/integration/test_*.py` con `auth_client`.
- Si encontrás un patrón que no calza con lo establecido, preguntame
  antes de cambiarlo globalmente.
- Si hay decisiones nuevas que tomar (producto, arquitectura),
  documentalas en `docs/DECISIONES.md` antes de codear.
- Trabajá en español Perú para mensajes de usuario; código y comentarios
  en inglés.
- Si los puertos chocan con TukiJuris (5432, 6379, 8000, 3000): detené
  TukiJuris primero con `docker compose down` en su repo.
```

---

## Tips para usar el prompt

- **Sé específico en "MI OBJETIVO HOY ES"**.
  - ❌ "Sigue con el proyecto"
  - ✅ "Sprint F2: Pantalla de Pacientes. Lista filtrable contra `GET /api/v1/pets` + búsqueda con `?q=` + paginación. Detalle con 6 tabs (Resumen, Encuentros, Vacunas, Recetas, Peso con gráfico, Documentos). Wizard 'Nuevo tutor + mascota' contra `POST /customers` y `POST /pets`. Smoke E2E manual."
  - ✅ "V1 backend hardening: Sentry SDK con `app.main:app`, rate-limit Redis real en `app/core/ratelimit.py`, `EXPLAIN ANALYZE` sobre queries críticas (búsqueda, due-list, KPIs), backup script `pg_dump` cifrado, `docs/OPERACIONES.md` con RTO/RPO."

- **Si retomás después de tiempo**, agregá:
  > Hace [N] semanas que no toco esto. Antes de codear, hacé `git log
  > --oneline -20`, `make test` y `cd apps/web && npm run build` para
  > verificar que nada se rompió con deps actualizadas.

- **Si sos un agente con memoria persistente** (Engram, Meridian),
  hacé `mem_search "tukivet"` para retomar contexto.

---

## Próximos sprints — orden recomendado

| Sprint | Foco | Endpoints clave | Esfuerzo |
|---|---|---|---|
| **F2** | Pacientes (lista + detalle con tabs) | `/customers`, `/pets`, `/pets/:id/weights` | medio |
| **F3** | Encuentros + SOAP editor bipartito (crítica) | `/encounters`, `/encounters/:id/soap`, `/vitals`, `/problems` | grande |
| **F4** | Vacunas + Recetas | `/vaccines`, `/prescriptions` | medio |
| **F5** | Inventario + POS + Caja | `/inventory/*`, `/orders`, `/payments`, `/cash-sessions` | grande |
| **F6** | Comprobantes + Agenda | `/invoices`, `/appointments`, `/rooms` | medio |
| **F7** | Reportes + Comunicaciones + Config | `/reports/*`, `/notifications/*`, `/organizations`, `/users` | medio |
| **F8** | Portal cliente | `/portal/*` | medio |
| **F9** | QA + a11y + responsive + Playwright E2E | — | chico |
| **V1** | Backend hardening (paralelo) | Sentry, rate-limit Redis real, EXPLAIN, backups | medio |
| **D0-D3** | Deploy a VPS | infra, CI/CD, observabilidad, piloto | grande |

---

## Pendientes operativos del usuario (Jaime)

1. **Trámite Meta WhatsApp Business** (2-4 semanas, bloquea WhatsApp prod).
2. **API key real de TukiFact** (sandbox para empezar).
3. **Entrevista con el amigo dueño de la veterinaria** — 10 preguntas en
   `docs/DECISIONES.md §D9` para validar workflow.
4. **Cumplimiento Ley 29733**: ver `docs/LEY_29733.md` checklist.
5. **Specs del VPS** cuando estés listo para Fase 4.
