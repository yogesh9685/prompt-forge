"""Comprehensive tests for Prompt System Library features with async database.

Covers:
- List Prompt Systems
- Case-insensitive search by name
- Case-insensitive search by description
- Recent sorting (?sort=recent)
- Pagination (?page=1&limit=2)
- Duplicate Prompt System
- Archive Prompt System
- Unarchive Prompt System
- Archived Prompt Systems excluded by default
- Include archived (?include_archived=true)
- Ownership & security isolation across users
- Unauthenticated requests
"""
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from backend.app.database.base import Base
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.prompt_system import PromptSystem
from backend.app.models.user import User
from backend.app.services.auth_service import create_access_token


@pytest.fixture
async def db_session():
    """Create a clean, isolated SQLite async in-memory database for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestingSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with TestingSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
def client(db_session):
    """Provide a TestClient with overridden get_db dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
async def user1(db_session):
    """Create the primary test user asynchronously."""
    u1 = User(
        name="Alice Smith",
        email="alice@promptforge.io",
        password_hash="$2b$12$hashedpasswordforalice",
    )
    db_session.add(u1)
    await db_session.commit()
    await db_session.refresh(u1)
    return u1


@pytest.fixture
async def user2(db_session):
    """Create a secondary test user for multi-tenant isolation testing asynchronously."""
    u2 = User(
        name="Bob Jones",
        email="bob@promptforge.io",
        password_hash="$2b$12$hashedpasswordforbob",
    )
    db_session.add(u2)
    await db_session.commit()
    await db_session.refresh(u2)
    return u2


