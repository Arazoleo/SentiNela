import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr, JSONColumn


class NotificationType(str, PyEnum):
    membership_request = "membership_request"
    membership_approved = "membership_approved"
    membership_rejected = "membership_rejected"
    system = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    data: Mapped[dict | None] = mapped_column(JSONColumn, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    recipient = relationship("User", back_populates="notifications")
