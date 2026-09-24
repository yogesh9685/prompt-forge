"""Tests for PostgreSQL async connection, SQLAlchemy 2.0 base, session lifecycle, and health endpoints."""
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from fastapi.testclient import TestClient

from backend.app.database.base import Base
from backend.app.database.connection import (
    DATABASE_URL,
    create_db_async_engine,
    get_db,
    verify_database_connection,
)
from backend.app.main import app

client = TestClient(app)


def test_base_declarative():
    """Verify that Base is properly initialized as SQLAlchemy DeclarativeBase."""
    assert Base is not None
    assert hasattr(Base, "metadata")


def test_async_engine_creation():
    """Verify that create_db_async_engine returns an engine with proper parameters."""
    test_url = "sqlite+aiosqlite:///:memory:"
    engine = create_db_async_engine(test_url)
    assert engine is not None
    assert engine.pool is not None


@pytest.mark.asyncio
async def test_session_lifecycle_and_select_1():
    """Verify async session creation, executing SELECT 1, and clean closure."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    TestingSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with TestingSessionLocal() as session:
        assert isinstance(session, AsyncSession)
        result = await session.execute(text("SELECT 1"))
        assert result.scalar() == 1

    await engine.dispose()


@pytest.mark.asyncio
async def test_get_db_dependency_lifecycle():
    """Verify that async get_db generator yields a session and closes it cleanly."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    TestingSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def mock_get_db():
        async with TestingSessionLocal() as session:
            yield session

    gen = mock_get_db()
    session = await anext(gen)
    assert isinstance(session, AsyncSession)
    
    result = await session.execute(text("SELECT 1"))
    assert result.scalar() == 1
    
    with pytest.raises(StopAsyncIteration):
        await anext(gen)

    await engine.dispose()


def test_health_endpoint():
    """Test general health check."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_db_health_endpoint_with_override():
    """Test /health/db with an active async database dependency override."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    TestingSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = client.get("/health/db")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "database": "connected"}
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
@pytest.mark.skipif(
    not DATABASE_URL or not DATABASE_URL.startswith("postgresql+asyncpg"),
    reason="PostgreSQL asyncpg not configured or unavailable in environment",
)
async def test_live_postgres_connection():
    """Test live PostgreSQL async connection if DATABASE_URL is configured."""
    engine = create_db_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        assert result.scalar() == 1
    await engine.dispose()
