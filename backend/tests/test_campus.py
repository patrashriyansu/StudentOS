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


def register_role(client: TestClient, role: str) -> dict:
    email = f"{role}-{uuid4().hex[:10]}@example.com"
    response = client.post("/api/v1/auth/register", json={
        "name": f"Campus {role.title()} Test",
        "email": email,
        "password": "Password1!",
        "role": role,
    })
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}", "email": email}


def test_student_academic_profile_and_recruiter_visibility_are_opt_in() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        student = register_student(client, f"REG-{uuid4().hex[:8]}")

        initial_visibility = client.get("/api/v1/campus/recruiter/visibility", headers=student)
        assert initial_visibility.status_code == 200
        assert initial_visibility.json() == {"profile_visible": False, "contact_visible": False}

        academic = client.put(
            "/api/v1/campus/academic-profile",
            headers=student,
            json={
                "course": "B.Tech",
                "branch": "Computer Science",
                "section": "CSE-A",
                "admission_year": 2024,
                "passing_out_year": 2028,
                "current_year": 3,
                "current_semester": 5,
                "cgpa": 8.39,
                "sgpa": 8.6,
            },
        )
        assert academic.status_code == 200, academic.text

        saved_profile = client.get("/api/v1/campus/academic-profile", headers=student)
        assert saved_profile.status_code == 200
        assert saved_profile.json()["complete"] is True
        assert saved_profile.json()["passing_out_year"] == 2028
        assert saved_profile.json()["current_semester"] == 5
        assert saved_profile.json()["cgpa"] == 8.39
        assert saved_profile.json()["sgpa"] == 8.6

        recruiter = register_role(client, "recruiter")
        before_opt_in = client.get("/api/v1/campus/recruiter/candidates", headers=recruiter)
        assert before_opt_in.status_code == 200
        assert all(row["name"] != "Campus Test Student" for row in before_opt_in.json())

        updated = client.put(
            "/api/v1/campus/recruiter/visibility",
            headers=student,
            json={"profile_visible": True, "contact_visible": False},
        )
        assert updated.status_code == 200, updated.text

        candidates = client.get("/api/v1/campus/recruiter/candidates", headers=recruiter)
        assert candidates.status_code == 200
        candidate = next(row for row in candidates.json() if row["name"] == "Campus Test Student")
        assert candidate["email"] is None
        assert candidate["passing_out_year"] == 2028
        assert "cgpa" not in candidate
        assert "sgpa" not in candidate
        assert "current_semester" not in candidate
        assert "attendance" not in candidate

        contact_enabled = client.put(
            "/api/v1/campus/recruiter/visibility",
            headers=student,
            json={"contact_visible": True},
        )
        assert contact_enabled.status_code == 200
        with_contact = client.get("/api/v1/campus/recruiter/candidates", headers=recruiter)
        contact_candidate = next(row for row in with_contact.json() if row["name"] == "Campus Test Student")
        assert contact_candidate["email"] == student["email"]

        private_again = client.put(
            "/api/v1/campus/recruiter/visibility",
            headers=student,
            json={"profile_visible": False},
        )
        assert private_again.status_code == 200
        assert private_again.json()["contact_visible"] is False
        hidden = client.get("/api/v1/campus/recruiter/candidates", headers=recruiter)
        assert all(row["name"] != "Campus Test Student" for row in hidden.json())


def test_mentor_sees_only_assigned_student_basics_without_academic_scores() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        mentor = register_role(client, "mentor")
        student = register_student(client, f"REG-{uuid4().hex[:8]}")

        forbidden_student_access = client.get("/api/v1/campus/mentor/students", headers=student)
        assert forbidden_student_access.status_code == 403

        assigned_students = client.get("/api/v1/campus/mentor/students", headers=mentor)
        assert assigned_students.status_code == 200
        assert assigned_students.json() == []
