# DESIGN.md — TukiVet

Documento canónico para generar el frontend con Cloud Design / Stitch.

Última actualización: 2026-06-02
Backend OpenAPI vivo en: `http://localhost:8000/docs` (después de `make up`)
Conventions: español Perú, formato fecha `dd/mm/yyyy`, moneda `S/`, separador miles `,`.

---

## 1. Identidad visual

- **Producto**: TukiVet — gestión integral para veterinaria.
- **Tono**: profesional, cálido, ágil. Para uso diario de veterinarios y recepción, no para impresionar a inversionistas.
- **Paleta sugerida**:
  - Primario: verde-azul `#2DB39A` (asociado a salud y cuidado animal)
  - Acento: naranja suave `#F4A261` (CTA secundarios)
  - Neutros: gris cálido `#F7F5F2`, texto `#1F2937`
  - Error: rojo `#DC2626`, warning amber `#F59E0B`, success verde `#10B981`
- **Tipografía**: Inter o Geist Sans (sistema), tamaños generosos para tablets de mostrador.
- **Forma**: bordes redondeados `8px` botones, `12px` cards. Sombras suaves, no neumórficas.
- **Densidad**: media-alta. Diseñado para ver muchos datos sin scroll.
- **Modo**: claro por default; oscuro opcional para hospitalización 24/7.

---

## 2. Tipos de usuario y aplicaciones

| Aplicación | Audiencia | URL prefix | Auth |
|---|---|---|---|
| **Intranet** (backoffice) | Owner, vet, técnico, recepción, contador | `/app/*` | JWT `/api/v1/auth/*` |
| **Portal del cliente** | Tutores de mascotas | `/portal/*` | Magic link al WhatsApp `/api/v1/portal/auth/*` |
| **Landing pública** | Visitantes | `/` | Pública |

---

## 3. Landing pública (`/`)

Página única scrollable. Componentes:

1. **Hero**: título grande "Cuidamos a quienes más amás", subtítulo, CTA "Reservar cita online" → portal, CTA secundario "Ver servicios".
2. **Banda de confianza**: número de pacientes atendidos, años de experiencia, valoraciones Google.
3. **Servicios**: grid 3×N con cards de "Consultas", "Vacunación", "Cirugía", "Emergencias", "Hospitalización", "Grooming" (opcional). Cada card: ícono, título, descripción corta, CTA "Agendar".
4. **Equipo**: cards de los veterinarios con foto, nombre, especialidad y CMVP (colegiatura).
5. **Sobre nosotros**: 2 columnas (texto + foto del local).
6. **Ubicación**: mapa embebido + dirección + horarios + WhatsApp con click-to-chat (`https://wa.me/5199...`).
7. **Testimonios**: 3 cards con foto del tutor + foto de la mascota + quote.
8. **Footer**: links, redes, RUC de la SAC, link al portal cliente.

Layout responsive (mobile-first). Imágenes con `next/image`. SEO con `metadata` por sección.

---

## 4. Portal del cliente (`/portal/*`)

### 4.1 Login (`/portal/login`)
- Input: documento (DNI/RUC). Selector de tipo.
- Botón "Recibir código por WhatsApp" → POST `/api/v1/portal/auth/magic-link`.
- Pantalla intermedia: "Te enviamos el código a +51 9** *** ***6. Ingrésalo aquí." con input de 6 a 8 dígitos.
- Botón "Iniciar sesión" → POST `/api/v1/portal/auth/consume`.

### 4.2 Dashboard (`/portal`)
- Saludo: "Hola, María 👋".
- Card resumen por cada mascota: foto, nombre, edad, próxima vacuna (badge si vencida).
- CTA: "Agendar cita", "Pagar saldo pendiente" (si hay).

### 4.3 Mascota (`/portal/pets/[id]`)
- Cabecera con foto + datos básicos (especie, raza, edad, peso actual).
- Tabs: **Historial**, **Vacunas**, **Recetas**, **Documentos**.
- Historial: timeline reverso con encounters (motivo, fecha, vet).
- Vacunas: cards con próxima dosis + botón descargar certificado PDF.
- Recetas: lista con estado (dispensada/parcial/anulada).

