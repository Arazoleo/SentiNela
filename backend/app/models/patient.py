from datetime import date, datetime, timezone
from sqlalchemy import String, Date, ForeignKey, Numeric, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    address_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address_state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="patient")
    chat_sessions = relationship("ChatSession", back_populates="patient", cascade="all, delete-orphan")
