import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, ForeignKey, DateTime, Enum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr


class SessionStatus(str, PyEnum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.active)
    patient_lat: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    patient_lng: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    final_syndrome: Mapped[str | None] = mapped_column(String(100), nullable=True)
    urgency_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    recommended_clinic_id: Mapped[str | None] = mapped_column(UUIDStr, ForeignKey("clinics.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient = relationship("Patient", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    syndrome_report = relationship("SyndromeReport", back_populates="session", uselist=False, cascade="all, delete-orphan")
    recommended_clinic = relationship("Clinic")
