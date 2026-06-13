# TukiVet — Product Requirements Document

**Versión**: 1.0  
**Fecha**: 2026-06-13  
**Estado**: En desarrollo (MVP funcional)

---

## 1. Visión del Producto

TukiVet es un sistema de gestión clínica veterinaria (Practice Management System) diseñado para clínicas pequeñas y medianas en Perú. Permite gestionar clientes, pacientes, historial clínico SOAP, recetas, inventario, caja y facturación electrónica (SUNAT), todo desde un único panel web.

**Objetivo primario**: Reemplazar flujos manuales en papel y reducir el tiempo administrativo de veterinarios en al menos 40%.

**Usuarios objetivo**:
| Rol | Descripción |
|-----|-------------|
| `owner` | Dueño/director de la clínica. Acceso total. |
| `vet` | Médico veterinario. Acceso clínico completo. |
| `receptionist` | Recepcionista. Clientes, citas, caja, recetas (consulta). |
| `groomer` | Peluquero. Solo módulo de peluquería. |

---

## 2. Arquitectura Técnica

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui, TanStack Query |
| Backend | FastAPI (Python 3.12), SQLAlchemy async, Alembic |
| Base de datos | PostgreSQL 16 |
| Cache | Redis 7 |
| Almacenamiento | MinIO (S3-compatible) |
| Auth | JWT (access + refresh tokens) |
| IA | OpenAI GPT-4o-mini (con mock fallback) |
| Facturación | SUNAT OSE (integración futura) |

---

## 3. Módulos y Requerimientos Funcionales

---

### 3.1 Autenticación (`/auth`)

**RF-AUTH-01**: Login con email + contraseña. Retorna `access_token` (JWT, 30min) + `refresh_token` (7 días).  
**RF-AUTH-02**: Refresh token sin re-login.  
**RF-AUTH-03**: Logout invalida refresh token.  
**RF-AUTH-04**: Protección de todas las rutas (excepto login).  
**RF-AUTH-05**: Sesión persistente en localStorage + renovación automática.

**Criterios de aceptación**:
- [ ] Login exitoso redirige al Dashboard
- [ ] Token expirado es renovado transparentemente
- [ ] Logout limpia sesión y redirige a `/login`
- [ ] Ruta protegida sin token redirige a `/login`

---

### 3.2 Dashboard (`/dashboard`)

**RF-DASH-01**: KPIs del día: citas pendientes, encuentros abiertos, caja actual.  
**RF-DASH-02**: Próximas citas (lista de los siguientes 5).  
**RF-DASH-03**: Alertas: stock bajo, lotes por vencer, vacunas vencidas.  
**RF-DASH-04**: Acceso rápido a crear cliente, encuentro, cita.

**Criterios de aceptación**:
- [ ] Carga en < 2s con datos reales
- [ ] Alertas de stock bajo visibles si hay items con cantidad ≤ `min_stock`
- [ ] Citas del día actualizadas en tiempo real (TanStack Query refetch)

---

### 3.3 Clientes (`/clientes`)

**RF-CLI-01**: Listado paginado con búsqueda por nombre, DNI, RUC, teléfono.  
**RF-CLI-02**: Crear cliente con: nombre completo, DNI/RUC, email, teléfonos (principal + secundario), dirección, notas.  
**RF-CLI-03**: Ver detalle de cliente con sus mascotas asociadas.  
**RF-CLI-04**: Editar datos del cliente.  
**RF-CLI-05**: Historial de comprobantes del cliente.  
**RF-CLI-06**: Validación de DNI (8 dígitos) y RUC (11 dígitos).  
**RF-CLI-07**: Portal del cliente (acceso externo, solo lectura).

**Criterios de aceptación**:
- [ ] Búsqueda retorna resultados en < 500ms
- [ ] Crear cliente con DNI duplicado muestra error
- [ ] Campos obligatorios: nombre, tipo documento, número documento
- [ ] Paginación funciona correctamente (botones Anterior/Siguiente)

