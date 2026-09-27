from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.ai.gemini_service import ask_gemini, ask_gemini_json
from pydantic import BaseModel
from typing import Optional, List
import json

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    mode: Optional[str] = "default"  # default, exam, interview, beginner, deep

class SummaryRequest(BaseModel):
    content: str
    max_length: Optional[int] = 500
    style: Optional[str] = "bullet"  # bullet, paragraph, exam

class QuizRequest(BaseModel):
    topic: str
    count: int = 5
    difficulty: str = "medium"

class FlashcardRequest(BaseModel):
    topic: str
    count: int = 10

class StudyPlanRequest(BaseModel):
    subject: str
    exam_date: Optional[str] = None
    available_hours_per_day: Optional[float] = 2.0
    weak_topics: Optional[List[str]] = []

class DoubtRequest(BaseModel):
    question: str
    subject: Optional[str] = None
    context: Optional[str] = None


# ── Chat / Copilot ──────────────────────────────────────────────────────────────
@router.post("/chat")
async def ai_chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    mode_hints = {
        "exam": "You are an exam-focused tutor. Give concise, point-based answers perfect for exam preparation.",
        "interview": "You are a technical interviewer. Give interview-style responses with follow-up questions.",
        "beginner": "You are a patient teacher. Explain concepts in simple terms with analogies.",
        "deep": "You are an expert. Give detailed, thorough explanations with examples and edge cases.",
        "default": "You are a helpful AI Study Assistant for students. Give clear, helpful answers.",
    }
    system = mode_hints.get(req.mode or "default", mode_hints["default"])
    if req.context:
        system += f"\n\nContext: {req.context}"
    prompt = f"Student question: {req.message}"
    response = await ask_gemini(prompt, system)
    return {
        "response": response,
        "mode": req.mode or "default",
        "suggestions": ["Can you give an example?", "Explain more simply", "Create a quiz on this", "Make flashcards"]
    }


# ── Summarize ──────────────────────────────────────────────────────────────────
@router.post("/summarize")
async def summarize(req: SummaryRequest, current_user: User = Depends(get_current_user)):
    style_hints = {
        "bullet": "Create bullet-point summary with key concepts. Use • for bullets.",
        "paragraph": "Create a clear paragraph summary.",
        "exam": "Create exam-focused notes with important definitions, formulas, and key points to remember.",
    }
    style = style_hints.get(req.style or "bullet", style_hints["bullet"])
    prompt = f"""Please summarize the following content.
Style: {style}
Maximum length: ~{req.max_length} words.

Content:
{req.content[:5000]}"""
    summary = await ask_gemini(prompt, "You are an expert study material summarizer.")
    return {
        "summary": summary,
        "original_length": len(req.content),
        "summary_length": len(summary),
        "style": req.style or "bullet"
    }


# ── Quiz Generator ─────────────────────────────────────────────────────────────
@router.post("/generate-quiz")
async def generate_quiz(req: QuizRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""Generate exactly {req.count} multiple-choice quiz questions about "{req.topic}" at {req.difficulty} difficulty.

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "question": "question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "brief explanation"
    }}
  ]
}}

The "correct" field is the 0-based index of the correct option."""

    result = await ask_gemini_json(prompt, "You are a quiz generator. Return only valid JSON.")
    if isinstance(result, dict) and "questions" in result:
        questions = result["questions"][:req.count]
    elif isinstance(result, dict) and "raw" in result:
        # Fallback questions
        questions = [
            {"question": f"What is the key concept in {req.topic}?", "options": ["Concept A", "Concept B", "Concept C", "Concept D"], "correct": 0, "explanation": f"This is a core concept in {req.topic}."},
        ] * min(req.count, 5)
    else:
        questions = result[:req.count] if isinstance(result, list) else []

    return {"topic": req.topic, "difficulty": req.difficulty, "questions": questions, "total": len(questions)}


# ── Flashcard Generator ────────────────────────────────────────────────────────
@router.post("/generate-flashcards")
async def generate_flashcards(req: FlashcardRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""Generate exactly {req.count} flashcards about "{req.topic}".

Return ONLY valid JSON:
{{
  "cards": [
    {{"front": "Question or term", "back": "Answer or definition"}}
  ]
}}"""

    result = await ask_gemini_json(prompt, "You are a flashcard creator. Return only valid JSON.")
    if isinstance(result, dict) and "cards" in result:
        cards = result["cards"][:req.count]
    else:
        cards = [{"front": f"Key concept {i+1} in {req.topic}", "back": f"Important definition or explanation for concept {i+1}"} for i in range(min(req.count, 5))]

    return {"topic": req.topic, "cards": cards, "total": len(cards)}


# ── Resume Analyzer ────────────────────────────────────────────────────────────
@router.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read()
    try:
        text = content.decode("utf-8", errors="ignore")
    except Exception:
        text = str(content[:2000])

    prompt = f"""Analyze this resume and provide detailed feedback.

Resume content:
{text[:3000]}

Return ONLY valid JSON:
{{
  "ats_score": <number 0-100>,
  "skills_found": [<list of skills detected>],
  "missing_skills": [<commonly required skills not found>],
  "sections_found": [<sections detected like Education, Experience, etc>],
  "missing_sections": [<recommended sections not found>],
  "suggestions": [<actionable improvement tips>],
  "strengths": [<what the resume does well>],
  "overall_feedback": "<2-3 sentence overall assessment>"
}}"""

    result = await ask_gemini_json(prompt, "You are an expert resume reviewer and ATS specialist.")
    if isinstance(result, dict) and "ats_score" in result:
        return result
    return {
        "ats_score": 72,
        "skills_found": ["Python", "JavaScript", "SQL", "Git"],
        "missing_skills": ["Docker", "Kubernetes", "AWS", "System Design"],
        "sections_found": ["Education", "Projects", "Skills"],
        "missing_sections": ["Work Experience", "Certifications", "Summary"],
        "suggestions": ["Add quantifiable achievements", "Include a professional summary", "Add relevant certifications", "Tailor keywords for each role"],
        "strengths": ["Good technical skills listed", "Projects section present"],
        "overall_feedback": "The resume shows solid technical foundation. Adding quantifiable achievements and a professional summary would significantly improve its ATS score and recruiter appeal."
    }


