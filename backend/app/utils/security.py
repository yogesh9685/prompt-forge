"""Security and password hashing utilities."""
import bcrypt


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt.
    
    Generates a secure salt and returns the utf-8 decoded hashed string.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash string."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )
