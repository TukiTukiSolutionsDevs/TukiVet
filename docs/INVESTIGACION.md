# Investigación de mercado — SaaS Veterinario (Perú / LATAM)

Última actualización: 2026-06-01
Fuentes: SUNAT, SENASA, ANPD, sitios oficiales de PIMS veterinarios líderes y blogs especializados (CoVet, IDEXX, Provet, Shepherd, Digitail, NubeFact, Culqi/Niubiz/Izipay docs).

---

## 1. Estado del mercado: PIMS líderes en 2025–2026

PIMS = *Practice Information Management System* (sistema integral de gestión clínica para veterinaria).

### 1.1 Comparativa rápida

| Sistema | Despliegue | Sweet spot | Precio aprox. | Fortaleza distintiva |
|---|---|---|---|---|
| **ezyVet** (IDEXX) | Cloud | Hospitales grandes, multi-sede, especialidad, equinos | desde USD 245/mes + implementación | Configurabilidad enterprise, integración IDEXX profunda, AI-Assisted Notes |
| **Cornerstone** (IDEXX) | Server (on-prem) | Clínicas medianas/grandes multi-doctor | Licencia + soporte | Estándar de la industria USA |
| **IDEXX Neo** | Cloud | Clínica general pequeña/mediana | Suscripción | Onboarding rápido, integrado a IDEXX |
| **Provet Cloud** | Cloud | Multi-sede, grupos enterprise EU/Nordics | Por usuario | AI summaries, dashboard 360, multi-clínica |
| **Shepherd** | Cloud | Indep. small-animal y startups | USD 299–749/mes (escalado por usuarios) | Diseñado por vets, SOAP nativo, charge capture automático |
| **Covetrus Pulse** | Cloud | Clínicas en ecosistema Covetrus | USD 100–276/mes | Suite con farmacia + supply + pagos |
| **DaySmart Vet** | Cloud | Solo practitioners, house-call | Suscripción | Setup simple, mobile-first |
| **Digitail** | Cloud | Clínicas en crecimiento, foco cliente | Suscripción | UX moderna, **pet parent app móvil**, AI SOAP dictation |
| **Avimark** | On-prem | Clínicas small-mid que prefieren control local | Licencia | Largo track record, sin dependencia de internet |
| **Hippo Manager**, **eVetPractice**, **Onward Vet**, **Animana**, **Vetter** | Cloud | Pequeñas/medianas | Suscripción | Opciones más económicas, features básicos |

### 1.2 Tendencias 2025–2026 (todos están en esto)

1. **AI SOAP dictation** — el vet habla, el sistema genera el SOAP. Digitail, Shepherd (TranscribeAI), ezyVet (AI-Assisted Notes), CoVet (USD 45/usuario/mes como capa sobre cualquier PIMS).
2. **AI charge capture / facturación automática** — el sistema infiere los cargos desde el SOAP y los pone en la factura. Resuelve un dolor brutal: cargos olvidados = revenue perdido.
3. **Flowboard / whiteboard digital** — pizarra en tiempo real con estado de cada paciente (check-in → triage → consulta → hospitalización → alta).
4. **Mobile apps para el dueño** (pet parent): historial, recordatorios, agenda online, descarga de certificados, chat con la clínica. Digitail es el referente.
5. **Two-way SMS/WhatsApp** — recordatorios, confirmación de citas, encuestas NPS. En LATAM, WhatsApp es no-negociable.
6. **Integración con labs in-house y referencia** — IDEXX VetConnect, Antech, Heska, Sound PACS para imágenes.
7. **Telemedicina veterinaria** con documentación de VCPR (Veterinarian-Client-Patient Relationship).
8. **Wellness plans / suscripciones** — modelo Banfield: paquetes mensuales de salud preventiva (consultas + vacunas + desparasitación + descuentos en farmacia).
9. **Integraciones con farmacia / delivery** — pet pharmacy delivery (Covetrus, Petly).

### 1.3 Quejas comunes sobre PIMS existentes (oportunidades)

- UX lenta, navegación con 5+ clics para tareas frecuentes.
- Búsqueda pobre (no encuentra por chip, ni por raza, ni en notas).
- Falta integración WhatsApp en LATAM (la mayoría usan SMS o email genéricos).
- Contabilidad/facturación rígida, no integrada con SUNAT en Perú.
- No hay mobile app real para el dueño.
- Reporting estático, sin dashboards de KPIs accionables.
- Difícil migrar datos entre PIMS.
- Pricing alto (USD 200–500/mes por usuario es prohibitivo para clínica pequeña peruana).

