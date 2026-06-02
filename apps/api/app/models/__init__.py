"""Modelos SQLAlchemy ORM. Importarlos aquí los registra en Base.metadata."""

from app.models.appointment import Appointment, Room, TimeOff
from app.models.audit_log import AuditLog
from app.models.breed import Breed
from app.models.customer import Customer
from app.models.encounter import Encounter, EncounterAmendment, SoapNote, VitalSign
from app.models.inventory import InventoryLot, InventoryMovement, Product, Supplier
from app.models.organization import Branch, Organization
from app.models.permission import Permission, Role, RolePermission
from app.models.pet import Pet, PetOwner, PetWeightHistory
from app.models.problem import Problem
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole, UserStatus
from app.models.vaccine import VaccineAdministration, VaccineCatalog

__all__ = [
    "Appointment",
    "AuditLog",
    "Branch",
    "Breed",
    "Customer",
    "Encounter",
    "EncounterAmendment",
    "InventoryLot",
    "InventoryMovement",
    "Organization",
    "Permission",
    "Pet",
    "PetOwner",
    "PetWeightHistory",
    "Problem",
    "Product",
    "RefreshToken",
    "Role",
    "RolePermission",
    "Room",
    "SoapNote",
    "Supplier",
    "TimeOff",
    "User",
    "UserRole",
    "UserStatus",
    "VaccineAdministration",
    "VaccineCatalog",
    "VitalSign",
]
