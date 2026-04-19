import uuid
from sqlalchemy import String, Integer, ForeignKey, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr


class DoctorSchedule(Base):
    """Disponibilidade semanal de um médico em uma clínica."""
    __tablename__ = "doctor_schedules"
    __table_args__ = (
        UniqueConstraint("doctor_id", "clinic_id", "day_of_week", "start_time"),
    )

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    clinic_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False, index=True)
    # 0 = segunda, 1 = terça, ..., 6 = domingo
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "HH:MM"
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)    # "HH:MM"
    slot_minutes: Mapped[int] = mapped_column(Integer, default=30)

    doctor = relationship("Doctor")
    clinic = relationship("Clinic")
