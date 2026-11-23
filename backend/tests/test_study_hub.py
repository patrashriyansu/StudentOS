import io
import os
import sys
import time
import zipfile
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
DB_PATH = Path("test_studentos_auth.db").absolute()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{DB_PATH.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-for-study-tests"
os.environ["SEED_DEMO_DATA"] = "false"

from fastapi.testclient import TestClient
from pypdf import PdfWriter
from backend.main import app


def wait_until_ready(client: TestClient) -> None:
    for _ in range(50):
        response = client.get("/ready")
        if response.status_code == 200:
            return
        time.sleep(0.1)
    raise AssertionError(client.get("/ready").text)


def register_student(client: TestClient) -> dict[str, str]:
    email = f"study-{uuid4().hex[:10]}@example.com"
    response = client.post("/api/v1/auth/register", json={
        "name": "Study Test Student",
        "email": email,
        "password": "Password1!",
        "role": "student",
    })
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def make_docx(text: str) -> bytes:
    buffer = io.BytesIO()
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body><w:p><w:r><w:t>' + text + '</w:t></w:r></w:p></w:body></w:document>'
    )
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", document_xml)
    return buffer.getvalue()


def test_docx_upload_search_download_and_student_isolation() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        first = register_student(client)
        second = register_student(client)

        uploaded = client.post(
            "/api/v1/study/documents",
            headers=first,
            files={"file": ("Algorithms Notes.docx", make_docx("Breadth First Search visits neighbours level by level."), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert uploaded.status_code == 201, uploaded.text
        document = uploaded.json()
        assert document["index_status"] == "indexed"
        assert document["extracted_characters"] > 20

        search = client.get("/api/v1/study/documents/search?q=Breadth+First", headers=first)
        assert search.status_code == 200
        assert len(search.json()) == 1
        assert "Breadth First Search" in search.json()[0]["snippet"]

        text_response = client.get(f"/api/v1/study/documents/{document['id']}/text", headers=first)
        assert text_response.status_code == 200
        assert "level by level" in text_response.json()["text"]

        download = client.get(f"/api/v1/study/documents/{document['id']}/download", headers=first)
        assert download.status_code == 200
        assert download.content.startswith(b"PK")

        hidden = client.get(f"/api/v1/study/documents/{document['id']}/download", headers=second)
        assert hidden.status_code == 404


def test_pdf_upload_and_image_upload_validation() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        headers = register_student(client)

        pdf_buffer = io.BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=72, height=72)
        writer.write(pdf_buffer)
        pdf = client.post(
            "/api/v1/study/documents",
            headers=headers,
            files={"file": ("lecture.pdf", pdf_buffer.getvalue(), "application/pdf")},
        )
        assert pdf.status_code == 201, pdf.text
        assert pdf.json()["content_type"] == "application/pdf"
        assert pdf.json()["index_status"] == "no_text_found"

        png = client.post(
            "/api/v1/study/documents",
            headers=headers,
            files={"file": ("diagram.png", bytes([137, 80, 78, 71, 13, 10, 26, 10]) + b"fake-image", "image/png")},
        )
        assert png.status_code == 201, png.text
        assert png.json()["index_status"] == "needs_ocr"

        unsupported = client.post(
            "/api/v1/study/documents",
            headers=headers,
            files={"file": ("payload.exe", b"MZ-not-a-study-file", "application/octet-stream")},
        )
        assert unsupported.status_code == 415