---

## 2. Módulos funcionales esenciales

### 2.1 Núcleo clínico

#### Clientes (tutores) y pacientes (mascotas)
- 1 cliente → N mascotas. 1 mascota puede tener varios tutores (familia, codueños).
- Campos cliente: DNI/RUC, nombre, teléfonos, email, dirección, fecha de nacimiento, género, ocupación, fuente de referencia, preferencias de comunicación (WhatsApp/email/SMS), consentimientos firmados.
- Campos mascota: nombre, especie, raza, sexo, fecha de nacimiento (real o estimada), color/marcas, peso histórico, microchip, tatuaje, esterilizado (sí/no/fecha), alergias, problemas crónicos, foto, status (activo/fallecido/cedido).
- Identificación de la mascota: **microchip ISO 11784/11785** (15 dígitos) o tatuaje. En Perú, adopción de microchip es baja pero subiendo en Lima.

#### Historia Clínica Electrónica (EHR) con SOAP
- **POMR** (Problem-Oriented Medical Record) como modelo: lista de problemas activa + crónica.
- **SOAP** por encuentro:
  - **S**ubjetivo: motivo de consulta, historia, observaciones del dueño, dieta, comportamiento.
  - **O**bjetivo: signos vitales (T°, FC, FR, peso, BCS body condition score, mucosas, hidratación), examen físico por sistemas.
  - **A**ssessment: diagnóstico(s) presuntivo(s) y diferenciales.
  - **P**lan: tratamiento, exámenes solicitados, recomendaciones, próxima cita.
- Adjuntos: fotos, radiografías, ecografías, archivos.
- Plantillas por tipo de consulta (anual, vacunación, dermatología, oftalmología, urgencia).
- Firma electrónica del veterinario, timestamps de creación/modificación, historial de cambios (auditoría).

#### Agendamiento / citas
- Calendario por recurso: veterinario, sala, equipo (ecógrafo, dental, quirófano).
- Tipos de cita configurables (consulta general 30min, vacuna 15min, cirugía 90min, etc.).
- Lista de espera, no-shows, reagendamiento.
- **Reservas online** desde portal cliente.
- **Recordatorios** automáticos: 24h antes, día de la cita, post-cita NPS.

#### Vacunación
- Catálogo por especie:
  - Caninos: parvo, distemper, hepatitis, parainfluenza, leptospira, rabia, tos de las perreras (Bordetella).
  - Felinos: triple felina (panleucopenia, rinotraqueitis, calicivirus), leucemia felina, rabia.
- Calendario protocolo: cachorro (8/12/16 semanas, refuerzo anual), adulto (anual).
- Generación automática de **certificado de vacunación** (PDF).
- Recordatorios automáticos de refuerzos.
- Lote, fecha de vencimiento del biológico, sitio de aplicación.

#### Recetas y dispensación
- Catálogo de medicamentos veterinarios.
- Receta con: principio activo, presentación, dosis (mg/kg), frecuencia, duración, vía, indicaciones.
- Cálculo de dosis por peso (auto).
- Dispensación desde inventario (descuenta stock).
- **Sustancias controladas**: registro especial (similar a DEA en USA; en Perú es MINSA/DIGEMID). Bitácora con dispensaciones, testigos, conciliación periódica.

#### Laboratorio
- Solicitud (orden): hemograma, bioquímica, urianálisis, parasitológico, citología, cultivo, PCR, serología.
- Toma de muestra in-house o envío a lab externo.
- Captura de resultados (manual o por importación CSV/PDF/HL7).
- Vinculación a SOAP.
- Tendencias longitudinales (gráficos de creatinina en el tiempo, p.ej.).

#### Imágenes
- Subida de fotos y radiografías al expediente.
- Anotaciones simples (texto sobre imagen).
- **DICOM** queda para fase futura (V2).

### 2.2 Operación clínica

#### Hospitalización
- Admisión → ingreso a sala con cama asignada → kardex (medicación pautada por horario) → órdenes médicas → fluidoterapia → monitoreo de constantes → alta.
- **Flowboard** público (a pantalla en la clínica) con estado en tiempo real.
- Costos acumulados visibles para el dueño en tiempo real (opcional).

