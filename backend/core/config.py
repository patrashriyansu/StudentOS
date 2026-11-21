from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
from sqlalchemy.engine import make_url

# Find .env file — check backend dir first, then project root
_here = Path(__file__).parent.parent.parent  # project root
_env_file = str(_here / "backend" / ".env") if ((_here / "backend" / ".env").exists()) else str(_here / ".env")

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./studentos.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "studentos-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OPENAI_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_TENANT_ID: str = "common"
    GOOGLE_CLIENT_SECRET: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    FRONTEND_URL: str = ""
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = ""
    SEED_DEMO_DATA: bool = False

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Use Psycopg 3 async for hosted PostgreSQL URLs.

        Neon publishes libpq query parameters including sslmode and
        channel_binding. Psycopg 3 supports these options; asyncpg.connect()
        does not accept channel_binding and rejects libpq sslmode as a keyword.
        SQLAlchemy selects Psycopg async automatically with create_async_engine().
        """
        url = make_url(value)
        if url.drivername in {"postgres", "postgresql", "postgresql+asyncpg"}:
            url = url.set(drivername="postgresql+psycopg")
            value = url.render_as_string(hide_password=False)
        return value
    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if self.ENVIRONMENT.lower() == "production":
            if self.SECRET_KEY == "studentos-super-secret-key-change-in-production" or len(self.SECRET_KEY) < 32:
                raise ValueError("Production requires a unique SECRET_KEY of at least 32 characters.")
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError("Production must use a persistent PostgreSQL DATABASE_URL.")
        return self

    class Config:
        env_file = _env_file
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache
def get_settings():
    return Settings()

settings = get_settings()
