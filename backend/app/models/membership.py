import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, ForeignKey, DateTime, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr


class ClinicRole(str, PyEnum):
    member = "member"
    coordinator = "coordinator"
    director = "director"


class ClinicMembership(Base):
    __tablename__ = "clinic_memberships"
    __table_args__ = (UniqueConstraint("clinic_id", "doctor_id"),)

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    clinic_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    role_in_clinic: Mapped[ClinicRole] = mapped_column(Enum(ClinicRole), default=ClinicRole.member)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    clinic = relationship("Clinic", back_populates="memberships")
    doctor = relationship("Doctor", back_populates="memberships")
