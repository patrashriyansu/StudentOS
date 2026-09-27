from fastapi import APIRouter
from backend.auth.routes import router as auth_router
from backend.users.routes import router as users_router
from backend.academics.routes import router as academics_router
from backend.coding.routes import router as coding_router
from backend.placements.routes import router as placements_router
from backend.ai.routes import router as ai_router
from backend.wellness.routes import router as wellness_router
from backend.notifications.routes import router as notifications_router
from backend.analytics.routes import router as analytics_router
from backend.productivity.routes import router as productivity_router
from backend.finance.routes import router as finance_router

router = APIRouter()
router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
router.include_router(users_router, prefix="/users", tags=["Users"])
router.include_router(academics_router, prefix="/academics", tags=["Academics"])
router.include_router(coding_router, prefix="/coding", tags=["Coding"])
router.include_router(placements_router, prefix="/placements", tags=["Placements"])
router.include_router(ai_router, prefix="/ai", tags=["AI"])
router.include_router(wellness_router, prefix="/wellness", tags=["Wellness"])
router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
router.include_router(productivity_router, prefix="/productivity", tags=["Productivity"])
router.include_router(finance_router, prefix="/finance", tags=["Finance"])
