from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, LargeBinary, String, Text
from backend.core.database import Base


class StudyDocument(Base):
    __tablename__ = "study_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)
    file_data = Column(LargeBinary, nullable=False)
    extracted_text = Column(Text, nullable=False, default="")
    index_status = Column(String(24), nullable=False, default="indexed")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
