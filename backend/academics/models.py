from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.database import Base
from datetime import datetime, timezone

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=True)
    faculty = Column(String(200), nullable=True)
    total_classes = Column(Integer, default=0)
    attended_classes = Column(Integer, default=0)
    credits = Column(Integer, default=3)
    semester = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    attendance_records = relationship("AttendanceRecord", back_populates="subject")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    date = Column(Date, nullable=False)
    status = Column(String(10))  # present, absent
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    subject = relationship("Subject", back_populates="attendance_records")

class Timetable(Base):
    __tablename__ = "timetables"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    day_of_week = Column(Integer)  # 0=Monday
    subject_name = Column(String(200))
    faculty = Column(String(200))
    room = Column(String(50))
    start_time = Column(Time)
    end_time = Column(Time)

class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(300))
    description = Column(Text, nullable=True)
    subject = Column(String(200))
    due_date = Column(DateTime(timezone=True))
    status = Column(String(20), default="pending")
    grade = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(300))
    content = Column(Text)
    subject = Column(String(200), nullable=True)
    summary = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    file_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Exam(Base):
    __tablename__ = "exams"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String(200))
    exam_type = Column(String(50))
    date = Column(DateTime(timezone=True))
    syllabus = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class StudySession(Base):
    __tablename__ = "study_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String(200))
    duration_minutes = Column(Integer)
    date = Column(Date)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Grade(Base):
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    semester = Column(Integer)
    subject = Column(String(200))
    credits = Column(Integer)
    grade_point = Column(Float)
    grade = Column(String(5))
