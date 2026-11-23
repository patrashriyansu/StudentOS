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
from backend.study.models import StudyDocument
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
        index_status = "indexed" if extracted_text.strip() else "no_text_found"
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
async def index_document_image(document_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    document = await _owned_document(document_id, user, db)
    if document.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=422, detail="OCR can currently be run on uploaded PNG, JPG and WEBP images.")
    extracted = await ask_gemini_image(
        "Transcribe all readable text in this study image. Preserve headings, equations, lists and line breaks. "
        "Return only the extracted text. Do not guess text that is not legible.",
        document.file_data,
        document.content_type,
    )
    document.extracted_text = extracted[:MAX_EXTRACTED_CHARS]
    document.index_status = "indexed" if document.extracted_text.strip() else "no_text_found"
    await db.commit()
    return _document_metadata(document)


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
