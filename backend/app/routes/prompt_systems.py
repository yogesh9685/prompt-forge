"""Prompt Systems API route handlers."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..dependencies.auth import get_current_user
from ..models.user import User
from ..schemas.prompt_system import (
    PromptSystemCreate,
    PromptSystemResponse,
    PromptSystemUpdate,
)
from ..services.prompt_system_service import (
    create_prompt_system,
    delete_prompt_system,
    get_prompt_system_by_id,
    update_prompt_system,
)

router = APIRouter(prefix="/prompt-systems", tags=["Prompt Systems"])


@router.post(
    "",
    response_model=PromptSystemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a Prompt System",
    description="Creates a new Prompt System owned by the currently authenticated user.",
)
def create_new_prompt_system(
    payload: PromptSystemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new Prompt System."""
    return create_prompt_system(db=db, data=payload, owner_id=current_user.id)


@router.get(
    "/{prompt_system_id}",
    response_model=PromptSystemResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a Prompt System",
    description="Retrieve a single Prompt System owned by the currently authenticated user.",
)
def get_single_prompt_system(
    prompt_system_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a Prompt System by ID."""
    prompt_system = get_prompt_system_by_id(db=db, prompt_system_id=prompt_system_id)
    if not prompt_system:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt System not found.",
        )

    if prompt_system.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this Prompt System.",
        )

    return prompt_system


@router.put(
    "/{prompt_system_id}",
    response_model=PromptSystemResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a Prompt System",
    description="Update an existing Prompt System owned by the authenticated user.",
)
def update_existing_prompt_system(
    prompt_system_id: int,
    payload: PromptSystemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update editable fields of a Prompt System."""
    prompt_system = get_prompt_system_by_id(db=db, prompt_system_id=prompt_system_id)
    if not prompt_system:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt System not found.",
        )

    if prompt_system.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this Prompt System.",
        )

    return update_prompt_system(db=db, prompt_system=prompt_system, data=payload)


@router.delete(
    "/{prompt_system_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a Prompt System",
    description="Delete a Prompt System owned by the authenticated user.",
)
def delete_existing_prompt_system(
    prompt_system_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a Prompt System by ID."""
    prompt_system = get_prompt_system_by_id(db=db, prompt_system_id=prompt_system_id)
    if not prompt_system:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt System not found.",
        )

    if prompt_system.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this Prompt System.",
        )

    delete_prompt_system(db=db, prompt_system=prompt_system)
    return {
        "message": "Prompt System deleted successfully.",
        "id": prompt_system_id,
    }