---

### 3.4 Pacientes (`/pacientes`)

**RF-PAC-01**: Listado con búsqueda por nombre, raza, microchip, tutor.  
**RF-PAC-02**: Crear mascota con: nombre, especie, raza, sexo, fecha nacimiento, color, microchip, peso inicial, alergias conocidas, foto.  
**RF-PAC-03**: Vincular mascota a cliente (tutor).  
**RF-PAC-04**: Ver ficha completa: datos básicos, peso actual, alertas médicas.  
**RF-PAC-05**: Tabs de historial: Resumen, Encuentros, Vacunas, Recetas, Peso, Documentos.  
**RF-PAC-06**: Gráfico de evolución de peso.  
**RF-PAC-07**: Lista de problemas activos/crónicos/resueltos (POMR).  
**RF-PAC-08**: Subir documentos adjuntos (PDF, imágenes): labs, radiografías, consentimientos.  
**RF-PAC-09**: Alertas de vacunas vencidas o próximas a vencer.

**Criterios de aceptación**:
- [ ] Microchip único por organización
- [ ] Foto de mascota se almacena en MinIO y se sirve correctamente
- [ ] Tab Documentos muestra empty state si no hay documentos
- [ ] Upload de documento muestra progreso y confirma éxito
- [ ] Peso en tab "Peso" muestra gráfico histórico con fechas

---

### 3.5 Encuentros Clínicos (`/encuentros`)

**RF-ENC-01**: Listado filtrable por estado (Borrador, En progreso, Cerrado, Enmendado).  
**RF-ENC-02**: Crear nuevo encuentro: seleccionar mascota → tipo → motivo.  
**RF-ENC-03**: Tipos de encuentro: Consulta, Vacunación, Cirugía, Emergencia, Seguimiento, Chequeo, Hospitalización, Peluquería, Hospedaje.  
**RF-ENC-04**: Registro de signos vitales: T°, FC, FR, Peso, SpO2, Mucosas, Hidratación, Dolor (0–10 VAS), notas.  
**RF-ENC-05**: Editor SOAP con 4 tabs: Subjetivo (S), Objetivo (O), Apreciación (A), Plan (P).  
**RF-ENC-06**: Guardado automático al salir del input (debounce 1s) + Ctrl+S manual.  
**RF-ENC-07**: Gestión de Problemas (POMR): añadir, resolver, marcar como crónico.  
**RF-ENC-08**: Cerrar encuentro (requiere confirmación).  
**RF-ENC-09**: Enmendar encuentro cerrado (auditoría con motivo mínimo 10 chars).  
**RF-ENC-10**: Estado "Solo lectura" para encuentros cerrados/enmendados.  
**RF-ENC-11**: Asistente IA BETA: genera sugerencias SOAP basadas en motivo + vitales + problemas.

**Criterios de aceptación**:
- [ ] SOAP se guarda correctamente (POST/PATCH a `/encounters/{id}/soap`)
- [ ] Cambio a otra tab conserva datos ingresados
- [ ] Encuentro cerrado muestra badge "Solo lectura" y deshabilita todos los inputs
- [ ] Enmienda queda registrada con timestamp y motivo
- [ ] AI: botón visible solo en encuentros no-cerrados; mock funciona sin API key

---

### 3.6 Formularios de Especialidad

#### 3.6.1 Examen Oftálmico

**RF-OFT-01**: Panel colapsable dentro del encuentro.  
**RF-OFT-02**: Evaluación por ojo: OD (derecho) y OS (izquierdo).  
**RF-OFT-03**: Campos por ojo: visión, respuesta amenaza, PLR directo/consensual, STT, PIO, segmento anterior, segmento posterior, tinción fluoresceína, notas.  
**RF-OFT-04**: Conclusión/diagnóstico global.  
**RF-OFT-05**: Guardar en `soap.objective.ophthalmic_exam`.

