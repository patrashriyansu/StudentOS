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


def _user_id(client: TestClient, headers: dict) -> int:
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()["id"]


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

        pdf = b"%PDF-1.4\\n% StudentOS test resume\\n%%EOF"
        upload = client.post("/api/v1/placements/resume/upload", headers=student,
                             files={"file": ("Student Resume.pdf", pdf, "application/pdf")})
        assert upload.status_code == 201, upload.text
        resume_id = upload.json()["resume_document_id"]
        applied = client.post(f"/api/v1/workspaces/student/jobs/{job_id}/apply", headers=student,
                              json={"resume_document_id": resume_id,
                                    "cover_note": "I would like to be considered."})
        assert applied.status_code == 201, applied.text
        applications = client.get("/api/v1/workspaces/recruiter/applications", headers=recruiter)
        assert applications.status_code == 200
        application = applications.json()[0]
        assert application["student_name"] == student["name"]
        assert application["email"] is None
        assert application["status"] == "applied"
        assert application["resume_available"] is True
        assert application["resume_filename"] == "Student Resume.pdf"
        resume_download = client.get(
            f"/api/v1/workspaces/recruiter/applications/{application['id']}/resume", headers=recruiter
        )
        assert resume_download.status_code == 200
        assert resume_download.content.startswith(b"%PDF-1.4")

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



def test_resume_library_and_candidate_details_respect_field_level_student_consent() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        recruiter = register(client, "recruiter")
        student = register(client, "student", "CSE-A")
        student_id = _user_id(client, student)

        master = client.put("/api/v1/campus/recruiter/visibility", headers=student,
                            json={"profile_visible": True, "contact_visible": False})
        assert master.status_code == 200
        hidden = client.get(f"/api/v1/workspaces/recruiter/candidates/{student_id}", headers=recruiter)
        assert hidden.status_code == 200
        assert hidden.json()["academic"] is None
        assert hidden.json()["phone"] is None
        assert hidden.json()["resume_documents"] == []

        saved = client.put("/api/v1/users/profile", headers=student, json={
            "bio": "Computer science student focused on software engineering.",
            "phone": "+91 9000000000", "college": "Example Institute",
            "github_url": "https://github.com/example-student",
            "linkedin_url": "https://www.linkedin.com/in/example-student",
            "portfolio_url": "https://example.dev", "skills": ["Python", "React", "SQL"],
        })
        assert saved.status_code == 200

        academic = client.put("/api/v1/campus/academic-profile", headers=student, json={
            "registration_number": "TEST-ACADEMIC-01", "section": "CSE-A",
            "course": "B.Tech", "branch": "Computer Science", "admission_year": 2024,
            "passing_out_year": 2028, "current_year": 3, "current_semester": 5,
            "cgpa": 8.39, "sgpa": 8.6,
        })
        assert academic.status_code == 200, academic.text

        pdf = b"%PDF-1.4\\n% StudentOS consent test\\n%%EOF"
        upload = client.post("/api/v1/placements/resume/upload", headers=student,
                             files={"file": ("Career Resume.pdf", pdf, "application/pdf")})
        assert upload.status_code == 201, upload.text

        disclosures = client.put("/api/v1/campus/recruiter/disclosures", headers=student, json={
            "academics_visible": True, "phone_visible": True, "resume_visible": True,
        })
        assert disclosures.status_code == 200
        detail = client.get(f"/api/v1/workspaces/recruiter/candidates/{student_id}", headers=recruiter)
        assert detail.status_code == 200, detail.text
        payload = detail.json()
        assert payload["phone"] == "+91 9000000000"
        assert payload["academic"]["cgpa"] == 8.39
        assert payload["academic"]["sgpa"] == 8.6
        assert payload["resume_documents"][0]["filename"] == "Career Resume.pdf"
        download = client.get(f"/api/v1/workspaces/recruiter/candidates/{student_id}/resume",
                              headers=recruiter)
        assert download.status_code == 200
        assert download.content == pdf

        client.put("/api/v1/campus/recruiter/disclosures", headers=student, json={
            "academics_visible": False, "phone_visible": False, "resume_visible": False,
        })
        hidden_again = client.get(f"/api/v1/workspaces/recruiter/candidates/{student_id}", headers=recruiter)
        assert hidden_again.status_code == 200
        assert hidden_again.json()["academic"] is None
        assert hidden_again.json()["phone"] is None
        assert hidden_again.json()["resume_documents"] == []
        assert client.get(f"/api/v1/workspaces/recruiter/candidates/{student_id}/resume",
                          headers=recruiter).status_code == 404

        invalid = client.post("/api/v1/placements/resume/upload", headers=student,
                              files={"file": ("bad.pdf", b"not pdf", "application/pdf")})
        assert invalid.status_code == 415