#### Cirugía
- Cotización pre-quirúrgica con desglose.
- **Consentimiento informado** firmado digitalmente (canvas o foto de la firma).
- Pre-quirúrgico (exámenes obligatorios).
- Hoja de anestesia.
- Hoja quirúrgica (procedimiento, hallazgos, materiales).
- Recovery y alta con instrucciones post-op.

### 2.3 Backoffice

#### Inventario
- SKU, código, nombre, categoría (medicamento / vacuna / alimento balanceado / accesorio / insumo).
- **Lotes** con fecha de vencimiento, cantidad por lote.
- Costo promedio ponderado, precio de venta.
- Movimientos: compra, venta, ajuste, merma, transferencia entre sedes.
- Alertas: stock bajo (reorder point), vencimiento próximo (60/30/7 días), vencidos.
- Métodos: FIFO para dispensación.

#### POS / Facturación
- Ticket de venta con líneas (servicios y productos).
- Aplicación de descuentos y promociones.
- Múltiples métodos de pago (efectivo, tarjeta, Yape, Plin, transferencia, crédito).
- Emisión de **comprobante electrónico SUNAT** (boleta o factura) — ver sección Perú.
- Notas de crédito y débito.
- Cuentas por cobrar (crédito a clientes con convenio).

#### Caja
- Apertura/cierre de caja por usuario y turno.
- Conciliación diaria.
- Reporte de cuadre vs. lo facturado.

#### Contabilidad
- Centro de costos por sede / vet / categoría de servicio.
- Reporte de ingresos por: servicio, producto, vet, día/mes/año.
- Egresos: compras de inventario, planilla, alquiler, servicios.
- P&L mensual.
- Exportación a Excel y formato CONTASIS/Concar para que el contador lo cargue (Perú).

#### CRM y comunicación
- Segmentación de clientes (mascotas con vacunas vencidas, clientes inactivos, clientes premium).
- Campañas: WhatsApp / email / SMS con plantillas.
- Recordatorios automáticos (vacunas, antiparasitarios, control anual).
- NPS post-visita.
- Referidos (programa).

#### Portal del cliente
- Login con DNI + clave o magic link al WhatsApp.
- Ver mascotas, historial, vacunas, recetas, archivos.
- Agendar cita online.
- Descargar certificados (vacunas, salud).
- Pagar saldos pendientes.
- Chat con la clínica (vía WhatsApp embebido o chat propio).

#### RBAC (control de acceso)
Roles típicos:
- **Super-admin** (operador del SaaS, multi-tenant)
- **Owner / dueño de clínica** (admin total de su tenant)
- **Veterinario** (clínica completa, sin acceso a configuración financiera)
- **Técnico veterinario / enfermería** (puede ver historia, registrar signos vitales, pesos, dispensaciones)
- **Recepción** (citas, registro de clientes, cobros, sin acceso a historia clínica detallada salvo lectura)
- **Contador** (solo módulo financiero / reportes)
- **Cliente** (portal cliente, solo sus mascotas)

### 2.4 Reportes (KPIs)

Top 10 KPIs que un PIMS debe tener listos:

1. **Active patients** (mascotas con visita en últimos 12–18m)
2. **Average Transaction Charge (ACT)** — benchmark USD 150–250
3. **Revenue per veterinarian (FTE)**
4. **Client retention rate** — target ≥75%
5. **Vaccine compliance** (% pacientes al día) — benchmark 80–87% real
6. **No-show rate** — <10%
7. **Appointment occupancy** (capacidad usada)
8. **Inventory turnover** — 4–6x/año
9. **Expiry rate** (% inventario vencido) — <5%
10. **NPS** — ≥70

---

## 3. Módulos opcionales / diferenciadores

| Módulo | Valor | Complejidad | Fase sugerida |
|---|---|---|---|
| Telemedicina (video + VCPR docs) | Alto post-COVID | Media | V2 |
| Boarding / pensión | Alto si la clínica lo ofrece | Media | V2 |
| Grooming / peluquería | Medio | Baja | V2 |
| Wellness plans (suscripción) | Alto (recurring revenue) | Media-Alta | V2 |
| Multi-sede / multi-clínica | Alto para cadenas | Alta | V2 |
| Integración microchip lookup | Medio | Baja | V1 (sólo guardar) |
| DICOM imaging | Alto para hospitales | Alta | V3 |
| Mobile app cliente (nativa) | Alto | Alta | V2/V3 |
| AI SOAP dictation | Muy diferencial | Media (con LLM) | V2 |
| Lab in-house integration (IDEXX) | Alto pero caro | Alta | V3 |
| Marketplace de productos | Medio | Alta | V3 |
| Pharmacy delivery | Medio | Media | V3 |

