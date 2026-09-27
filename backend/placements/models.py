from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.database import Base
from datetime import datetime, timezone

class Resume(Base):
    __tablename__ = "resumes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    version = Column(Integer, default=1)
    file_url = Column(String(500))
    ats_score = Column(Float, nullable=True)
    skills_extracted = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    suggestions = Column(JSON, default=list)
    parsed_content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company = Column(String(200))
    role = Column(String(200))
    status = Column(String(50), default="applied")  # applied, screening, interview, offer, rejected
    application_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    deadline = Column(DateTime(timezone=True), nullable=True)
    salary = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    round = Column(Integer, default=0)

class Interview(Base):
    __tablename__ = "interviews"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company = Column(String(200))
    role = Column(String(200))
    interview_type = Column(String(50))  # technical, hr, coding
    scheduled_at = Column(DateTime(timezone=True))
    feedback = Column(Text, nullable=True)
    rating = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    completed = Column(Boolean, default=False)

class Offer(Base):
    __tablename__ = "offers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company = Column(String(200))
    role = Column(String(200))
    ctc = Column(String(100))
    location = Column(String(200))
    joining_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="pending")
