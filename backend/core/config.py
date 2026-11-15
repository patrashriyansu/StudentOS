from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

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
    GOOGLE_CLIENT_SECRET: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    OPENAI_MODEL: str = "gpt-4o-mini"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    FRONTEND_URL: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_STARTTLS: bool = True
    SEED_DEMO_DATA: bool = False

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Use SQLAlchemy's async Postgres driver when hosts provide a plain URL."""
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://"):
            value = value.replace("postgresql://", "postgresql+asyncpg://", 1)
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

