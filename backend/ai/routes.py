from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.ai.gemini_service import ask_gemini, ask_gemini_json
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=6000)
    context: Optional[str] = Field(default=None, max_length=12000)
    mode: Literal["default", "exam", "interview", "beginner", "deep"] = "default"

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be empty.")
        return value


class SummaryRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=30000)
    max_length: int = Field(default=500, ge=80, le=3000)
    style: Literal["bullet", "paragraph", "exam"] = "bullet"


class QuizRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=160)
    count: int = Field(default=5, ge=1, le=10)
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class FlashcardRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=160)
    count: int = Field(default=10, ge=1, le=20)


class StudyPlanRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=160)
    exam_date: Optional[str] = None
    available_hours_per_day: Optional[float] = Field(default=2.0, gt=0, le=16)
    weak_topics: List[str] = Field(default_factory=list)


class DoubtRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=6000)
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
{req.content[:30000]}"""
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

    result = await ask_gemini_json(prompt, "You are an expert assessment designer. Create accurate questions and plausible distractors. Return only valid JSON.")
    questions = result.get("questions") if isinstance(result, dict) else None
    if not isinstance(questions, list) or len(questions) < req.count:
        raise HTTPException(status_code=502, detail="The AI could not create a complete quiz. Please retry or choose another topic.")

    validated = []
    for item in questions[:req.count]:
        if not isinstance(item, dict):
            raise HTTPException(status_code=502, detail="The AI returned an invalid quiz question. Please retry.")
        question = item.get("question")
        options = item.get("options")
        correct = item.get("correct")
        explanation = item.get("explanation", "")
        if (
            not isinstance(question, str) or not question.strip()
            or not isinstance(options, list) or len(options) != 4
            or not all(isinstance(option, str) and option.strip() for option in options)
            or not isinstance(correct, int) or isinstance(correct, bool) or correct not in range(4)
            or not isinstance(explanation, str)
        ):
            raise HTTPException(status_code=502, detail="The AI returned an invalid quiz question. Please retry.")
        validated.append({
            "question": question.strip(),
            "options": [option.strip() for option in options],
            "correct": correct,
            "explanation": explanation.strip(),
        })

    return {"topic": req.topic, "difficulty": req.difficulty, "questions": validated, "total": len(validated)}


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

    result = await ask_gemini_json(prompt, "You are an expert study-card author. Create specific, factually accurate cards. Return only valid JSON.")
    cards = result.get("cards") if isinstance(result, dict) else None
    if not isinstance(cards, list) or len(cards) < req.count:
        raise HTTPException(status_code=502, detail="The AI could not create enough flashcards. Please retry or choose another topic.")

    validated = []
    for card in cards[:req.count]:
        if (
            not isinstance(card, dict)
            or not isinstance(card.get("front"), str) or not card["front"].strip()
            or not isinstance(card.get("back"), str) or not card["back"].strip()
        ):
            raise HTTPException(status_code=502, detail="The AI returned an invalid flashcard. Please retry.")
        validated.append({"front": card["front"].strip(), "back": card["back"].strip()})

    return {"topic": req.topic, "cards": validated, "total": len(validated)}


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
    raise HTTPException(status_code=502, detail="The AI returned an invalid resume analysis. Please try again.")


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
    if isinstance(result, dict) and isinstance(result.get("plan"), list) and result["plan"]:
        return result
    raise HTTPException(status_code=502, detail="The AI could not create a valid study plan. Please retry.")


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
