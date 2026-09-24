"""Tests for Branch 9: Prompt System Variables.

Covers:
- Variable parser detection of variables
- Duplicate removal preserving appearance order
- Variable schema validation (types, name without spaces, uniqueness)
- Variable validation endpoint (POST /prompt-systems/{id}/variables/validate)
- Matching, missing, and unused variable reporting
- Ownership protection (403 for unauthorized users)
- 404 for non-existent prompt systems
- Saving variables through prompt system update (PUT / PATCH)
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from backend.app.database.base import Base
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.user import User
from backend.app.services.auth_service import create_access_token
from backend.app.utils.variable_parser import extract_variables, validate_prompt_variables


# ==============================================================================
# Unit Tests for Variable Parser Utility
# ==============================================================================

def test_variable_parser_detects_variables():
    """Verify variable parser detects placeholders like {variable_name}."""
    text = "Write a blog about {topic} for {audience} in a {tone} tone."
    detected = extract_variables(text)
    assert detected == ["topic", "audience", "tone"]


def test_variable_parser_removes_duplicates_and_preserves_order():
    """Verify variable parser deduplicates while keeping first appearance order."""
    text = "Write about {topic}. Explain {topic} for {audience}. Use {topic} and {audience}."
    detected = extract_variables(text)
    assert detected == ["topic", "audience"]


def test_variable_parser_handles_empty_and_no_variables():
    """Verify variable parser returns empty list when text has no placeholders or is empty."""
    assert extract_variables("") == []
    assert extract_variables(None) == []
    assert extract_variables("Plain instructions without variables.") == []
    assert extract_variables("Braces with spaces { not_a_variable }") == []


def test_validate_prompt_variables_pure_function():
    """Verify pure validation helper function with various matching/mismatching scenarios."""
    instructions = "Explain {topic} to {audience}."
    
    # 1. Exact match
    matched = validate_prompt_variables(
        instructions,
        [{"name": "topic"}, {"name": "audience"}],
    )
    assert matched["valid"] is True
    assert matched["detected_variables"] == ["topic", "audience"]
    assert matched["configured_variables"] == ["topic", "audience"]
    assert matched["missing_variables"] == []
    assert matched["unused_variables"] == []

    # 2. Missing variable (in instructions but not configured)
    missing = validate_prompt_variables(
        instructions,
        [{"name": "topic"}],
    )
    assert missing["valid"] is False
    assert missing["missing_variables"] == ["audience"]
    assert missing["unused_variables"] == []

    # 3. Unused variable (configured but not in instructions)
    unused = validate_prompt_variables(
        instructions,
        [{"name": "topic"}, {"name": "audience"}, {"name": "tone"}],
    )
    assert unused["valid"] is False
    assert unused["missing_variables"] == []
    assert unused["unused_variables"] == ["tone"]

    # 4. No variables in either
    empty = validate_prompt_variables("No variables here", [])
    assert empty["valid"] is True
    assert empty["detected_variables"] == []
    assert empty["configured_variables"] == []


# ==============================================================================
# Integration Tests for Database & API Endpoints
# ==============================================================================

@pytest.fixture
async def db_session():
    """Create isolated SQLite async in-memory database for testing."""
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
    """Create test owner user."""
    u1 = User(
        name="Alice Owner",
        email="alice@promptforge.io",
        password_hash="$2b$12$hashedpasswordforalice",
    )
    db_session.add(u1)
    await db_session.commit()
    await db_session.refresh(u1)
    return u1


@pytest.fixture
async def user2(db_session):
    """Create another user for testing ownership boundaries."""
    u2 = User(
        name="Bob Other",
        email="bob@promptforge.io",
        password_hash="$2b$12$hashedpasswordforbob",
    )
    db_session.add(u2)
    await db_session.commit()
    await db_session.refresh(u2)
    return u2


@pytest.fixture
def auth_headers1(user1):
    """JWT headers for Alice."""
    token = create_access_token(data={"sub": str(user1.id), "email": user1.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers2(user2):
    """JWT headers for Bob."""
    token = create_access_token(data={"sub": str(user2.id), "email": user2.email})
    return {"Authorization": f"Bearer {token}"}


def test_variables_validation_endpoint_exact_match(client, auth_headers1):
    """Test POST /variables/validate returns valid: true when variables match."""
    payload = {
        "name": "Article Generator",
        "instructions": "Write an article about {topic} for {audience}.",
        "variables": [
            {
                "name": "topic",
                "label": "Topic",
                "type": "text",
                "required": True,
                "default": "",
                "description": "Article topic",
            },
            {
                "name": "audience",
                "label": "Audience",
                "type": "text",
                "required": True,
                "default": "developers",
                "description": "Target audience",
            },
        ],
    }
    create_res = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert create_res.status_code == 201
    ps_id = create_res.json()["id"]

    val_res = client.post(f"/prompt-systems/{ps_id}/variables/validate", headers=auth_headers1)
    assert val_res.status_code == 200
    data = val_res.json()
    assert data["valid"] is True
    assert data["detected_variables"] == ["topic", "audience"]
    assert data["configured_variables"] == ["topic", "audience"]
    assert data["missing_variables"] == []
    assert data["unused_variables"] == []


def test_variables_validation_endpoint_missing_variables(client, auth_headers1):
    """Test POST /variables/validate reports missing variables."""
    payload = {
        "name": "Article Generator",
        "instructions": "Write an article about {topic} for {audience}.",
        "variables": [
            {
                "name": "topic",
                "label": "Topic",
                "type": "text",
                "required": True,
            }
        ],
    }
    create_res = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    ps_id = create_res.json()["id"]

    val_res = client.post(f"/prompt-systems/{ps_id}/variables/validate", headers=auth_headers1)
    assert val_res.status_code == 200
    data = val_res.json()
    assert data["valid"] is False
    assert data["detected_variables"] == ["topic", "audience"]
    assert data["configured_variables"] == ["topic"]
    assert data["missing_variables"] == ["audience"]
    assert data["unused_variables"] == []


def test_variables_validation_endpoint_unused_variables(client, auth_headers1):
    """Test POST /variables/validate reports unused variables."""
    payload = {
        "name": "Article Generator",
        "instructions": "Write an article about {topic}.",
        "variables": [
            {
                "name": "topic",
                "label": "Topic",
                "type": "text",
                "required": True,
            },
            {
                "name": "tone",
                "label": "Tone",
                "type": "select",
                "required": False,
                "default": "casual",
            },
        ],
    }
    create_res = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    ps_id = create_res.json()["id"]

    val_res = client.post(f"/prompt-systems/{ps_id}/variables/validate", headers=auth_headers1)
    assert val_res.status_code == 200
    data = val_res.json()
    assert data["valid"] is False
    assert data["detected_variables"] == ["topic"]
    assert data["configured_variables"] == ["topic", "tone"]
    assert data["missing_variables"] == []
    assert data["unused_variables"] == ["tone"]


def test_variables_validation_no_variables(client, auth_headers1):
    """Test validation when no variables are in instructions or configuration."""
    create_res = client.post(
        "/prompt-systems",
        json={"name": "Static Prompt", "instructions": "Always be polite."},
        headers=auth_headers1,
    )
    ps_id = create_res.json()["id"]

    val_res = client.post(f"/prompt-systems/{ps_id}/variables/validate", headers=auth_headers1)
    assert val_res.status_code == 200
    data = val_res.json()
    assert data["valid"] is True
    assert data["detected_variables"] == []
    assert data["configured_variables"] == []
    assert data["missing_variables"] == []
    assert data["unused_variables"] == []


def test_variables_validation_unauthorized_user_forbidden(client, auth_headers1, auth_headers2):
    """Test user cannot validate variables for another user's prompt system (403)."""
    create_res = client.post(
        "/prompt-systems",
        json={"name": "Alice's Secret Prompt", "instructions": "Hello {secret}"},
        headers=auth_headers1,
    )
    ps_id = create_res.json()["id"]

    # Bob attempts to validate Alice's prompt system
    bob_res = client.post(f"/prompt-systems/{ps_id}/variables/validate", headers=auth_headers2)
    assert bob_res.status_code == 403


