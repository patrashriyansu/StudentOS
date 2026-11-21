import { useAuth } from '../hooks/useAuth'
import Dashboard from './Dashboard'
import MentorStudents from './MentorStudents'
import RecruiterCandidates from './RecruiterCandidates'

export default function RoleDashboard() {
  const { user } = useAuth()

  if (user?.role === 'mentor') return <MentorStudents />
  if (user?.role === 'recruiter') return <RecruiterCandidates />
  return <Dashboard />
}
