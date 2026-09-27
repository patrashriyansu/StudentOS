from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, datetime, timezone
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.coding.models import CodingProfile, CodingProblem, Contest, DSAProgress
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class CodingUsername(BaseModel):
    platform: str; username: str

@router.get("/profile")
async def get_coding_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CodingProfile(user_id=current_user.id); db.add(profile); await db.commit(); await db.refresh(profile)
    return {"leetcode_username": profile.leetcode_username, "codeforces_username": profile.codeforces_username, "codechef_username": profile.codechef_username, "total_problems_solved": profile.total_problems_solved, "total_contests": profile.total_contests, "current_streak": profile.current_streak, "max_streak": profile.max_streak, "rating": profile.rating}

@router.put("/profile")
async def update_coding_profile(req: CodingUsername, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile: profile = CodingProfile(user_id=current_user.id); db.add(profile)
    if req.platform == "leetcode": profile.leetcode_username = req.username
    elif req.platform == "codeforces": profile.codeforces_username = req.username
    elif req.platform == "codechef": profile.codechef_username = req.username
    await db.commit(); return {"message": f"{req.platform} username updated"}

@router.get("/problems")
async def get_coding_problems(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CodingProblem).where(CodingProblem.user_id == current_user.id).order_by(CodingProblem.solved_at.desc()).limit(200))
    problems = result.scalars().all()
    return [{"id": p.id, "platform": p.platform, "title": p.title, "difficulty": p.difficulty, "topics": p.topics, "solved_at": p.solved_at.isoformat()} for p in problems]

@router.get("/dsa-progress")
async def get_dsa_progress(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DSAProgress).where(DSAProgress.user_id == current_user.id))
    topics = result.scalars().all()
    return [{"topic": t.topic, "total_problems": t.total_problems, "solved_problems": t.solved_problems, "progress": round(t.solved_problems / t.total_problems * 100, 1) if t.total_problems > 0 else 0, "difficulty_breakdown": t.difficulty_breakdown} for t in topics]

@router.get("/streak")
async def get_streak(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    return {"current_streak": profile.current_streak if profile else 0, "max_streak": profile.max_streak if profile else 0}

@router.get("/analytics")
async def get_coding_analytics(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    problems = await db.execute(select(CodingProblem).where(CodingProblem.user_id == current_user.id))
    probs = problems.scalars().all()
    difficulty_count = {"easy": 0, "medium": 0, "hard": 0}
    platform_count = {}
    for p in probs:
        d = p.difficulty.lower()
        if d in difficulty_count: difficulty_count[d] += 1
        platform_count[p.platform] = platform_count.get(p.platform, 0) + 1
    return {"total_solved": len(probs), "difficulty_breakdown": difficulty_count, "platform_breakdown": platform_count}
