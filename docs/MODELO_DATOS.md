# Modelo de datos — TukiVet

Última actualización: 2026-06-01

Convenciones:
- PK: ULID en columna `id` (`VARCHAR(26)` o `UUID` binario equivalente).
- FK: `<entidad>_id`.
- Timestamps: `created_at`, `updated_at` (`TIMESTAMPTZ DEFAULT NOW()`), `deleted_at TIMESTAMPTZ NULL` para soft delete.
- Auditoría: `created_by`, `updated_by` (FK a `user.id`).
- Estados (enums): `VARCHAR` con CHECK constraint, no `ENUM` postgres (evita migraciones costosas).
- Dinero: `NUMERIC(12, 2)` siempre.

---

## 1. Organización y autenticación

### `organization`
Empresa/clínica. Aunque hoy hay sólo una, modelamos formalmente.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| legal_name | VARCHAR(255) | Razón social SUNAT |
| trade_name | VARCHAR(255) | Nombre comercial |
| ruc | VARCHAR(11) UNIQUE | RUC del negocio |
| address | VARCHAR(500) | |
| phone | VARCHAR(20) | |
| email | VARCHAR(255) | |
| sunat_data_bank_code | VARCHAR(50) NULL | Código de registro de banco de datos ante ANPD |
| tukifact_api_key | TEXT (cifrado) | API key para emisión |
| logo_url | VARCHAR(500) NULL | |
| settings | JSONB | Configuración: moneda, IGV%, formato fecha, etc. |
| created_at, updated_at, deleted_at | | |

### `branch`
Sede (1..N por organización).

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| organization_id | FK | |
| name | VARCHAR(255) | "Sede principal" |
| address | VARCHAR(500) | |
| phone | VARCHAR(20) | |
| is_main | BOOLEAN DEFAULT FALSE | Una por org |
| timezone | VARCHAR(50) DEFAULT 'America/Lima' | |
| created_at, updated_at, deleted_at | | |

### `user`
Usuarios del sistema (staff). NO incluye clientes externos.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| organization_id | FK | |
| email | VARCHAR(255) UNIQUE | |
| password_hash | TEXT | argon2id |
| full_name | VARCHAR(255) | |
| phone | VARCHAR(20) NULL | |
| professional_id | VARCHAR(50) NULL | Colegiatura CMVP para veterinarios |
| status | VARCHAR(20) | active / disabled / pending |
| last_login_at | TIMESTAMPTZ NULL | |
| created_at, updated_at, deleted_at | | |

### `role`
Roles predefinidos (seed).

| id | name |
|---|---|
| ULID | owner |
| ULID | vet |
| ULID | tech |
| ULID | reception |
| ULID | accountant |

### `user_role`
N:M user ↔ role (un usuario puede tener varios roles).

| user_id | role_id | branch_id (NULL = todas las sedes) |

### `permission`
Permisos granulares.

| Campo | Tipo |
|---|---|
| code | VARCHAR(100) PK | ej: `encounters:write`, `invoices:emit` |
| description | TEXT |

### `role_permission`
N:M role ↔ permission.

### `refresh_token`
Para JWT refresh rotation.

| id | user_id | jti | issued_at | expires_at | revoked_at NULL | replaced_by NULL |

### `audit_log`
Auditoría inmutable.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| actor_user_id | FK NULL (NULL si es sistema) |
| action | VARCHAR(100) | `customer.created`, `encounter.closed`, etc. |
| target_type | VARCHAR(100) |
| target_id | VARCHAR(26) |
| before | JSONB NULL |
| after | JSONB NULL |
| ip | INET NULL |
| user_agent | TEXT NULL |
| created_at | TIMESTAMPTZ |

Índice: `(organization_id, created_at DESC)`, `(target_type, target_id)`.

---

## 2. Clientes y mascotas

