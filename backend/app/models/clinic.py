from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, ForeignKey, Numeric, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr, JSONColumn


class Clinic(Base):
    __tablename__ = "clinics"

    id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    cnpj: Mapped[str | None] = mapped_column(String(18), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address_street: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address_state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    address_zip: Mapped[str | None] = mapped_column(String(10), nullable=True)
    latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)
    specialties: Mapped[list | None] = mapped_column(JSONColumn, nullable=True)
    operating_hours: Mapped[dict | None] = mapped_column(JSONColumn, nullable=True)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="clinic")
    memberships = relationship("ClinicMembership", back_populates="clinic", cascade="all, delete-orphan")
    membership_requests = relationship("MembershipRequest", back_populates="clinic", cascade="all, delete-orphan")
    graph_node = relationship("GraphNode", back_populates="clinic", uselist=False)
