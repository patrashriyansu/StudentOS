from sqlalchemy.engine import make_url

from backend.core.config import Settings


def normalize_database_url(value: str) -> str:
    return Settings(
        _env_file=None,
        ENVIRONMENT="test",
        DATABASE_URL=value,
    ).DATABASE_URL


def test_libpq_postgres_url_translates_sslmode_for_asyncpg() -> None:
    normalized = normalize_database_url(
        "postgresql://student:secret@db.example.test:5432/studentos"
        "?sslmode=require&application_name=StudentOS"
    )
    url = make_url(normalized)

    assert url.drivername == "postgresql+asyncpg"
    assert url.password == "secret"
    assert url.query["ssl"] == "require"
    assert "sslmode" not in url.query
    assert url.query["application_name"] == "StudentOS"


def test_legacy_postgres_scheme_also_translates_sslmode() -> None:
    normalized = normalize_database_url(
        "postgres://student:secret@db.example.test/studentos?sslmode=verify-full"
    )
    url = make_url(normalized)

    assert url.drivername == "postgresql+asyncpg"
    assert url.query["ssl"] == "verify-full"
    assert "sslmode" not in url.query


def test_explicit_asyncpg_ssl_setting_takes_precedence() -> None:
    normalized = normalize_database_url(
        "postgresql+asyncpg://student:secret@db.example.test/studentos"
        "?ssl=verify-full&sslmode=require"
    )
    url = make_url(normalized)

    assert url.query["ssl"] == "verify-full"
    assert "sslmode" not in url.query


def test_non_postgres_url_is_unchanged() -> None:
    value = "sqlite+aiosqlite:///./studentos.db"
    assert normalize_database_url(value) == value