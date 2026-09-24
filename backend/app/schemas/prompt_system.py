"""PromptSystem request and response schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator


class PromptSystemBase(BaseModel):
    """Base schema for PromptSystem properties."""

    name: str = Field(..., min_length=1, max_length=255, description="Prompt System name")
    description: Optional[str] = Field(None, description="Optional description")
    instructions: Optional[str] = Field(None, description="Core system instructions")
    variables: Optional[Union[List[Any], Dict[str, Any]]] = Field(
        default_factory=list,
        description="Variables definitions",
    )
    examples: Optional[Union[List[Any], Dict[str, Any]]] = Field(
        default_factory=list,
        description="Prompt examples",
    )
    output_format: Optional[Union[Dict[str, Any], List[Any]]] = Field(
        default_factory=dict,
        description="Output format specification",
    )
    modules: Optional[Union[List[Any], Dict[str, Any]]] = Field(
        default_factory=list,
        description="Module references / configuration",
    )

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, value: str) -> str:
        """Ensure name is not empty or composed solely of whitespace."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("Prompt System name cannot be empty or whitespace only.")
        return stripped


class PromptSystemCreate(PromptSystemBase):
    """Schema for creating a new PromptSystem."""
    pass


class PromptSystemUpdate(BaseModel):
    """Schema for updating an existing PromptSystem."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    variables: Optional[Union[List[Any], Dict[str, Any]]] = None
    examples: Optional[Union[List[Any], Dict[str, Any]]] = None
    output_format: Optional[Union[Dict[str, Any], List[Any]]] = None
    modules: Optional[Union[List[Any], Dict[str, Any]]] = None

    @field_validator("name")
    @classmethod
    def validate_name_if_provided(cls, value: Optional[str]) -> Optional[str]:
        """Ensure updated name is not empty if provided."""
        if value is not None:
            stripped = value.strip()
            if not stripped:
                raise ValueError("Prompt System name cannot be empty or whitespace only.")
            return stripped
        return value


class PromptSystemResponse(BaseModel):
    """Schema for returning PromptSystem details."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    instructions: Optional[str] = None
    variables: Optional[Any] = None
    examples: Optional[Any] = None
    output_format: Optional[Any] = None
    modules: Optional[Any] = None
    version: int
    created_at: datetime
    updated_at: datetime
