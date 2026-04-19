import uuid
from datetime import date, datetime, timezone
from sqlalchemy import String, DateTime, Date, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.core.types import UUIDStr


class EpidemiologicalCase(Base):
    __tablename__ = "epidemiological_cases"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    syndrome_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    icd10_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    lat: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    lng: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    case_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    case_count: Mapped[int] = mapped_column(Integer, default=1)
    severity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="chat")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
