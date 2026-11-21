import { useEffect, useState } from 'react'
import { AlertCircle, BookOpen, GraduationCap, Users } from 'lucide-react'
import { api } from '../services/api'

type MentoredStudent = {
  student_id: number
  name: string
  section?: string | null
  course?: string | null
  branch?: string | null
  college?: string | null
  passing_out_year?: number | null
  current_year?: number | null
  current_semester?: number | null
}

export default function MentorStudents() {
  const [students, setStudents] = useState<MentoredStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/campus/mentor/students')
      .then((response) => {
        if (active) setStudents(Array.isArray(response.data) ? response.data : [])
      })
      .catch((requestError: any) => {
        if (active) setError(requestError?.response?.data?.detail || 'Could not load your assigned students.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Mentor workspace</p>
        <h1 className="text-2xl font-bold">My Students</h1>
        <p className="text-sm text-dark-muted mt-1">
          View the students assigned to you and their current course progress details.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 border border-dark-border">
          <div className="flex items-center gap-2 text-sm text-dark-muted"><Users size={16} /> Assigned students</div>
          <p className="text-3xl font-bold mt-2">{loading ? '—' : students.length}</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-dark-border">
          <div className="flex items-center gap-2 text-sm text-dark-muted"><GraduationCap size={16} /> Workspace access</div>
          <p className="text-sm font-semibold mt-3">Mentoring and academic guidance</p>
          <p className="text-xs text-dark-muted mt-1">Student financial, placement and private academic scores are not shown here.</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertCircle size={17} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-10 border border-dark-border text-center text-sm text-dark-muted">Loading assigned students…</div>
      ) : students.length === 0 ? (
        <div className="glass rounded-2xl p-10 border border-dark-border text-center">
          <Users size={34} className="mx-auto text-dark-muted mb-3" />
          <h2 className="font-semibold">No students assigned yet</h2>
          <p className="text-sm text-dark-muted mt-2 max-w-md mx-auto">
            Your assigned students will appear here after an administrator links their student accounts to your mentor account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((student) => (
            <article key={student.student_id} className="glass rounded-2xl p-5 border border-dark-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                  {student.name?.slice(0, 1).toUpperCase() || 'S'}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{student.name}</h2>
                  <p className="text-xs text-dark-muted">{student.section || 'Section not provided'}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-dark-muted">
                  <BookOpen size={15} className="mt-0.5 shrink-0" />
                  <span>{[student.course, student.branch].filter(Boolean).join(' · ') || 'Course details not provided'}</span>
                </div>
                {student.college && <p className="text-xs text-dark-muted">{student.college}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {student.current_year != null && <span className="rounded-lg bg-dark-lighter border border-dark-border px-2.5 py-1 text-xs">{student.current_year}{student.current_year === 1 ? 'st' : student.current_year === 2 ? 'nd' : student.current_year === 3 ? 'rd' : 'th'} year</span>}
                  {student.current_semester != null && <span className="rounded-lg bg-dark-lighter border border-dark-border px-2.5 py-1 text-xs">Semester {student.current_semester}</span>}
                  {student.passing_out_year != null && <span className="rounded-lg bg-dark-lighter border border-dark-border px-2.5 py-1 text-xs">Batch {student.passing_out_year}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