**Criterios de aceptación**:
- [ ] Valores se persisten correctamente en el SOAP
- [ ] Panel en read-only para encuentros cerrados

#### 3.6.2 Examen Dermatológico

**RF-DERM-01**: Panel colapsable dentro del encuentro.  
**RF-DERM-02**: 16 regiones corporales seleccionables.  
**RF-DERM-03**: Por región: lesión primaria (pápula, pústula, nódulo, vesícula, mácula, placa) + lesión secundaria (costra, escama, úlcera, liquenificación, hiperpigmentación, alopecia).  
**RF-DERM-04**: Distribución de lesiones (focal, multifocal, generalizada, bilateral simétrica).  
**RF-DERM-05**: Score de prurito global (0–10 VAS).  
**RF-DERM-06**: Conclusión/diagnóstico diferencial.  
**RF-DERM-07**: Guardar en `soap.objective.dermatology_exam`.

---

### 3.7 Recetas (`/recetas`)

**RF-REC-01**: Buscar mascota para ver/crear recetas.  
**RF-REC-02**: Crear receta con: diagnóstico, ítems (medicamento, dosis mg/kg, cantidad, frecuencia, duración, vía, instrucciones al tutor), notas internas.  
**RF-REC-03**: Cálculo automático de dosis total basado en peso de la mascota.  
**RF-REC-04**: Marcar medicamento como sustancia controlada (aviso rojo en impresión).  
**RF-REC-05**: Dispensar parcialmente una receta (registro de cantidad dispensada por ítem).  
**RF-REC-06**: Estados de receta: Activa, Dispensada, Dispensada parcial, Anulada.  
**RF-REC-07**: Anular receta (requiere confirmación).  
**RF-REC-08**: Imprimir receta en formato A4 con: encabezado clínica, datos paciente/propietario, tabla medicamentos, instrucciones, firma vet + firma propietario.

**Criterios de aceptación**:
- [ ] Receta sin ítems no puede guardarse
- [ ] Dispensación parcial actualiza cantidad restante
- [ ] Impresión activa el diálogo de impresión del navegador automáticamente
- [ ] Sustancia controlada muestra aviso en rojo en hoja impresa
- [ ] Receta anulada no puede ser dispensada

---

### 3.8 Vacunas (`/vacunas`)

**RF-VAC-01**: Listado de vacunaciones con filtro por mascota, estado, fecha.  
**RF-VAC-02**: Registrar vacuna: mascota, vacuna (producto), lote, fecha aplicación, próxima dosis, veterinario aplicador.  
**RF-VAC-03**: Alertas automáticas de vacunas próximas a vencer (≤ 30 días) y vencidas.  
**RF-VAC-04**: Carnét de vacunas por mascota (vista/impresión).  
**RF-VAC-05**: Historial completo de vacunas por mascota en tab "Vacunas" de la ficha de paciente.

**Criterios de aceptación**:
- [ ] Registro sin lote es permitido (campo opcional)
- [ ] Alerta visible en ficha de paciente si tiene vacuna vencida
- [ ] Estado "Vigente" vs "Vencida" calculado automáticamente por fecha

---

### 3.9 Inventario (`/inventario`)

**RF-INV-01**: Catálogo de productos: medicamentos, insumos, alimentos, servicios.  
**RF-INV-02**: Campos: nombre, categoría, SKU, unidad de medida, precio de venta, precio de costo, stock actual, stock mínimo.  
**RF-INV-03**: Gestión de lotes: número de lote, fecha vencimiento, cantidad.  
**RF-INV-04**: Alertas de stock bajo (cantidad ≤ `min_stock`).  
**RF-INV-05**: Alertas de lotes próximos a vencer (≤ 30 días).  
**RF-INV-06**: Movimientos de inventario: entrada, salida, ajuste.  
**RF-INV-07**: Servicios (sin stock): precio fijo, categoría para reportes.  
**RF-INV-08**: Búsqueda por nombre, SKU, categoría.