### `customer`
Tutor / dueño de mascota.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| organization_id | FK | |
| document_type | VARCHAR(10) | DNI, RUC, CE (carnet ext.), PASSPORT |
| document_number | VARCHAR(20) | |
| document_number_hash | VARCHAR(64) | hash para búsqueda (cifrado el original con pgcrypto) |
| first_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| business_name | VARCHAR(255) NULL | Si es RUC (razón social) |
| email | VARCHAR(255) NULL | |
| phone_primary | VARCHAR(20) | |
| phone_secondary | VARCHAR(20) NULL | |
| whatsapp_opted_in | BOOLEAN DEFAULT TRUE | |
| email_opted_in | BOOLEAN DEFAULT TRUE | |
| address | VARCHAR(500) NULL | |
| district | VARCHAR(100) NULL | |
| city | VARCHAR(100) DEFAULT 'Lima' | |
| birth_date | DATE NULL | |
| gender | VARCHAR(20) NULL | |
| referral_source | VARCHAR(100) NULL | "Google", "amigo", "vecino" |
| notes | TEXT NULL | Notas internas |
| created_at, updated_at, deleted_at | | |

UNIQUE: `(organization_id, document_type, document_number)`
Índice: full-text `tsvector` sobre `first_name + last_name + business_name + phone_primary`.

### `pet`
Mascota.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| organization_id | FK | |
| name | VARCHAR(100) | |
| species | VARCHAR(50) | dog, cat, bird, rabbit, exotic, other |
| breed_id | FK NULL | ref a `breed` |
| sex | VARCHAR(10) | male / female / unknown |
| birth_date | DATE NULL | |
| birth_date_estimated | BOOLEAN DEFAULT FALSE | |
| color | VARCHAR(100) NULL | |
| distinguishing_marks | TEXT NULL | |
| microchip | VARCHAR(20) NULL | 15 dígitos ISO 11784/11785 |
| tattoo | VARCHAR(50) NULL | |
| sterilized | BOOLEAN DEFAULT FALSE | |
| sterilization_date | DATE NULL | |
| status | VARCHAR(20) | active / deceased / transferred / lost |
| deceased_date | DATE NULL | |
| deceased_reason | TEXT NULL | |
| alerts | JSONB | array de alertas: agresivo, miedoso, alergia X |
| chronic_conditions | JSONB | array de condiciones crónicas |
| current_weight_kg | NUMERIC(6,2) NULL | snapshot último peso |
| current_weight_at | TIMESTAMPTZ NULL | |
| photo_url | VARCHAR(500) NULL | |
| created_at, updated_at, deleted_at | | |

Índice: `microchip` UNIQUE PARTIAL (where microchip is not null)
Full-text sobre `name + species + breed_name + color`.

### `breed`
Catálogo de razas.

| id | species | name_es | name_en |

Seed con ~200 razas comunes (caninos AKC + felinos).

### `pet_owner`
N:M customer ↔ pet con rol.

| Campo | Tipo |
|---|---|
| customer_id | FK |
| pet_id | FK |
| role | VARCHAR(20) (primary / secondary / emergency) |
| created_at | |

PK: `(customer_id, pet_id)`. Unique: un pet tiene exactamente un `primary`.

### `pet_weight_history`
Histórico de pesos.

| id | pet_id | weight_kg | measured_at | encounter_id NULL | recorded_by |

Útil para gráficos.

---

## 3. Historia clínica

### `encounter`
Visita/encuentro clínico. Cada vez que la mascota va a la clínica.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| organization_id | FK | |
| branch_id | FK | |
| pet_id | FK | |
| customer_id | FK | tutor que vino (puede no ser el primary) |
| veterinarian_id | FK to user | |
| appointment_id | FK NULL | si vino con cita previa |
| type | VARCHAR(30) | consultation / vaccination / surgery / emergency / follow_up |
| chief_complaint | TEXT NULL | motivo (corto) |
| status | VARCHAR(20) | open / in_progress / closed / amended |
| started_at | TIMESTAMPTZ | |
| closed_at | TIMESTAMPTZ NULL | |
| total_amount | NUMERIC(12,2) DEFAULT 0 | snapshot al cierre |
| order_id | FK NULL | al ticket generado |
| created_at, updated_at | | |

NO soft-delete: nunca se borra. Sólo "amend".