### 4.4 Citas (`/portal/appointments`)
- Lista de próximas + historial.
- CTA "Agendar nueva": modal con selector de vet, tipo de cita, fecha+hora (slots libres calculados desde `/appointments` con filtros).

### 4.5 Saldos y pagos (`/portal/billing`)
- Lista de órdenes pendientes con monto y "Pagar con Yape/Plin" (manual: muestra QR del comercio + input de nº operación → POST `/orders/:id/payments`).
- Histórico de comprobantes con link PDF.

### 4.6 Mi cuenta (`/portal/account`)
- Datos personales editables.
- Opt-in/out WhatsApp y email.
- Consentimientos firmados (Ley 29733).
- **Botón "Descargar mis datos"** (derecho de acceso) → GET `/portal/data-export`.
- **Botón "Solicitar eliminación / rectificación / oposición"** → modal ARCO → POST `/portal/data-requests`.

---

## 5. Intranet (`/app/*`)

Layout principal:
- **Sidebar fijo izquierdo** (`240px`): logo, navegación primaria, usuario activo, cierre de sesión.
- **Topbar** (`64px`): búsqueda global, atajos de caja, notificaciones, cambio de sede.
- **Contenido principal**: mínimo `1200px` de ancho útil. Diseñado para desktop primero.

Navegación primaria (sidebar):

```
🏠 Dashboard
📅 Agenda          → /app/appointments
🐾 Pacientes       → /app/pets (incl. tutores)
🩺 Encuentros      → /app/encounters
💉 Vacunas         → /app/vaccines
📝 Recetas         → /app/prescriptions
📦 Inventario      → /app/inventory
💵 POS y caja      → /app/pos
🧾 Comprobantes    → /app/invoices
📊 Reportes        → /app/reports
💬 Comunicaciones  → /app/messaging
👥 Equipo          → /app/staff
⚙️  Configuración  → /app/settings
```

### 5.1 Dashboard (`/app`)

Top: cards de KPIs (de `/reports/kpis`):
- Pacientes activos
- ARPU (Average Transaction Charge)
- Ingresos últimos 30d
- Cumplimiento vacunas %
- No-show %
- Stock bajo (count, click → inventory alerts)
- Lotes por vencer (count, click → inventory alerts)

Centro:
- Agenda del día (lista horizontal con timeline)
- Tareas pendientes (recetas sin dispensar, encuentros abiertos, etc.)
- Últimas notificaciones WhatsApp enviadas

### 5.2 Agenda (`/app/appointments`)
- Vista calendario semanal por defecto (días en columnas, horas en filas).
- Filtros: por vet (chips), por tipo de cita (consulta/vacuna/cirugía/etc.).
- Click en slot vacío → modal "Nueva cita": cliente (autocompletado), mascota, vet, duración.
- Click en cita existente → drawer derecho con detalle + acciones (confirmar, iniciar, completar, cancelar, no-show).
- Vista alternativa: lista por día.
- **Búsqueda global desde topbar**: por cliente, mascota, chip, teléfono → resultados directos.

### 5.3 Pacientes (`/app/pets`)

Tabla principal:
- Columnas: foto (small), nombre, especie, raza, tutor (nombre + teléfono), edad, peso, chip, status.
- Filtros: especie, vet asignado, status, "tiene vacunas vencidas".
- Búsqueda en topbar de la tabla.
- Botón "Nuevo tutor + mascota" → wizard de 2 pasos (cliente con DNI/RUC, luego mascota).

Detalle (`/app/pets/[id]`):
- Cabecera: foto, datos clave, badges (alergias, condiciones crónicas).
- Tabs:
  - **Resumen**: alerts, problemas activos, próxima vacuna, último encuentro, último peso.
  - **Encuentros**: lista con quick-action "Nuevo encuentro".
  - **Vacunas**: timeline + botón certificado.
  - **Recetas**: histórico.
  - **Peso**: gráfico de línea de la serie temporal.
  - **Documentos**: adjuntos.

### 5.4 Encuentros (`/app/encounters`)

Lista filtrable: por mascota, por vet, por status (open/in_progress/closed/amended).

Crear/editar encounter — **vista principal del veterinario**, layout 2 columnas:

