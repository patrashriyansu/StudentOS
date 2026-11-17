import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{Path('test_studentos_auth.db').absolute().as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-for-auth-tests"
os.environ["SEED_DEMO_DATA"] = "false"

from fastapi.testclient import TestClient
from backend.main import app
from backend.auth.routes import limiter as auth_limiter

auth_limiter.enabled = False
INDIA_TZ = ZoneInfo("Asia/Kolkata")


def wait_until_ready(client: TestClient) -> None:
    for _ in range(50):
        response = client.get("/ready")
        if response.status_code == 200:
            return
        time.sleep(0.1)
    raise AssertionError(client.get("/ready").text)


def register_student(client: TestClient) -> dict[str, str]:
    email = f"features-{uuid4().hex[:10]}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "StudentOS Feature Test",
            "email": email,
            "password": "Password1!",
            "role": "student",
        },
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_attendance_upsert_streak_grades_and_email_reminder_flows() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        headers = register_student(client)

        today = datetime.now(INDIA_TZ).date()
        yesterday = today - timedelta(days=1)

        subject = client.post(
            "/api/v1/academics/subjects",
            headers=headers,
            json={"name": "Algorithms", "code": "CS301", "faculty": "Prof. Rao", "credits": 4},
        )
        assert subject.status_code == 200, subject.text
        subject_id = subject.json()["id"]

        for attendance_date in (yesterday, today, today):
            response = client.post(
                "/api/v1/academics/attendance",
                headers=headers,
                json={
                    "subject_id": subject_id,
                    "status": "present",
                    "date": attendance_date.isoformat(),
                },
            )
            assert response.status_code == 200, response.text

        subjects = client.get("/api/v1/academics/subjects", headers=headers).json()
        assert subjects[0]["total_classes"] == 2
        assert subjects[0]["attended_classes"] == 2
        streak = client.get("/api/v1/academics/attendance/streak", headers=headers)
        assert streak.status_code == 200
        assert streak.json()["current_streak"] == 2

        absent = client.post(
            "/api/v1/academics/attendance",
            headers=headers,
            json={"subject_id": subject_id, "status": "absent", "date": today.isoformat()},
        )
        assert absent.status_code == 200
        subjects = client.get("/api/v1/academics/subjects", headers=headers).json()
        assert subjects[0]["total_classes"] == 2
        assert subjects[0]["attended_classes"] == 1
        streak = client.get("/api/v1/academics/attendance/streak", headers=headers)
        assert streak.json()["current_streak"] == 0

        for grade in (
            {"semester": 2, "subject": "Algorithms", "credits": 4, "grade_point": 9.5, "grade": "A+"},
            {"semester": 2, "subject": "Networks", "credits": 2, "grade_point": 8.0, "grade": "A"},
        ):
            saved_grade = client.post("/api/v1/academics/grades", headers=headers, json=grade)
            assert saved_grade.status_code == 200, saved_grade.text

        cgpa = client.get("/api/v1/academics/cgpa", headers=headers)
        assert cgpa.status_code == 200
        assert cgpa.json()["cgpa"] == 9.0
        sgpa = client.get("/api/v1/academics/sgpa/2", headers=headers)
        assert sgpa.json()["sgpa"] == 9.0
        assert len(client.get("/api/v1/academics/grades", headers=headers).json()) == 2

        now = datetime.now(INDIA_TZ)
        timetable = client.post(
            "/api/v1/academics/timetable",
            headers=headers,
            json={
                "day_of_week": now.weekday() % 6,
                "subject_name": "Algorithms",
                "faculty": "Prof. Rao",
                "room": "LH-2",
                "start_time": "23:00",
                "end_time": "23:30",
            },
        )
        assert timetable.status_code == 200, timetable.text

        due_at = (now + timedelta(days=3)).isoformat()
        exam_at = (now + timedelta(days=4)).isoformat()
        application_deadline = (now + timedelta(days=5)).isoformat()
        interview_at = (now + timedelta(days=6)).isoformat()
        joining_at = (now + timedelta(days=7)).isoformat()
        reminder_at = (now + timedelta(days=8)).isoformat()

        assignment = client.post(
            "/api/v1/academics/assignments",
            headers=headers,
            json={"title": "Graph Algorithms", "description": "Complete the worksheet", "subject": "Algorithms", "due_date": due_at},
        )
        assert assignment.status_code == 200, assignment.text

        exam = client.post(
            "/api/v1/academics/exams",
            headers=headers,
            json={"subject": "Algorithms", "exam_type": "Mid-Semester", "date": exam_at, "syllabus": "Graphs"},
        )
        assert exam.status_code == 200, exam.text

        application = client.post(
            "/api/v1/placements/applications",
            headers=headers,
            json={"company": "Example Labs", "role": "SDE Intern", "deadline": application_deadline},
        )
        assert application.status_code == 200, application.text

        interview = client.post(
            "/api/v1/placements/interviews",
            headers=headers,
            json={"company": "Example Labs", "role": "SDE Intern", "interview_type": "Mock Interview", "scheduled_at": interview_at},
        )
        assert interview.status_code == 200, interview.text

        offer = client.post(
            "/api/v1/placements/offers",
            headers=headers,
            json={"company": "Example Labs", "role": "SDE Intern", "ctc": "12 LPA", "location": "Remote", "joining_date": joining_at},
        )
        assert offer.status_code == 200, offer.text

        custom = client.post(
            "/api/v1/notifications/reminders",
            headers=headers,
            json={"title": "Prepare for placement", "message": "Revise DSA", "remind_at": reminder_at, "repeat_interval": "none"},
        )
        assert custom.status_code == 200, custom.text

        reminders = client.get("/api/v1/notifications/reminders", headers=headers)
        assert reminders.status_code == 200
        reminder_titles = {item["title"] for item in reminders.json()}
        assert len(reminder_titles) >= 7
        assert "Upcoming class: Algorithms" in reminder_titles
        assert "Assignment due: Graph Algorithms" in reminder_titles
        assert "Upcoming exam: Algorithms" in reminder_titles
        assert "Application deadline: Example Labs" in reminder_titles
        assert "Interview reminder: Example Labs" in reminder_titles
        assert "Joining reminder: Example Labs" in reminder_titles
        assert "Prepare for placement" in reminder_titles



