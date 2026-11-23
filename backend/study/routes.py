from __future__ import annotations

import hashlib
import io
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import PurePath

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.study.models import StudyDocument, StudyChapterProgress
from backend.ai.gemini_service import ask_gemini_image

router = APIRouter()

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_EXTRACTED_CHARS = 300_000
MAX_PDF_PAGES = 80
DOCX_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _safe_filename(value: str | None) -> str:
    raw = PurePath(value or "study-document").name
    cleaned = re.sub(r"[^A-Za-z0-9._() -]", "_", raw).strip(" .")
    return (cleaned or "study-document")[:255]


def _extract_docx(data: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            info = archive.getinfo("word/document.xml")
            if info.file_size > 2 * 1024 * 1024:
                raise HTTPException(status_code=422, detail="The DOCX document is too large to index.")
            root = ET.fromstring(archive.read("word/document.xml"))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="The uploaded DOCX file is invalid or damaged.") from exc

    paragraphs = []
    for paragraph in root.iter(f"{DOCX_NS}p"):
        text = "".join(node.text or "" for node in paragraph.iter(f"{DOCX_NS}t"))
        if text.strip():
            paragraphs.append(text.strip())
    return "\n".join(paragraphs)[:MAX_EXTRACTED_CHARS]


def _extract_pdf(data: bytes) -> str:
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF.")
    try:
        reader = PdfReader(io.BytesIO(data), strict=False)
        if len(reader.pages) > MAX_PDF_PAGES:
            raise HTTPException(status_code=413, detail=f"PDFs are limited to {MAX_PDF_PAGES} pages.")
        parts = []
        remaining = MAX_EXTRACTED_CHARS
        for page in reader.pages:
            if remaining <= 0:
                break
            extracted = (page.extract_text() or "").strip()
            if extracted:
                parts.append(extracted[:remaining])
                remaining -= len(extracted)
        return "\n\n".join(parts)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="The PDF could not be read. Upload a text-based, unencrypted PDF.") from exc


def _validate_image(data: bytes, extension: str) -> str:
    signatures = {
        ".png": (b"\x89PNG\r\n\x1a\n", "image/png"),
        ".jpg": (b"\xff\xd8\xff", "image/jpeg"),
        ".jpeg": (b"\xff\xd8\xff", "image/jpeg"),
        ".webp": (b"RIFF", "image/webp"),
    }
    expected = signatures.get(extension)
    if not expected:
        raise HTTPException(status_code=415, detail="Supported image formats are PNG, JPG, JPEG and WEBP.")
    signature, mime = expected
    if not data.startswith(signature) or (extension == ".webp" and data[8:12] != b"WEBP"):
        raise HTTPException(status_code=415, detail="The image file contents do not match its extension.")
    return mime


def _document_metadata(document: StudyDocument) -> dict:
    return {
        "id": document.id,
        "filename": document.filename,
        "content_type": document.content_type,
        "file_size": document.file_size,
        "extracted_characters": len(document.extracted_text or ""),
        "index_status": document.index_status,
        "created_at": document.created_at.isoformat(),
    }


async def _owned_document(document_id: int, user: User, db: AsyncSession) -> StudyDocument:
    document = (await db.execute(select(StudyDocument).where(
        StudyDocument.id == document_id,
        StudyDocument.user_id == user.id,
    ))).scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Study document not found.")
    return document


