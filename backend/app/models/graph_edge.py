import uuid
from sqlalchemy import String, ForeignKey, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.types import UUIDStr


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_node_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("graph_nodes.id"), nullable=False)
    to_node_id: Mapped[str] = mapped_column(UUIDStr, ForeignKey("graph_nodes.id"), nullable=False)
    weight: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    edge_type: Mapped[str] = mapped_column(String(20), default="road")
    is_bidirectional: Mapped[bool] = mapped_column(Boolean, default=True)

    from_node = relationship("GraphNode", foreign_keys=[from_node_id], back_populates="edges_from")
    to_node = relationship("GraphNode", foreign_keys=[to_node_id], back_populates="edges_to")