### `encounter_amendment`
Cuando un encounter cerrado se enmienda.

| id | encounter_id | amended_by_user_id | reason | before_snapshot JSONB | after_snapshot JSONB | created_at |

### `soap_note`
1:1 con encounter (o 1:N si hay enmiendas → la activa).

| Campo | Tipo |
|---|---|
| id | PK |
| encounter_id | FK |
| subjective | TEXT | texto largo |
| objective | JSONB | estructurado: sistemas, examen físico, observaciones |
| assessment | JSONB | diagnósticos: array de { code (VeNom o libre), description, type: presumptive/definitive } |
| plan | JSONB | tratamientos, exámenes, recomendaciones, próxima cita |
| template_id | FK NULL | si se usó plantilla |
| is_current | BOOLEAN | true para la versión activa |
| version | INT DEFAULT 1 |
| created_at, updated_at |

### `vital_sign`
Signos vitales por encounter.

| Campo | Tipo |
|---|---|
| id | PK |
| encounter_id | FK |
| measured_at | TIMESTAMPTZ |
| temperature_c | NUMERIC(4,1) NULL |
| heart_rate_bpm | INT NULL |
| respiratory_rate | INT NULL |
| weight_kg | NUMERIC(6,2) NULL |
| body_condition_score | INT NULL CHECK (1..9) |
| mucous_membranes | VARCHAR(50) NULL |
| capillary_refill_seconds | NUMERIC(3,1) NULL |
| hydration_status | VARCHAR(50) NULL |
| recorded_by | FK to user |

### `problem`
Lista de problemas (POMR) por mascota — vive a través del tiempo.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| pet_id | FK |
| description | VARCHAR(255) |
| code | VARCHAR(50) NULL | VeNom |
| status | VARCHAR(20) | active / inactive / resolved |
| onset_date | DATE NULL |
| resolved_date | DATE NULL |
| notes | TEXT NULL |
| created_by_encounter_id | FK NULL |
| created_at, updated_at |

### `attachment`
Adjuntos a encounter o pet.

| id | organization_id | attachable_type (encounter/pet) | attachable_id | filename | mime_type | size_bytes | storage_key (S3) | uploaded_by | created_at |

### `soap_template`
Plantillas reutilizables.

| id | organization_id | name | type (consultation/vaccination/surgery/etc) | template JSONB | created_by | created_at |

---

## 4. Vacunación

### `vaccine_catalog`
Catálogo de vacunas disponibles.

| id | organization_id | name | species (puede ser dog/cat/all) | manufacturer | active | notes | created_at |

Seed con vacunas peruanas comunes: rabia, parvo, sextuple canina (DHPPi+L), triple felina, FeLV, Bordetella.

### `vaccine_administration`
Aplicación concreta de una vacuna.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| pet_id | FK |
| encounter_id | FK |
| vaccine_id | FK to vaccine_catalog |
| administered_by | FK to user |
| administered_at | TIMESTAMPTZ |
| lot_id | FK to inventory_lot NULL | si dispensado del stock |
| lot_number | VARCHAR(50) NULL | fallback si no de stock |
| expiry_date | DATE NULL | |
| site_of_application | VARCHAR(100) NULL | "MS izq subcutáneo" |
| next_dose_due_date | DATE NULL | calculado por protocolo |
| certificate_number | VARCHAR(50) NULL | nº correlativo en certificado oficial |
| notes | TEXT NULL |
| status | VARCHAR(20) | administered / cancelled |
| created_at, updated_at |

### `vaccine_protocol`
Protocolos por especie/edad.

| id | organization_id | species | age_min_weeks | age_max_weeks | vaccine_id | dose_number | interval_weeks_to_next | notes |

Seed:
- Cachorro canino: parvo+distemper a las 6w, refuerzo 9w, 12w; rabia 16w; refuerzo anual.
- Gatito: triple felina 8w, 12w, 16w; rabia 16w; FeLV opcional.

---

## 5. Medicamentos y recetas

