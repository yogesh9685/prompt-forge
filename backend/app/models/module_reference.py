"""ModuleReference database model definition."""
from datetime import datetime
from typing import Any, Optional, TYPE_CHECKING
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.base import Base

if TYPE_CHECKING:
    from .prompt_system import PromptSystem
    from .prompt_module import PromptModule


class ModuleReference(Base):
    """ModuleReference model linking a PromptSystem to a reusable PromptModule.

    A single PromptModule can be referenced by many PromptSystems.
    The same module is never duplicated; only this reference record is created.
    """

    __tablename__ = "module_references"

    __table_args__ = (
        # Prevent the same module from being attached twice to the same system.
        UniqueConstraint("prompt_system_id", "module_id", name="uq_module_reference_system_module"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)

    prompt_system_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("prompt_systems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("prompt_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    input_mapping: Mapped[Optional[Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
        default=dict,
    )
    output_mapping: Mapped[Optional[Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
        default=dict,
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    prompt_system: Mapped["PromptSystem"] = relationship("PromptSystem", back_populates="module_references")
    prompt_module: Mapped["PromptModule"] = relationship("PromptModule", back_populates="module_references")

    def __repr__(self) -> str:
        return (
            f"<ModuleReference id={self.id} "
            f"prompt_system_id={self.prompt_system_id} "
            f"module_id={self.module_id} "
            f"enabled={self.enabled}>"
        )
