"""Catálogo de permisos y mapeo de roles por defecto.

Cada permiso es un código `dominio:accion`. Los roles son colecciones de permisos.
Cuando se registra una organización, se replican estos roles para esa org.
"""

from __future__ import annotations

from typing import Final

# ---------- Catálogo de permisos ----------
# Crecerá conforme se agreguen módulos en sprints siguientes.

PERMISSIONS: Final[dict[str, str]] = {
    # organización y sedes
    "organization:read": "Ver datos de la organización",
    "organization:update": "Editar datos de la organización",
    "branch:read": "Ver sedes",
    "branch:write": "Crear/editar sedes",
    # usuarios y roles
    "user:read": "Ver usuarios",
    "user:write": "Crear/editar usuarios",
    "user:assign_role": "Asignar roles a usuarios",
    "role:read": "Ver roles y permisos",
    "role:write": "Modificar roles personalizados",
    # clientes y mascotas (sprint 2)
    "customer:read": "Ver clientes",
    "customer:write": "Crear/editar clientes",
    "customer:delete": "Eliminar (soft) clientes",
    "pet:read": "Ver mascotas",
    "pet:write": "Crear/editar mascotas",
    "pet:delete": "Eliminar (soft) mascotas",
    # historia clínica (sprint 3)
    "encounter:read": "Ver encuentros clínicos",
    "encounter:write": "Crear y completar encuentros",
    "encounter:close": "Cerrar encuentros",
    "encounter:amend": "Enmendar encuentros cerrados",
    "vital:write": "Registrar signos vitales",
    # vacunas (sprint 4)
    "vaccine:read": "Ver vacunas",
    "vaccine:administer": "Administrar vacunas",
    # recetas (sprint 7)
    "prescription:read": "Ver recetas",
    "prescription:write": "Crear recetas",
    "prescription:dispense": "Dispensar recetas",
    # inventario (sprint 5)
    "inventory:read": "Ver inventario y movimientos",
    "inventory:write": "Registrar movimientos de inventario",
    "product:write": "Mantener catálogo de productos",
    # citas (sprint 6)
    "appointment:read": "Ver citas",
    "appointment:write": "Crear/editar citas",
    "appointment:cancel": "Cancelar citas",
    # comercial (sprint 8)
    "order:read": "Ver órdenes/tickets",
    "order:write": "Crear/editar órdenes",
    "order:void": "Anular órdenes",
    "payment:read": "Ver pagos",
    "payment:record": "Registrar pagos",
    "payment:refund": "Procesar devoluciones",
    "cash_session:read": "Ver sesiones de caja",
    "cash_session:manage": "Abrir/cerrar caja",
    # facturación electrónica (sprint 9-12)
    "invoice:read": "Ver comprobantes electrónicos",
    "invoice:emit": "Emitir comprobantes electrónicos",
    "invoice:void": "Anular comprobantes",
    # reportes y auditoría
    "report:read": "Ver reportes y KPIs",
    "audit:read": "Ver auditoría",
}


# ---------- Roles por defecto ----------

ROLE_OWNER: Final = "owner"
ROLE_VET: Final = "vet"
ROLE_TECH: Final = "tech"
ROLE_RECEPTION: Final = "reception"
ROLE_ACCOUNTANT: Final = "accountant"

ALL_PERMISSIONS: Final = list(PERMISSIONS.keys())

DEFAULT_ROLES: Final[dict[str, dict[str, object]]] = {
    ROLE_OWNER: {
        "name": "Propietario",
        "description": "Acceso total a la organización",
        "permissions": ALL_PERMISSIONS,
    },
    ROLE_VET: {
        "name": "Veterinario/a",
        "description": "Atención clínica completa",
        "permissions": [
            "organization:read",
            "branch:read",
            "customer:read",
            "customer:write",
            "pet:read",
            "pet:write",
            "encounter:read",
            "encounter:write",
            "encounter:close",
            "encounter:amend",
            "vital:write",
            "vaccine:read",
            "vaccine:administer",
            "prescription:read",
            "prescription:write",
            "prescription:dispense",
            "inventory:read",
            "appointment:read",
            "appointment:write",
            "appointment:cancel",
            "report:read",
        ],
    },
    ROLE_TECH: {
        "name": "Técnico/a",
        "description": "Soporte clínico (signos vitales, dispensación)",
        "permissions": [
            "customer:read",
            "pet:read",
            "encounter:read",
            "vital:write",
            "vaccine:read",
            "vaccine:administer",
            "prescription:read",
            "prescription:dispense",
            "inventory:read",
            "appointment:read",
        ],
    },
    ROLE_RECEPTION: {
        "name": "Recepción",
        "description": "Front desk: clientes, citas, cobros y comprobantes",
        "permissions": [
            "organization:read",
            "branch:read",
            "customer:read",
            "customer:write",
            "pet:read",
            "pet:write",
            "encounter:read",
            "vaccine:read",
            "appointment:read",
            "appointment:write",
            "appointment:cancel",
            "inventory:read",
            "order:read",
            "order:write",
            "payment:read",
            "payment:record",
            "cash_session:read",
            "cash_session:manage",
            "invoice:read",
            "invoice:emit",
        ],
    },
    ROLE_ACCOUNTANT: {
        "name": "Contador/a",
        "description": "Acceso de sólo lectura financiera + reportes",
        "permissions": [
            "organization:read",
            "branch:read",
            "customer:read",
            "order:read",
            "payment:read",
            "cash_session:read",
            "invoice:read",
            "report:read",
            "audit:read",
        ],
    },
}
