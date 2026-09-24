"""Tests for PromptSystem SQLAlchemy model definition, relationships, and JSON fields."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database.base import Base
from backend.app.models.prompt_system import PromptSystem
from backend.app.models.user import User


@pytest.fixture
def db_session():
    """Provide a fresh isolated SQLite in-memory database session."""
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
def sample_user(db_session):
    """Create a sample user to act as owner."""
    user = User(
        name="Prompt Engineer",
        email="engineer@promptforge.io",
        password_hash="$2b$12$hashedpasswordforpromptengineertesting",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_create_prompt_system(db_session, sample_user):
    """Verify that a PromptSystem can be created with all attributes and JSON fields."""
    variables_data = {
        "user_name": {"type": "string", "required": True},
        "query": {"type": "string", "required": True},
    }
    examples_data = [
        {"input": "Hello", "output": "Welcome to PromptForge!"},
        {"input": "Help", "output": "How can I assist you today?"},
    ]
    output_format_data = {
        "format": "json",
        "schema": {"response": "string", "confidence": "float"},
    }
    modules_data = ["persona_module", "guardrails_module"]

    prompt_system = PromptSystem(
        name="Support Bot Prompt",
        description="Core customer support system prompt",
        owner_id=sample_user.id,
        instructions="You are a professional customer support AI assistant.",
        variables=variables_data,
        examples=examples_data,
        output_format=output_format_data,
        modules=modules_data,
    )

    db_session.add(prompt_system)
    db_session.commit()
    db_session.refresh(prompt_system)

    # 1. Verify existence and primary key
    assert prompt_system.id is not None
    assert prompt_system.name == "Support Bot Prompt"
    assert prompt_system.description == "Core customer support system prompt"
    assert prompt_system.instructions == "You are a professional customer support AI assistant."

    # 2. Verify ownership and relationship
    assert prompt_system.owner_id == sample_user.id
    assert prompt_system.owner.id == sample_user.id
    assert prompt_system in sample_user.prompt_systems

    # 3. Verify version default
    assert prompt_system.version == 1

    # 4. Verify created_at and updated_at timestamps
    assert prompt_system.created_at is not None
    assert prompt_system.updated_at is not None

    # 5. Verify JSON fields store and retrieve data correctly
    assert prompt_system.variables == variables_data
    assert prompt_system.examples == examples_data
    assert prompt_system.output_format == output_format_data
    assert prompt_system.modules == modules_data


def test_prompt_system_version_default(db_session, sample_user):
    """Verify that version defaults to 1 when omitted."""
    ps = PromptSystem(
        name="Minimal Prompt System",
        owner_id=sample_user.id,
    )
    db_session.add(ps)
    db_session.commit()
    db_session.refresh(ps)

    assert ps.version == 1


def test_prompt_system_cascade_deletion(db_session, sample_user):
    """Verify that deleting the owner user cascades and removes their prompt systems."""
    ps = PromptSystem(
        name="Orphan Candidate",
        owner_id=sample_user.id,
    )
    db_session.add(ps)
    db_session.commit()
    ps_id = ps.id

    # Delete the owner user
    db_session.delete(sample_user)
    db_session.commit()

    # The prompt system should now be deleted
    queried_ps = db_session.query(PromptSystem).filter(PromptSystem.id == ps_id).first()
    assert queried_ps is None
