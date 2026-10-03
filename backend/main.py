from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.core.database import engine, Base
from backend.core.config import settings
from backend.core.seed import seed_data

# ── Import all models so SQLAlchemy registers them for table creation ──────────
import backend.users.models          # noqa: F401
import backend.auth.models           # noqa: F401
import backend.academics.models      # noqa: F401
import backend.coding.models         # noqa: F401
import backend.placements.models     # noqa: F401
import backend.wellness.models       # noqa: F401
import backend.productivity.models   # noqa: F401
import backend.finance.models        # noqa: F401

from backend.api import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create all tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed demo data if DB is empty
    await seed_data()
    yield
    await engine.dispose()


app = FastAPI(
    title="StudentOS API",
    description="AI-Powered Student Operating System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0", "database": settings.DATABASE_URL.split("://")[0]}

@app.get("/ready")
async def ready():
    return {"ready": True}
