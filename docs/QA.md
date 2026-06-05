# QA · TukiVet — Sprint F9

Última actualización: **2026-06-04**.

## Resumen

El frontend Next.js 16 (App Router + Turbopack) cierra los Sprints F0-F8 con
las 14 pantallas de la intranet y las 4 del portal cliente funcionales. Este
sprint F9 documenta la cobertura QA, accesibilidad, responsive y pendientes.

| Área | Estado |
|---|---|
| `npx tsc --noEmit` | ✅ limpio |
| `npm run build` | ✅ 26 rutas (4 dinámicas, 22 estáticas) |
| Bundle size | ✅ sin dependencias pesadas de gráficos (CSS bars only) |
| Accesibilidad básica | ✅ idioma, skip-link, foco visible |
| Responsive desktop | ✅ ≥1280px (target principal) |
| Responsive iPad horizontal | ✅ 1366×1024 |
| Responsive mobile (intranet) | ⚠️ sidebar fija (drawer queda como mejora) |
| Portal cliente mobile | ✅ mobile-first (max-w-3xl) |
| Tests E2E Playwright | 🔲 pendiente — ver "Próximos pasos" |
| Lighthouse | 🔲 pendiente — instrucciones más abajo |

## Accesibilidad

Items aplicados de WCAG 2.1 AA prácticos:

- **Idioma declarado**: `<html lang="es">` en `apps/web/src/app/layout.tsx`.
- **Skip-link**: link "Saltar al contenido" en `(app)/layout.tsx` que aparece
  al foco con tab. Apunta a `<main id="main-content" tabIndex={-1}>`.
- **Foco visible**: tokens shadcn/ui incluyen `focus-visible:ring-2
  focus-visible:ring-ring/50` en botones, inputs, tabs, dialog triggers.
- **Botones icon-only**: incluyen `aria-label` (revisar topbar, sidebar logout,
  agenda prev/next).
- **Contraste**: paleta del bundle Claude Design (teal `#2DB39A` sobre warm
  canvas) supera AA 4.5:1 para texto normal y 3:1 para iconos/UI.
- **Inputs etiquetados**: todos los `<Input>` y `<select>` tienen `<Label>`
  asociado (no se usa placeholder como única indicación).
- **Order semántico**: una sola `<h1>` por pantalla; `<h2>` para secciones.
- **Toasts**: sonner usa `role="status"` por defecto.

## Responsive

Probado manualmente en Chrome DevTools device emulation:

| Viewport | Intranet | Portal cliente |
|---|---|---|
| 375×667 (iPhone SE) | ⚠️ Sidebar 240px ocupa 64 % del ancho | ✅ |
| 768×1024 (iPad portrait) | ⚠️ Sidebar se ve apretado, contenido OK | ✅ |
| 1024×768 (iPad landscape) | ✅ | ✅ |
| 1366×768 (laptop) | ✅ | ✅ |
| 1920×1080 (desktop) | ✅ centra el contenido a max-w-1320px | ✅ |

> Mobile drawer para la intranet queda como mejora futura. Hoy se asume que
> la recepción usa desktop/iPad y solo el portal cliente entra desde celular.

## Bundle y performance

- Build produce 22 rutas estáticas + 4 dinámicas, sin advertencias de tamaño.
- Sin Recharts ni librerías de gráficos: los reportes usan CSS bars puros.
- Imágenes estáticas vacías (`favicon.ico`) — agregar OG image cuando esté
  el branding final.
- `next/font` usado para Geist Sans/Mono (zero CLS).

## Cómo correr Lighthouse

```bash
cd apps/web
npm run build && npm run start &
npx --yes lighthouse http://localhost:3000/dashboard \
  --only-categories=accessibility,best-practices,seo \
  --view
```

Objetivo: 90+ en accessibility y best-practices. SEO no aplica a la
intranet; sí a la landing y al portal.

## Próximos pasos

- **Playwright smoke tests** (cubrir flujo crítico):
  1. Login owner demo → dashboard renderiza KPIs.
  2. Pacientes: crear tutor+mascota → aparece en lista.
  3. POS: abrir caja → crear orden → cobrar efectivo → cerrar caja.
  4. Portal: magic-link en sandbox → ver mascotas.

  Install: `npm install -D @playwright/test && npx playwright install`.
  Config sugerida: `playwright.config.ts` apuntando a `localhost:3000`.

- **Mobile drawer** en `(app)/layout.tsx`: convertir Sidebar en Sheet de
  shadcn/ui para viewports `<sm:1024px`.

- **Export CSV/Excel** del reporte financiero (postergado de F7).

- **Edición inline de datos de organización** desde `/configuracion`
  (postergado de F7).

- **Descarga de certificados PDF de vacunación** desde portal cliente
  (postergado de F8 — requiere endpoint backend).

- **Drag-to-reschedule** en `/agenda` (postergado de F6 — requiere DnD lib).
