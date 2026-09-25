"""Tests for Prompt Systems CRUD APIs, authentication, authorization, and validation with async database."""
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
        name="User One",
        email="user1@promptforge.io",
        password_hash="$2b$12$hashedpasswordforuserone",
    )
    db_session.add(u1)
    await db_session.commit()
    await db_session.refresh(u1)
    return u1


@pytest.fixture
async def user2(db_session):
    """Create a secondary test user for ownership testing asynchronously."""
    u2 = User(
        name="User Two",
        email="user2@promptforge.io",
        password_hash="$2b$12$hashedpasswordforusertwo",
    )
    db_session.add(u2)
    await db_session.commit()
    await db_session.refresh(u2)
    return u2


@pytest.fixture
def auth_headers1(user1):
    """Generate JWT authorization headers for User 1."""
    token = create_access_token(data={"sub": str(user1.id), "email": user1.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers2(user2):
    """Generate JWT authorization headers for User 2."""
    token = create_access_token(data={"sub": str(user2.id), "email": user2.email})
    return {"Authorization": f"Bearer {token}"}


def test_create_prompt_system(client, user1, auth_headers1):
    """Test creating a Prompt System successfully sets ownership and returns full schema."""
    payload = {
        "name": "Technical Blog Writer",
        "description": "Creates technical blog articles",
        "instructions": "You are an expert technical writer.",
        "variables": [
            {
                "name": "topic",
                "label": "Topic",
                "type": "text",
                "required": True,
            }
        ],
        "examples": [{"input": "AI news", "output": "Weekly AI summary"}],
        "output_format": {"type": "markdown"},
        "modules": ["seo_module"],
        "owner_id": 9999,  # Should be ignored and overwritten by authenticated user
    }
    response = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert response.status_code == 201

    data = response.json()
    assert "id" in data
    assert data["name"] == "Technical Blog Writer"
    assert data["description"] == "Creates technical blog articles"
    assert data["instructions"] == "You are an expert technical writer."
    assert data["owner_id"] == user1.id  # Verified ownership
    assert data["version"] == 1
    assert len(data["variables"]) == 1
    assert data["variables"][0]["name"] == "topic"
    assert data["examples"] == [{"input": "AI news", "output": "Weekly AI summary"}]
    assert data["output_format"] == {"type": "markdown"}
    assert data["modules"] == ["seo_module"]
    assert "created_at" in data
    assert "updated_at" in data


def test_get_prompt_system(client, auth_headers1, user1):
    """Test retrieving a Prompt System owned by authenticated user."""
    # Create prompt system
    create_resp = client.post(
        "/prompt-systems",
        json={"name": "Fetch Me", "instructions": "System instructions"},
        headers=auth_headers1,
    )
    assert create_resp.status_code == 201
    ps_id = create_resp.json()["id"]

    # Fetch prompt system
    get_resp = client.get(f"/prompt-systems/{ps_id}", headers=auth_headers1)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == ps_id
    assert data["name"] == "Fetch Me"
    assert data["owner_id"] == user1.id


def test_update_prompt_system(client, auth_headers1, user1):
    """Test updating editable fields of a Prompt System."""
    create_resp = client.post(
        "/prompt-systems",
        json={"name": "Original Name", "description": "Original Desc"},
        headers=auth_headers1,
    )
    ps_id = create_resp.json()["id"]

    update_payload = {
        "name": "Updated Name",
        "description": "Updated Desc",
        "instructions": "New Instructions",
        "variables": [{"name": "new_var"}],
        "owner_id": 9999,  # Should be ignored
    }
    update_resp = client.put(f"/prompt-systems/{ps_id}", json=update_payload, headers=auth_headers1)
    assert update_resp.status_code == 200

    data = update_resp.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated Desc"
    assert data["instructions"] == "New Instructions"
    assert data["variables"] == [{"name": "new_var"}]
    assert data["owner_id"] == user1.id  # Unchanged


@pytest.mark.asyncio
async def test_delete_prompt_system(client, auth_headers1, db_session):
    """Test deleting a Prompt System removes it from database asynchronously."""
    create_resp = client.post(
        "/prompt-systems",
        json={"name": "To Be Deleted"},
        headers=auth_headers1,
    )
    ps_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/prompt-systems/{ps_id}", headers=auth_headers1)
    assert delete_resp.status_code == 200

    # Ensure it no longer exists via API
    get_resp = client.get(f"/prompt-systems/{ps_id}", headers=auth_headers1)
    assert get_resp.status_code == 404

    # Direct async DB check with select()
    stmt = select(PromptSystem).where(PromptSystem.id == ps_id)
    result = await db_session.execute(stmt)
    assert result.scalar_one_or_none() is None


def test_unauthenticated_requests(client):
    """Test that all CRUD endpoints reject unauthenticated requests with 401."""
    assert client.post("/prompt-systems", json={"name": "No Auth"}).status_code == 401
    assert client.get("/prompt-systems/1").status_code == 401
    assert client.put("/prompt-systems/1", json={"name": "No Auth"}).status_code == 401
    assert client.delete("/prompt-systems/1").status_code == 401


def test_user_cannot_access_another_user_prompt_system(client, auth_headers1, auth_headers2):
    """Test that a user cannot read, update, or delete another user's Prompt System (403 Forbidden)."""
    # User 1 creates Prompt System
    create_resp = client.post(
        "/prompt-systems",
        json={"name": "User 1 Private System"},
        headers=auth_headers1,
    )
    ps_id = create_resp.json()["id"]

    # User 2 tries to GET
    get_resp = client.get(f"/prompt-systems/{ps_id}", headers=auth_headers2)
    assert get_resp.status_code == 403
    assert "permission" in get_resp.json()["detail"].lower()

    # User 2 tries to PUT
    put_resp = client.put(f"/prompt-systems/{ps_id}", json={"name": "Hacked"}, headers=auth_headers2)
    assert put_resp.status_code == 403

    # User 2 tries to DELETE
    del_resp = client.delete(f"/prompt-systems/{ps_id}", headers=auth_headers2)
    assert del_resp.status_code == 403


def test_prompt_system_not_found(client, auth_headers1):
    """Test operations on non-existent Prompt Systems return 404."""
    non_existent_id = 999999
    assert client.get(f"/prompt-systems/{non_existent_id}", headers=auth_headers1).status_code == 404
    assert client.put(f"/prompt-systems/{non_existent_id}", json={"name": "Test"}, headers=auth_headers1).status_code == 404
    assert client.delete(f"/prompt-systems/{non_existent_id}", headers=auth_headers1).status_code == 404


def test_invalid_requests(client, auth_headers1):
    """Test validation errors return 422 Unprocessable Entity."""
    # Blank name
    res1 = client.post("/prompt-systems", json={"name": ""}, headers=auth_headers1)
    assert res1.status_code == 422

    # Whitespace-only name
    res2 = client.post("/prompt-systems", json={"name": "   "}, headers=auth_headers1)
    assert res2.status_code == 422

    # Missing name
    res3 = client.post("/prompt-systems", json={"description": "Missing name"}, headers=auth_headers1)
    assert res3.status_code == 422

    # Update with empty name
    create_res = client.post("/prompt-systems", json={"name": "Valid Name"}, headers=auth_headers1)
    ps_id = create_res.json()["id"]
    res4 = client.put(f"/prompt-systems/{ps_id}", json={"name": ""}, headers=auth_headers1)
    assert res4.status_code == 422

    # Invalid path parameter
    res5 = client.get("/prompt-systems/invalid_id", headers=auth_headers1)
    assert res5.status_code == 422


# ==============================================================================
# Branch 9 Fix: Output Format Validation (String, Dictionary, List)
# ==============================================================================

def test_output_format_as_string(client, auth_headers1):
    """Verify output_format accepts string and preserves string type on create and read."""
    payload = {
        "name": "Markdown System",
        "output_format": "Return clean Markdown.",
    }
    response = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["output_format"], str)
    assert data["output_format"] == "Return clean Markdown."

    # Fetch to verify persistence
    get_res = client.get(f"/prompt-systems/{data['id']}", headers=auth_headers1)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert isinstance(get_data["output_format"], str)
    assert get_data["output_format"] == "Return clean Markdown."


def test_output_format_as_multiline_string(client, auth_headers1):
    """Verify output_format accepts multiline string with markdown formatting."""
    multiline_format = (
        "Return clean Markdown.\n\n"
        "- Start with a three-bullet summary\n"
        "- Use descriptive H2 and H3 headings\n"
        "- Include runnable code blocks where useful\n"
        "- Target 1,000–1,400 words\n"
        "- End with practical next steps"
    )
    payload = {
        "name": "Complex Markdown System",
        "output_format": multiline_format,
    }
    response = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["output_format"], str)
    assert data["output_format"] == multiline_format

    # Fetch to verify persistence
    get_res = client.get(f"/prompt-systems/{data['id']}", headers=auth_headers1)
    assert get_res.status_code == 200
    assert get_res.json()["output_format"] == multiline_format


