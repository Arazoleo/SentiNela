from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr, JSONColumn


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    crm: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    crm_state: Mapped[str] = mapped_column(String(2), nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sub_specialties: Mapped[list | None] = mapped_column(JSONColumn, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    biography: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="doctor")
    memberships = relationship("ClinicMembership", back_populates="doctor", cascade="all, delete-orphan")
    membership_requests = relationship("MembershipRequest", back_populates="doctor", cascade="all, delete-orphan")
