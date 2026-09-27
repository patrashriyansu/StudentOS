from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path

# Find .env file — check backend dir first, then project root
_here = Path(__file__).parent.parent.parent  # project root
_env_file = str(_here / "backend" / ".env") if ((_here / "backend" / ".env").exists()) else str(_here / ".env")

class Settings(BaseSettings):
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
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    class Config:
        env_file = _env_file
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache
def get_settings():
    return Settings()

settings = get_settings()

