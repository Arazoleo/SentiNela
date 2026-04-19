import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr


class AppointmentStatus(str, PyEnum):
    pending   = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id:  Mapped[str] = mapped_column(UUIDStr, ForeignKey("doctors.id",  ondelete="CASCADE"), nullable=False, index=True)
    clinic_id:  Mapped[str] = mapped_column(UUIDStr, ForeignKey("clinics.id",  ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), default=AppointmentStatus.pending)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)   # síndrome/queixa
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)           # notas do agente
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    doctor  = relationship("Doctor")
    clinic  = relationship("Clinic")
