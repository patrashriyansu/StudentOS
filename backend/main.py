import asyncio
import contextlib
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.core.database import engine, Base
from backend.core.config import settings
from backend.core.seed import seed_data
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ── Import all models so SQLAlchemy registers them for table creation ──────────
import backend.users.models          # noqa: F401
import backend.auth.models           # noqa: F401
import backend.academics.models      # noqa: F401
import backend.coding.models         # noqa: F401
import backend.placements.models     # noqa: F401
import backend.wellness.models       # noqa: F401
import backend.productivity.models   # noqa: F401
import backend.finance.models        # noqa: F401
import backend.campus.models         # noqa: F401
import backend.workspaces.models     # noqa: F401
import backend.study.models          # noqa: F401

from backend.api import router as api_router
from backend.notifications.service import reminder_worker

limiter = Limiter(key_func=get_remote_address)

logger = logging.getLogger("studentos.startup")

configured_origins = [origin.strip() for origin in settings.FRONTEND_URL.split(",") if origin.strip()]
allowed_origins = configured_origins or ["http://localhost:5173", "http://127.0.0.1:5173"]


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
    app.state.reminder_task = asyncio.create_task(reminder_worker())
    yield
    task = getattr(app.state, "db_init_task", None)
    if task and not task.done():
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
    reminder_task = getattr(app.state, "reminder_task", None)
    if reminder_task and not reminder_task.done():
        reminder_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await reminder_task
    await engine.dispose()


app = FastAPI(
    title="StudentOS API",
    description="AI-Powered Student Operating System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=bool(configured_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


def require_database_ready() -> None:
    if not getattr(app.state, "db_ready", False):
        detail = getattr(app.state, "db_error", None) or "Database is still starting"
        raise HTTPException(status_code=503, detail=detail)


@app.get("/health")
@app.get("/api/v1/health")
async def health():
    # Render's existing service setting still uses /health. Keep that path
    # readiness-aware as well as /ready so failed database initialization
    # cannot be reported as a healthy production service.
    require_database_ready()
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": settings.DATABASE_URL.split("://")[0],
        "database_ready": True,
        "database_error": None,
    }


@app.get("/ready")
@app.get("/api/v1/ready")
async def ready():
    require_database_ready()
    return {"ready": True}