def test_professional_mentor_programme_requires_acceptance_and_tracks_progress() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        admin = register(client, "student")
        promote(admin["email"], "admin")
        mentor = register(client, "mentor")
        student = register(client, "student", "CSE-M")
        assignment = client.post("/api/v1/campus/mentor/assignments", headers=admin, json={
            "mentor_email": mentor["email"], "student_email": student["email"],
        })
        assert assignment.status_code == 201

        student_id = _user_id(client, student)
        created = client.post("/api/v1/workspaces/mentor/programmes", headers=mentor, json={
            "student_id": student_id, "title": "Career readiness and full-stack growth",
            "focus_area": "Career readiness",
            "description": "A structured development programme covering technical growth, portfolio quality and interview readiness.",
            "start_date": "2026-12-01", "target_end_date": "2027-03-31", "meeting_cadence": "biweekly",
        })
        assert created.status_code == 201, created.text
        programme_id = created.json()["id"]

        pending = client.get("/api/v1/workspaces/student/mentoring", headers=student)
        assert pending.status_code == 200
        assert pending.json()["programmes"][0]["status"] == "awaiting_student"

        blocked = client.post("/api/v1/workspaces/mentor/development-goals", headers=mentor, json={
            "program_id": programme_id, "title": "Publish portfolio projects",
            "desired_outcome": "Publish two complete project case studies.",
            "success_measure": "Two public case-study pages with code and screenshots.",
        })
        assert blocked.status_code == 409

        accepted = client.post(f"/api/v1/workspaces/student/mentoring/programmes/{programme_id}/respond",
                               headers=student, json={"accepted": True})
        assert accepted.status_code == 200

        goal = client.post("/api/v1/workspaces/mentor/development-goals", headers=mentor, json={
            "program_id": programme_id, "title": "Publish portfolio projects",
            "category": "Technical skills", "desired_outcome": "Publish two complete project case studies.",
            "success_measure": "Two public case-study pages with README, architecture and demo.",
            "baseline": "0 case studies", "target": "2 case studies", "priority": "high",
            "due_date": "2027-01-31",
        })
        assert goal.status_code == 201, goal.text
        goal_id = goal.json()["id"]
        action = client.post("/api/v1/workspaces/mentor/action-items", headers=mentor, json={
            "goal_id": goal_id, "title": "Write the first case-study draft",
            "owner": "student", "due_date": "2026-12-15",
        })
        assert action.status_code == 201

        plan = client.get("/api/v1/workspaces/student/mentoring", headers=student)
        assert len(plan.json()["goals"]) == 1
        action_id = plan.json()["action_items"][0]["id"]
        assert client.patch(f"/api/v1/workspaces/student/mentoring/action-items/{action_id}",
                            headers=student, json={"status": "completed"}).status_code == 200

        checkin = client.post(
            f"/api/v1/workspaces/student/mentoring/programmes/{programme_id}/check-ins",
            headers=student, json={"confidence_rating": 4, "progress_status": "on_track",
                "wins": "Completed the first draft.", "blockers": "Need review feedback.",
                "support_needed": "Please review the project outline."},
        )
        assert checkin.status_code == 201
        inbox = client.get("/api/v1/workspaces/mentor/check-ins", headers=mentor)
        assert inbox.status_code == 200
        checkin_id = inbox.json()[0]["id"]
        replied = client.post(f"/api/v1/workspaces/mentor/check-ins/{checkin_id}/reply",
                              headers=mentor, json={"mentor_reply": "Good progress. Share the draft before our next meeting."})
        assert replied.status_code == 200
        latest = client.get("/api/v1/workspaces/student/mentoring", headers=student)
        assert latest.json()["check_ins"][0]["mentor_reply"].startswith("Good progress")


