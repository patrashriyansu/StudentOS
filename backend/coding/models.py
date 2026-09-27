from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, Date, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.database import Base
from datetime import datetime, timezone

class CodingProfile(Base):
    __tablename__ = "coding_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    leetcode_username = Column(String(100), nullable=True)
    codeforces_username = Column(String(100), nullable=True)
    codechef_username = Column(String(100), nullable=True)
    total_problems_solved = Column(Integer, default=0)
    total_contests = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    max_streak = Column(Integer, default=0)
    last_solved_date = Column(Date, nullable=True)
    rating = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class CodingProblem(Base):
    __tablename__ = "coding_problems"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    platform = Column(String(50))
    problem_id = Column(String(100))
    title = Column(String(300))
    difficulty = Column(String(20))
    topics = Column(JSON, default=list)
    solved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Contest(Base):
    __tablename__ = "coding_contests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    platform = Column(String(50))
    contest_name = Column(String(200))
    rank = Column(Integer, nullable=True)
    rating_change = Column(Integer, nullable=True)
    date = Column(DateTime(timezone=True))

class DSAProgress(Base):
    __tablename__ = "dsa_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String(100))
    total_problems = Column(Integer, default=0)
    solved_problems = Column(Integer, default=0)
    difficulty_breakdown = Column(JSON, default=dict)
