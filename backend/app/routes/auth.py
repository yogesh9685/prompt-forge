"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.connection import get_db
from ..dependencies.auth import get_current_user
from ..models.user import User
from ..schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserLoginData,
    UserResponse,
)
from ..services.auth_service import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Registers a new user account with hashed password and unique email.",
)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Handle user registration asynchronously."""
    normalized_email = request.email.lower()

    # Check for duplicate email using SQLAlchemy 2.0 select()
    stmt = select(User).where(User.email == normalized_email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered.",
        )

    # Hash the plain-text password before saving
    hashed_password = hash_password(request.password)

    # Instantiate user model
    user = User(
        name=request.name,
        email=normalized_email,
        password_hash=hashed_password,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
    description="Authenticates a user with email and password and returns JWT access token.",
)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Handle user login and credential verification asynchronously."""
    normalized_email = request.email.lower()

    # Find user by email using SQLAlchemy 2.0 select()
    stmt = select(User).where(User.email == normalized_email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Verify submitted password against stored password hash
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Generate JWT access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


@router.get(
    "/me",
    response_model=UserLoginData,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Returns profile of currently authenticated user using JWT Bearer token.",
)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile of authenticated user."""
    return current_user