def test_resume_download_is_private_to_the_document_owner() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        first = register(client, "student")
        second = register(client, "student")
        pdf = b"%PDF-1.4\\n% private file\\n%%EOF"
        upload = client.post("/api/v1/placements/resume/upload", headers=first,
                             files={"file": ("private.pdf", pdf, "application/pdf")})
        assert upload.status_code == 201
        doc_id = upload.json()["id"]
        assert client.get(f"/api/v1/placements/resume/documents/{doc_id}/download",
                          headers=first).content == pdf
        assert client.get(f"/api/v1/placements/resume/documents/{doc_id}/download",
                          headers=second).status_code == 404


def test_student_can_request_mentor_and_message_only_after_acceptance() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        mentor = register(client, "mentor")
        student = register(client, "student")
        other_student = register(client, "student")
        mentor_id = _user_id(client, mentor)
        student_id = _user_id(client, student)

        available = client.get("/api/v1/workspaces/student/mentors", headers=student)
        assert available.status_code == 200
        assert any(item["id"] == mentor_id for item in available.json())

        request = client.post("/api/v1/workspaces/student/mentoring/requests", headers=student, json={
            "mentor_id": mentor_id,
            "message": "I would like guidance on software engineering and internship preparation.",
        })
        assert request.status_code == 201, request.text
        request_id = request.json()["id"]
        duplicate = client.post("/api/v1/workspaces/student/mentoring/requests", headers=student, json={
            "mentor_id": mentor_id,
            "message": "Following up.",
        })
        assert duplicate.status_code == 409

        mentor_requests = client.get("/api/v1/workspaces/mentor/requests", headers=mentor)
        assert mentor_requests.status_code == 200
        assert mentor_requests.json()[0]["student_name"] == student["name"]

        premature = client.post(
            f"/api/v1/workspaces/student/mentoring/messages/{mentor_id}",
            headers=student,
            json={"content": "Can we schedule a first meeting?"},
        )
        assert premature.status_code == 404

        accepted = client.patch(
            f"/api/v1/workspaces/mentor/requests/{request_id}",
            headers=mentor,
            json={"status": "accepted"},
        )
        assert accepted.status_code == 200
        assert accepted.json()["status"] == "accepted"

        student_message = client.post(
            f"/api/v1/workspaces/student/mentoring/messages/{mentor_id}",
            headers=student,
            json={"content": "Can we schedule a first meeting?"},
        )
        assert student_message.status_code == 201

        mentor_thread = client.get(
            f"/api/v1/workspaces/mentor/messages/{student_id}",
            headers=mentor,
        )
        assert mentor_thread.status_code == 200
        assert mentor_thread.json()[0]["content"] == "Can we schedule a first meeting?"

        mentor_reply = client.post(
            f"/api/v1/workspaces/mentor/messages/{student_id}",
            headers=mentor,
            json={"content": "Yes. Please share your availability for this week."},
        )
        assert mentor_reply.status_code == 201

        student_thread = client.get(
            f"/api/v1/workspaces/student/mentoring/messages/{mentor_id}",
            headers=student,
        )
        assert [item["sender_id"] for item in student_thread.json()] == [student_id, mentor_id]
        assert student_thread.json()[1]["content"].startswith("Yes.")

        intruder = client.get(
            f"/api/v1/workspaces/student/mentoring/messages/{mentor_id}",
            headers=other_student,
        )
        assert intruder.status_code == 404

