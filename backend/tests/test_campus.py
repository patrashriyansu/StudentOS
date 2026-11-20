import os
import sys
import time
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{Path('test_studentos_auth.db').absolute().as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-for-campus-tests"
os.environ["SEED_DEMO_DATA"] = "false"

from fastapi.testclient import TestClient
from backend.main import app
from backend.auth.routes import limiter as auth_limiter

auth_limiter.enabled = False


def wait_until_ready(client: TestClient) -> None:
    for _ in range(50):
        response = client.get("/ready")
        if response.status_code == 200:
            return
        time.sleep(0.1)
    raise AssertionError(client.get("/ready").text)


def register_student(client: TestClient, registration_number: str | None = None) -> dict:
    suffix = uuid4().hex[:10]
    payload = {
        "name": "Campus Test Student",
        "email": f"campus-{suffix}@example.com",
        "password": "Password1!",
        "role": "student",
    }
    if registration_number:
        payload.update({"registration_number": registration_number, "section": "CSE-A"})
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}", "email": payload["email"]}


def test_student_registration_identity_is_saved_and_visible() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        headers = register_student(client, f"REG-{uuid4().hex[:8]}")
        profile = client.get("/api/v1/campus/profile", headers=headers)
        assert profile.status_code == 200
        assert profile.json()["complete"] is True
        assert profile.json()["section"] == "CSE-A"

        me = client.get("/api/v1/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["registration_number"] == profile.json()["registration_number"]
        assert me.json()["section"] == "CSE-A"

        leaderboard = client.get("/api/v1/campus/leaderboard", headers=headers)
        assert leaderboard.status_code == 200
        assert any(row["name"] == "Campus Test Student" for row in leaderboard.json()["students"])


def test_registration_number_must_be_unique() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        registration_number = f"REG-{uuid4().hex[:8]}"
        register_student(client, registration_number)
        duplicate = client.post("/api/v1/auth/register", json={
            "name": "Another Student",
            "email": f"duplicate-{uuid4().hex[:8]}@example.com",
            "password": "Password1!",
            "role": "student",
            "registration_number": registration_number.lower(),
            "section": "CSE-A",
        })
        assert duplicate.status_code == 409
        assert "Registration number" in duplicate.json()["detail"]


def test_students_cannot_use_faculty_management_endpoints() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        headers = register_student(client, f"REG-{uuid4().hex[:8]}")
        students = client.get("/api/v1/campus/students", headers=headers)
        assert students.status_code == 403
        notice = client.post("/api/v1/campus/notices", headers=headers, json={
            "title": "Restricted notice",
            "message": "Only faculty can publish this.",
            "audience_type": "all",
        })
        assert notice.status_code == 403
        subjects = client.post("/api/v1/campus/subjects", headers=headers, json={
            "name": "Algorithms",
            "section": "CSE-A",
        })
        assert subjects.status_code == 403


def test_reminder_status_reports_resend_instead_of_smtp() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        headers = register_student(client)
        status = client.get("/api/v1/notifications/reminders/status", headers=headers)
        assert status.status_code == 200
        assert status.json()["provider"] == "Resend"
        assert status.json()["delivery_method"] == "HTTPS API"