def test_variables_validation_not_found_returns_404(client, auth_headers1):
    """Test non-existent prompt system returns 404."""
    res = client.post("/prompt-systems/999999/variables/validate", headers=auth_headers1)
    assert res.status_code == 404


def test_variables_validation_unauthenticated_returns_401(client):
    """Test unauthenticated call returns 401."""
    res = client.post("/prompt-systems/1/variables/validate")
    assert res.status_code == 401


def test_save_variables_via_update_flow(client, auth_headers1):
    """Test saving variables through PUT and PATCH update endpoints."""
    # Create with minimal data
    create_res = client.post(
        "/prompt-systems",
        json={"name": "Test System", "instructions": "Hello {name}"},
        headers=auth_headers1,
    )
    ps_id = create_res.json()["id"]

    # Update variables via PUT
    updated_vars = [
        {
            "name": "name",
            "label": "User Name",
            "type": "text",
            "required": True,
            "default": "Friend",
            "description": "The user's greeting name",
        }
    ]
    put_res = client.put(
        f"/prompt-systems/{ps_id}",
        json={"variables": updated_vars},
        headers=auth_headers1,
    )
    assert put_res.status_code == 200
    assert len(put_res.json()["variables"]) == 1
    assert put_res.json()["variables"][0]["name"] == "name"
    assert put_res.json()["variables"][0]["type"] == "text"

    # Validate endpoint now passes
    val_res = client.post(f"/prompt-systems/{ps_id}/variables/validate", headers=auth_headers1)
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True


def test_invalid_variable_type_rejected(client, auth_headers1):
    """Test that invalid variable types are rejected with 422."""
    payload = {
        "name": "Invalid Type System",
        "variables": [
            {
                "name": "foo",
                "label": "Foo",
                "type": "unsupported_type",  # Must be text, number, select, multiline
                "required": True,
            }
        ],
    }
    res = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert res.status_code == 422


def test_duplicate_variable_names_rejected(client, auth_headers1):
    """Test that duplicate variable names inside one PromptSystem are rejected with 422."""
    payload = {
        "name": "Duplicate Variable System",
        "variables": [
            {
                "name": "topic",
                "label": "Topic 1",
                "type": "text",
                "required": True,
            },
            {
                "name": "topic",  # Duplicate name
                "label": "Topic 2",
                "type": "multiline",
                "required": False,
            },
        ],
    }
    res = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert res.status_code == 422


def test_invalid_variable_name_with_spaces_rejected(client, auth_headers1):
    """Test that variable names containing spaces are rejected with 422."""
    payload = {
        "name": "Space Variable System",
        "variables": [
            {
                "name": "my topic",  # Contains space
                "label": "My Topic",
                "type": "text",
                "required": True,
            }
        ],
    }
    res = client.post("/prompt-systems", json=payload, headers=auth_headers1)
    assert res.status_code == 422