---

## 4. Estándares técnicos

- **HL7 FHIR**: no hay perfil veterinario maduro; uso vía adaptación.
- **VeNom Codes**: vocabulario veterinario controlado (problemas, diagnósticos, procedimientos) — usable para normalizar.
- **SNOMED-CT Veterinary Extension**: existe, licencia compleja.
- **DICOM**: estándar imaging (futuro).
- **Microchip ISO 11784/11785**: 15 dígitos, formato definido.
- **Privacidad**: GDPR como referencia, Ley 29733 Perú como obligatoria.

---

## 5. Contexto regulatorio Perú

### 5.1 SUNAT — Facturación electrónica
- **Obligatorio** desde 2022 para casi todos los contribuyentes (RS 279-2019/SUNAT y modificatorias).
- **Comprobante de Pago Electrónico (CPE)** — formato **UBL 2.1 XML firmado** + **CDR** (Constancia de Recepción).
- Tipos:
  - **Factura electrónica** (cliente con RUC)
  - **Boleta de venta electrónica** (cliente con DNI o sin documento)
  - **Nota de crédito electrónica** (anulación/devolución)
  - **Nota de débito electrónica**
  - **Guía de remisión electrónica** (transporte de productos)
- Vías de emisión:
  1. **SEE-SOL** (portal SUNAT, manual, gratis) — inviable para clínica con muchos comprobantes
  2. **Facturador SUNAT** (app de escritorio, gratis, requiere desarrollo de integración)
  3. **OSE** (Operador de Servicios Electrónicos) — terceros autorizados, vía API JSON/XML
  4. **PSE** (Proveedor de Servicios Electrónicos) — emite por cuenta del contribuyente
- **OSE recomendado para SaaS**: **Nubefact** (S/70/mes plan online, API JSON, autorizado SUNAT como OSE y PSE). Alternativas: Bsale, Defontana, Effa, Facturatech, eFact.
- **IGV** = 18% (gravado para servicios veterinarios; no encontré exoneración aplicable).
- **Régimen tributario** según ingresos: NRUS / RER / Mype Tributario / Régimen General. Para clínica veterinaria establecida con factura electrónica obligatoria, normalmente Mype Tributario o General.
- **SIRE** (Sistema Integrado de Registros Electrónicos) obligatorio para principales contribuyentes desde 2026.

### 5.2 SENASA — Sanidad animal
- **Registro de establecimientos**: clínicas veterinarias que expenden productos veterinarios requieren registro SENASA (RJ 031-98-AG-SENASA Anexo V).
- **Productos veterinarios registrados**: cada medicamento/vacuna/alimento debe estar en el registro de Insumos Pecuarios del SENASA. Las clínicas sólo pueden dispensar productos registrados.
- **Rabia**: vacunación obligatoria a perros y gatos según norma. Certificado de vacunación oficial debe contener: datos del propietario, datos del animal, lote y serie de la vacuna, fecha, sello y firma del MV.
- **Ley 30407 (Protección y Bienestar Animal)**: obliga al registro y prohíbe maltrato.
- **Trazabilidad de sustancias controladas**: anestésicos (ketamina, opioides) requieren bitácora especial.

### 5.3 Ley 29733 — Protección de Datos Personales
- **Reglamento actualizado: DS 016-2024-JUS** (importante: hay marco renovado).
- **Banco de datos personales** debe registrarse ante la **ANPD** (Autoridad Nacional de Protección de Datos Personales) — sí, una clínica veterinaria debe registrar su banco de datos de clientes.
- **Consentimiento informado, expreso, inequívoco** antes de tratar datos.
- **Derechos ARCO** (acceso, rectificación, cancelación, oposición) — implementar endpoints.
- **Designar oficial de datos personales**.
- **Medidas de seguridad** proporcionales a la sensibilidad.
- **Multas**: hasta 100 UIT (~S/ 535,000 al 2026).

