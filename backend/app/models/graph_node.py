import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, ForeignKey, DateTime, Enum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr


class NodeType(str, PyEnum):
    clinic = "clinic"
    intersection = "intersection"
    landmark = "landmark"


class GraphNode(Base):
    __tablename__ = "graph_nodes"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    node_type: Mapped[NodeType] = mapped_column(Enum(NodeType), nullable=False)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)
    clinic_id: Mapped[str | None] = mapped_column(UUIDStr, ForeignKey("clinics.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    clinic = relationship("Clinic", back_populates="graph_node")
    edges_from = relationship("GraphEdge", foreign_keys="GraphEdge.from_node_id", back_populates="from_node", cascade="all, delete-orphan")
    edges_to = relationship("GraphEdge", foreign_keys="GraphEdge.to_node_id", back_populates="to_node")