def test_recruiter_interviews_are_scheduled_for_owned_applications_and_visible_to_student() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        recruiter = register(client, "recruiter")
        student = register(client, "student", "CSE-I")
        visibility = client.put("/api/v1/campus/recruiter/visibility", headers=student,
                                json={"profile_visible": True, "contact_visible": False})
        assert visibility.status_code == 200

        job = client.post("/api/v1/workspaces/recruiter/jobs", headers=recruiter, json={
            "title": "Backend Engineering Intern",
            "company": "Interview Workflow Test",
            "description": "Build backend APIs and automated tests.",
            "employment_type": "Internship",
            "skills": ["Python", "FastAPI"],
        })
        assert job.status_code == 201, job.text
        pdf = b"%PDF-1.4\\n% interview workflow test\\n%%EOF"
        uploaded = client.post("/api/v1/placements/resume/upload", headers=student,
                               files={"file": ("interview.pdf", pdf, "application/pdf")})
        assert uploaded.status_code == 201, uploaded.text
        application = client.post(
            f"/api/v1/workspaces/student/jobs/{job.json()['id']}/apply",
            headers=student,
            json={"resume_document_id": uploaded.json()["resume_document_id"],
                  "cover_note": "I am interested in this role."},
        )
        assert application.status_code == 201, application.text
        application_id = application.json()["id"]

        scheduled = client.post(
            f"/api/v1/workspaces/recruiter/applications/{application_id}/interviews",
            headers=recruiter,
            json={
                "scheduled_at": "2030-01-02T09:00:00Z",
                "duration_minutes": 45,
                "interview_type": "technical",
                "meeting_url": "https://meet.example.test/interview",
                "notes": "Bring a project walkthrough.",
            },
        )
        assert scheduled.status_code == 201, scheduled.text
        recruiter_view = client.get("/api/v1/workspaces/recruiter/interviews", headers=recruiter)
        assert recruiter_view.status_code == 200
        assert recruiter_view.json()[0]["student_name"] == student["name"]
        assert recruiter_view.json()[0]["status"] == "scheduled"

        student_view = client.get("/api/v1/workspaces/student/recruiter-interviews", headers=student)
        assert student_view.status_code == 200
        assert student_view.json()[0]["company"] == "Interview Workflow Test"
        assert student_view.json()[0]["recruiter_name"] == recruiter["name"]
        assert student_view.json()[0]["meeting_url"] == "https://meet.example.test/interview"

        assert client.get("/api/v1/workspaces/recruiter/interviews", headers=student).status_code == 403
        assert client.get("/api/v1/workspaces/student/recruiter-interviews", headers=recruiter).status_code == 403


def test_mentor_availability_can_only_be_booked_by_assigned_student() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        admin = register(client, "student")
        promote(admin["email"], "admin")
        mentor = register(client, "mentor")
        assigned = register(client, "student", "CSE-S")
        unassigned = register(client, "student", "CSE-U")

        assignment = client.post("/api/v1/campus/mentor/assignments", headers=admin, json={
            "mentor_email": mentor["email"],
            "student_email": assigned["email"],
        })
        assert assignment.status_code == 201, assignment.text

        slot = client.post("/api/v1/workspaces/mentor/availability", headers=mentor, json={
            "starts_at": "2030-02-10T09:00:00Z",
            "ends_at": "2030-02-10T09:30:00Z",
            "meeting_link": "https://meet.example.test/mentor",
        })
        assert slot.status_code == 201, slot.text
        slot_id = slot.json()["id"]

        visible = client.get("/api/v1/workspaces/student/mentoring/availability", headers=assigned)
        assert visible.status_code == 200
        assert [item["id"] for item in visible.json()] == [slot_id]
        assert client.get("/api/v1/workspaces/student/mentoring/availability", headers=unassigned).json() == []

        booked = client.post(
            f"/api/v1/workspaces/student/mentoring/availability/{slot_id}/book",
            headers=assigned,
            json={"message": "I would like to discuss my internship preparation."},
        )
        assert booked.status_code == 201, booked.text
        assert booked.json()["slot"]["status"] == "booked"

        mentor_slots = client.get("/api/v1/workspaces/mentor/availability", headers=mentor)
        assert mentor_slots.status_code == 200
        assert mentor_slots.json()[0]["student_name"] == assigned["name"]
        assert mentor_slots.json()[0]["booking_message"].startswith("I would like")

        duplicate = client.post(
            f"/api/v1/workspaces/student/mentoring/availability/{slot_id}/book",
            headers=unassigned,
            json={"message": "Trying another account."},
        )
        assert duplicate.status_code == 404
        assert client.get("/api/v1/workspaces/mentor/availability", headers=assigned).status_code == 403
