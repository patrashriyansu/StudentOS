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
import Dashboard from './pages/Dashboard'
import Academics from './pages/Academics'
import Coding from './pages/Coding'
import Placements from './pages/Placements'
import AIAssistant from './pages/AIAssistant'
import Wellness from './pages/Wellness'
import Profile from './pages/Profile'
import Analytics from './pages/Analytics'
import Community from './pages/Community'
import Productivity from './pages/Productivity'
import Expenses from './pages/Expenses'
import Notifications from './pages/Notifications'
import Projects from './pages/Projects'
import Campus from './pages/Campus'
import Settings from './pages/Settings'

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
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="academics" element={<Academics />} />
        <Route path="coding" element={<Coding />} />
        <Route path="placements" element={<Placements />} />
        <Route path="ai" element={<AIAssistant />} />
        <Route path="wellness" element={<Wellness />} />
        <Route path="profile" element={<Profile />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="community" element={<Community />} />
        <Route path="productivity" element={<Productivity />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="projects" element={<Projects />} />
        <Route path="campus" element={<Campus />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