**Columna izquierda** (info contextual):
- Datos paciente: foto, edad, peso actual, alergias, condiciones crónicas.
- Vacunas vigentes/vencidas.
- Encuentros previos (resumen 3-5 más recientes con quick-link).

**Columna derecha** (SOAP):
- Cabecera: motivo de consulta (free text), tipo, vet, hora inicio.
- **Signos vitales** (form inline): temperatura, FC, FR, peso, BCS, mucosas, hidratación. Validación rangos (temperatura 30-45°C).
- **S — Subjetivo**: textarea + plantillas dropdown.
- **O — Objetivo**: sub-secciones por sistemas (cardiovascular, respiratorio, etc.) — collapsible.
- **A — Assessment**: tabla editable de diagnósticos (descripción, tipo: presuntivo/definitivo/diferencial).
- **P — Plan**: tratamientos, exámenes solicitados, recomendaciones, próxima visita.

Footer fijo:
- Botón "Guardar borrador" → PUT SOAP.
- Botón "Agregar receta" → modal embebido.
- Botón "Cerrar encuentro" → confirma + PUT close.
- Si cerrado: muestra "Encuentro cerrado el dd/mm/yyyy" y botón "Enmendar" (modal con razón obligatoria).

### 5.5 Vacunas (`/app/vaccines`)

Tabs:
- **Catálogo**: tabla de vacunas configuradas (nombre, especie, intervalo refuerzo). CRUD.
- **Aplicaciones recientes**: tabla con filtros.
- **Por vencer / vencidas**: vista clave para recordatorios. Tabla con cliente, mascota, vacuna, días vencida, botón "Enviar WhatsApp" (envía notification via plantilla `vet_vaccine_due`).

Modal "Registrar vacuna":
- Selector mascota → autocompleta especie.
- Selector vacuna del catálogo filtrado por especie.
- Lote, fecha de aplicación, sitio.
- Cálculo automático de próxima dosis (editable).

### 5.6 Recetas (`/app/prescriptions`)

Lista + filtros (mascota, vet, status).

Crear/editar:
- Cabecera: mascota, diagnóstico, notas.
- Líneas de items con:
  - Selector de producto del catálogo O texto libre.
  - **Calculadora de dosis** embebida: peso, mg/kg, mg/unidad → unidades por administración (auto). Botón "Aplicar".
  - Frecuencia, duración, vía.
- Si item es sustancia controlada (`is_controlled=true`): muestra alerta amarilla "Requiere testigo al dispensar".

Dispensación:
- Botón "Dispensar" → modal: cantidad, testigo (si controlado). FIFO automático por lotes (mostrado al usuario).

### 5.7 Inventario (`/app/inventory`)

Tabs:
- **Productos**: tabla con SKU, nombre, categoría, precio, stock disponible, reorder point. Badge rojo si bajo stock.
- **Lotes**: por producto.
- **Movimientos**: histórico (compra, venta, ajuste, merma).
- **Proveedores**: CRUD.
- **Alertas**: low_stock + expiring_lots (cards rojas/ambar).

Acciones:
- "Recibir lote" (modal con producto + lote + cantidad + costo).
- "Ajuste / merma" (modal con motivo obligatorio).

### 5.8 POS y caja (`/app/pos`)

Layout 2 columnas:

**Izquierda — armado de orden** (60% ancho):
- Selector cliente (autocomplete con DNI/RUC).
- Línea de búsqueda: agregar servicio O producto.
- Tabla de items: descripción, qty, precio, descuento, subtotal, total. Cada fila editable inline.
- Atajos: "Agregar consulta", "Agregar vacuna aplicada", "Agregar receta".

**Derecha — totales y cobro** (40% ancho):
- Subtotal, IGV, total.
- Saldo pendiente.
- Botones de método de pago en grid: Efectivo, Yape, Plin, Transferencia, POS Tarjeta, Crédito.
- Modal de pago: monto, referencia (si Yape/Plin), foto del voucher opcional.
- Botón final "Emitir comprobante" → llama POST `/invoices` (TukiFact).

