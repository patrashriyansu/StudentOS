import pytest
from pydantic import ValidationError

from backend.core.config import Settings


def test_production_rejects_weak_signing_secret() -> None:
    with pytest.raises(ValidationError, match="unique SECRET_KEY"):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql://student:secret@localhost/studentos",
            SECRET_KEY="short-secret",
        )


def test_production_rejects_ephemeral_sqlite_database() -> None:
    with pytest.raises(ValidationError, match="persistent PostgreSQL"):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="sqlite+aiosqlite:///./studentos.db",
            SECRET_KEY="production-secret-key-for-tests-only-123456",
        )


def test_production_normalizes_postgres_database_url() -> None:
    config = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://student:secret@localhost/studentos",
        SECRET_KEY="production-secret-key-for-tests-only-123456",
    )
    assert config.DATABASE_URL.startswith("postgresql+asyncpg://")