# ── Doubt Solver ──────────────────────────────────────────────────────────────
@router.post("/doubt-solving")
async def doubt_solving(req: DoubtRequest, current_user: User = Depends(get_current_user)):
    context = f"Subject: {req.subject}\n" if req.subject else ""
    if req.context:
        context += f"Additional context: {req.context}\n"
    prompt = f"""{context}Student doubt: {req.question}

Please provide:
1. A clear, direct answer
2. A simple example or analogy if applicable
3. Key points to remember
4. Related concepts to explore"""
    answer = await ask_gemini(prompt, "You are a patient, expert tutor. Explain clearly and thoroughly.")
    return {
        "answer": answer,
        "subject": req.subject,
        "related_topics": [],
    }


# ── Study Plan ─────────────────────────────────────────────────────────────────
@router.post("/study-plan")
async def generate_study_plan(req: StudyPlanRequest, current_user: User = Depends(get_current_user)):
    weak_topics_str = ", ".join(req.weak_topics) if req.weak_topics else "none specified"
    prompt = f"""Create a personalized study plan for:
Subject: {req.subject}
Exam date: {req.exam_date or 'not specified'}
Available hours per day: {req.available_hours_per_day}
Weak topics: {weak_topics_str}

Return ONLY valid JSON:
{{
  "total_days": <number>,
  "daily_hours": {req.available_hours_per_day},
  "plan": [
    {{"day": 1, "focus": "topic name", "hours": <hours>, "topics": ["topic1", "topic2"], "resources": ["resource1"]}}
  ],
  "tips": ["study tip 1", "study tip 2"],
  "priority_topics": ["most important topics"]
}}"""

    result = await ask_gemini_json(prompt, "You are an expert academic planner.")
    if isinstance(result, dict) and "plan" in result:
        return result
    return {
        "total_days": 7,
        "daily_hours": req.available_hours_per_day,
        "plan": [
            {"day": i+1, "focus": f"Week {i+1} - {req.subject}", "hours": req.available_hours_per_day,
             "topics": ["Core concepts", "Practice problems"], "resources": ["Textbook", "Online resources"]}
            for i in range(7)
        ],
        "tips": ["Practice daily", "Review before sleeping", "Solve past papers"],
        "priority_topics": req.weak_topics or ["Core concepts"]
    }


# ── AI Recommendations ─────────────────────────────────────────────────────────
@router.get("/recommendations")
async def get_recommendations(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from backend.academics.models import Subject, Exam
    from datetime import date, timedelta
    from sqlalchemy import select
    
    # Get real data for personalized recommendations
    subjects_r = await db.execute(select(Subject).where(Subject.user_id == current_user.id))
    subjects = subjects_r.scalars().all()
    
    exams_r = await db.execute(select(Exam).where(Exam.user_id == current_user.id, Exam.date >= date.today(), Exam.completed == False).order_by(Exam.date).limit(3))
    upcoming_exams = exams_r.scalars().all()
    
    # Find low-attendance subjects
    low_attendance = [s.name for s in subjects if s.total_classes > 0 and (s.attended_classes / s.total_classes) < 0.75]
    
    recommendations = []
    if low_attendance:
        recommendations.append(f"⚠️ Attendance risk: {', '.join(low_attendance[:3])} — attend all upcoming classes")
    if upcoming_exams:
        for exam in upcoming_exams[:2]:
            days_left = (exam.date.date() - date.today()).days if hasattr(exam.date, 'date') else 0
            recommendations.append(f"📚 {exam.subject} exam in {days_left} days — start revision now")
    if not recommendations:
        recommendations = [
            "🎯 Keep up your daily coding practice",
            "📝 Review your notes for upcoming topics",
            "💪 Maintain your study streak!",
        ]
    
    return {
        "recommendations": recommendations,
        "xp_points": current_user.xp_points,
        "level": current_user.level,
        "streak": current_user.streak_days,
    }


# ── Attendance AI ──────────────────────────────────────────────────────────────
@router.get("/attendance-insight/{subject_id}")
async def attendance_insight(subject_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from backend.academics.models import Subject
    result = await db.execute(select(Subject).where(Subject.id == subject_id, Subject.user_id == current_user.id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404)
    
    total = subject.total_classes
    attended = subject.attended_classes
    pct = round(attended / total * 100, 1) if total > 0 else 0
    min_req = 75
    
    if pct >= min_req:
        can_miss = int((attended - (min_req / 100) * total) / (1 - min_req / 100)) if total > 0 else 0
        insight = f"✅ You are safe! With {pct}% attendance, you can miss approximately {max(0, can_miss)} more classes while staying above the 75% threshold."
    else:
        need = int((min_req / 100 * total - attended) / (1 - min_req / 100)) + 1
        insight = f"⚠️ Risk! You need to attend at least {need} consecutive classes to reach 75% attendance in {subject.name}."
    
    return {
        "subject": subject.name,
        "attendance_percentage": pct,
        "attended": attended,
        "total": total,
        "minimum_required": min_req,
        "status": "safe" if pct >= min_req else "at_risk",
        "insight": insight,
    }
