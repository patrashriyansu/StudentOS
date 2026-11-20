from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from backend.core.config import settings

# SQLite needs check_same_thread=False and no pool_size. It is used for
# local development and tests only; production config rejects SQLite.
if "sqlite" in settings.DATABASE_URL:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    # Keep the application pool deliberately small for serverless PostgreSQL
    # providers such as Neon Free. A large per-worker pool can exhaust the
    # provider's connection limit and waste compute while the database wakes.
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_size=3,
        max_overflow=2,
        pool_timeout=20,
        pool_recycle=300,
        pool_pre_ping=True,
    )

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
