import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Numeric, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.core.types import UUIDStr


class EpidemicAlert(Base):
    __tablename__ = "epidemic_alerts"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    syndrome_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    icd10_code: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Epicentro do cluster
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    centroid_lat: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    centroid_lng: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    radius_km: Mapped[float] = mapped_column(Numeric(6, 2), default=10.0)

    # Dados do cluster
    case_count: Mapped[int] = mapped_column(Integer, nullable=False)
    window_days: Mapped[int] = mapped_column(Integer, default=7)
    severity: Mapped[str] = mapped_column(String(20), default="moderate")  # low / moderate / high / critical

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
