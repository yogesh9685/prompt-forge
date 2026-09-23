"""Database connection and session management module."""
import os
import logging
from typing import Generator
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError

logger = logging.getLogger(__name__)

# Locate and load .env file from project or current working directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Notice for developers without exposing sensitive data
    logger.warning("DATABASE_URL environment variable is not set.")
    # Fallback to empty string to allow module import without crashing immediately
    DATABASE_URL = ""

# Support postgres:// URLs (e.g. from some hosting providers) by normalizing to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def create_db_engine(db_url: str):
    """Create and configure a SQLAlchemy engine."""
    if not db_url:
        return None
    return create_engine(
        db_url,
        pool_pre_ping=True,  # Test connection liveness before checking out from pool
        echo=False,
    )


# Initialize engine if DATABASE_URL is available
engine = create_db_engine(DATABASE_URL) if DATABASE_URL else None

# Session factory bound to engine
SessionLocal = (
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
    if engine
    else None
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI generator dependency providing a transactional database session.
    
    Ensures that the session is always closed after the request completes.
    """
    if SessionLocal is None:
        raise RuntimeError(
            "Database engine is not initialized. Please ensure DATABASE_URL is properly configured."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_database_connection() -> dict:
    """Verifies PostgreSQL connectivity by executing a lightweight SELECT 1.
    
    Returns a dict with status and safe details without exposing credentials.
    """
    if not DATABASE_URL or engine is None:
        return {
            "status": "error",
            "database": "disconnected",
            "detail": "DATABASE_URL is not configured.",
        }

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
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
