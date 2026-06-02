"""Permisos y roles."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import UserRole


class Permission(Base):
    """Catálogo global de permisos. Seeded en migración."""

    __tablename__ = "permission"

    code: Mapped[str] = mapped_column(String(100), primary_key=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)


class Role(Base, IDMixin, TimestampMixin):
    """Rol por organización (cada org tiene su copia de los roles por defecto)."""

    __tablename__ = "role"
    __table_args__ = (UniqueConstraint("organization_id", "code", name="uq_role_org_code"),)

    organization_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    role_permissions: Mapped[list[RolePermission]] = relationship(
        back_populates="role",
        cascade="all, delete-orphan",
    )
    user_roles: Mapped[list[UserRole]] = relationship(back_populates="role")


class RolePermission(Base):
    """N:M entre rol y permiso."""

    __tablename__ = "role_permission"

    role_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("role.id", ondelete="CASCADE"),
        primary_key=True,
    )
    permission_code: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("permission.code", ondelete="CASCADE"),
        primary_key=True,
    )

    role: Mapped[Role] = relationship(back_populates="role_permissions")
