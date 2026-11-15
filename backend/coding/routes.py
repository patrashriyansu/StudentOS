import json
import re
from datetime import date, datetime, timezone
from typing import Literal
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.coding.models import CodingProfile, CodingProblem, Contest, DSAProgress

router = APIRouter()

LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"
LEETCODE_PROFILE_QUERY = """
query StudentOSPublicProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
    }
    submitStats: submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
    userCalendar {
      streak
      totalActiveDays
    }
  }
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
  }
}
"""


class CodingUsername(BaseModel):
    platform: Literal["leetcode", "codeforces", "codechef"]
    username: str = Field(..., min_length=1, max_length=300)


def normalize_leetcode_username(value: str) -> str:
    """Accept a LeetCode username or its public profile URL and return the handle."""
    candidate = value.strip()
    if candidate.startswith("@"):
        candidate = candidate[1:]

    if "://" in candidate or "leetcode.com/" in candidate.lower():
        parsed = urlparse(candidate if "://" in candidate else f"https://{candidate}")
        host = (parsed.hostname or "").lower()
        if host not in {"leetcode.com", "www.leetcode.com"}:
            raise ValueError("Enter a LeetCode profile URL or username.")
        parts = [part for part in parsed.path.split("/") if part]
        if parts and parts[0].lower() == "u":
            parts = parts[1:]
        if len(parts) != 1:
            raise ValueError("Use a profile URL such as https://leetcode.com/u/username/.")
        candidate = parts[0]

    if not re.fullmatch(r"[A-Za-z0-9_-]{1,50}", candidate):
        raise ValueError("LeetCode usernames can contain letters, numbers, underscores and hyphens.")
    return candidate


async def fetch_leetcode_public_stats(username: str) -> dict:
    """Fetch only public profile statistics. No session cookie or account password is used."""
    variables = json.dumps({"username": username})
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Referer": f"https://leetcode.com/u/{username}/",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0.0.0 Safari/537.36"
        ),
    }

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=6.0),
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = await client.get(
                LEETCODE_GRAPHQL_URL,
                params={"query": LEETCODE_PROFILE_QUERY, "variables": variables},
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=503,
            detail="LeetCode took too long to respond. Your handle is saved; try syncing again shortly.",
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"LeetCode is temporarily unavailable (HTTP {exc.response.status_code}). Try syncing again later.",
        ) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not reach LeetCode right now. Your handle is saved; try syncing again shortly.",
        ) from exc

    user_data = (payload.get("data") or {}).get("matchedUser")
    if not user_data:
        raise HTTPException(status_code=404, detail="That LeetCode username was not found. Check the profile URL.")

    accepted_rows = (user_data.get("submitStats") or {}).get("acSubmissionNum") or []
    if not accepted_rows:
        raise HTTPException(
            status_code=502,
            detail="LeetCode returned an incomplete profile response. Please retry the sync.",
        )

    accepted = {
        str(row.get("difficulty", "")).strip().lower(): int(row.get("count") or 0)
        for row in accepted_rows
    }
    easy = accepted.get("easy", 0)
    medium = accepted.get("medium", 0)
    hard = accepted.get("hard", 0)
    total = accepted.get("all", easy + medium + hard)

    contest = (payload.get("data") or {}).get("userContestRanking") or {}
    calendar = user_data.get("userCalendar") or {}
    return {
        "username": user_data.get("username") or username,
        "total_problems_solved": total,
        "easy_solved": easy,
        "medium_solved": medium,
        "hard_solved": hard,
        "total_contests": int(contest.get("attendedContestsCount") or 0),
        "current_streak": int(calendar.get("streak") or 0),
        "rating": round(float(contest.get("rating") or 0)),
        "ranking": (user_data.get("profile") or {}).get("ranking"),
    }