### `prescription`
Cabecera de receta.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| encounter_id | FK |
| pet_id | FK |
| prescribed_by | FK to user |
| issued_at | TIMESTAMPTZ |
| diagnosis | TEXT NULL |
| notes | TEXT NULL |
| status | VARCHAR(20) | issued / dispensed_partial / dispensed_full / void |
| created_at, updated_at |

### `prescription_item`
Línea de receta.

| Campo | Tipo |
|---|---|
| id | PK |
| prescription_id | FK |
| medication_id | FK to product NULL | si producto del catálogo |
| medication_name | VARCHAR(255) | siempre (snapshot, por si producto cambia) |
| active_ingredient | VARCHAR(255) NULL |
| dose_mg_per_kg | NUMERIC(8,3) NULL |
| total_dose_mg | NUMERIC(10,3) NULL |
| presentation | VARCHAR(100) NULL | "Tableta 50mg", "Suspensión 50mg/ml" |
| quantity | NUMERIC(10,2) | unidades a entregar |
| frequency | VARCHAR(100) | "Cada 12h", "BID", "SID" |
| duration_days | INT NULL |
| route | VARCHAR(50) | oral, sc, im, iv, topical, ocular |
| instructions | TEXT NULL |
| dispensed_qty | NUMERIC(10,2) DEFAULT 0 |
| dispensed_at | TIMESTAMPTZ NULL |
| dispensed_by | FK to user NULL |
| lot_id | FK to inventory_lot NULL |
| is_controlled | BOOLEAN DEFAULT FALSE |
| witness_user_id | FK NULL | testigo para controlados |

---

## 6. Inventario

### `product`
Catálogo unificado: medicamentos, vacunas, alimento, accesorios, insumos.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| organization_id | FK | |
| sku | VARCHAR(50) | único por org |
| name | VARCHAR(255) | |
| category | VARCHAR(50) | medication / vaccine / food / accessory / supply / service-derived |
| subcategory | VARCHAR(100) NULL | |
| presentation | VARCHAR(100) NULL | |
| active_ingredient | VARCHAR(255) NULL | |
| manufacturer | VARCHAR(100) NULL | |
| is_controlled | BOOLEAN DEFAULT FALSE | |
| barcode | VARCHAR(50) NULL | |
| unit | VARCHAR(20) | tableta, ml, kg, unidad |
| reorder_point | NUMERIC(10,2) NULL | |
| reorder_qty | NUMERIC(10,2) NULL | |
| sale_price | NUMERIC(12,2) | |
| sale_price_includes_igv | BOOLEAN DEFAULT TRUE | |
| igv_affected | BOOLEAN DEFAULT TRUE | |
| sunat_code | VARCHAR(20) NULL | catálogo SUNAT (UN/SUNAT) |
| active | BOOLEAN DEFAULT TRUE | |
| created_at, updated_at, deleted_at | | |

UNIQUE: `(organization_id, sku)`.
Full-text sobre `name + active_ingredient + manufacturer`.

### `inventory_lot`
Lote.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| product_id | FK |
| lot_number | VARCHAR(50) |
| expiry_date | DATE |
| received_at | DATE |
| supplier_id | FK NULL |
| unit_cost | NUMERIC(12,4) | costo unitario al recibir |
| initial_qty | NUMERIC(12,2) |
| current_qty | NUMERIC(12,2) |
| status | VARCHAR(20) | active / depleted / expired / recalled |
| created_at, updated_at |

UNIQUE: `(product_id, lot_number)`.
Índice: `(product_id, expiry_date)` para FIFO.

### `inventory_movement`
Movimiento.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| product_id | FK |
| lot_id | FK NULL |
| type | VARCHAR(20) | purchase / sale / dispensation / adjustment / waste / transfer |
| quantity | NUMERIC(12,2) | signed: + ingresa, - sale |
| unit_cost | NUMERIC(12,4) NULL |
| reference_type | VARCHAR(50) NULL | order, encounter, prescription, etc. |
| reference_id | VARCHAR(26) NULL |
| reason | TEXT NULL |
| performed_by | FK to user |
| witness_user_id | FK NULL |
| created_at |

