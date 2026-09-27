from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    college: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    avatar: Optional[str]
    xp_points: int
    level: int
    streak_days: int
    created_at: str