**Criterios de aceptación**:
- [ ] SKU único por organización
- [ ] Stock no puede quedar negativo (validación backend)
- [ ] Alerta de stock bajo aparece en Dashboard y en lista de inventario
- [ ] Servicios no tienen campo de stock ni lotes

---

### 3.10 POS y Caja (`/pos`)

**RF-POS-01**: Apertura de sesión de caja con monto inicial.  
**RF-POS-02**: Crear orden de venta: buscar mascota/cliente, agregar ítems del inventario o servicios.  
**RF-POS-03**: Aplicar descuento (%) por ítem o global.  
**RF-POS-04**: Métodos de pago: efectivo, tarjeta débito, tarjeta crédito, transferencia, Yape, Plin.  
**RF-POS-05**: Pago mixto (múltiples métodos en una orden).  
**RF-POS-06**: Descuento de stock automático al confirmar pago.  
**RF-POS-07**: Generar comprobante electrónico (boleta/factura) al pagar.  
**RF-POS-08**: Cierre de caja con resumen de ingresos por método de pago.  
**RF-POS-09**: Estado de caja visible en header (Caja abierta / Caja cerrada).

**Criterios de aceptación**:
- [ ] No se puede crear orden sin sesión de caja abierta
- [ ] Orden con stock insuficiente muestra error
- [ ] Cierre de caja calcula diferencia entre efectivo esperado vs declarado
- [ ] Comprobante generado es descargable como PDF

---

### 3.11 Comprobantes (`/comprobantes`)

**RF-COMP-01**: Listado de facturas y boletas con filtro por fecha, tipo, estado.  
**RF-COMP-02**: Ver detalle: cliente, ítems, IGV (18%), total.  
**RF-COMP-03**: Anular comprobante (genera nota de crédito).  
**RF-COMP-04**: Descargar PDF del comprobante.  
**RF-COMP-05**: Serie y correlativo automáticos (B001-XXXXX para boletas, F001-XXXXX para facturas).

**Criterios de aceptación**:
- [ ] IGV calculado correctamente (18% sobre base imponible)
- [ ] Anulación registra motivo
- [ ] Correlativo es secuencial y no se reutiliza

---

### 3.12 Agenda (`/agenda`)

**RF-AGENDA-01**: Vista de calendario diaria, semanal, mensual.  
**RF-AGENDA-02**: Crear cita: mascota, tipo, veterinario, fecha/hora, duración, notas.  
**RF-AGENDA-03**: Estados de cita: Pendiente, Confirmada, En proceso, Atendida, No-show, Cancelada.  
**RF-AGENDA-04**: Recordatorio automático (notificación interna + WhatsApp si configurado).  
**RF-AGENDA-05**: Filtrar por veterinario o tipo de servicio.  
**RF-AGENDA-06**: Crear encuentro directamente desde una cita.

**Criterios de aceptación**:
- [ ] No se pueden crear dos citas del mismo veterinario en el mismo slot
- [ ] Cita cancelada libera el slot automáticamente
- [ ] Desde cita "Pendiente" se puede confirmar con un click

---

### 3.13 Peluquería (`/peluqueria`)

**RF-PELO-01**: Listado de citas de peluquería con filtro por estado.  
**RF-PELO-02**: Crear cita: buscar mascota, seleccionar servicio (baño, corte, baño+corte, tratamiento), fecha/hora, notas especiales.  
**RF-PELO-03**: Estados: Agendada, En proceso, Completada, Cancelada.  
**RF-PELO-04**: Detalle de servicio registrado como encuentro tipo "Peluquería" con notas en SOAP.

**Criterios de aceptación**:
- [ ] "Crear cita" requiere mascota seleccionada y servicio
- [ ] Cita completada genera encuentro automáticamente (o vincula a uno existente)

---

### 3.14 Hospedaje (`/hospedaje`)

