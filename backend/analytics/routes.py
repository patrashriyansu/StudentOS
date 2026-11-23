from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from io import BytesIO
from datetime import datetime, timezone
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, UserActivity

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Real-time overview pulling from actual user data."""
    from backend.academics.models import Grade, Subject
    from backend.coding.models import CodingProfile
    from backend.placements.models import Application
    from backend.productivity.models import Task

    # CGPA
    grade_res = await db.execute(select(Grade).where(Grade.user_id == current_user.id))
    grades = grade_res.scalars().all()
    if grades:
        total_credits = sum(g.credits for g in grades)
        cgpa = round(sum(g.grade_point * g.credits for g in grades) / total_credits, 2) if total_credits else 0
    else:
        cgpa = None

    # Problems solved
    cp_res = await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))
    cp = cp_res.scalar_one_or_none()
    total_problems = cp.total_problems_solved if cp else None

    # Placement applications
    app_res = await db.execute(select(func.count(Application.id)).where(Application.user_id == current_user.id))
    placement_apps = app_res.scalar() or 0

    # Tasks completed
    task_res = await db.execute(
        select(func.count(Task.id)).where(Task.user_id == current_user.id, Task.status == "done")
    )
    tasks_completed = task_res.scalar() or 0

    return {
        "cgpa": cgpa,
        "total_problems_solved": total_problems,
        "placement_apps": placement_apps,
        "tasks_completed": tasks_completed,
        "xp_points": current_user.xp_points,
        "level": current_user.level,
        "streak_days": current_user.streak_days,
    }


@router.get("/dashboard")
async def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    activity_result = await db.execute(
        select(func.count(UserActivity.id)).where(UserActivity.user_id == current_user.id)
    )
    total_activities = activity_result.scalar() or 0
    return {
        "total_activities": total_activities,
        "xp_points": current_user.xp_points,
        "level": current_user.level,
        "streak_days": current_user.streak_days,
        "recent_activity_count": min(total_activities, 10),
    }


@router.get("/activities")
async def get_recent_activities(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserActivity)
        .where(UserActivity.user_id == current_user.id)
        .order_by(UserActivity.created_at.desc())
        .limit(20)
    )
    activities = result.scalars().all()
    return [
        {
            "id": a.id,
            "activity_type": a.activity_type,
            "description": a.description,
            "xp_earned": a.xp_earned,
            "created_at": a.created_at.isoformat(),
        }
        for a in activities
    ]



@router.get("/report.pdf")
async def download_student_report(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Create a downloadable progress report from this user's saved StudentOS records."""
    from backend.academics.models import Grade, Subject, AttendanceRecord
    from backend.coding.models import CodingProfile
    from backend.placements.models import Application, Interview, Offer
    from backend.productivity.models import Task
    from backend.wellness.models import MoodLog, SleepLog, ExerciseLog
    from backend.finance.models import Expense

    grades = (await db.execute(select(Grade).where(Grade.user_id == current_user.id))).scalars().all()
    subjects = (await db.execute(select(Subject).where(Subject.user_id == current_user.id))).scalars().all()
    attendance_rows = (await db.execute(
        select(AttendanceRecord, Subject)
        .join(Subject, Subject.id == AttendanceRecord.subject_id)
        .where(Subject.user_id == current_user.id)
        .order_by(AttendanceRecord.date.desc())
    )).all()
    coding = (await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))).scalar_one_or_none()
    applications = (await db.execute(select(Application).where(Application.user_id == current_user.id))).scalars().all()
    interviews = (await db.execute(select(Interview).where(Interview.user_id == current_user.id))).scalars().all()
    offers = (await db.execute(select(Offer).where(Offer.user_id == current_user.id))).scalars().all()
    tasks = (await db.execute(select(Task).where(Task.user_id == current_user.id))).scalars().all()
    expenses = (await db.execute(select(Expense).where(Expense.user_id == current_user.id))).scalars().all()
    moods = (await db.execute(select(MoodLog).where(MoodLog.user_id == current_user.id))).scalars().all()
    sleep = (await db.execute(select(SleepLog).where(SleepLog.user_id == current_user.id))).scalars().all()
    exercise = (await db.execute(select(ExerciseLog).where(ExerciseLog.user_id == current_user.id))).scalars().all()

    credits = sum(item.credits or 0 for item in grades)
    weighted_cgpa = sum((item.grade_point or 0) * (item.credits or 0) for item in grades) / credits if credits else None
    attendance_by_subject: dict[int, list[int]] = {}
    for record, subject in attendance_rows:
        counts = attendance_by_subject.setdefault(subject.id, [0, 0])
        counts[1] += 1
        if (record.status or "").lower() == "present":
            counts[0] += 1

    completed_tasks = sum(1 for task in tasks if bool(task.completed))
    expense_total = sum(item.amount or 0 for item in expenses)
    avg_mood = sum(item.mood_score or 0 for item in moods) / len(moods) if moods else None
    avg_sleep = sum(item.hours or 0 for item in sleep) / len(sleep) if sleep else None
    exercise_minutes = sum(item.duration_minutes or 0 for item in exercise)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=17 * mm, bottomMargin=17 * mm,
        title="StudentOS Progress Report", author="StudentOS",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="StudentOSReportTitle", parent=styles["Title"], alignment=TA_CENTER,
        textColor=colors.HexColor("#243B73"), fontSize=19, leading=23, spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="StudentOSReportSub", parent=styles["Normal"], alignment=TA_CENTER,
        textColor=colors.HexColor("#5D6472"), fontSize=8, spaceAfter=14,
    ))
    styles.add(ParagraphStyle(
        name="StudentOSReportSection", parent=styles["Heading2"],
        textColor=colors.HexColor("#243B73"), fontSize=12, leading=15,
        spaceBefore=11, spaceAfter=6,
    ))
    story = [
        Paragraph("StudentOS Progress Report", styles["StudentOSReportTitle"]),
        Paragraph(
            f"{escape(current_user.name)} · {escape(current_user.email)}<br/>Generated {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}",
            styles["StudentOSReportSub"],
        ),
        Paragraph("Academic and career overview", styles["StudentOSReportSection"]),
    ]
    summary = [
        ["Measure", "Saved result"],
        ["Subjects", str(len(subjects))],
        ["Grade records", str(len(grades))],
        ["Weighted CGPA", f"{weighted_cgpa:.2f}" if weighted_cgpa is not None else "No grade data entered"],
        ["LeetCode problems solved", str(coding.total_problems_solved) if coding else "No coding profile data"],
        ["Applications tracked", str(len(applications))],
        ["Interviews tracked", str(len(interviews))],
        ["Offers saved", str(len(offers))],
        ["Tasks completed", f"{completed_tasks} / {len(tasks)}"],
    ]
    table = Table(summary, colWidths=[76 * mm, 92 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#243B73")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), .35, colors.HexColor("#D8DCE5")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F6FA")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(table)
    story.append(Paragraph("Subject attendance", styles["StudentOSReportSection"]))
    attendance_data = [["Subject", "Present", "Recorded", "Attendance"]]
    for subject in subjects:
        present, recorded = attendance_by_subject.get(subject.id, [0, 0])
        attendance_data.append([
            subject.name, str(present), str(recorded),
            f"{present / recorded * 100:.1f}%" if recorded else "No records",
        ])
    if len(attendance_data) == 1:
        attendance_data.append(["No subjects entered", "—", "—", "—"])
    attendance_table = Table(attendance_data, colWidths=[78 * mm, 24 * mm, 27 * mm, 39 * mm], repeatRows=1)
    attendance_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3C587D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), .35, colors.HexColor("#D8DCE5")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F6FA")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(attendance_table)
    story.append(Paragraph("Wellness and finance", styles["StudentOSReportSection"]))
    wellness = [
        ["Measure", "Saved result"],
        ["Average mood", f"{avg_mood:.1f} / 5" if avg_mood is not None else "No mood records"],
        ["Average sleep", f"{avg_sleep:.1f} hours" if avg_sleep is not None else "No sleep records"],
        ["Exercise time", f"{exercise_minutes} minutes across {len(exercise)} sessions"],
        ["Recorded expenses", f"INR {expense_total:,.2f} across {len(expenses)} transactions"],
    ]
    wellness_table = Table(wellness, colWidths=[76 * mm, 92 * mm])
    wellness_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3C587D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), .35, colors.HexColor("#D8DCE5")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F6FA")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(wellness_table)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "This report reflects records currently saved in your StudentOS account. Missing values mean no corresponding records have been entered; they are not estimated.",
        styles["Small"],
    ))
    doc.build(story)
    buffer.seek(0)
    filename = f"studentos-progress-{datetime.now(timezone.utc).date().isoformat()}.pdf"
    return StreamingResponse(
        buffer, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