@router.get("/documents")
async def list_documents(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    documents = (await db.execute(
        select(StudyDocument).where(StudyDocument.user_id == user.id)
        .order_by(StudyDocument.created_at.desc())
    )).scalars().all()
    return [_document_metadata(document) for document in documents]


@router.get("/documents/search")
async def search_documents(
    q: str = Query(min_length=2, max_length=120),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(status_code=422, detail="Enter at least two characters to search.")
    documents = (await db.execute(
        select(StudyDocument).where(
            StudyDocument.user_id == user.id,
            StudyDocument.extracted_text.ilike(f"%{query}%"),
        ).order_by(StudyDocument.created_at.desc())
    )).scalars().all()
    results = []
    folded = query.casefold()
    for document in documents:
        source = document.extracted_text or ""
        index = source.casefold().find(folded)
        start = max(0, index - 90)
        results.append({
            **_document_metadata(document),
            "snippet": ("…" if start else "") + source[start:min(len(source), index + len(query) + 150)] + ("…" if index + len(query) + 150 < len(source) else ""),
        })
    return results


@router.post("/documents", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filename = _safe_filename(file.filename)
    extension = PurePath(filename).suffix.lower()
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    await file.close()
    if not data:
        raise HTTPException(status_code=422, detail="Choose a non-empty file.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Study documents are limited to 10 MB each.")

    if extension == ".pdf":
        content_type = "application/pdf"
        extracted_text = _extract_pdf(data)
        index_status = "indexed" if extracted_text.strip() else "needs_ocr"
    elif extension == ".docx":
        if not zipfile.is_zipfile(io.BytesIO(data)):
            raise HTTPException(status_code=415, detail="The uploaded DOCX file is invalid.")
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        extracted_text = _extract_docx(data)
        index_status = "indexed" if extracted_text.strip() else "no_text_found"
    elif extension in {".png", ".jpg", ".jpeg", ".webp"}:
        content_type = _validate_image(data, extension)
        extracted_text = ""
        index_status = "needs_ocr"
    else:
        raise HTTPException(status_code=415, detail="Upload a PDF, DOCX, PNG, JPG, JPEG or WEBP file.")

    document = StudyDocument(
        user_id=user.id,
        filename=filename,
        content_type=content_type,
        file_size=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
        file_data=data,
        extracted_text=extracted_text,
        index_status=index_status,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return _document_metadata(document)


@router.get("/documents/{document_id}/text")
async def get_document_text(document_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    document = await _owned_document(document_id, user, db)
    if not document.extracted_text.strip():
        raise HTTPException(status_code=422, detail="No searchable text is available. Run OCR for an image, or upload a text-based PDF/DOCX.")
    return {"id": document.id, "filename": document.filename, "text": document.extracted_text}


@router.post("/documents/{document_id}/ocr")
async def index_document_image_or_pdf(document_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    document = await _owned_document(document_id, user, db)
    if document.content_type not in {"image/png", "image/jpeg", "image/webp", "application/pdf"}:
        raise HTTPException(status_code=422, detail="OCR is supported for uploaded PDFs and PNG/JPG/WEBP images.")

    ocr_data = document.file_data
    mime_type = document.content_type
    prompt = (
        "Transcribe all readable text from this study material. Preserve page order, headings, "
        "equations, tables, lists and line breaks. Include page headings for PDF pages. "
        "Return only extracted text. Never guess content that is not legible."
    )
    partial = False
    if mime_type == "application/pdf":
        try:
            reader = PdfReader(io.BytesIO(document.file_data), strict=False)
            page_count = len(reader.pages)
            if page_count > MAX_PDF_PAGES:
                raise HTTPException(status_code=413, detail=f"PDFs are limited to {MAX_PDF_PAGES} pages.")
            if page_count > 20:
                from pypdf import PdfWriter
                writer = PdfWriter()
                for page in reader.pages[:20]:
                    writer.add_page(page)
                buffer = io.BytesIO()
                writer.write(buffer)
                ocr_data = buffer.getvalue()
                partial = True
                prompt += f" Process pages 1 to 20 only (of {page_count} total pages)."
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=422, detail="The PDF could not be prepared for OCR.") from exc

    extracted = await ask_gemini_image(prompt, ocr_data, mime_type)
    document.extracted_text = extracted[:MAX_EXTRACTED_CHARS]
    document.index_status = "partial_indexed" if partial and document.extracted_text.strip() else (
        "indexed" if document.extracted_text.strip() else "no_text_found"
    )
    await db.commit()
    result = _document_metadata(document)
    if partial:
        result["index_message"] = "Only the first 20 pages were OCR-indexed. Split any remaining pages into another PDF to search them."
    return result


@router.get("/documents/{document_id}/download")
async def download_document(document_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    document = await _owned_document(document_id, user, db)
    return Response(
        content=document.file_data,
        media_type=document.content_type,
        headers={"Content-Disposition": f'attachment; filename="{document.filename}"'},
    )


@router.delete("/documents/{document_id}")
async def delete_document(document_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    document = await _owned_document(document_id, user, db)
    await db.delete(document)
    await db.commit()
    return {"message": "Study document deleted."}



from pydantic import BaseModel, Field
from datetime import datetime, timezone


class ChapterProgressCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=160)
    chapter_title: str = Field(min_length=1, max_length=200)
    status: str = Field(default="not_started", pattern="^(not_started|in_progress|completed|needs_revision)$")
    completion_percent: int = Field(default=0, ge=0, le=100)
    notes: str = Field(default="", max_length=3000)


class ChapterProgressUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(not_started|in_progress|completed|needs_revision)$")
    completion_percent: int | None = Field(default=None, ge=0, le=100)
    notes: str | None = Field(default=None, max_length=3000)


def _chapter_dict(item: StudyChapterProgress) -> dict:
    return {
        "id": item.id,
        "subject": item.subject,
        "chapter_title": item.chapter_title,
        "status": item.status,
        "completion_percent": item.completion_percent,
        "notes": item.notes,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


@router.get("/chapters")
async def list_chapter_progress(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(StudyChapterProgress).where(StudyChapterProgress.user_id == user.id)
        .order_by(StudyChapterProgress.subject.asc(), StudyChapterProgress.chapter_title.asc())
    )).scalars().all()
    return [_chapter_dict(item) for item in rows]


@router.post("/chapters", status_code=201)
async def upsert_chapter_progress(
    req: ChapterProgressCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    subject = req.subject.strip()
    title = req.chapter_title.strip()
    item = (await db.execute(select(StudyChapterProgress).where(
        StudyChapterProgress.user_id == user.id,
        StudyChapterProgress.subject == subject,
        StudyChapterProgress.chapter_title == title,
    ))).scalar_one_or_none()
    if item is None:
        item = StudyChapterProgress(user_id=user.id, subject=subject, chapter_title=title)
        db.add(item)
    item.status = req.status
    item.completion_percent = 100 if req.status == "completed" else req.completion_percent
    item.notes = req.notes.strip()
    item.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return _chapter_dict(item)


@router.patch("/chapters/{progress_id}")
async def update_chapter_progress(
    progress_id: int,
    req: ChapterProgressUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(select(StudyChapterProgress).where(
        StudyChapterProgress.id == progress_id,
        StudyChapterProgress.user_id == user.id,
    ))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Chapter progress not found.")
    for field, value in req.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(item, field, value)
    if item.status == "completed":
        item.completion_percent = 100
    elif item.completion_percent == 100 and item.status != "completed":
        item.status = "in_progress"
    item.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return _chapter_dict(item)


@router.delete("/chapters/{progress_id}")
async def delete_chapter_progress(
    progress_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(select(StudyChapterProgress).where(
        StudyChapterProgress.id == progress_id,
        StudyChapterProgress.user_id == user.id,
    ))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Chapter progress not found.")
    await db.delete(item)
    await db.commit()
    return {"message": "Chapter progress deleted."}