**RF-HOSP-01**: Panel principal con contador de mascotas alojadas actualmente.  
**RF-HOSP-02**: KPIs: Alojados, Total registrados, Check-out hoy, Ingresos hoy.  
**RF-HOSP-03**: Nuevo ingreso: mascota, jaula/habitación, fecha entrada, salida estimada, instrucciones alimentación, notas especiales.  
**RF-HOSP-04**: Check-out: registrar fecha/hora de salida real.  
**RF-HOSP-05**: Historial de hospedajes pasados.  
**RF-HOSP-06**: Detalles de hospedaje almacenados en `soap.objective.boarding_details` del encuentro vinculado.

**Criterios de aceptación**:
- [ ] Jaula puede tener máximo una mascota alojada al mismo tiempo
- [ ] Alerta si salida estimada < fecha actual (retraso)
- [ ] Check-out actualiza estado del encuentro vinculado

---

### 3.15 Reportes (`/reportes`)

**RF-REP-01**: KPIs últimos 30 días: pacientes activos, clientes activos, encuentros, citas, ingresos, ATC promedio, no-show %, cumplimiento vacunas %, valor inventario, lotes por vencer, stock bajo.  
**RF-REP-02**: Reporte financiero con rango de fechas: ingreso bruto, IGV, ingreso neto, # facturas, # boletas, # anulados.  
**RF-REP-03**: Pagos por método de pago.  
**RF-REP-04**: Ingresos por categoría de producto/servicio.  
**RF-REP-05**: Gráficos: ingresos por categoría (barras horizontales), distribución de pagos (pie), ingresos por veterinario (barras verticales).  
**RF-REP-06**: Exportar reporte a CSV/Excel (funcionalidad futura).

**Criterios de aceptación**:
- [ ] KPIs cargan en < 3s
- [ ] Cambio de rango de fechas actualiza reporte financiero sin recargar página
- [ ] Gráficos solo se muestran si hay datos (condicional)
- [ ] Categorías muestran nombres legibles (no claves raw)

---

### 3.16 Asistente IA SOAP (`/encuentros/[id]`)

**RF-AI-01**: Panel "Asistente IA BETA" visible solo en encuentros editables.  
**RF-AI-02**: Al pulsar "Generar sugerencias": envía motivo, vitales, problemas activos y SOAP actual al backend.  
**RF-AI-03**: Respuesta estructurada: S (anamnesis + historia), O (examen físico sugerido), A (diagnósticos diferenciales), P (tratamiento + seguimiento + instrucciones propietario) + exámenes sugeridos + banderas rojas.  
**RF-AI-04**: Mock automático cuando `OPENAI_API_KEY` está vacío (banner "Modo demo").  
**RF-AI-05**: "Aplicar al SOAP": merge de sugerencias en los campos S/O/A/P actuales.  
**RF-AI-06**: "Nueva sugerencia": limpia resultado y permite generar de nuevo.  
**RF-AI-07**: Habilitado/deshabilitado por flag `ENABLE_AI_SOAP` en configuración.

**Criterios de aceptación**:
- [ ] Endpoint retorna 403 si `ENABLE_AI_SOAP=false`
- [ ] Mock retorna estructura válida cuando API key está vacío
- [ ] "Aplicar al SOAP" no sobreescribe campos ya llenos (merge, no replace)
- [ ] Indicador de carga durante generación ("Generando…")

---

### 3.17 Equipo (`/equipo`)

**RF-EQP-01**: Listado de usuarios de la organización con rol y estado.  
**RF-EQP-02**: Invitar nuevo usuario (envío de email con link de activación).  
**RF-EQP-03**: Cambiar rol de usuario.  
**RF-EQP-04**: Desactivar/reactivar usuario.  
**RF-EQP-05**: Perfil propio: cambiar nombre, contraseña.

**Criterios de aceptación**:
- [ ] Solo `owner` puede invitar/desactivar usuarios
- [ ] Email de invitación enviado en < 30s
- [ ] Usuario desactivado no puede iniciar sesión

