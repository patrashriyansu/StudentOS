# StudentOS
**Live Website**: https://studentos-shriyansu.vercel.app/
**StudentOS** by Shriyansu Patra — All-in-One Student Operating System for Academic Tracking, Coding Practice, Placement Prep & Productivity.

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

## 🌐 React Web Frontend

The web application is in `frontend/` and is deployed at
https://studentos-shriyansu.vercel.app/.

```bash
cd frontend
npm ci
npm run dev
```

Quality checks:

```bash
npm test
npm run lint
npm run build
```

## 🔧 FastAPI Backend

The API is in `backend/`. All application endpoints use the `/api/v1` prefix.
Interactive API documentation is available at `/docs` when the backend is running.

Common endpoints:

- `POST /api/v1/auth/register` — Register
- `POST /api/v1/auth/login` — Login and issue JWT tokens
- `POST /api/v1/auth/refresh` — Refresh an expired access token
- `GET /api/v1/auth/me` — Current authenticated user
- `POST /api/v1/auth/send-otp` — Send email verification/recovery code
- `POST /api/v1/auth/reset-password` — Reset password using a recovery code
- `GET /api/v1/wellness/history` — Data-backed wellness history

Run the backend from the repository root:

```bash
python -m venv .venv
# Activate the virtual environment, then:
pip install -r backend/requirements-render.txt
cp backend/.env.example backend/.env
uvicorn backend.main:app --reload --port 8000
```

For local development, use `ENVIRONMENT=development` and a local database.
Production must use a persistent PostgreSQL `DATABASE_URL`, a unique
`SECRET_KEY` of at least 32 characters, and `ENVIRONMENT=production`.

### Password recovery email setup

Password recovery requires SMTP credentials in the backend environment:
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`,
`SMTP_FROM_EMAIL`, and `SMTP_STARTTLS`. Configure these as private environment
variables on the backend host; do not commit credentials to Git.

### CI

Pull requests run frontend contract tests, linting, a production build, and
backend regression tests through GitHub Actions. The legacy Google Cloud/Firebase
deployment workflow is manual-only; configure its credentials before running it.

---

## 🎨 Design System
- **Background**: #0A0A0F → #1A1A2E
- **Primary**: #6C63FF (Purple)
- **Secondary**: #A855F7 (Violet)
- **Accent**: #00D4FF (Cyan)
- **Font**: Outfit (Google Fonts)
- **Style**: Glassmorphism, frosted cards, gradient buttons
