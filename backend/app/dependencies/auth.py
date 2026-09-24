"""Authentication dependencies."""
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from ..database.connection import get_db
from ..models.user import User
from ..services.auth_service import decode_access_token

# HTTPBearer registers the standard Bearer security scheme in OpenAPI/Swagger UI
security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate Bearer JWT from Authorization header and return authenticated User asynchronously.

    Handles:
        - missing token
        - malformed header
        - expired token
        - invalid token
        - user not found in database
    """
    token: Optional[str] = None

    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    else:
        # Fallback inspection of raw Authorization header for custom clients / malformed formats
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is missing.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        parts = auth_header.strip().split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed Authorization header. Format must be 'Bearer <token>'.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = parts[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        parsed_id = int(user_id)
        stmt = select(User).where(User.id == parsed_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
    except (ValueError, TypeError):
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