---

### 3.18 Configuración (`/configuracion`)

**RF-CONF-01**: Datos de la clínica: nombre, RUC, dirección, teléfono, email, logo.  
**RF-CONF-02**: Configuración de series de comprobantes.  
**RF-CONF-03**: Parámetros de caja: moneda, IGV habilitado/deshabilitado.  
**RF-CONF-04**: Integración WhatsApp (número de teléfono del agente).  
**RF-CONF-05**: Horarios de atención.  
**RF-CONF-06**: Razas personalizadas (agregar razas no incluidas en catálogo).

---

### 3.19 Comunicaciones (`/comunicaciones`)

**RF-COM-01**: Enviar notificaciones masivas a clientes (recordatorio de vacunas, promociones).  
**RF-COM-02**: Historial de mensajes enviados con estado de entrega.  
**RF-COM-03**: Plantillas de mensaje personalizables.  
**RF-COM-04**: Canal: email (actual) + WhatsApp (con integración configurada).

---

## 4. Requerimientos No Funcionales

| Código | Descripción | Métrica |
|--------|-------------|---------|
| RNF-01 | Tiempo de carga inicial | < 3s en red 4G |
| RNF-02 | Tiempo de respuesta API | P95 < 500ms para endpoints de lectura |
| RNF-03 | Disponibilidad | 99.5% uptime (excluye mantenimiento programado) |
| RNF-04 | Seguridad | JWT, HTTPS, rate limiting en auth |
| RNF-05 | Datos | Backup diario de PostgreSQL |
| RNF-06 | Multi-tenant | Datos completamente aislados por `organization_id` |
| RNF-07 | Accesibilidad | WCAG 2.1 AA (contraste, navegación por teclado) |
| RNF-08 | Responsive | Usable en tablet (768px+); móvil limitado |
| RNF-09 | Auditoría | Todas las modificaciones a registros médicos quedan en `audit_log` |
| RNF-10 | Retención | Datos clínicos retenidos mínimo 5 años (legislación peruana) |

---

## 5. Modelo de Datos Simplificado

```
Organization
  └── User (roles: owner, vet, receptionist, groomer)
  └── Customer (tutor/propietario)
       └── Pet (mascota)
            ├── PetDocument (archivos adjuntos)
            ├── Problem (POMR)
            ├── Vaccine (vacunas)
            └── Encounter (visita clínica)
                 ├── VitalSign (signos vitales)
                 ├── SoapNote (subjective/objective/assessment/plan JSON)
                 └── Prescription
                      └── PrescriptionItem
                           └── Dispensation
  └── InventoryItem (productos/servicios)
       └── InventoryLot (lotes con vencimiento)
       └── InventoryMovement (entradas/salidas)
  └── Appointment (citas)
  └── CashSession (sesión de caja)
       └── Order (venta)
            └── OrderItem
            └── Payment (pago)
       └── Invoice (comprobante electrónico)
```

---

## 6. Flujos Críticos

### 6.1 Flujo de Consulta Completa
1. Recepcionista crea/busca cliente → verifica mascota
2. Veterinario crea encuentro desde Agenda o desde ficha de paciente
3. Registra signos vitales
4. Completa SOAP (S → O → A → P)
5. Opcionalmente usa Asistente IA para sugerencias
6. Registra problemas activos
7. Emite receta si aplica
8. Cierra encuentro
9. Recepcionista genera orden en POS → cobra → emite boleta/factura

### 6.2 Flujo de Hospitalización
1. Crear encuentro tipo "Hospitalización"
2. Ingresar paciente en módulo Hospedaje (jaula, instrucciones)
3. Registrar vitales 2–3 veces/día
4. Actualizar SOAP diariamente
5. Check-out cuando el paciente es dado de alta
6. Cerrar encuentro + cobrar en POS