### `supplier`
Proveedores.

| id | organization_id | name | ruc | contact_name | phone | email | address | active | created_at |

---

## 7. Citas

### `appointment`
| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| branch_id | FK |
| pet_id | FK NULL | NULL si es para "mascota nueva sin registrar" |
| customer_id | FK |
| veterinarian_id | FK to user |
| room_id | FK NULL |
| type | VARCHAR(50) | consultation / vaccine / surgery / follow_up |
| starts_at | TIMESTAMPTZ |
| ends_at | TIMESTAMPTZ |
| status | VARCHAR(20) | scheduled / confirmed / in_progress / completed / no_show / cancelled |
| confirmed_at | TIMESTAMPTZ NULL |
| cancelled_at | TIMESTAMPTZ NULL |
| cancel_reason | TEXT NULL |
| notes | TEXT NULL |
| source | VARCHAR(20) | staff / portal / whatsapp |
| created_at, updated_at |

Índice: `(veterinarian_id, starts_at)`, `(branch_id, starts_at)`.

### `room`
Salas / consultorios.

| id | organization_id | branch_id | name | type (consultation / surgery / hospitalization) | active |

### `time_off`
Bloqueos de agenda (vacaciones, almuerzo).

| id | organization_id | user_id NULL (NULL = bloqueo de la sede) | room_id NULL | starts_at | ends_at | reason |

---

## 8. Comercial: servicios, órdenes, pagos

### `service_catalog`
Servicios facturables (consulta, vacuna, cirugía, etc.). Separado de `product` porque no tiene stock.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| code | VARCHAR(30) | |
| name | VARCHAR(255) |
| category | VARCHAR(50) | consultation / surgery / vaccination / lab / imaging / grooming / boarding |
| base_price | NUMERIC(12,2) |
| price_includes_igv | BOOLEAN DEFAULT TRUE |
| sunat_code | VARCHAR(20) NULL |
| active | BOOLEAN DEFAULT TRUE |
| created_at, updated_at, deleted_at |

### `order`
Ticket / orden de venta.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| branch_id | FK |
| encounter_id | FK NULL | si vino de una visita |
| customer_id | FK |
| status | VARCHAR(20) | draft / open / paid / partially_paid / void |
| number | INT | correlativo por sede |
| issued_at | TIMESTAMPTZ |
| subtotal | NUMERIC(12,2) |
| igv_amount | NUMERIC(12,2) |
| discount_amount | NUMERIC(12,2) DEFAULT 0 |
| total | NUMERIC(12,2) |
| paid_amount | NUMERIC(12,2) DEFAULT 0 |
| balance | NUMERIC(12,2) | total - paid |
| notes | TEXT NULL |
| created_by | FK to user |
| created_at, updated_at |

### `order_item`
| Campo | Tipo |
|---|---|
| id | PK |
| order_id | FK |
| product_id | FK NULL |
| service_id | FK NULL |
| description | VARCHAR(500) | snapshot |
| quantity | NUMERIC(10,2) |
| unit_price | NUMERIC(12,2) |
| discount_pct | NUMERIC(5,2) DEFAULT 0 |
| igv_amount | NUMERIC(12,2) |
| subtotal | NUMERIC(12,2) |
| total | NUMERIC(12,2) |
| lot_id | FK NULL | si producto, lote del que se vende |
| reference_type | VARCHAR(50) NULL | encounter, prescription, vaccine |
| reference_id | VARCHAR(26) NULL |

CHECK: exactly one of `product_id` o `service_id` no null.

### `payment`
| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| order_id | FK |
| method | VARCHAR(30) | cash / yape / plin / transfer / pos_card / online_culqi / credit |
| amount | NUMERIC(12,2) |
| reference | VARCHAR(100) NULL | nº de operación Yape/Plin/transferencia |
| voucher_image_key | VARCHAR(500) NULL | S3 key para foto |
| received_by | FK to user |
| received_at | TIMESTAMPTZ |
| status | VARCHAR(20) | confirmed / pending / refunded / void |
| online_provider_id | VARCHAR(100) NULL | si online: Culqi charge id |
| online_provider_data | JSONB NULL |
| created_at, updated_at |

