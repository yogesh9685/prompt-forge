"""Authentication and JWT service."""
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import jwt
from dotenv import load_dotenv

from ..utils.security import hash_password, verify_password

# Locate and load .env file from project or current working directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# JWT configuration defaults
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def get_jwt_secret_key() -> str:
    """Retrieve the current JWT secret key from environment."""
    secret = os.getenv("JWT_SECRET_KEY", JWT_SECRET_KEY)
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY environment variable is not configured.")
    return secret


def get_jwt_algorithm() -> str:
    """Retrieve the current JWT algorithm from environment."""
    return os.getenv("JWT_ALGORITHM", JWT_ALGORITHM) or "HS256"


def get_jwt_expire_minutes() -> int:
    """Retrieve token expiration in minutes from environment."""
    val = os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", str(JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    return int(val)


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT access token containing subject data and expiration."""
    secret_key = get_jwt_secret_key()
    algorithm = get_jwt_algorithm()

    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=get_jwt_expire_minutes())

    to_encode.update({
        "exp": expire,
        "iat": now,
    })

    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT access token.

    Raises:
        jwt.ExpiredSignatureError: If the token expiration timestamp has passed.
        jwt.InvalidTokenError: If the token signature is invalid or malformed.
    """
    secret_key = get_jwt_secret_key()
    algorithm = get_jwt_algorithm()

    return jwt.decode(
        token,
        secret_key,
        algorithms=[algorithm],
    )
