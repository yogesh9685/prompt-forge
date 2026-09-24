"""Tests for user registration authentication flow, model, validation, and security."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database.base import Base
from backend.app.database.connection import get_db
from backend.app.main import app
from backend.app.models.user import User
from backend.app.utils.security import verify_password


@pytest.fixture
def db_session():
    """Create a clean, isolated SQLite in-memory database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    """Provide a TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ==============================================================================
# Registration Tests
# ==============================================================================

def test_successful_registration(client, db_session):
    """Test successful user registration returns expected schema without sensitive data."""
    payload = {
        "name": "Yogesh",
        "email": "yogesh@example.com",
        "password": "password123",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert "id" in data
    assert data["name"] == "Yogesh"
    assert data["email"] == "yogesh@example.com"
    assert "created_at" in data
    assert "updated_at" in data

    # Ensure password and password_hash are NEVER exposed in response
    assert "password" not in data
    assert "password_hash" not in data

    # Verify user exists in the database
    db_user = db_session.query(User).filter(User.email == "yogesh@example.com").first()
    assert db_user is not None
    assert db_user.name == "Yogesh"
    assert db_user.password_hash != "password123"


def test_duplicate_email(client):
    """Test that registering with an already existing email returns a 400 error."""
    payload = {
        "name": "Original User",
        "email": "duplicate@example.com",
        "password": "password123",
    }
    first_resp = client.post("/auth/register", json=payload)
    assert first_resp.status_code == 201

    # Attempt duplicate registration with exact same email
    dup_payload = {
        "name": "Duplicate User",
        "email": "duplicate@example.com",
        "password": "newpassword456",
    }
    dup_resp = client.post("/auth/register", json=dup_payload)
    assert dup_resp.status_code == 400
    assert "already registered" in dup_resp.json()["detail"].lower()

    # Attempt duplicate registration with different casing (case insensitive)
    dup_case_payload = {
        "name": "Duplicate User 2",
        "email": "DUPLICATE@example.com",
        "password": "newpassword456",
    }
    dup_case_resp = client.post("/auth/register", json=dup_case_payload)
    assert dup_case_resp.status_code == 400
    assert "already registered" in dup_case_resp.json()["detail"].lower()


@pytest.mark.parametrize(
    "invalid_email",
    [
        "not-an-email",
        "user@",
        "@example.com",
        "plainaddress",
        "user@.com",
    ],
)
def test_invalid_email(client, invalid_email):
    """Test that invalid email addresses are rejected with 422 Unprocessable Entity."""
    payload = {
        "name": "Test User",
        "email": invalid_email,
        "password": "password123",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.parametrize(
    "short_password",
    [
        "",
        "123",
        "short",
        "1234567",  # 7 characters (min length is 8)
    ],
)
def test_invalid_short_password(client, short_password):
    """Test that passwords shorter than minimum length are rejected with 422."""
    payload = {
        "name": "Test User",
        "email": "valid@example.com",
        "password": short_password,
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 422


def test_password_is_stored_hashed(client, db_session):
    """Verify that password is never stored plaintext and is securely hashed."""
    plain_password = "MySuperSecretPassword#2026"
    payload = {
        "name": "Security Tester",
        "email": "security@example.com",
        "password": plain_password,
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201

    db_user = db_session.query(User).filter(User.email == "security@example.com").first()
    assert db_user is not None
    # Must never equal plaintext
    assert db_user.password_hash != plain_password
    # Must be a bcrypt hash (starts with $2b$ or $2a$)
    assert db_user.password_hash.startswith("$2")
    # Must successfully verify against bcrypt
    assert verify_password(plain_password, db_user.password_hash) is True
    # Incorrect password should fail verification
    assert verify_password("wrong_password", db_user.password_hash) is False


def test_name_validation(client):
    """Test that name cannot be empty, whitespace-only, or missing."""
    # Blank name
    resp1 = client.post(
        "/auth/register",
        json={"name": "", "email": "blankname@example.com", "password": "password123"},
    )
    assert resp1.status_code == 422

    # Whitespace-only name
    resp2 = client.post(
        "/auth/register",
        json={"name": "   ", "email": "whitespacename@example.com", "password": "password123"},
    )
    assert resp2.status_code == 422

    # Missing name
    resp3 = client.post(
        "/auth/register",
        json={"email": "noname@example.com", "password": "password123"},
    )
    assert resp3.status_code == 422


# ==============================================================================
# Login Tests
# ==============================================================================

def test_successful_login(client):
    """Test successful login with registered credentials."""
    # Register user first
    reg_payload = {
        "name": "Yogesh",
        "email": "yogesh@example.com",
        "password": "password123",
    }
    reg_resp = client.post("/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201
    user_id = reg_resp.json()["id"]

    # Login with same credentials
    login_payload = {
        "email": "yogesh@example.com",
        "password": "password123",
    }
    login_resp = client.post("/auth/login", json=login_payload)
    assert login_resp.status_code == 200

    data = login_resp.json()
    assert data["message"] == "Login successful"
    assert "user" in data
    assert data["user"]["id"] == user_id
    assert data["user"]["name"] == "Yogesh"
    assert data["user"]["email"] == "yogesh@example.com"

    # Verify sensitive data is NEVER returned
    assert "password" not in data
    assert "password_hash" not in data
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]


def test_login_incorrect_password(client):
    """Test that incorrect password returns 401 Unauthorized."""
    # Register user
    reg_payload = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "correct_password123",
    }
    reg_resp = client.post("/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201

    # Attempt login with wrong password
    login_payload = {
        "email": "test@example.com",
        "password": "wrong_password456",
    }
    login_resp = client.post("/auth/login", json=login_payload)
    assert login_resp.status_code == 401
    assert "invalid" in login_resp.json()["detail"].lower()


def test_login_non_existing_email(client):
    """Test that login with non-existing email returns 401 Unauthorized."""
    login_payload = {
        "email": "doesnotexist@example.com",
        "password": "password123",
    }
    login_resp = client.post("/auth/login", json=login_payload)
    assert login_resp.status_code == 401
    assert "invalid" in login_resp.json()["detail"].lower()


@pytest.mark.parametrize(
    "invalid_payload",
    [
        {},
        {"email": "test@example.com"},
        {"password": "password123"},
        {"email": "not-an-email", "password": "password123"},
        {"email": "test@example.com", "password": ""},
    ],
)
def test_login_empty_or_invalid_input(client, invalid_payload):
    """Test that empty or malformed login requests are rejected with 422."""
    response = client.post("/auth/login", json=invalid_payload)
    assert response.status_code == 422


def test_login_case_insensitive_email(client):
    """Test that email matching during login is case-insensitive."""
    reg_payload = {
        "name": "Case User",
        "email": "case.sensitive@example.com",
        "password": "password123",
    }
    reg_resp = client.post("/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201

    # Login with uppercase email
    login_payload = {
        "email": "CASE.SENSITIVE@EXAMPLE.COM",
        "password": "password123",
    }
    login_resp = client.post("/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    assert login_resp.json()["message"] == "Login successful"
    assert login_resp.json()["user"]["email"] == "case.sensitive@example.com"
