# StudentOS

> **Your Academic Superpower** — A comprehensive mobile app for students.

---

## 📱 Flutter Frontend

### Screens (55+ completed)

| Hub | Screens |
|-----|---------|
| Auth | Splash, Login, Signup, Onboarding |
| Dashboard | Main Dashboard, Hero Twin Card |
| Study Hub | Hub Home, Notes, PDF Scanner, AI Summarizer, Quiz Generator, Flashcards |
| Academic Hub | Hub Home, Attendance, SGPA Calculator, CGPA Predictor, Exam Planner, Timetable |
| Coding Hub | Hub Home, LeetCode Tracker, Daily Challenges, DSA Roadmap, Contest Tracker |
| Placement Hub | Hub Home, Resume Analyzer, Mock Interview, ATS Score, Internship Finder |
| Wellness Hub | Hub Home, Mood Tracker, Sleep Tracker, Water Tracker, Meditation |
| Finance Hub | Hub Home, Expense Tracker, Budget Planner, Savings Predictor |
| AI | AI Copilot (chat) |
| Misc | Notifications, Profile, Digital Twin |

### Tech Stack
- Flutter + Dart
- Riverpod (state management)
- GoRouter (navigation)
- Google Fonts (Outfit)
- FL Chart

### Run Flutter App
```bash
cd StudentOS
flutter pub get
flutter run
```

---

## 🔧 FastAPI Backend

### Endpoints
- `POST /auth/register` — Register
- `POST /auth/login` — Login (JWT)
- `GET /auth/me` — Current user
- `GET /attendance/` — Get subjects
- `POST /attendance/` — Add/update subject
- `PUT /attendance/{subject}` — Mark attend/miss
- `GET /attendance/predict/{subject}` — AI prediction
- `GET /notes/` — All notes
- `POST /notes/` — Create note
- `POST /notes/{id}/summarize` — AI summarize
- `POST /notes/{id}/quiz` — AI quiz generation

### Run Backend
```bash
cd StudentOS/backend
pip install -r requirements.txt
cp .env.example .env   # Fill in your keys
uvicorn app.main:app --reload --port 8000
```

---

## 🎨 Design System
- **Background**: #0A0A0F → #1A1A2E
- **Primary**: #6C63FF (Purple)
- **Secondary**: #A855F7 (Violet)
- **Accent**: #00D4FF (Cyan)
- **Font**: Outfit (Google Fonts)
- **Style**: Glassmorphism, frosted cards, gradient buttons
