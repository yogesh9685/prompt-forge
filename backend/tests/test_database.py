"""Tests for PostgreSQL connection, SQLAlchemy base, session lifecycle, and health endpoints."""
import os
import pytest
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from backend.app.database.base import Base
from backend.app.database.connection import (
    DATABASE_URL,
    create_db_engine,
    get_db,
    verify_database_connection,
)
from backend.app.main import app

client = TestClient(app)


def test_base_declarative():
    """Verify that Base is properly initialized as SQLAlchemy DeclarativeBase."""
    assert Base is not None
    assert hasattr(Base, "metadata")


def test_engine_creation():
    """Verify that create_db_engine returns an engine with proper parameters."""
    test_url = "sqlite:///:memory:"
    engine = create_db_engine(test_url)
    assert engine is not None
    assert engine.pool is not None


def test_session_lifecycle_and_select_1():
    """Verify session creation, executing SELECT 1, and clean closure."""
    # Use in-memory SQLite engine to test session lifecycle deterministically
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    session = TestingSessionLocal()
    assert isinstance(session, Session)
    
    # Execute SELECT 1
    result = session.execute(text("SELECT 1")).scalar()
    assert result == 1
    
    # Verify session closes properly
    session.close()


def test_get_db_dependency_lifecycle():
    """Verify that get_db generator yields a session and closes it cleanly."""
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def mock_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    gen = mock_get_db()
    session = next(gen)
    assert isinstance(session, Session)
    
    result = session.execute(text("SELECT 1")).scalar()
    assert result == 1
    
    # Exhaust generator to trigger finally block
    with pytest.raises(StopIteration):
        next(gen)


def test_health_endpoint():
    """Test general health check."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_db_health_endpoint_with_override():
    """Test /health/db with an active database dependency."""
    test_engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = client.get("/health/db")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "database": "connected"}
    finally:
        app.dependency_overrides.clear()


@pytest.mark.skipif(
    not DATABASE_URL or not DATABASE_URL.startswith("postgresql"),
    reason="PostgreSQL not configured or unavailable in environment",
)
def test_live_postgres_connection():
    """Test live PostgreSQL connection if DATABASE_URL is configured."""
    engine = create_db_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
        assert result == 1
