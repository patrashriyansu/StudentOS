import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
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

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
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
      </Route>
    </Routes>
  )
}
