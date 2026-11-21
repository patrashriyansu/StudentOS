from sqlalchemy.engine import make_url

from backend.core.config import Settings


def normalize_database_url(value: str) -> str:
    return Settings(
        _env_file=None,
        ENVIRONMENT="test",
        DATABASE_URL=value,
    ).DATABASE_URL


def test_neon_url_uses_psycopg_async_and_preserves_tls_channel_binding() -> None:
    normalized = normalize_database_url(
        "postgresql://student:secret@db.example.test:5432/studentos"
        "?sslmode=require&channel_binding=require&application_name=StudentOS"
    )
    url = make_url(normalized)

    assert url.drivername == "postgresql+psycopg"
    assert url.password == "secret"
    assert url.query["sslmode"] == "require"
    assert url.query["channel_binding"] == "require"
    assert url.query["application_name"] == "StudentOS"


def test_legacy_postgres_scheme_uses_psycopg_async() -> None:
    normalized = normalize_database_url(
        "postgres://student:secret@db.example.test/studentos"
        "?sslmode=verify-full&channel_binding=require"
    )
    url = make_url(normalized)

    assert url.drivername == "postgresql+psycopg"
    assert url.query["sslmode"] == "verify-full"
    assert url.query["channel_binding"] == "require"


def test_previous_asyncpg_url_migrates_to_psycopg() -> None:
    normalized = normalize_database_url(
        "postgresql+asyncpg://student:secret@db.example.test/studentos"
        "?sslmode=require&channel_binding=require"
    )
    url = make_url(normalized)

    assert url.drivername == "postgresql+psycopg"
    assert url.query["sslmode"] == "require"
    assert url.query["channel_binding"] == "require"


def test_existing_psycopg_url_is_preserved() -> None:
    value = (
        "postgresql+psycopg://student:secret@db.example.test/studentos"
        "?sslmode=require&channel_binding=require"
    )
    assert normalize_database_url(value) == value


def test_non_postgres_url_is_unchanged() -> None:
    value = "sqlite+aiosqlite:///./studentos.db"
    assert normalize_database_url(value) == value