"""ModuleReference service layer for managing module-to-system attachments asynchronously."""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.module_reference import ModuleReference
from ..models.prompt_module import PromptModule
from ..schemas.module_reference import ModuleReferenceCreate, ModuleReferenceUpdate


async def get_module_reference_by_id(
    db: AsyncSession,
    reference_id: int,
) -> Optional[ModuleReference]:
    """Retrieve a ModuleReference by primary key, eagerly loading its PromptModule."""
    stmt = (
        select(ModuleReference)
        .where(ModuleReference.id == reference_id)
        .options(selectinload(ModuleReference.prompt_module))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_module_references(
    db: AsyncSession,
    prompt_system_id: int,
) -> List[ModuleReference]:
    """List all ModuleReferences for a given PromptSystem, with PromptModule preloaded."""
    stmt = (
        select(ModuleReference)
        .where(ModuleReference.prompt_system_id == prompt_system_id)
        .options(selectinload(ModuleReference.prompt_module))
        .order_by(ModuleReference.id)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_module_reference(
    db: AsyncSession,
    prompt_system_id: int,
    data: ModuleReferenceCreate,
) -> ModuleReference:
    """Create and persist a new ModuleReference linking a PromptSystem to a PromptModule."""
    reference = ModuleReference(
        prompt_system_id=prompt_system_id,
        module_id=data.module_id,
        input_mapping=data.input_mapping if data.input_mapping is not None else {},
        output_mapping=data.output_mapping if data.output_mapping is not None else {},
        enabled=data.enabled,
    )
    db.add(reference)
    await db.commit()
    await db.refresh(reference)

    # Reload with module joined so module_name is available
    return await get_module_reference_by_id(db=db, reference_id=reference.id)


async def update_module_reference(
    db: AsyncSession,
    reference: ModuleReference,
    data: ModuleReferenceUpdate,
) -> ModuleReference:
    """Partially update an existing ModuleReference.

    Only input_mapping, output_mapping, and enabled may be changed.
    module_id and prompt_system_id are immutable.
    """
    update_data = data.model_dump(exclude_unset=True)
    allowed_fields = {"input_mapping", "output_mapping", "enabled"}

    for field, value in update_data.items():
        if field in allowed_fields:
            setattr(reference, field, value)

    await db.commit()
    await db.refresh(reference)

    # Reload with module joined
    return await get_module_reference_by_id(db=db, reference_id=reference.id)


async def delete_module_reference(
    db: AsyncSession,
    reference: ModuleReference,
) -> None:
    """Delete a ModuleReference without touching the underlying PromptModule."""
    await db.delete(reference)
    await db.commit()


async def get_module_by_id_for_owner(
    db: AsyncSession,
    module_id: int,
    owner_id: int,
) -> Optional[PromptModule]:
    """Retrieve a PromptModule by ID, filtered to the given owner."""
    stmt = select(PromptModule).where(
        PromptModule.id == module_id,
        PromptModule.owner_id == owner_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