def test_output_format_as_dictionary(client, auth_headers1):
    """Verify output_format accepts dictionary and preserves dict type (not wrapped or converted to list)."""
    payload = {
        "name": "JSON Output System",
        "output_format": {"name": "yogesh"},
    }
    response = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["output_format"], dict)
    assert data["output_format"] == {"name": "yogesh"}
    assert not isinstance(data["output_format"], list)

    # Fetch to verify persistence
    get_res = client.get(f"/prompt-systems/{data['id']}", headers=auth_headers1)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert isinstance(get_data["output_format"], dict)
    assert get_data["output_format"] == {"name": "yogesh"}


def test_output_format_as_list(client, auth_headers1):
    """Verify output_format accepts list/array and preserves list type."""
    payload = {
        "name": "List Output System",
        "output_format": ["summary", "headings", "code", "next_steps"],
    }
    response = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["output_format"], list)
    assert data["output_format"] == ["summary", "headings", "code", "next_steps"]

    # Fetch to verify persistence
    get_res = client.get(f"/prompt-systems/{data['id']}", headers=auth_headers1)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert isinstance(get_data["output_format"], list)
    assert get_data["output_format"] == ["summary", "headings", "code", "next_steps"]


def test_output_format_patch_supports_all_three_types(client, auth_headers1):
    """Verify PATCH /prompt-systems/{id} updates and preserves string, dict, and list."""
    # 1. Create with string
    create_res = client.post(
        "/prompt-systems",
        json={"name": "Flexible Format System", "output_format": "Initial string"},
        headers=auth_headers1,
    )
    assert create_res.status_code == 201
    ps_id = create_res.json()["id"]

    # 2. PATCH with dictionary
    patch_dict_res = client.patch(
        f"/prompt-systems/{ps_id}",
        json={"output_format": {"name": "yogesh"}},
        headers=auth_headers1,
    )
    assert patch_dict_res.status_code == 200
    assert isinstance(patch_dict_res.json()["output_format"], dict)
    assert patch_dict_res.json()["output_format"] == {"name": "yogesh"}

    # Verify via GET
    get_res = client.get(f"/prompt-systems/{ps_id}", headers=auth_headers1)
    assert get_res.json()["output_format"] == {"name": "yogesh"}

    # 3. PATCH with list
    patch_list_res = client.patch(
        f"/prompt-systems/{ps_id}",
        json={"output_format": ["summary", "headings"]},
        headers=auth_headers1,
    )
    assert patch_list_res.status_code == 200
    assert isinstance(patch_list_res.json()["output_format"], list)
    assert patch_list_res.json()["output_format"] == ["summary", "headings"]

    # Verify via GET
    get_res = client.get(f"/prompt-systems/{ps_id}", headers=auth_headers1)
    assert get_res.json()["output_format"] == ["summary", "headings"]

    # 4. PATCH with string
    patch_str_res = client.patch(
        f"/prompt-systems/{ps_id}",
        json={"output_format": "Return clean Markdown."},
        headers=auth_headers1,
    )
    assert patch_str_res.status_code == 200
    assert isinstance(patch_str_res.json()["output_format"], str)
    assert patch_str_res.json()["output_format"] == "Return clean Markdown."

    # Verify via GET
    get_res = client.get(f"/prompt-systems/{ps_id}", headers=auth_headers1)
    assert get_res.json()["output_format"] == "Return clean Markdown."

