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

Password recovery and scheduled email reminders use the Resend HTTPS API.
Render Free blocks outbound SMTP traffic on ports 25, 465 and 587, so StudentOS
uses HTTPS instead. Create a Resend account, add and verify a sender domain,
and create a sending API key at [Resend API keys](https://resend.com/api-keys).

Set these private environment variables on the Render `studentos-backend`
service:

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | Your Resend API key (`re_...`) |
| `EMAIL_FROM` | A sender on your verified domain, e.g. `StudentOS <noreply@example.com>` |

Never commit the API key to Git. After saving the values, redeploy the backend.
Open **Smart Notifications → Email Reminders** and select **Send test email**
to verify delivery to the signed-in student's account email. The status endpoint
shows which values are missing. The Resend sender domain must be verified before
sending to arbitrary student email addresses; Resend's test sender is only for
limited testing.

**Reminder timing on Render Free:** the background reminder worker runs inside
the web service. Render Free services can spin down after 15 minutes without
incoming traffic and may restart at any time, so a reminder can be delivered late
when the service is asleep. Exact-time delivery needs an always-on service or an
external scheduler; the Free web service alone cannot guarantee it.

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
