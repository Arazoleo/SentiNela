import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, ForeignKey, DateTime, Enum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr, JSONColumn


class UrgencyLevel(str, PyEnum):
    low = "low"
    medium = "medium"
    high = "high"
    emergency = "emergency"


class SyndromeReport(Base):
    __tablename__ = "syndrome_reports"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("chat_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    symptoms: Mapped[list] = mapped_column(JSONColumn, nullable=False, default=list)
    syndrome_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    icd10_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    urgency_level: Mapped[UrgencyLevel | None] = mapped_column(Enum(UrgencyLevel), nullable=True)
    recommendations: Mapped[list | None] = mapped_column(JSONColumn, nullable=True)
    medgemma_raw: Mapped[dict | None] = mapped_column(JSONColumn, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    session = relationship("ChatSession", back_populates="syndrome_report")
