import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, ForeignKey, DateTime, Enum, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr


class RequestStatus(str, PyEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class InitiatedBy(str, PyEnum):
    doctor = "doctor"
    clinic = "clinic"


class MembershipRequest(Base):
    __tablename__ = "membership_requests"
    __table_args__ = (UniqueConstraint("clinic_id", "doctor_id"),)

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    clinic_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    initiated_by: Mapped[InitiatedBy] = mapped_column(Enum(InitiatedBy), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus), default=RequestStatus.pending)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    clinic = relationship("Clinic", back_populates="membership_requests")
    doctor = relationship("Doctor", back_populates="membership_requests")
