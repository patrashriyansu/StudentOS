import json
import os
import sys
import time
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
DB_PATH = Path("test_studentos_auth.db").absolute()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{DB_PATH.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-for-career-report-tests"
os.environ["SEED_DEMO_DATA"] = "false"

from fastapi.testclient import TestClient
from backend.main import app


def wait_until_ready(client: TestClient) -> None:
    for _ in range(50):
        response = client.get("/ready")
        if response.status_code == 200:
            return
        time.sleep(0.1)
    raise AssertionError(client.get("/ready").text)


def register_student(client: TestClient) -> dict[str, str]:
    response = client.post("/api/v1/auth/register", json={
        "name": "Career Test Student",
        "email": f"career-{uuid4().hex[:10]}@example.com",
        "password": "Password1!",
        "role": "student",
    })
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_resume_versions_are_private_and_interview_feedback_is_saved() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        owner = register_student(client)
        other = register_student(client)
        content = {
            "full_name": "Career Test Student",
            "headline": "Full-Stack Developer",
            "email": "career@example.com",
            "phone": "",
            "location": "India",
            "summary": "Builds reliable web applications.",
            "education": [{
                "degree": "B.Tech CSE", "institution": "University",
                "location": "India", "start_year": "2024", "end_year": "2028",
                "details": "CGPA: 8.4",
            }],
            "experience": [],
            "projects": [{
                "name": "StudentOS", "technologies": ["React", "FastAPI"],
                "link": "https://example.com", "description": "Student workspace.",
            }],
            "skills": ["Python", "React", "SQL"],
            "certifications": [],
            "achievements": [],
        }
        created = client.post("/api/v1/placements/resume-versions", headers=owner, json={
            "title": "Full-Stack Intern",
            "content": content,
        })
        assert created.status_code == 201, created.text
        version_id = created.json()["id"]
        assert created.json()["version_number"] == 1

        versions = client.get("/api/v1/placements/resume-versions", headers=owner)
        assert len(versions.json()) >= 1
        assert any(item["id"] == version_id for item in versions.json())
        assert client.get("/api/v1/placements/resume-versions", headers=other).json() == []

        update = client.put(f"/api/v1/placements/resume-versions/{version_id}", headers=owner, json={
            "title": "Backend Intern",
            "content": {**content, "headline": "Backend Developer"},
        })
        assert update.status_code == 200
        assert update.json()["content"]["headline"] == "Backend Developer"
        assert client.put(f"/api/v1/placements/resume-versions/{version_id}", headers=other, json={
            "title": "Intrusion", "content": content,
        }).status_code == 404
        assert client.delete(f"/api/v1/placements/resume-versions/{version_id}", headers=other).status_code == 404

        scheduled = client.post("/api/v1/placements/interviews", headers=owner, json={
            "company": "Example", "role": "Software Intern",
            "interview_type": "Technical", "scheduled_at": "2026-12-01T10:00:00+05:30",
        })
        assert scheduled.status_code == 200, scheduled.text
        interview_id = scheduled.json()["id"]
        feedback = client.patch(f"/api/v1/placements/interviews/{interview_id}", headers=owner, json={
            "feedback": "Need to revise graph traversal and communicate complexity clearly.",
            "rating": 4,
            "confidence_score": 3,
            "completed": True,
        })
        assert feedback.status_code == 200, feedback.text
        assert feedback.json()["completed"] is True
        assert feedback.json()["rating"] == 4
        assert client.patch(f"/api/v1/placements/interviews/{interview_id}", headers=other, json={
            "feedback": "not mine",
        }).status_code == 404


def test_notification_preferences_and_career_profile_persist() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        headers = register_student(client)

        saved = client.put("/api/v1/notifications/settings", headers=headers, json={
            "email_enabled": False,
            "in_app_enabled": True,
            "assignment_reminders": False,
            "exam_reminders": True,
            "attendance_alerts": False,
            "placement_updates": True,
            "quiet_hours_start": "21:30",
            "quiet_hours_end": "07:15",
        })
        assert saved.status_code == 200, saved.text
        assert saved.json()["email_enabled"] is False
        loaded = client.get("/api/v1/notifications/settings", headers=headers)
        assert loaded.status_code == 200
        assert loaded.json()["quiet_hours_start"] == "21:30"
        assert loaded.json()["assignment_reminders"] is False
        invalid = client.put("/api/v1/notifications/settings", headers=headers, json={
            "quiet_hours_start": "25:99",
        })
        assert invalid.status_code == 422

        career = client.put("/api/v1/users/career-profile", headers=headers, json={
            "career_goal": "Become a software engineer",
            "target_role": "Full-Stack Developer",
            "target_industries": ["Software", "FinTech"],
            "preferred_locations": ["Bengaluru", "Remote"],
            "employment_types": ["Internship", "Full-time"],
            "work_mode": "hybrid",
            "target_start_date": "2027-05-01",
            "onboarding_completed": True,
        })
        assert career.status_code == 200, career.text
        current = client.get("/api/v1/users/career-profile", headers=headers)
        assert current.json()["target_role"] == "Full-Stack Developer"
        assert current.json()["preferred_locations"] == ["Bengaluru", "Remote"]


def test_account_export_is_scoped_and_deletion_request_requires_confirmation() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        owner = register_student(client)
        other = register_student(client)

        client.put("/api/v1/users/career-profile", headers=owner, json={
            "career_goal": "Build software", "target_role": "Backend Developer",
            "preferred_locations": ["Remote"],
        })
        export = client.get("/api/v1/users/export", headers=owner)
        assert export.status_code == 200
        assert "application/json" in export.headers["content-type"]
        data = export.json()
        assert "studentos-account-export" in export.headers.get("content-disposition", "")
        assert data["career_profile"]["target_role"] == "Backend Developer"
        assert "password_hash" not in json.dumps(data)
        assert "file_data" not in json.dumps(data)

        other_export = client.get("/api/v1/users/export", headers=other).json()
        assert other_export["account"]["id"] != data["account"]["id"]
        assert other_export["career_profile"] is None

        invalid = client.post("/api/v1/users/account/deletion-request", headers=owner, json={
            "confirmation": "delete",
            "reason": "Test request",
        })
        assert invalid.status_code == 422
        request = client.post("/api/v1/users/account/deletion-request", headers=owner, json={
            "confirmation": "DELETE MY ACCOUNT",
            "reason": "I no longer need this account.",
        })
        assert request.status_code == 201, request.text
        assert request.json()["status"] == "pending"
        duplicate = client.post("/api/v1/users/account/deletion-request", headers=owner, json={
            "confirmation": "DELETE MY ACCOUNT",
        })
        assert duplicate.status_code == 409
        cancelled = client.delete("/api/v1/users/account/deletion-request", headers=owner)
        assert cancelled.status_code == 200


def test_personal_progress_report_returns_pdf() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        headers = register_student(client)
        response = client.get("/api/v1/analytics/report.pdf", headers=headers)
        assert response.status_code == 200, response.text
        assert response.headers["content-type"].startswith("application/pdf")
        assert response.content.startswith(b"%PDF-")
