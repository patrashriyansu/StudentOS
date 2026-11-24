from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey, LargeBinary, UniqueConstraint
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



class ResumeDocument(Base):
    """Private PDF resume file stored as binary data in the existing PostgreSQL database."""
    __tablename__ = "resume_documents"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False, default="application/pdf")
    file_size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ApplicationResumeSnapshot(Base):
    """Immutable resume copy attached to one recruiter application at submission time."""
    __tablename__ = "workspace_application_resume_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("workspace_recruiter_applications.id", ondelete="CASCADE"),
                            nullable=False, unique=True, index=True)
    resume_document_id = Column(Integer, ForeignKey("resume_documents.id", ondelete="SET NULL"),
                                 nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False, default="application/pdf")
    file_size = Column(Integer, nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)



class ResumeBuilderVersion(Base):
    __tablename__ = "resume_builder_versions"
    __table_args__ = (UniqueConstraint("user_id", "version_number", name="uq_resume_builder_user_version"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)