**Topbar de POS**:
- Estado de caja (abierta/cerrada).
- Si cerrada: CTA "Abrir caja" (modal con saldo inicial).
- Si abierta: badge con sesión activa + botón "Cerrar caja" (modal con saldo declarado + comparación auto-calculado + diferencia).

### 5.9 Comprobantes (`/app/invoices`)

Tabla:
- Columnas: tipo (badge: F = factura, B = boleta, NC, ND), serie-número, cliente, total, status SUNAT, fecha, acciones (PDF, XML, Anular).
- Filtros: status (pending/accepted/rejected/cancelled), tipo, rango de fechas.
- Click en fila → drawer con detalle + eventos de webhook (timeline).

### 5.10 Reportes (`/app/reports`)

Top: selector de rango de fechas.

Secciones:
- **Dashboard de KPIs**: las 10 métricas en cards + gráficos pequeños.
- **Financiero**: gráfico de ingresos diarios, ingresos por método de pago (donut), comprobantes emitidos (boleta vs factura).
- **Clínico**: cumplimiento de vacunas (gauge), no-show rate, encuentros por vet (bar chart).
- **Inventario**: rotación, productos top vendidos, alertas.
- **Exportar**: dropdown con CSV / Excel.

### 5.11 Comunicaciones (`/app/messaging`)

Tabs:
- **Plantillas**: lista (vet_appointment_reminder_24h, vet_vaccine_due, etc.). CRUD + botón "Cargar defaults" (POST seed-defaults).
- **Envíos**: log de notifications con status (queued/sent/delivered/blocked_safe_mode/failed). Click en row para ver body.

Composer manual: "Enviar mensaje" → selector cliente + plantilla + variables.

### 5.12 Equipo (`/app/staff`)

- Lista de usuarios con rol(es), status, última conexión.
- Botón "Invitar usuario" → modal con email, nombre, rol(es).
- Detalle usuario → editar roles, cambiar status, ver log de acciones (audit_log filtrado).

### 5.13 Configuración (`/app/settings`)

Tabs:
- **Organización**: datos SUNAT (RUC, razón social), logo, dirección.
- **Sedes**: CRUD de branches (V2).
- **Roles y permisos**: ver/editar roles, asignar permisos.
- **Catálogo de servicios** (`/orders/services` CRUD).
- **Plantillas WhatsApp**.
- **Integraciones**:
  - TukiFact: API key + entorno (sandbox/prod) + test de conexión.
  - Twilio WhatsApp: account_sid + auth_token + número.
  - Culqi: feature flag (off por default — D4).
- **Cumplimiento Ley 29733**: ver consentimientos firmados, derechos ARCO recibidos, banco de datos registrado (link al documento).

---

## 6. Componentes reutilizables (design system)

Para que Cloud Design genere los siguientes átomos y moléculas:

### Átomos
- `Button` (primary, secondary, ghost, destructive, sm/md/lg)
- `Input` (con label, error, helper)
- `Select` / `Combobox` (con search)
- `Checkbox`, `Radio`, `Switch`
- `Badge` (status colors)
- `Avatar` (con fallback iniciales)
- `Tooltip`
- `Spinner`
- `Icon` (Lucide)

### Moléculas
- `DataTable` con sorting, paginación server-side, filtros, búsqueda.
- `Form` field con label + input + helper + error inline.
- `Card` (con header/body/footer).
- `Modal` / `Drawer` (lateral derecho 480px).
- `Toast` (success, error, info, warning).
- `Tabs` horizontales.
- `Breadcrumb`.
- `Pagination`.

### Organismos
- `Sidebar` con navegación.
- `Topbar` con búsqueda global + atajos.
- `AppointmentCalendar` (vista semana/día).
- `SoapEditor` (form bipartito S/O/A/P con plantillas).
- `WeightChart` (línea con tooltips).
- `KPICard` (número grande + delta + sparkline opcional).
- `OrderComposer` (tabla editable + totales con IGV en vivo).
- `PaymentModal` (selector de método + form).
- `VaccineDueList` (con quick-action enviar WhatsApp).
- `InventoryAlertCard` (low stock / expiring).
- `WhatsAppTemplateEditor` (con preview render de variables).