### 5.4 Pagos en Perú
| Pasarela | Comisión | Fijo mensual | Yape/Plin | Plugins | Liquidez |
|---|---|---|---|---|---|
| **Culqi** | 3.44% + IGV (o 3.99% + S/1) | 0 | **Sí, nativo** | WooCommerce, Shopify, SDK | Mismo día con BCP |
| **Izipay** | 3.44% + S/0.69 + IGV | 0 | IzipayYa (limitado) | Plugin oficial | Inmediato Interbank |
| **Niubiz** | 3.5–5% + S/0.30 | ~S/59 | No nativo | API custom | 24–48h |
| **MercadoPago** | Variable | 0 | Billetera propia | Plugin oficial | Variable |

**Recomendación MVP**: **Culqi** (Yape/Plin nativo, sin fijo, plugins, mejor doc).

### 5.5 WhatsApp Business API
- **BSPs** (Business Solution Providers) disponibles en Perú: Twilio, 360Dialog, Gupshup, Wati, Sirena, Trengo, Whaticket.
- Solo se inicia conversación con **plantillas (HSM)** pre-aprobadas por Meta.
- Costos Meta + costos BSP (Twilio cobra USD ~0.005–0.07 por mensaje según país y categoría).
- Casos: recordatorio cita, recordatorio vacuna, confirmación reserva, NPS, factura/recibo, marketing.
- **Recomendación MVP**: **Twilio** (mejor doc, SDK Python, sandbox para desarrollo) o **360Dialog** (sin markup sobre tarifas Meta).

### 5.6 Identificación de mascotas
- Lima Metropolitana tiene **registro canino municipal** (Ordenanza 1855-2014). Cada perro debe estar registrado.
- No hay registro nacional unificado.
- Microchip: adopción creciente en Lima/centros premium, baja en provincias.

---

## 6. Competencia local en Perú/LATAM

- **Digitail** (Rumania, fuerte en LATAM con app móvil del dueño)
- **VetSoft** (Argentina, presencia regional)
- **Vetuel** (México)
- **Animal Vet** y otros locales (Perú) — más artesanales, sin facturación electrónica integrada
- **Davix Healthcare** (Perú, foco médico/salud, no veterinario per se)

**Oportunidad**: no hay un PIMS peruano con (a) facturación electrónica SUNAT nativa, (b) WhatsApp recordatorios, (c) Yape/Plin/Culqi integrado, (d) UX moderna. Eso es exactamente el hueco.

---

## 7. Flujos clave (workflows)

### 7.1 "Llega un perro nuevo"
1. Recepción: registra cliente (DNI/RUC) y mascota (especie, raza, edad, peso).
2. Triage: técnico toma signos vitales.
3. Vet: abre encuentro, llena SOAP (con plantilla), diagnostica.
4. Vet: prescribe + agrega cargos (consulta + vacuna + antiparasitario + alimento).
5. Recepción: cobra, emite boleta electrónica SUNAT, entrega ticket por WhatsApp.
6. Sistema: agenda recordatorio de próxima vacuna (configurado en el protocolo).

### 7.2 Cirugía electiva
1. Cotización pre-quirúrgica firmada por dueño (consentimiento informado).
2. Pre-quirúrgico: análisis sanguíneo + exámenes.
3. Día de cirugía: hoja de anestesia + hoja quirúrgica.
4. Recovery + alta con instrucciones post-op enviadas por WhatsApp.
5. Factura consolidada.
6. Follow-up automático al día 3 y día 10.

### 7.3 Hospitalización
1. Admisión → cama asignada.
2. Vet emite **órdenes médicas** (fluidos, medicación con horarios, monitoreo cada X horas).
3. Técnicos ejecutan el **kardex** (firmando cada administración).
4. Flowboard muestra estado en vivo a todo el equipo.
5. Alta → factura consolidada + instrucciones post-alta.

---

## 8. Conclusiones para el diseño del producto

1. **MVP debe ser cloud-first, multi-tenant**, listo para escalar a SaaS pero ejecutable contra 1 sola clínica al inicio.
2. **Facturación electrónica SUNAT vía Nubefact desde el día 1** — no negociable en Perú.
3. **WhatsApp recordatorios desde el día 1** — es el diferenciador local.
4. **Yape/Plin/Culqi desde fase temprana** — sin esto pierdes 40% de los cobros.
5. **UX rápida con búsqueda global** (cliente, mascota, chip, teléfono, todo) — es donde fallan los PIMS actuales.
6. **Flowboard digital y kardex** son el corazón operacional de una clínica con hospitalización.
7. **AI SOAP dictation** y **portal del cliente con app** son los diferenciadores V2.
8. **Cumplimiento Ley 29733** — registro de banco de datos, consentimientos, derechos ARCO desde MVP.
