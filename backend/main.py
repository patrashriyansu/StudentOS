import asyncio
import contextlib
import logging
from fastapi import FastAPI, HTTPException
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

logger = logging.getLogger("studentos.startup")


async def initialize_database(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        if settings.SEED_DEMO_DATA:
            await seed_data()
        app.state.db_ready = True
        app.state.db_error = None
        logger.info("Database initialization complete")
    except Exception as exc:
        app.state.db_ready = False
        app.state.db_error = str(exc)
        logger.exception("Database initialization failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db_ready = False
    app.state.db_error = None
    app.state.db_init_task = asyncio.create_task(initialize_database(app))
    yield
    task = getattr(app.state, "db_init_task", None)
    if task and not task.done():
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
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
    # In production, set FRONTEND_URL (e.g. https://studentos.vercel.app) to restrict CORS.
    # Wildcard "*" is used as fallback for local dev; credentials are disabled in that mode.
    allow_origins=[settings.FRONTEND_URL] if settings.FRONTEND_URL else ["*"],
    allow_credentials=bool(settings.FRONTEND_URL),  # True only when specific origin is set
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
@app.get("/api/v1/health")
async def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": settings.DATABASE_URL.split("://")[0],
        "database_ready": bool(getattr(app.state, "db_ready", False)),
        "database_error": getattr(app.state, "db_error", None),
    }

@app.get("/ready")
async def ready():
    if not getattr(app.state, "db_ready", False):
        detail = getattr(app.state, "db_error", None) or "Database is still starting"
        raise HTTPException(status_code=503, detail=detail)
    return {"ready": True}