### Patterns
- **Empty states**: ilustración + texto + CTA.
- **Loading**: skeleton donde corresponda; spinners solo en acciones.
- **Errores**: toasts para errores transitorios; inline para validación; pantalla de error con CTA para errores fatales.

---

## 7. Endpoints clave por pantalla (mapa rápido)

| Pantalla | Endpoints principales |
|---|---|
| Login app | `POST /auth/login`, `GET /auth/me` |
| Login portal | `POST /portal/auth/magic-link`, `POST /portal/auth/consume` |
| Dashboard app | `GET /reports/kpis` |
| Agenda | `GET /appointments?starts_at_from&to&vet`, `POST /appointments`, `POST /:id/confirm/start/complete/cancel/no-show` |
| Pacientes lista | `GET /pets?q&species&customer_id&microchip` |
| Detalle paciente | `GET /pets/:id`, `GET /pets/:id/weights`, `GET /pets/:id/problems`, `GET /vaccines/pets/:id/vaccines`, `GET /prescriptions/pets/:id/prescriptions` |
| Encuentro | `POST/GET/PUT /encounters`, `PUT /encounters/:id/soap`, `POST /encounters/:id/vitals`, `POST /:id/close`, `POST /:id/amend` |
| Vacunas catálogo | `GET/POST /vaccines/catalog`, `GET /vaccines/due?days_window` |
| Recetas | `POST /prescriptions`, `POST /:id/items/:itemId/dispense`, `POST /prescriptions/calculate-dose` |
| Inventario | `GET /inventory/products`, `POST /inventory/lots`, `POST /inventory/movements`, `GET /inventory/alerts/*` |
| POS | `POST /orders`, `POST /:id/items`, `POST /:id/payments`, `POST /cash-sessions/open/close` |
| Comprobantes | `POST /invoices`, `GET /invoices`, `POST /invoices/:id/void` |
| Reportes | `GET /reports/kpis`, `GET /reports/financial?start&end` |
| Comunicaciones | `GET/POST /notifications/templates`, `POST /notifications/send`, `GET /notifications` |
| Portal mascotas | `GET /portal/pets`, `GET /portal/pets/:id/history` |
| Portal billing | `GET /portal/orders/pending` |
| Portal ARCO | `POST /portal/data-requests`, `GET /portal/data-export`, `POST /portal/consents` |

---

## 8. Reglas críticas de UX

1. **Búsqueda global ultra-rápida** desde el topbar — debe encontrar por nombre cliente, mascota, microchip (15 dígitos), teléfono, RUC en <300ms percibido. Single source: `/customers?q=` + `/pets?q=` en paralelo.
2. **El SOAP es el cuello de botella del flujo**. UX objetivo: completar un SOAP de consulta general en <3 minutos. Atajos de teclado (Tab para sub-secciones, Ctrl+S para guardar).
3. **Auto-save** del SOAP cada 30s mientras está open/in_progress.
4. **Confirmaciones destructivas** son obligatorias para: cerrar encuentro, anular comprobante, soft-delete cliente/mascota, anular receta.
5. **Mostrar audit trail** en el detalle de cada entidad (quién hizo qué y cuándo).
6. **Notificaciones inline** cuando el sistema envía un WhatsApp (toast con "Mensaje enviado a +51 9XX *** **6").
7. **Estados claros**: nunca un botón "guardado" que en realidad falló silenciosamente.
8. **Móvil del vet**: la intranet debe funcionar razonable en tablet (iPad horizontal). El móvil del vet en campo es V2.

---

## 9. Tareas para Cloud Design

Por orden sugerido al generar el frontend:

1. Sistema de diseño base (atomos + moléculas).
2. Landing pública.
3. Login intranet + dashboard.
4. CRUD pacientes (lista + detalle con tabs).
5. Calendario de citas.
6. Editor SOAP (la pantalla crítica).
7. POS / pagos.
8. Comprobantes electrónicos.
9. Inventario.
10. Vacunas (catálogo + due-list).
11. Reportes con gráficos.
12. Comunicaciones.
13. Configuración.
14. Portal del cliente (login + dashboard + mascotas + ARCO).

Hand-off: cada pantalla con los endpoints listados en §7 y los componentes de §6.
