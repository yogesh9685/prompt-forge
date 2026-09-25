"""PromptModule request and response schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .prompt_system import _validate_variables_list, VariableDefinition, VariableType


class PromptModuleBase(BaseModel):
    """Base schema for PromptModule properties."""

    name: str = Field(..., min_length=1, max_length=255, description="Prompt Module name")
    description: Optional[str] = Field(None, description="Short explanation of what the module does")
    instructions: Optional[str] = Field(None, description="Actual instructions/prompt logic of the module")
    variables: Optional[Union[List[Any], Dict[str, Any]]] = Field(
        default_factory=list,
        description="Variables required by the module",
    )
    input_context: Optional[Union[List[Any], Dict[str, Any]]] = Field(
        default_factory=list,
        description="Context/input information expected by the module",
    )
    output_contract: Optional[Union[str, Dict[str, Any], List[Any]]] = Field(
        default=None,
        description="Description or specification of the expected output from the module",
    )
    examples: Optional[Union[List[Any], Dict[str, Any]]] = Field(
        default_factory=list,
        description="Example inputs/outputs or example usage",
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        """Ensure name is not empty or whitespace."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("Module name cannot be empty or only whitespace.")
        return stripped

    @field_validator("variables")
    @classmethod
    def validate_variables(cls, value: Optional[Union[List[Any], Dict[str, Any]]]):
        """Ensure variable names are valid and unique within PromptModule."""
        return _validate_variables_list(value)


class PromptModuleCreate(PromptModuleBase):
    """Schema for creating a new PromptModule."""
    pass


class PromptModuleUpdate(BaseModel):
    """Schema for updating an existing PromptModule via PATCH."""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated module name")
    description: Optional[str] = Field(None, description="Updated description")
    instructions: Optional[str] = Field(None, description="Updated instructions")
    variables: Optional[Union[List[Any], Dict[str, Any]]] = Field(
        None,
        description="Updated variables required by the module",
    )
    input_context: Optional[Union[List[Any], Dict[str, Any]]] = Field(
        None,
        description="Updated context/input information expected by the module",
    )
    output_contract: Optional[Union[str, Dict[str, Any], List[Any]]] = Field(
        None,
        description="Updated output contract description or specification",
    )
    examples: Optional[Union[List[Any], Dict[str, Any]]] = Field(
        None,
        description="Updated example inputs/outputs or usage",
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        """Ensure updated name is not empty or whitespace if provided."""
        if value is not None:
            stripped = value.strip()
            if not stripped:
                raise ValueError("Module name cannot be empty or only whitespace.")
            return stripped
        return value

    @field_validator("variables")
    @classmethod
    def validate_variables(cls, value: Optional[Union[List[Any], Dict[str, Any]]]):
        """Ensure variable names are valid and unique within PromptModule."""
        return _validate_variables_list(value)


class PromptModuleResponse(BaseModel):
    """Schema for returning PromptModule details."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    variables: Optional[Any] = None
    input_context: Optional[Any] = None
    output_contract: Optional[Union[str, Dict[str, Any], List[Any]]] = None
    examples: Optional[Any] = None
    created_at: datetime
    updated_at: datetime
