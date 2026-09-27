from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, UserProfile, UserActivity
from backend.users.schemas import UserProfileUpdate, UserResponse

router = APIRouter()

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return {
        "user": {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role, "avatar": current_user.avatar, "xp_points": current_user.xp_points, "level": current_user.level, "streak_days": current_user.streak_days},
        "profile": {"bio": profile.bio, "phone": profile.phone, "department": profile.department, "year": profile.year, "college": profile.college, "github_url": profile.github_url, "linkedin_url": profile.linkedin_url, "portfolio_url": profile.portfolio_url, "resume_url": profile.resume_url, "skills": profile.skills, "interests": profile.interests, "achievements": profile.achievements}
    }

@router.put("/profile")
async def update_profile(req: UserProfileUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    for field, value in req.model_dump(exclude_unset=True).items():
        if field == "name":
            current_user.name = value
        else:
            setattr(profile, field, value)
    await db.commit()
    return {"message": "Profile updated"}

@router.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read()
    import base64
    b64 = base64.b64encode(content).decode()
    current_user.avatar = f"data:{file.content_type};base64,{b64}"
    return {"avatar": current_user.avatar}

@router.get("/leaderboard")
async def leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.xp_points.desc()).limit(50))
    users = result.scalars().all()
    return [{"id": u.id, "name": u.name, "avatar": u.avatar, "xp_points": u.xp_points, "level": u.level, "streak_days": u.streak_days} for u in users]

@router.get("/activities")
async def get_activities(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserActivity).where(UserActivity.user_id == current_user.id).order_by(UserActivity.created_at.desc()).limit(50))
    activities = result.scalars().all()
    return [{"id": a.id, "activity_type": a.activity_type, "description": a.description, "xp_earned": a.xp_earned, "created_at": a.created_at.isoformat()} for a in activities]

@router.get("/list", response_model=list[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403)
    result = await db.execute(select(User).limit(100))
    users = result.scalars().all()
    return [UserResponse(id=u.id, email=u.email, name=u.name, role=u.role, avatar=u.avatar, xp_points=u.xp_points, level=u.level, streak_days=u.streak_days, created_at=u.created_at.isoformat()) for u in users]
