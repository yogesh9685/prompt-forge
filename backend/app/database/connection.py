"""Database connection and async session management module."""
import os
import logging
from typing import AsyncGenerator
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.exc import SQLAlchemyError, OperationalError

logger = logging.getLogger(__name__)

# Locate and load .env file from project or current working directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Normalize postgres URL schemes to asyncpg driver
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


def create_db_async_engine(db_url: str) -> AsyncEngine | None:
    """Create and configure a SQLAlchemy AsyncEngine."""
    if not db_url:
        return None
    return create_async_engine(
        db_url,
        pool_pre_ping=True,
        echo=False,
    )


# Initialize async engine if DATABASE_URL is configured
engine = create_db_async_engine(DATABASE_URL) if DATABASE_URL else None

# Async session factory bound to async engine
AsyncSessionLocal = (
    async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    if engine
    else None
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI async dependency providing an AsyncSession.
    
    Ensures that the session is always closed after the request finishes.
    """
    if AsyncSessionLocal is None:
        raise RuntimeError(
            "Database engine is not initialized. Please ensure DATABASE_URL is properly configured."
        )
    async with AsyncSessionLocal() as session:
        yield session


async def verify_database_connection() -> dict:
    """Verifies PostgreSQL connectivity asynchronously by executing a lightweight SELECT 1.
    
    Returns a dict with status and safe details without exposing credentials.
    """
    if not DATABASE_URL or engine is None:
        return {
            "status": "error",
            "database": "disconnected",
            "detail": "DATABASE_URL is not configured.",
        }

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
        }
    except OperationalError:
        logger.error("PostgreSQL server is unreachable or connection failed.")
        return {
            "status": "error",
            "database": "disconnected",
            "detail": "PostgreSQL server is unavailable or authentication failed.",
        }
    except SQLAlchemyError as exc:
        logger.error("Database connection error: %s", type(exc).__name__)
        return {
            "status": "error",
            "database": "disconnected",
            "detail": "Database connection error.",
        }
