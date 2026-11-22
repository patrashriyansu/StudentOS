import os
import sqlite3
import sys
import time
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
DB_PATH = Path("test_studentos_auth.db").absolute()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{DB_PATH.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-for-role-workspaces"
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


def register(client: TestClient, role: str = "student", section: str | None = None) -> dict:
    suffix = uuid4().hex[:10]
    email = f"{role}-{suffix}@example.com"
    payload = {
        "name": f"Workspace {role.title()} {suffix[:4]}",
        "email": email,
        "password": "Password1!",
        "role": role,
    }
    if section:
        payload.update({"registration_number": f"REG-{suffix}", "section": section})
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return {
        "Authorization": f"Bearer {response.json()['access_token']}",
        "email": email,
        "name": payload["name"],
    }


def promote(email: str, role: str) -> None:
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute("UPDATE users SET role = ? WHERE lower(email) = lower(?)", (role, email))
        connection.commit()


def test_recruiter_jobs_candidates_shortlist_and_application_stages_are_persisted() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        recruiter = register(client, "recruiter")
        student = register(client, "student", "CSE-A")

        private_candidates = client.get("/api/v1/campus/recruiter/candidates", headers=recruiter)
        assert private_candidates.status_code == 200
        assert all(row["email"] != student["email"] for row in private_candidates.json())

        visibility = client.put("/api/v1/campus/recruiter/visibility", headers=student, json={
            "profile_visible": True,
            "contact_visible": False,
        })
        assert visibility.status_code == 200

        created = client.post("/api/v1/workspaces/recruiter/jobs", headers=recruiter, json={
            "title": "Software Engineering Intern",
            "company": "Workspace Test Company",
            "description": "Build and test full-stack applications with the engineering team.",
            "employment_type": "Internship",
            "skills": ["Python", "React"],
            "graduation_year_min": 2027,
            "graduation_year_max": 2029,
        })
        assert created.status_code == 201, created.text
        job_id = created.json()["id"]

        candidates = client.get("/api/v1/campus/recruiter/candidates", headers=recruiter)
        candidate = next(row for row in candidates.json() if row["email"] is None and row["name"] == student["name"])
        saved = client.post(f"/api/v1/workspaces/recruiter/shortlist/{candidate['student_id']}",
                            headers=recruiter, json={"note": "Review project portfolio"})
        assert saved.status_code == 201
        assert client.get("/api/v1/workspaces/recruiter/shortlist", headers=recruiter).json()[0]["name"] == student["name"]

        applied = client.post(f"/api/v1/workspaces/student/jobs/{job_id}/apply", headers=student,
                              json={"cover_note": "I would like to be considered."})
        assert applied.status_code == 201, applied.text
        applications = client.get("/api/v1/workspaces/recruiter/applications", headers=recruiter)
        assert applications.status_code == 200
        application = applications.json()[0]
        assert application["student_name"] == student["name"]
        assert application["email"] is None
        assert application["status"] == "applied"

        changed = client.patch(f"/api/v1/workspaces/recruiter/applications/{application['id']}",
                               headers=recruiter, json={"status": "interview", "recruiter_note": "Invite for interview"})
        assert changed.status_code == 200
        student_applications = client.get("/api/v1/workspaces/student/applications", headers=student)
        assert student_applications.status_code == 200
        assert student_applications.json()[0]["status"] == "interview"

        hidden = client.put("/api/v1/campus/recruiter/visibility", headers=student,
                            json={"profile_visible": False})
        assert hidden.status_code == 200
        assert hidden.json()["contact_visible"] is False
        assert all(row["student_name"] != student["name"] for row in
                   client.get("/api/v1/workspaces/recruiter/applications", headers=recruiter).json())


def test_mentor_can_only_create_sessions_goals_and_private_notes_for_assigned_students() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        admin = register(client, "student")
        promote(admin["email"], "admin")
        mentor = register(client, "mentor")
        assigned = register(client, "student", "CSE-A")
        unassigned = register(client, "student", "CSE-B")

        assignment = client.post("/api/v1/campus/mentor/assignments", headers=admin, json={
            "mentor_email": mentor["email"],
            "student_email": assigned["email"],
        })
        assert assignment.status_code == 201

        roster = client.get("/api/v1/campus/mentor/students", headers=mentor)
        assert roster.status_code == 200
        assert [row["name"] for row in roster.json()] == [assigned["name"]]
        assert "cgpa" not in roster.json()[0] and "sgpa" not in roster.json()[0]

        session = client.post("/api/v1/workspaces/mentor/sessions", headers=mentor, json={
            "student_id": roster.json()[0]["student_id"],
            "scheduled_at": "2026-12-01T10:00:00+05:30",
            "duration_minutes": 45,
            "agenda": "Review learning plan",
        })
        assert session.status_code == 201, session.text

        goal = client.post("/api/v1/workspaces/mentor/goals", headers=mentor, json={
            "student_id": roster.json()[0]["student_id"],
            "title": "Complete graph algorithms",
            "description": "Finish BFS, DFS and shortest path practice.",
        })
        assert goal.status_code == 201

        private_note = client.post("/api/v1/workspaces/mentor/notes", headers=mentor, json={
            "student_id": roster.json()[0]["student_id"],
            "body": "Discussed weekly learning targets.",
        })
        assert private_note.status_code == 201
        assert client.get("/api/v1/workspaces/mentor/notes", headers=mentor).json()[0]["body"] == "Discussed weekly learning targets."

        forbidden_goal = client.post("/api/v1/workspaces/mentor/goals", headers=mentor, json={
            "student_id": 999999,
            "title": "Should not be linked",
        })
        assert forbidden_goal.status_code == 404

        other_mentor = register(client, "mentor")
        assert client.get("/api/v1/workspaces/mentor/notes", headers=other_mentor).json() == []


def test_faculty_is_limited_to_assigned_sections_and_can_publish_and_grade_classwork() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        admin = register(client, "student")
        promote(admin["email"], "admin")
        faculty = register(client, "student")
        grant = client.post("/api/v1/campus/faculty", headers=admin, json={"email": faculty["email"]})
        assert grant.status_code == 200

        student_a = register(client, "student", "CSE-A")
        student_b = register(client, "student", "CSE-B")
        assigned_class = client.post("/api/v1/workspaces/admin/classes", headers=admin, json={
            "faculty_email": faculty["email"],
            "name": "Data Structures",
            "code": "CSE201",
            "section": "CSE-A",
        })
        assert assigned_class.status_code == 201, assigned_class.text
        subject_id = assigned_class.json()["id"]

        self_assigned = client.post("/api/v1/campus/subjects", headers=faculty, json={
            "name": "Unauthorized extra class",
            "code": "BAD101",
            "section": "CSE-B",
        })
        assert self_assigned.status_code == 403

        rankings = client.get("/api/v1/campus/leaderboard", headers=faculty)
        assert rankings.status_code == 200
        assert all(row["section"] == "CSE-A" for row in rankings.json()["students"])

        broadcast = client.post("/api/v1/campus/notices", headers=faculty, json={
            "title": "Unauthorized broadcast",
            "message": "Faculty cannot publish a college-wide notice.",
            "audience_type": "all",
        })
        assert broadcast.status_code == 403
        outside_section = client.post("/api/v1/campus/notices", headers=faculty, json={
            "title": "Wrong section",
            "message": "Faculty cannot target a section they do not teach.",
            "audience_type": "section",
            "section": "CSE-B",
        })
        assert outside_section.status_code == 403
        assigned_section = client.post("/api/v1/campus/notices", headers=faculty, json={
            "title": "CSE-A notice",
            "message": "Class announcement.",
            "audience_type": "section",
            "section": "CSE-A",
        })
        assert assigned_section.status_code == 200

        teacher_students = client.get("/api/v1/campus/students", headers=faculty)
        assert teacher_students.status_code == 200
        visible_emails = {row["email"] for row in teacher_students.json()}
        assert student_a["email"] in visible_emails
        assert student_b["email"] not in visible_emails

        assignment = client.post("/api/v1/workspaces/faculty/assignments", headers=faculty, json={
            "subject_id": subject_id,
            "title": "Graph traversal exercise",
            "instructions": "Submit a short explanation and code.",
            "points": 20,
        })
        assert assignment.status_code == 201, assignment.text
        assignment_id = assignment.json()["id"]

        student_classroom = client.get("/api/v1/workspaces/student/classroom", headers=student_a)
        assert [row["id"] for row in student_classroom.json()["assignments"]] == [assignment_id]
        assert client.get("/api/v1/workspaces/student/classroom", headers=student_b).json()["assignments"] == []

        submission = client.post(f"/api/v1/workspaces/student/classroom/assignments/{assignment_id}/submit",
                                 headers=student_a, json={"submission_text": "BFS uses a queue."})
        assert submission.status_code == 201, submission.text
        submissions = client.get(f"/api/v1/workspaces/faculty/assignments/{assignment_id}/submissions",
                                  headers=faculty)
        assert submissions.status_code == 200
        submission_id = submissions.json()[0]["id"]

        graded = client.post(f"/api/v1/workspaces/faculty/submissions/{submission_id}/grade",
                             headers=faculty, json={"marks_awarded": 18, "feedback": "Good work."})
        assert graded.status_code == 200
        classroom_after_grade = client.get("/api/v1/workspaces/student/classroom", headers=student_a)
        assert classroom_after_grade.json()["assignments"][0]["submission"]["marks_awarded"] == 18

        forbidden = client.post("/api/v1/workspaces/faculty/assignments", headers=faculty, json={
            "subject_id": 999999,
            "title": "Out of scope",
            "instructions": "Should be rejected.",
        })
        assert forbidden.status_code == 404



def test_admin_can_manage_staff_roles_and_status_but_other_roles_cannot() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        admin = register(client, "student")
        promote(admin["email"], "admin")
        mentor = register(client, "mentor")
        current = client.get("/api/v1/auth/me", headers=mentor)
        assert current.status_code == 200
        staff_id = current.json()["id"]

        denied = client.patch(f"/api/v1/workspaces/admin/staff/{staff_id}",
                              headers=mentor, json={"role": "recruiter"})
        assert denied.status_code == 403

        changed = client.patch(f"/api/v1/workspaces/admin/staff/{staff_id}",
                               headers=admin, json={"role": "recruiter"})
        assert changed.status_code == 200, changed.text
        assert changed.json()["role"] == "recruiter"

        disabled = client.patch(f"/api/v1/workspaces/admin/staff/{staff_id}",
                                headers=admin, json={"is_active": False})
        assert disabled.status_code == 200
        assert disabled.json()["active"] is False

        updated_staff = client.get("/api/v1/workspaces/admin/staff", headers=admin)
        item = next(row for row in updated_staff.json() if row["id"] == staff_id)
        assert item["role"] == "recruiter"
        assert item["active"] is False