@pytest.fixture
def auth_headers1(user1):
    """Generate JWT authorization headers for User 1 (Alice)."""
    token = create_access_token(data={"sub": str(user1.id), "email": user1.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers2(user2):
    """Generate JWT authorization headers for User 2 (Bob)."""
    token = create_access_token(data={"sub": str(user2.id), "email": user2.email})
    return {"Authorization": f"Bearer {token}"}


def test_list_prompt_systems(client, auth_headers1, user1):
    """Test retrieving all active Prompt Systems for the authenticated user."""
    # Create two prompt systems for user 1
    client.post("/prompt-systems", json={"name": "System Alpha"}, headers=auth_headers1)
    client.post("/prompt-systems", json={"name": "System Beta"}, headers=auth_headers1)

    response = client.get("/prompt-systems", headers=auth_headers1)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    names = [item["name"] for item in data]
    assert "System Alpha" in names
    assert "System Beta" in names
    assert all(item["owner_id"] == user1.id for item in data)
    assert all(item["archived"] is False for item in data)


def test_search_by_name_case_insensitive(client, auth_headers1):
    """Test searching Prompt Systems by name with case-insensitivity."""
    client.post("/prompt-systems", json={"name": "Technical Blog Writer"}, headers=auth_headers1)
    client.post("/prompt-systems", json={"name": "Customer Support Bot"}, headers=auth_headers1)
    client.post("/prompt-systems", json={"name": "Email Generator"}, headers=auth_headers1)

    # Search with lowercase term "technical"
    response = client.get("/prompt-systems?search=technical", headers=auth_headers1)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Technical Blog Writer"

    # Search with uppercase term "WRITER"
    response_upper = client.get("/prompt-systems?search=WRITER", headers=auth_headers1)
    assert response_upper.status_code == 200
    data_upper = response_upper.json()
    assert len(data_upper) == 1
    assert data_upper[0]["name"] == "Technical Blog Writer"


def test_search_by_description_case_insensitive(client, auth_headers1):
    """Test searching Prompt Systems by description with case-insensitivity."""
    client.post(
        "/prompt-systems",
        json={"name": "System One", "description": "Expert code reviewer for Python"},
        headers=auth_headers1,
    )
    client.post(
        "/prompt-systems",
        json={"name": "System Two", "description": "Creative marketing copywriter"},
        headers=auth_headers1,
    )

    response = client.get("/prompt-systems?search=reviewer", headers=auth_headers1)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "System One"


@pytest.mark.asyncio
async def test_recent_sorting(client, auth_headers1, db_session):
    """Test sorting Prompt Systems by updated_at descending (?sort=recent)."""
    # Create two systems
    res1 = client.post("/prompt-systems", json={"name": "First Created"}, headers=auth_headers1)
    id1 = res1.json()["id"]

    res2 = client.post("/prompt-systems", json={"name": "Second Created"}, headers=auth_headers1)
    id2 = res2.json()["id"]

    # Explicitly adjust updated_at in database using select()
    stmt1 = select(PromptSystem).where(PromptSystem.id == id1)
    res1_db = await db_session.execute(stmt1)
    ps1 = res1_db.scalar_one()

    stmt2 = select(PromptSystem).where(PromptSystem.id == id2)
    res2_db = await db_session.execute(stmt2)
    ps2 = res2_db.scalar_one()

    ps1.updated_at = datetime.utcnow() - timedelta(hours=2)
    ps2.updated_at = datetime.utcnow() - timedelta(minutes=5)
    await db_session.commit()

    # Query with sort=recent
    response = client.get("/prompt-systems?sort=recent", headers=auth_headers1)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == id2
    assert data[1]["id"] == id1

    # Now update the first one so it becomes the most recent
    client.put(f"/prompt-systems/{id1}", json={"name": "First Created Updated"}, headers=auth_headers1)

    response_updated = client.get("/prompt-systems?sort=recent", headers=auth_headers1)
    assert response_updated.status_code == 200
    data_updated = response_updated.json()
    assert data_updated[0]["id"] == id1


def test_pagination(client, auth_headers1):
    """Test pagination using page and limit query parameters."""
    for i in range(1, 6):
        client.post("/prompt-systems", json={"name": f"Item {i}"}, headers=auth_headers1)

    # Page 1, limit 2
    res_p1 = client.get("/prompt-systems?page=1&limit=2", headers=auth_headers1)
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()
    assert len(data_p1) == 2

    # Page 2, limit 2
    res_p2 = client.get("/prompt-systems?page=2&limit=2", headers=auth_headers1)
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    assert len(data_p2) == 2
    # Ensure no overlap between page 1 and page 2
    p1_ids = {item["id"] for item in data_p1}
    p2_ids = {item["id"] for item in data_p2}
    assert p1_ids.isdisjoint(p2_ids)

    # Page 3, limit 2
    res_p3 = client.get("/prompt-systems?page=3&limit=2", headers=auth_headers1)
    assert res_p3.status_code == 200
    data_p3 = res_p3.json()
    assert len(data_p3) == 1

    # Validation: unreasonable limit or invalid page
    assert client.get("/prompt-systems?page=0", headers=auth_headers1).status_code == 422
    assert client.get("/prompt-systems?limit=0", headers=auth_headers1).status_code == 422
    assert client.get("/prompt-systems?limit=101", headers=auth_headers1).status_code == 422


def test_duplicate_prompt_system(client, auth_headers1, user1):
    """Test duplicating an existing Prompt System."""
    payload = {
        "name": "Technical Blog Writer",
        "description": "Original description",
        "instructions": "Original instructions",
        "variables": [{"name": "topic", "type": "string"}],
        "examples": [{"in": "test", "out": "res"}],
        "output_format": {"format": "json"},
        "modules": ["seo"],
    }
    create_res = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert create_res.status_code == 201
    orig_id = create_res.json()["id"]

    # Duplicate the prompt system
    dup_res = client.post(f"/prompt-systems/{orig_id}/duplicate", headers=auth_headers1)
    assert dup_res.status_code == 201
    dup_data = dup_res.json()

    # Verify duplicate properties
    assert dup_data["id"] != orig_id
    assert dup_data["name"] == "Technical Blog Writer (Copy)"
    assert dup_data["description"] == payload["description"]
    assert dup_data["instructions"] == payload["instructions"]
    assert dup_data["variables"] == payload["variables"]
    assert dup_data["examples"] == payload["examples"]
    assert dup_data["output_format"] == payload["output_format"]
    assert dup_data["modules"] == payload["modules"]
    assert dup_data["version"] == 1
    assert dup_data["owner_id"] == user1.id
    assert dup_data["archived"] is False
    assert "created_at" in dup_data
    assert "updated_at" in dup_data

    # Verify original remains unchanged
    orig_fetch = client.get(f"/prompt-systems/{orig_id}", headers=auth_headers1)
    assert orig_fetch.status_code == 200
    assert orig_fetch.json()["name"] == "Technical Blog Writer"


def test_archive_prompt_system(client, auth_headers1):
    """Test archiving a Prompt System marks archived = True without physical deletion."""
    create_res = client.post("/prompt-systems", json={"name": "To Archive"}, headers=auth_headers1)
    ps_id = create_res.json()["id"]

    # Archive
    archive_res = client.patch(f"/prompt-systems/{ps_id}/archive", headers=auth_headers1)
    assert archive_res.status_code == 200
    assert archive_res.json()["archived"] is True
    assert archive_res.json()["id"] == ps_id

    # Record still exists and is accessible directly by ID
    get_res = client.get(f"/prompt-systems/{ps_id}", headers=auth_headers1)
    assert get_res.status_code == 200
    assert get_res.json()["archived"] is True


def test_unarchive_prompt_system(client, auth_headers1):
    """Test unarchiving a Prompt System restores archived = False."""
    create_res = client.post("/prompt-systems", json={"name": "To Unarchive"}, headers=auth_headers1)
    ps_id = create_res.json()["id"]

    # Archive then unarchive
    client.patch(f"/prompt-systems/{ps_id}/archive", headers=auth_headers1)
    unarchive_res = client.patch(f"/prompt-systems/{ps_id}/unarchive", headers=auth_headers1)
    assert unarchive_res.status_code == 200
    assert unarchive_res.json()["archived"] is False


def test_archived_prompt_systems_excluded_by_default(client, auth_headers1):
    """Test that archived Prompt Systems are excluded from list by default."""
    res_active = client.post("/prompt-systems", json={"name": "Active System"}, headers=auth_headers1)
    res_archived = client.post("/prompt-systems", json={"name": "Archived System"}, headers=auth_headers1)
    archived_id = res_archived.json()["id"]

    client.patch(f"/prompt-systems/{archived_id}/archive", headers=auth_headers1)

    # Default list
    list_res = client.get("/prompt-systems", headers=auth_headers1)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["name"] == "Active System"


def test_include_archived_parameter(client, auth_headers1):
    """Test that include_archived=true includes both active and archived systems."""
    res1 = client.post("/prompt-systems", json={"name": "Active System"}, headers=auth_headers1)
    res2 = client.post("/prompt-systems", json={"name": "Archived System"}, headers=auth_headers1)
    archived_id = res2.json()["id"]
    client.patch(f"/prompt-systems/{archived_id}/archive", headers=auth_headers1)

    # Query with include_archived=true
    list_res = client.get("/prompt-systems?include_archived=true", headers=auth_headers1)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 2
    names = [i["name"] for i in items]
    assert "Active System" in names
    assert "Archived System" in names


def test_user_cannot_access_another_user_prompt_system(client, auth_headers1, auth_headers2):
    """Test that User 2 cannot list, duplicate, archive, or unarchive User 1's Prompt Systems."""
    # User 1 creates system
    create_res = client.post("/prompt-systems", json={"name": "User 1 Private"}, headers=auth_headers1)
    ps_id = create_res.json()["id"]

    # User 2 listing must be empty (isolated)
    u2_list = client.get("/prompt-systems", headers=auth_headers2)
    assert u2_list.status_code == 200
    assert len(u2_list.json()) == 0

    # User 2 search must not find User 1's system
    u2_search = client.get("/prompt-systems?search=Private", headers=auth_headers2)
    assert u2_search.status_code == 200
    assert len(u2_search.json()) == 0

    # User 2 cannot duplicate User 1's system (403)
    u2_dup = client.post(f"/prompt-systems/{ps_id}/duplicate", headers=auth_headers2)
    assert u2_dup.status_code == 403

    # User 2 cannot archive User 1's system (403)
    u2_arch = client.patch(f"/prompt-systems/{ps_id}/archive", headers=auth_headers2)
    assert u2_arch.status_code == 403

    # User 2 cannot unarchive User 1's system (403)
    u2_unarch = client.patch(f"/prompt-systems/{ps_id}/unarchive", headers=auth_headers2)
    assert u2_unarch.status_code == 403


def test_unauthenticated_requests(client):
    """Test that unauthenticated requests to library endpoints are rejected with 401."""
    assert client.get("/prompt-systems").status_code == 401
    assert client.post("/prompt-systems/1/duplicate").status_code == 401
    assert client.patch("/prompt-systems/1/archive").status_code == 401
    assert client.patch("/prompt-systems/1/unarchive").status_code == 401