def serialize_profile(profile: CodingProfile) -> dict:
    return {
        "leetcode_username": profile.leetcode_username,
        "codeforces_username": profile.codeforces_username,
        "codechef_username": profile.codechef_username,
        "total_problems_solved": profile.total_problems_solved or 0,
        "easy_solved": profile.easy_solved or 0,
        "medium_solved": profile.medium_solved or 0,
        "hard_solved": profile.hard_solved or 0,
        "total_contests": profile.total_contests or 0,
        "current_streak": profile.current_streak or 0,
        "max_streak": profile.max_streak or 0,
        "rating": profile.rating or 0,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


@router.get("/profile")
async def get_coding_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CodingProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return serialize_profile(profile)


@router.put("/profile")
async def update_coding_profile(
    req: CodingUsername,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    username = req.username.strip()
    if req.platform == "leetcode":
        try:
            username = normalize_leetcode_username(username)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    elif not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", username):
        raise HTTPException(status_code=422, detail="Enter a valid platform username.")

    result = await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CodingProfile(user_id=current_user.id)
        db.add(profile)

    if req.platform == "leetcode":
        if profile.leetcode_username != username:
            # Do not display the previous account's solved count for a new handle.
            profile.total_problems_solved = 0
            profile.easy_solved = 0
            profile.medium_solved = 0
            profile.hard_solved = 0
            profile.total_contests = 0
            profile.current_streak = 0
            profile.rating = 0
        profile.leetcode_username = username
    elif req.platform == "codeforces":
        profile.codeforces_username = username
    elif req.platform == "codechef":
        profile.codechef_username = username

    profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": f"{req.platform} username saved", "username": username}


@router.post("/leetcode/sync")
async def sync_leetcode_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile or not profile.leetcode_username:
        raise HTTPException(status_code=400, detail="Connect your LeetCode username first.")

    try:
        username = normalize_leetcode_username(profile.leetcode_username)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="The saved LeetCode handle is invalid. Edit it and enter your username or profile URL.",
        ) from exc

    stats = await fetch_leetcode_public_stats(username)
    profile.leetcode_username = stats["username"]
    profile.total_problems_solved = stats["total_problems_solved"]
    profile.easy_solved = stats["easy_solved"]
    profile.medium_solved = stats["medium_solved"]
    profile.hard_solved = stats["hard_solved"]
    profile.total_contests = stats["total_contests"]
    profile.current_streak = stats["current_streak"]
    profile.rating = stats["rating"]
    profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)

    return {
        "message": "LeetCode profile synced successfully.",
        "profile": serialize_profile(profile),
        "profile_url": f"https://leetcode.com/u/{username}/",
        "synced_at": profile.updated_at.isoformat(),
    }


@router.get("/problems")
async def get_coding_problems(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CodingProblem)
        .where(CodingProblem.user_id == current_user.id)
        .order_by(CodingProblem.solved_at.desc())
        .limit(200)
    )
    problems = result.scalars().all()
    return [
        {
            "id": problem.id,
            "platform": problem.platform,
            "title": problem.title,
            "difficulty": problem.difficulty,
            "topics": problem.topics,
            "solved_at": problem.solved_at.isoformat(),
        }
        for problem in problems
    ]


@router.get("/dsa-progress")
async def get_dsa_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DSAProgress).where(DSAProgress.user_id == current_user.id))
    topics = result.scalars().all()
    return [
        {
            "topic": topic.topic,
            "total_problems": topic.total_problems,
            "solved_problems": topic.solved_problems,
            "progress": round(topic.solved_problems / topic.total_problems * 100, 1)
            if topic.total_problems > 0 else 0,
            "difficulty_breakdown": topic.difficulty_breakdown,
        }
        for topic in topics
    ]


@router.get("/streak")
async def get_streak(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    return {
        "current_streak": profile.current_streak if profile else 0,
        "max_streak": profile.max_streak if profile else 0,
    }


@router.get("/analytics")
async def get_coding_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile_result = await db.execute(
        select(CodingProfile).where(CodingProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    other_problems_result = await db.execute(
        select(CodingProblem).where(
            CodingProblem.user_id == current_user.id,
            CodingProblem.platform != "leetcode",
        )
    )
    other_problems = other_problems_result.scalars().all()

    difficulty_count = {
        "easy": profile.easy_solved if profile else 0,
        "medium": profile.medium_solved if profile else 0,
        "hard": profile.hard_solved if profile else 0,
    }
    platform_count = {}
    if profile and profile.leetcode_username:
        platform_count["leetcode"] = profile.total_problems_solved or 0

    for problem in other_problems:
        difficulty = (problem.difficulty or "").lower()
        if difficulty in difficulty_count:
            difficulty_count[difficulty] += 1
        platform = (problem.platform or "other").lower()
        platform_count[platform] = platform_count.get(platform, 0) + 1

    total_solved = sum(difficulty_count.values())
    return {
        "total_solved": total_solved,
        "difficulty_breakdown": difficulty_count,
        "platform_breakdown": platform_count,
    }


@router.get("/difficulty-stats")
async def get_difficulty_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Backward-compatible chart endpoint backed by the synced profile counts."""
    analytics = await get_coding_analytics(current_user=current_user, db=db)
    counts = analytics["difficulty_breakdown"]
    return [
        {"name": "Easy", "value": counts["easy"], "color": "#10B981"},
        {"name": "Medium", "value": counts["medium"], "color": "#F59E0B"},
        {"name": "Hard", "value": counts["hard"], "color": "#EF4444"},
    ]
