"""PromptSystem service layer for managing PromptSystem database records."""
from typing import Optional
from sqlalchemy.orm import Session

from ..models.prompt_system import PromptSystem
from ..schemas.prompt_system import PromptSystemCreate, PromptSystemUpdate


def create_prompt_system(
    db: Session,
    data: PromptSystemCreate,
    owner_id: int,
) -> PromptSystem:
    """Create a new PromptSystem associated with an authenticated owner."""
    prompt_system = PromptSystem(
        name=data.name,
        description=data.description,
        owner_id=owner_id,
        instructions=data.instructions,
        variables=data.variables,
        examples=data.examples,
        output_format=data.output_format,
        modules=data.modules,
    )
    db.add(prompt_system)
    db.commit()
    db.refresh(prompt_system)
    return prompt_system


def get_prompt_system_by_id(
    db: Session,
    prompt_system_id: int,
) -> Optional[PromptSystem]:
    """Retrieve a PromptSystem by its primary key ID."""
    return db.query(PromptSystem).filter(PromptSystem.id == prompt_system_id).first()


def update_prompt_system(
    db: Session,
    prompt_system: PromptSystem,
    data: PromptSystemUpdate,
) -> PromptSystem:
    """Update editable fields of an existing PromptSystem.
    
    Prevents modifying immutable fields: id, owner_id, created_at, updated_at.
    """
    update_data = data.model_dump(exclude_unset=True)
    immutable_fields = {"id", "owner_id", "created_at", "updated_at"}

    for field, value in update_data.items():
        if field not in immutable_fields and hasattr(prompt_system, field):
            setattr(prompt_system, field, value)

    db.commit()
    db.refresh(prompt_system)
    return prompt_system


def delete_prompt_system(
    db: Session,
    prompt_system: PromptSystem,
) -> None:
    """Delete a PromptSystem from the database."""
    db.delete(prompt_system)
    db.commit()
