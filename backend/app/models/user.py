import uuid
from enum import Enum as PyEnum
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr


class UserRole(str, PyEnum):
    patient = "patient"
    clinic = "clinic"
    doctor = "doctor"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="user", uselist=False, cascade="all, delete-orphan")
    clinic = relationship("Clinic", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")
