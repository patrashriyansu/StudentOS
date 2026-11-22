from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, JSON,
    String, Text, UniqueConstraint,
)
from backend.core.database import Base


class RecruiterJob(Base):
    __tablename__ = "workspace_recruiter_jobs"
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(180), nullable=False)
    company = Column(String(180), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(180), nullable=True)
    employment_type = Column(String(40), nullable=False, default="Full-time")
    skills = Column(JSON, nullable=False, default=list)
    graduation_year_min = Column(Integer, nullable=True)
    graduation_year_max = Column(Integer, nullable=True)
    deadline = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="open", index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class RecruiterShortlist(Base):
    __tablename__ = "workspace_recruiter_shortlist"
    __table_args__ = (UniqueConstraint("recruiter_id", "student_id", name="uq_workspace_recruiter_shortlist"),)
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class RecruiterApplication(Base):
    __tablename__ = "workspace_recruiter_applications"
    __table_args__ = (UniqueConstraint("job_id", "student_id", name="uq_workspace_job_application"),)
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("workspace_recruiter_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(24), nullable=False, default="applied", index=True)
    cover_note = Column(Text, nullable=True)
    recruiter_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class MentorSession(Base):
    __tablename__ = "workspace_mentor_sessions"
    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)
    meeting_link = Column(String(1000), nullable=True)
    agenda = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="scheduled")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class MentorGoal(Base):
    __tablename__ = "workspace_mentor_goals"
    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="not_started")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class MentorNote(Base):
    __tablename__ = "workspace_mentor_notes"
    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class ClassAssignment(Base):
    __tablename__ = "workspace_class_assignments"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("campus_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(180), nullable=False)
    instructions = Column(Text, nullable=False)
    attachment_url = Column(String(1000), nullable=True)
    points = Column(Float, nullable=False, default=100)
    due_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class AssignmentSubmission(Base):
    __tablename__ = "workspace_assignment_submissions"
    __table_args__ = (UniqueConstraint("assignment_id", "student_id", name="uq_workspace_assignment_submission"),)
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("workspace_class_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_text = Column(Text, nullable=True)
    attachment_url = Column(String(1000), nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    marks_awarded = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)


class ClassMark(Base):
    __tablename__ = "workspace_class_marks"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("campus_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment = Column(String(180), nullable=False)
    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, nullable=False)
    remarks = Column(Text, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class LearningResource(Base):
    __tablename__ = "workspace_learning_resources"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("campus_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=True)
    resource_url = Column(String(1000), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class TimetableEntry(Base):
    __tablename__ = "workspace_timetable_entries"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("campus_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    weekday = Column(Integer, nullable=False)
    starts_at = Column(String(5), nullable=False)
    ends_at = Column(String(5), nullable=False)
    room = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
