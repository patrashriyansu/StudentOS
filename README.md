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
| Chatbot | AI-powered chat, summaries, quizzes and flashcards |
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

### GitHub and Microsoft sign-in

The web login supports password sign-in, Google, GitHub, and Microsoft. GitHub
and Microsoft require provider OAuth applications; their buttons stay disabled
until both client ID and client secret are configured on the Render
`studentos-backend` service.

Register these exact callback URLs in the provider consoles:

- GitHub OAuth App callback: `https://studentos-backend-a58j.onrender.com/api/v1/auth/github/callback`
- Microsoft Entra ID Web redirect URI: `https://studentos-backend-a58j.onrender.com/api/v1/auth/microsoft/callback`

For GitHub, grant the `read:user` and `user:email` scopes. For Microsoft,
create a confidential Web app and allow the OpenID Connect / Microsoft Graph
`User.Read` sign-in scopes. Use `common` as the tenant for personal and work
or school Microsoft accounts, or set `MICROSOFT_TENANT_ID` to a tenant ID if
the app should be single-tenant.

Set the provider secrets as private Render environment variables:
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, and
`MICROSOFT_CLIENT_SECRET`. The optional `MICROSOFT_TENANT_ID` defaults to
`common`. Never commit client secrets to Git. After saving these values,
redeploy the backend; the login page reads provider readiness from
`GET /api/v1/auth/providers`.

### Email delivery and scheduled reminders

Password recovery and scheduled email reminders use the same backend SMTP
configuration. Set these as private environment variables on the backend host:

| Variable | Gmail SMTP example |
| --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | Your sending Gmail address |
| `SMTP_PASSWORD` | A Google App Password |
| `SMTP_FROM_EMAIL` | Your verified sending address |
| `SMTP_STARTTLS` | `true` |

On Render, open the `studentos-backend` service, choose **Environment**, add
the variables above, save, and redeploy the backend. For Gmail, enable
2-Step Verification and create an [App Password](https://myaccount.google.com/apppasswords);
do not use your normal Google password. Never commit SMTP credentials to Git.

After deployment, open **Smart Notifications → Email Reminders** and select
**Send test email**. The status endpoint reports which required variables are
missing, and the test action verifies that the SMTP server can authenticate and
send to the signed-in student's account email. Reminders saved before SMTP is
configured remain queued and are processed by the backend worker after delivery
is enabled.

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