### 6.3 Flujo de Peluquería
1. Crear cita en módulo Peluquería
2. En la cita, crear encuentro tipo "Peluquería"
3. Registrar notas del servicio en SOAP
4. Completar cita
5. Cobrar en POS

---

## 7. Estado Actual de Implementación

| Módulo | Backend | Frontend | Tests | Estado |
|--------|---------|----------|-------|--------|
| Auth | ✅ | ✅ | — | Completo |
| Dashboard | ✅ | ✅ | — | Completo |
| Clientes | ✅ | ✅ | — | Completo |
| Pacientes | ✅ | ✅ | — | Completo |
| Encuentros + SOAP | ✅ | ✅ | — | Completo |
| Signos vitales | ✅ | ✅ | — | Completo |
| Problemas POMR | ✅ | ✅ | — | Completo |
| Documentos mascota | ✅ | ✅ | — | Completo |
| Especialidad: Oftálmica | — | ✅ | — | Frontend only |
| Especialidad: Dermatología | — | ✅ | — | Frontend only |
| Recetas + Impresión | ✅ | ✅ | — | Completo |
| Vacunas | ✅ | ✅ | — | Completo |
| Inventario | ✅ | ✅ | — | Completo |
| POS y Caja | ✅ | ✅ | — | Completo |
| Comprobantes | ✅ | ✅ | — | Completo |
| Agenda | ✅ | ✅ | — | Completo |
| Peluquería | — | ✅ | — | Frontend only* |
| Hospedaje | — | ✅ | — | Frontend only* |
| Reportes + Gráficos | ✅ | ✅ | — | Completo |
| Asistente IA SOAP | ✅ | ✅ | — | Completo (mock) |
| Equipo | ✅ | ✅ | — | Completo |
| Configuración | ✅ | ✅ | — | Completo |
| Comunicaciones | ✅ | ⚠️ | — | UI básica |
| Portal cliente | ✅ | — | — | Solo backend |
| Facturación SUNAT | ⚠️ | ⚠️ | — | Estructura lista, integración pendiente |

*Peluquería y Hospedaje crean encuentros del tipo correspondiente para registrar el servicio.

---

## 8. Gaps y Trabajo Pendiente

### Alta prioridad
1. **Enum `encounter.type` en PostgreSQL**: Agregar valores `grooming` y `boarding` mediante migración Alembic.
2. **Facturación SUNAT**: Integración real con OSE/PSE para emisión de comprobantes electrónicos válidos.
3. **Tests automatizados**: Cobertura de unit tests (backend) y E2E (frontend con Playwright).

### Media prioridad
4. **Labels de categorías en reportes**: Mapear claves raw de la API a nombres legibles.
5. **Portal del cliente**: Implementar UI web para que tutores vean historial de su mascota.
6. **OPENAI_API_KEY**: Configurar para sugerencias IA reales.
7. **Recordatorios automáticos**: Implementar envío de recordatorios de vacunas y citas.

### Baja prioridad
8. **Exportar reportes a CSV/Excel**.
9. **App móvil** (React Native o PWA).
10. **Integración WhatsApp Business API**.
11. **Mover página de impresión** fuera del layout `(app)` para impresión limpia.

---

## 9. Criterios de Lanzamiento (Definition of Done)

Para considerar TukiVet listo para producción:
- [ ] Todos los flujos críticos (§6) funcionan sin errores
- [ ] Facturación SUNAT validada con OSE en ambiente de prueba
- [ ] Enum `encounter.type` migrado con `grooming`/`boarding`
- [ ] Backup automatizado de base de datos configurado
- [ ] SSL/HTTPS configurado en dominio de producción
- [ ] Variables de entorno de producción definidas (sin valores de desarrollo)
- [ ] Tests E2E de flujos críticos pasando en CI/CD
- [ ] Capacitación del equipo de la clínica completada

---

*Documento generado automáticamente el 2026-06-13 basado en el estado actual del codebase.*