### `cash_session`
Apertura/cierre de caja por usuario/turno.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| branch_id | FK |
| user_id | FK |
| opened_at | TIMESTAMPTZ |
| opening_balance | NUMERIC(12,2) |
| closed_at | TIMESTAMPTZ NULL |
| closing_balance_declared | NUMERIC(12,2) NULL |
| closing_balance_calculated | NUMERIC(12,2) NULL |
| difference | NUMERIC(12,2) NULL |
| notes | TEXT NULL |
| created_at, updated_at |

### `customer_account`
Saldo de crédito del cliente (cuando se les fia).

| customer_id | balance | credit_limit | last_payment_at |

---

## 9. Facturación electrónica (TukiFact)

### `electronic_document`
Comprobante emitido.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| organization_id | FK | |
| order_id | FK NULL | |
| type | VARCHAR(10) | 01=factura, 03=boleta, 07=NC, 08=ND |
| series | VARCHAR(4) | F001, B001 |
| number | INT | |
| customer_id | FK | |
| customer_document_type | VARCHAR(10) | snapshot |
| customer_document_number | VARCHAR(20) | |
| customer_name | VARCHAR(255) | |
| customer_address | VARCHAR(500) NULL | |
| issued_at | TIMESTAMPTZ | |
| currency | VARCHAR(3) DEFAULT 'PEN' | |
| subtotal | NUMERIC(12,2) | |
| igv_amount | NUMERIC(12,2) | |
| total | NUMERIC(12,2) | |
| status | VARCHAR(20) | pending / accepted / rejected / cancelled |
| tukifact_id | VARCHAR(100) NULL | `doc_xxx` |
| tukifact_status | VARCHAR(20) NULL | accepted / rejected |
| sunat_code | VARCHAR(10) NULL | CDR code |
| sunat_message | TEXT NULL | |
| xml_storage_key | VARCHAR(500) NULL | S3 key del XML firmado |
| pdf_storage_key | VARCHAR(500) NULL | |
| cdr_storage_key | VARCHAR(500) NULL | |
| xml_hash_sha256 | VARCHAR(64) NULL | |
| referenced_document_id | FK NULL | para NC/ND |
| cancellation_reason | TEXT NULL | |
| created_at, updated_at |

UNIQUE: `(organization_id, series, number)`.

### `electronic_document_event`
Log de eventos (intentos, webhooks).

| id | electronic_document_id | event_type (sent_to_provider / accepted / rejected / void_requested / void_accepted) | data JSONB | occurred_at |

### `document_series_counter`
Correlativos.

| organization_id | type | series | next_number |

---

## 10. Comunicación y notificaciones

### `notification`
Log de envíos.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| channel | VARCHAR(20) | whatsapp / email / sms / push |
| recipient | VARCHAR(255) | número o email |
| template_code | VARCHAR(100) | |
| template_data | JSONB | |
| body_preview | TEXT NULL | |
| status | VARCHAR(20) | queued / sent / delivered / read / failed |
| provider | VARCHAR(50) | twilio / etc |
| provider_message_id | VARCHAR(100) NULL |
| error_message | TEXT NULL |
| sent_at | TIMESTAMPTZ NULL |
| delivered_at | TIMESTAMPTZ NULL |
| read_at | TIMESTAMPTZ NULL |
| related_type | VARCHAR(50) NULL | appointment / vaccine / invoice |
| related_id | VARCHAR(26) NULL |
| cost_estimate | NUMERIC(10,4) NULL | |
| created_at, updated_at |

### `message_template`
Plantillas (HSM para WhatsApp + email).

| id | organization_id | code | channel | name | locale | body | variables JSONB | provider_template_id NULL | status (draft/approved/disabled) | created_at, updated_at |

---

## 11. Portal del cliente

### `customer_credential`
Acceso al portal por parte del tutor.

| customer_id | password_hash NULL | magic_link_email_enabled | magic_link_whatsapp_enabled | last_login_at |

