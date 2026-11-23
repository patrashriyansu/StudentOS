import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useAuth } from './hooks/useAuth'
import { AppDispatch } from './store'
import { initializeAuth, logout } from './store/slices/authSlice'
import { api } from './services/api'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import AuthCallback from './pages/AuthCallback'
import RoleDashboard from './pages/RoleDashboard'
import Academics from './pages/Academics'
import Coding from './pages/Coding'
import Placements from './pages/Placements'
import AIAssistant from './pages/AIAssistant'
import Wellness from './pages/Wellness'
import Profile from './pages/Profile'
import Analytics from './pages/Analytics'
import Community from './pages/Community'
import Productivity from './pages/Productivity'
import StudyHub from './pages/StudyHub'
import Expenses from './pages/Expenses'
import Notifications from './pages/Notifications'
import Projects from './pages/Projects'
import Campus from './pages/Campus'
import Settings from './pages/Settings'
import { AdminWorkspace, FacultyWorkspace, RecruiterWorkspace, StudentClassroom, StudentMentoring, MentorWorkspace } from './pages/RoleWorkspaces'

function RootRoute() {
  const { isAuthenticated, initialized } = useAuth()
  const location = useLocation()

  // Record an active day on every authenticated StudentOS visit, not only
  // when the user opens the dashboard. The API is idempotent per IST date.
  useEffect(() => {
    if (!initialized || !isAuthenticated) return
    api.post('/users/ping').catch(() => {
      // A temporary activity endpoint failure must not block navigation.
    })
  }, [initialized, isAuthenticated, location.pathname])

  if (!initialized) {
    return <div className="min-h-screen bg-dark flex items-center justify-center text-dark-muted">Loading StudentOS...</div>
  }

  if (!isAuthenticated) {
    return location.pathname === '/' ? <Landing /> : <Navigate to="/login" replace />
  }

  return <Layout />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized } = useAuth()
  if (!initialized) return <div className="min-h-screen bg-dark flex items-center justify-center text-dark-muted">Checking session...</div>
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RoleRoute({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const { user, initialized } = useAuth()
  if (!initialized) return <div className="min-h-screen bg-dark flex items-center justify-center text-dark-muted">Checking permissions...</div>
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const studentOnly = ['student']
const mentorOnly = ['mentor']
const recruiterOnly = ['recruiter']
const facultyOnly = ['faculty']
const adminOnly = ['admin']

export default function App() {
  const dispatch = useDispatch<AppDispatch>()
  const location = useLocation()

  useEffect(() => {
    dispatch(initializeAuth())
    const handleAuthExpired = () => dispatch(logout())
    window.addEventListener('studentos:auth-expired', handleAuthExpired)
    return () => window.removeEventListener('studentos:auth-expired', handleAuthExpired)
  }, [dispatch])

  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (robots) robots.content = location.pathname === '/' ? 'index, follow' : 'noindex, nofollow'
    const noIndexPaths = ['/login', '/register', '/forgot-password', '/auth/callback']

    if (location.pathname === '/') {
      document.title = 'StudentOS | Your Student Academic, Coding & Career Workspace'
    } else if (noIndexPaths.includes(location.pathname)) {
      const pageName = location.pathname === '/login' ? 'Sign in'
        : location.pathname === '/register' ? 'Create account'
          : location.pathname === '/forgot-password' ? 'Reset password' : 'Authentication'
      document.title = 'StudentOS | ' + pageName
    }
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<RootRoute />}>
        <Route index element={<RoleDashboard />} />
        <Route path="dashboard" element={<RoleDashboard />} />
        <Route path="academics" element={<RoleRoute allowedRoles={studentOnly}><Academics /></RoleRoute>} />
        <Route path="study" element={<RoleRoute allowedRoles={studentOnly}><StudyHub /></RoleRoute>} />
        <Route path="coding" element={<RoleRoute allowedRoles={studentOnly}><Coding /></RoleRoute>} />
        <Route path="placements" element={<RoleRoute allowedRoles={studentOnly}><Placements /></RoleRoute>} />
        <Route path="ai" element={<AIAssistant />} />
        <Route path="wellness" element={<RoleRoute allowedRoles={studentOnly}><Wellness /></RoleRoute>} />
        <Route path="profile" element={<Profile />} />
        <Route path="analytics" element={<RoleRoute allowedRoles={studentOnly}><Analytics /></RoleRoute>} />
        <Route path="community" element={<RoleRoute allowedRoles={studentOnly}><Community /></RoleRoute>} />
        <Route path="productivity" element={<RoleRoute allowedRoles={studentOnly}><Productivity /></RoleRoute>} />
        <Route path="expenses" element={<RoleRoute allowedRoles={studentOnly}><Expenses /></RoleRoute>} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="projects" element={<RoleRoute allowedRoles={studentOnly}><Projects /></RoleRoute>} />
        <Route path="campus" element={<RoleRoute allowedRoles={studentOnly}><Campus /></RoleRoute>} />
        <Route path="classroom" element={<RoleRoute allowedRoles={studentOnly}><StudentClassroom /></RoleRoute>} />
        <Route path="mentoring" element={<RoleRoute allowedRoles={studentOnly}><StudentMentoring /></RoleRoute>} />
        <Route path="settings" element={<Settings />} />
        <Route path="mentor/students" element={<RoleRoute allowedRoles={mentorOnly}><MentorWorkspace /></RoleRoute>} />
        <Route path="mentor/requests" element={<RoleRoute allowedRoles={mentorOnly}><MentorWorkspace /></RoleRoute>} />
        <Route path="mentor/programmes" element={<RoleRoute allowedRoles={mentorOnly}><MentorWorkspace /></RoleRoute>} />
        <Route path="mentor/sessions" element={<RoleRoute allowedRoles={mentorOnly}><MentorWorkspace /></RoleRoute>} />
        <Route path="mentor/goals" element={<RoleRoute allowedRoles={mentorOnly}><MentorWorkspace /></RoleRoute>} />
        <Route path="mentor/actions" element={<RoleRoute allowedRoles={mentorOnly}><MentorWorkspace /></RoleRoute>} />
        <Route path="mentor/check-ins" element={<RoleRoute allowedRoles={mentorOnly}><MentorWorkspace /></RoleRoute>} />
        <Route path="mentor/notes" element={<RoleRoute allowedRoles={mentorOnly}><MentorWorkspace /></RoleRoute>} />
        <Route path="mentor/messages" element={<RoleRoute allowedRoles={mentorOnly}><MentorWorkspace /></RoleRoute>} />
        <Route path="recruiter/candidates" element={<RoleRoute allowedRoles={recruiterOnly}><RecruiterWorkspace /></RoleRoute>} />
        <Route path="recruiter/shortlisted" element={<RoleRoute allowedRoles={recruiterOnly}><RecruiterWorkspace /></RoleRoute>} />
        <Route path="recruiter/jobs" element={<RoleRoute allowedRoles={recruiterOnly}><RecruiterWorkspace /></RoleRoute>} />
        <Route path="recruiter/applications" element={<RoleRoute allowedRoles={recruiterOnly}><RecruiterWorkspace /></RoleRoute>} />
        <Route path="faculty/classes" element={<RoleRoute allowedRoles={facultyOnly}><FacultyWorkspace /></RoleRoute>} />
        <Route path="faculty/students" element={<RoleRoute allowedRoles={facultyOnly}><FacultyWorkspace /></RoleRoute>} />
        <Route path="faculty/attendance" element={<RoleRoute allowedRoles={facultyOnly}><FacultyWorkspace /></RoleRoute>} />
        <Route path="faculty/assignments" element={<RoleRoute allowedRoles={facultyOnly}><FacultyWorkspace /></RoleRoute>} />
        <Route path="faculty/marks" element={<RoleRoute allowedRoles={facultyOnly}><FacultyWorkspace /></RoleRoute>} />
        <Route path="faculty/timetable" element={<RoleRoute allowedRoles={facultyOnly}><FacultyWorkspace /></RoleRoute>} />
        <Route path="faculty/notices" element={<RoleRoute allowedRoles={facultyOnly}><FacultyWorkspace /></RoleRoute>} />
        <Route path="faculty/materials" element={<RoleRoute allowedRoles={facultyOnly}><FacultyWorkspace /></RoleRoute>} />
        <Route path="admin/students" element={<RoleRoute allowedRoles={adminOnly}><AdminWorkspace /></RoleRoute>} />
        <Route path="admin/staff" element={<RoleRoute allowedRoles={adminOnly}><AdminWorkspace /></RoleRoute>} />
        <Route path="admin/classes" element={<RoleRoute allowedRoles={adminOnly}><AdminWorkspace /></RoleRoute>} />
        <Route path="admin/mentors" element={<RoleRoute allowedRoles={adminOnly}><AdminWorkspace /></RoleRoute>} />
      </Route>
    </Routes>
  )
}
