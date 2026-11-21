import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'
import Dashboard from './Dashboard'
import MentorStudents from './MentorStudents'
import RecruiterCandidates from './RecruiterCandidates'

function StudentDashboard() {
  const navigate = useNavigate()
  const [profileIncomplete, setProfileIncomplete] = useState(false)

  useEffect(() => {
    let active = true
    api.get('/campus/academic-profile')
      .then((response) => {
        if (active) setProfileIncomplete(response.data?.complete !== true)
      })
      .catch(() => {
        // Keep the existing dashboard available during a temporary API outage.
      })
    return () => { active = false }
  }, [])

  return (
    <>
      {profileIncomplete && (
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-full mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left flex items-center gap-3 hover:bg-primary/10 transition-colors"
        >
          <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <AlertCircle size={19} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-white">Complete your academic profile</span>
            <span className="block text-xs text-dark-muted mt-1">Add your course, branch, passing-out year, current year and semester. Enter CGPA/SGPA when available.</span>
          </span>
          <ArrowRight size={18} className="text-primary shrink-0" />
        </button>
      )}
      <Dashboard />
    </>
  )
}

export default function RoleDashboard() {
  const { user } = useAuth()

  if (user?.role === 'mentor') return <MentorStudents />
  if (user?.role === 'recruiter') return <RecruiterCandidates />
  if (user?.role === 'student') return <StudentDashboard />
  return <Dashboard />
}
