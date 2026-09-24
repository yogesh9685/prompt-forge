"""Authentication and user schemas."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    """Schema for user registration request payload."""

    name: str = Field(..., min_length=1, max_length=100, description="Full name of user")
    email: EmailStr = Field(..., description="Valid user email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password must be at least 8 characters long",
    )

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, value: str) -> str:
        """Ensure name is not composed solely of whitespace."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("Name cannot be blank or contain only whitespace.")
        return stripped


class UserResponse(BaseModel):
    """Schema for user representation in responses.
    
    Excludes sensitive fields such as password_hash.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime


class LoginRequest(BaseModel):
    """Schema for user login request payload."""

    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")


class UserLoginData(BaseModel):
    """Basic user profile data returned upon login and auth checks."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr


class LoginResponse(BaseModel):
    """Response returned upon successful authentication containing JWT access token."""

    access_token: str
    token_type: str = "bearer"
    user: UserLoginData
