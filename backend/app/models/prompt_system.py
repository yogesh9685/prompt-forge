"""PromptSystem database model definition."""
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship

from ..database.base import Base


class PromptSystem(Base):
    """PromptSystem model representing a user-defined prompt structure."""

    __tablename__ = "prompt_systems"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    instructions = Column(Text, nullable=True)
    variables = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True, default=dict)
    examples = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True, default=list)
    output_format = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True, default=dict)
    modules = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True, default=list)
    version = Column(Integer, nullable=False, default=1, server_default="1")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship to owning user
    owner = relationship("User", back_populates="prompt_systems")

    def __repr__(self) -> str:
        return f"<PromptSystem id={self.id} name='{self.name}' owner_id={self.owner_id} version={self.version}>"
