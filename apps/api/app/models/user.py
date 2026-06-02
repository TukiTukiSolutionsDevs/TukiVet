"""Usuario del sistema (staff) y asignación de roles."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.permission import Role


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    PENDING = "pending"


class User(Base, IDMixin, TimestampMixin):
    """Usuario interno del sistema (vet, recepción, etc.). NO incluye clientes."""

    __tablename__ = "user"

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    professional_id: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=UserStatus.ACTIVE.value,
        server_default=UserStatus.ACTIVE.value,
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    organization: Mapped[Organization] = relationship(back_populates="users")
    user_roles: Mapped[list[UserRole]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    @property
    def is_active(self) -> bool:
        return self.status == UserStatus.ACTIVE.value and self.deleted_at is None


class UserRole(Base, TimestampMixin):
    """Asignación de un rol a un usuario.

    En Sprint 1 sólo hay una sede, así que no se acota por branch. Cuando se
    necesite scoping por sede, agregar branch_id con su propio FK + unique.
    """

    __tablename__ = "user_role"

    user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("role.id", ondelete="CASCADE"),
        primary_key=True,
    )

    user: Mapped[User] = relationship(back_populates="user_roles")
    role: Mapped[Role] = relationship(back_populates="user_roles")