def test_reminder_email_status_and_test_delivery(monkeypatch) -> None:
    from backend.notifications import routes as notification_routes

    with TestClient(app) as client:
        wait_until_ready(client)
        headers = register_student(client)

        monkeypatch.setattr(notification_routes, "missing_email_settings", lambda: ["RESEND_API_KEY"])
        status = client.get("/api/v1/notifications/reminders/status", headers=headers)
        assert status.status_code == 200, status.text
        assert status.json()["email_configured"] is False
        assert status.json()["missing_settings"] == ["RESEND_API_KEY"]

        blocked = client.post("/api/v1/notifications/reminders/test", headers=headers)
        assert blocked.status_code == 503
        assert "RESEND_API_KEY" in blocked.json()["detail"]

        sent_messages: list[tuple[str, str, str]] = []

        async def fake_send_email(to_email: str, subject: str, body: str) -> None:
            sent_messages.append((to_email, subject, body))

        monkeypatch.setattr(notification_routes, "missing_email_settings", lambda: [])
        monkeypatch.setattr(notification_routes, "send_email", fake_send_email)

        profile = client.get("/api/v1/auth/me", headers=headers)
        assert profile.status_code == 200, profile.text
        delivered = client.post("/api/v1/notifications/reminders/test", headers=headers)
        assert delivered.status_code == 200, delivered.text
        assert delivered.json()["to"] == profile.json()["email"]
        assert len(sent_messages) == 1
        assert sent_messages[0][1] == "StudentOS email delivery test"



def test_social_login_provider_status_and_authorization_redirects(monkeypatch) -> None:
    from backend.auth import routes as auth_routes

    with TestClient(app) as client:
        wait_until_ready(client)
        monkeypatch.setattr(auth_routes.settings, "GITHUB_CLIENT_ID", "")
        monkeypatch.setattr(auth_routes.settings, "GITHUB_CLIENT_SECRET", "")
        monkeypatch.setattr(auth_routes.settings, "MICROSOFT_CLIENT_ID", "")
        monkeypatch.setattr(auth_routes.settings, "MICROSOFT_CLIENT_SECRET", "")

        missing = client.get("/api/v1/auth/providers")
        assert missing.status_code == 200
        assert missing.json() == {"google": bool(auth_routes.settings.GOOGLE_CLIENT_ID), "github": False, "microsoft": False}
        assert client.get("/api/v1/auth/github/authorize").status_code == 503
        assert client.get("/api/v1/auth/microsoft/authorize").status_code == 503

        monkeypatch.setattr(auth_routes.settings, "GITHUB_CLIENT_ID", "github-client-id")
        monkeypatch.setattr(auth_routes.settings, "GITHUB_CLIENT_SECRET", "github-client-secret")
        monkeypatch.setattr(auth_routes.settings, "MICROSOFT_CLIENT_ID", "microsoft-client-id")
        monkeypatch.setattr(auth_routes.settings, "MICROSOFT_CLIENT_SECRET", "microsoft-client-secret")

        configured = client.get("/api/v1/auth/providers")
        assert configured.json()["github"] is True
        assert configured.json()["microsoft"] is True

        github = client.get("/api/v1/auth/github/authorize", follow_redirects=False)
        assert github.status_code == 302
        assert "github.com/login/oauth/authorize" in github.headers["location"]
        assert "read%3Auser" in github.headers["location"]
        assert github.cookies.get("studentos_oauth_state_github")

        microsoft = client.get("/api/v1/auth/microsoft/authorize", follow_redirects=False)
        assert microsoft.status_code == 302
        assert "login.microsoftonline.com/common/oauth2/v2.0/authorize" in microsoft.headers["location"]
        assert "openid" in microsoft.headers["location"]
        assert microsoft.cookies.get("studentos_oauth_state_microsoft")