### `customer_session`
Sesiones del portal.

| id | customer_id | jti | issued_at | expires_at | revoked_at NULL |

### `consent`
Consentimientos firmados.

| Campo | Tipo |
|---|---|
| id | PK |
| organization_id | FK |
| customer_id | FK |
| type | VARCHAR(50) | data_processing / treatment / surgery / image_use |
| version | VARCHAR(20) | hash o nº de versión del texto consentido |
| accepted_at | TIMESTAMPTZ |
| ip | INET NULL |
| user_agent | TEXT NULL |
| document_storage_key | VARCHAR(500) NULL | si firmado en PDF |
| body_hash | VARCHAR(64) | hash del texto exacto consentido |
| created_at |

### `data_subject_request`
Pedidos ARCO (Ley 29733).

| id | customer_id | type (access / rectification / cancellation / opposition) | description | status (pending / processing / completed / rejected) | requested_at | responded_at NULL | response | handled_by NULL |

---

## 12. Reportes / KPIs (vistas materializadas)

No son tablas — son materialized views refrescadas por job nocturno:

- `mv_kpi_active_patients` — pacientes con visita últimos 12m por sede
- `mv_kpi_revenue_by_vet_monthly` — ingresos por vet por mes
- `mv_kpi_inventory_turnover` — rotación por categoría
- `mv_kpi_vaccine_compliance` — % al día por especie
- `mv_kpi_no_show_rate` — citas no asistidas

---

## 13. Tablas técnicas

### `outbox`
Eventos de dominio para handlers async (ADR-006).

| id | organization_id | event_type | payload JSONB | attempts | next_attempt_at NULL | succeeded_at NULL | failed_permanently_at NULL | last_error TEXT NULL | created_at |

### `idempotency_key`
| key | endpoint | response_hash | response_body JSONB | created_at | expires_at |

### `job` / `job_log`
ARQ ya maneja jobs en Redis; sólo guardamos resultados/errores si conviene.

### `feature_flag`
| organization_id | code | enabled | data JSONB | updated_at |

Ej: `enable_culqi_payments`, `enable_ai_soap_dictation`.

---

## 14. Relaciones críticas (resumen visual)

```
organization 1─┬─N branch
               ├─N user ─┬N user_role ─ role
               ├─N customer ─N pet_owner ─ pet
               │                            │
               │                            ├─N encounter ─ soap_note
               │                            │              ├─ vital_sign
               │                            │              ├─ vaccine_administration
               │                            │              ├─ prescription ─N prescription_item
               │                            │              └─ attachment
               │                            ├─N problem
               │                            └─N pet_weight_history
               │
               ├─N product ─N inventory_lot ─N inventory_movement
               ├─N appointment ─ pet
               ├─N order ─N order_item
               │           └─N payment
               ├─N electronic_document ─ order
               ├─N notification ─ customer
               └─N audit_log
```

---

## 15. Estimación de volumen (5 años)

Para una veterinaria con ~3 vets, ~3000 pacientes activos, ~25 consultas/día:

| Tabla | Filas 5 años | Comentario |
|---|---|---|
| customer | ~5,000 | crecimiento lineal |
| pet | ~8,000 | algunos clientes con múltiples mascotas |
| encounter | ~50,000 | 25/día × 250 días/año × 5 años |
| soap_note | ~50,000 | 1:1 |
| vital_sign | ~50,000 | 1+ por encounter |
| vaccine_administration | ~30,000 | |
| prescription_item | ~80,000 | ~1.5 por encounter |
| inventory_movement | ~500,000 | el más grande, conviene partition por año |
| order | ~50,000 | |
| order_item | ~150,000 | |
| payment | ~70,000 | |
| electronic_document | ~50,000 | |
| notification | ~250,000 | recordatorios diarios |
| audit_log | ~5,000,000 | ~3000/día — partition por mes |

Postgres maneja esto sin sudar. Lo que sí: índices correctos + partitioning en `audit_log` y `inventory_movement` cuando se acerquen al millón.
