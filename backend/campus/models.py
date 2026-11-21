from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from backend.core.database import Base


class StudentIdentity(Base):
    __tablename__ = "student_identities"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    registration_number = Column(String(50), nullable=False, unique=True, index=True)
    section = Column(String(80), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class ClassSubject(Base):
    __tablename__ = "campus_subjects"
    id = Column(Integer, primary_key=True, index=True)
    faculty_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    section = Column(String(80), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ClassSession(Base):
    __tablename__ = "campus_class_sessions"
    __table_args__ = (UniqueConstraint("subject_id", "session_date", name="uq_campus_subject_session_date"),)
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("campus_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    session_date = Column(Date, nullable=False, index=True)
    topic = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ClassAttendance(Base):
    __tablename__ = "campus_attendance"
    __table_args__ = (UniqueConstraint("session_id", "student_id", name="uq_campus_attendance_student_session"),)
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("campus_class_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(10), nullable=False)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    marked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class Notice(Base):
    __tablename__ = "campus_notices"
    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(250), nullable=False)
    message = Column(Text, nullable=False)
    audience_type = Column(String(12), nullable=False, default="all")
    audience_section = Column(String(80), nullable=True, index=True)
    priority = Column(String(12), nullable=False, default="normal")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class NoticeRead(Base):
    __tablename__ = "campus_notice_reads"
    __table_args__ = (UniqueConstraint("notice_id", "student_id", name="uq_campus_notice_read"),)
    id = Column(Integer, primary_key=True, index=True)
    notice_id = Column(Integer, ForeignKey("campus_notices.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)



class StudentAcademicProfile(Base):
    """Student-entered academic details kept separate from existing campus identity rows."""
    __tablename__ = "student_academic_profiles"
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    course = Column(String(100), nullable=True)
    branch = Column(String(100), nullable=True)
    admission_year = Column(Integer, nullable=True)
    passing_out_year = Column(Integer, nullable=True)
    current_year = Column(Integer, nullable=True)
    current_semester = Column(Integer, nullable=True)
    cgpa = Column(Float, nullable=True)
    sgpa = Column(Float, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class MentorStudentAssignment(Base):
    """An administrator-approved link between an existing mentor and student account."""
    __tablename__ = "mentor_student_assignments"
    __table_args__ = (UniqueConstraint("mentor_id", "student_id", name="uq_mentor_student_assignment"),)
    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class RecruiterVisibility(Base):
    """Student-controlled, opt-in visibility of a career profile to recruiter accounts."""
    __tablename__ = "recruiter_visibility"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    profile_visible = Column(Boolean, nullable=False, default=False)
    contact_visible = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)
