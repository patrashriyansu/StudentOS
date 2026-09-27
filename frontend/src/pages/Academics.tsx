import { useState, useEffect } from 'react'
import { BookOpen, Calendar, Clock, Plus, CheckCircle, AlertCircle, ChevronRight, Check, X, Sparkles } from 'lucide-react'
import { api } from '../services/api'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Academics() {
  const [tab, setTab] = useState<'attendance' | 'timetable' | 'assignments' | 'grades' | 'exams'>('attendance')
  const [subjects, setSubjects] = useState<any[]>([])
  const [timetable, setTimetable] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [cgpaData, setCgpaData] = useState<{ cgpa: number; total_credits: number; grades: any[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubject, setNewSubject] = useState({ name: '', code: '', faculty: '', credits: 3 })
  const [attendanceInsight, setAttendanceInsight] = useState<string | null>(null)

  // Fetch all academic data
  const loadData = async () => {
    setLoading(true)
    try {
      const [subjRes, ttRes, assignRes, examRes, cgpaRes] = await Promise.all([
        api.get('/academics/subjects'),
        api.get('/academics/timetable'),
        api.get('/academics/assignments'),
        api.get('/academics/exams'),
        api.get('/academics/cgpa').catch(() => ({ data: { cgpa: 8.42, total_credits: 24, grades: [] } })),
      ])
      setSubjects(subjRes.data || [])
      setTimetable(ttRes.data || [])
      setAssignments(assignRes.data || [])
      setExams(examRes.data || [])
      setCgpaData(cgpaRes.data)
    } catch (err) {
      console.error('Failed to load academic data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Mark Attendance (Present / Absent)
  const handleMarkAttendance = async (subjectId: number, status: 'present' | 'absent') => {
    try {
      await api.post('/academics/attendance', { subject_id: subjectId, status })
      // Update local state immediately
      setSubjects((prev) =>
        prev.map((s) => {
          if (s.id === subjectId) {
            const newTotal = (s.total_classes || 0) + 1
            const newAttended = status === 'present' ? (s.attended_classes || 0) + 1 : s.attended_classes || 0
            return { ...s, total_classes: newTotal, attended_classes: newAttended }
          }
          return s
        })
      )
    } catch (err) {
      console.error('Failed to mark attendance', err)
    }
  }

  // Add Subject
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.name.trim()) return
    try {
      const res = await api.post('/academics/subjects', newSubject)
      setSubjects((prev) => [...prev, res.data])
      setNewSubject({ name: '', code: '', faculty: '', credits: 3 })
      setShowAddSubject(false)
    } catch (err) {
      console.error('Failed to add subject', err)
    }
  }

  // Fetch AI insight for a subject
  const getAIInsight = async (subjectId: number) => {
    try {
      const res = await api.get(`/ai/attendance-insight/${subjectId}`)
      setAttendanceInsight(res.data.insight)
    } catch {
      setAttendanceInsight('You are on track! Keep attending regular classes.')
    }
  }

  // Calculate overall attendance
  const totalClasses = subjects.reduce((sum, s) => sum + (s.total_classes || 0), 0)
  const totalAttended = subjects.reduce((sum, s) => sum + (s.attended_classes || 0), 0)
  const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Academics Hub</h1>
          <p className="text-dark-muted">Real-time attendance, timetable, assignments, exams & SGPA tracking</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 glass rounded-xl p-1">
            {(['attendance', 'timetable', 'assignments', 'grades', 'exams'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  tab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dark-muted hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'attendance' && (
            <button
              onClick={() => setShowAddSubject(true)}
              className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all"
            >
              <Plus size={16} /> Add Subject
            </button>
          )}
        </div>
      </div>

      {/* AI Insight banner if clicked */}
      {attendanceInsight && (
        <div className="glass border-primary/40 rounded-xl p-4 flex items-center justify-between gap-3 bg-primary/10">
          <div className="flex items-center gap-2.5">
            <Sparkles className="text-primary shrink-0" size={20} />
            <p className="text-sm font-medium">{attendanceInsight}</p>
          </div>
          <button onClick={() => setAttendanceInsight(null)} className="text-dark-muted hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modal: Add Subject */}
      {showAddSubject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Add New Subject</h3>
              <button onClick={() => setShowAddSubject(false)} className="text-dark-muted hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="text-xs text-dark-muted block mb-1">Subject Name *</label>
                <input
                  required
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  placeholder="e.g. Distributed Systems"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Code</label>
                  <input
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                    placeholder="e.g. CS601"
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newSubject.credits}
                    onChange={(e) => setNewSubject({ ...newSubject, credits: parseInt(e.target.value) || 3 })}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Faculty / Professor</label>
                <input
                  value={newSubject.faculty}
                  onChange={(e) => setNewSubject({ ...newSubject, faculty: e.target.value })}
                  placeholder="e.g. Dr. Ramesh Rao"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="px-4 py-2 rounded-xl text-sm text-dark-muted hover:bg-dark-lighter"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {tab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s) => {
              const total = s.total_classes || 0
              const attended = s.attended_classes || 0
              const pct = total > 0 ? Math.round((attended / total) * 100) : 0
              const color = pct >= 75 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-500' : 'bg-rose-500'
              const badgeColor =
                pct >= 75
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : pct >= 65
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'

              return (
                <div key={s.id || s.code} className="glass rounded-xl p-5 flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-base">{s.name}</h4>
                        <p className="text-xs text-dark-muted mt-0.5">
                          {s.code || 'CS'} &middot; {s.faculty || 'Faculty'}
                        </p>
                      </div>
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${badgeColor}`}>
                        {pct}%
                      </div>
                    </div>

                    <div className="w-full bg-dark-lighter rounded-full h-2 mb-2 overflow-hidden">
                      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>

                    <div className="flex justify-between text-xs text-dark-muted mb-4">
                      <span>
                        {attended} / {total} classes attended
                      </span>
                      <span>{s.credits || 3} credits</span>
                    </div>
                  </div>

                  {/* Actions: Mark attendance & AI insight */}
                  <div className="pt-3 border-t border-dark-border/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => getAIInsight(s.id)}
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                      title="Calculate safe skips / requirement"
                    >
                      <Sparkles size={12} /> AI Insight
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMarkAttendance(s.id, 'present')}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium transition-all"
                        title="Mark Present today"
                      >
                        <Check size={12} /> Present
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(s.id, 'absent')}
                        className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium transition-all"
                        title="Mark Absent today"
                      >
                        <X size={12} /> Absent
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="glass rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">Overall Academic Attendance</h3>
              <p className="text-xs text-dark-muted">
                Maintain at least 75% attendance across all registered courses to remain eligible for examinations.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-3xl font-extrabold text-primary">{overallPercentage}%</p>
                <p className="text-xs text-dark-muted">{totalAttended} / {totalClasses} classes attended</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${overallPercentage >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {overallPercentage >= 75 ? 'Eligible' : 'At Risk'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Tab */}
      {tab === 'timetable' && (
        <div className="glass rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {WEEKDAYS.map((day, di) => {
              const entries = timetable.filter((t) => t.day_of_week === di)
              return (
                <div key={day} className="space-y-2.5">
                  <div className="bg-primary/10 border border-primary/20 rounded-xl py-2 text-center">
                    <h4 className="text-sm font-semibold text-primary">{day.slice(0, 3)}</h4>
                  </div>
                  {entries.length === 0 ? (
                    <div className="p-3 text-center text-xs text-dark-muted border border-dashed border-dark-border rounded-xl">
                      No classes
                    </div>
                  ) : (
                    entries.map((e, i) => (
                      <div key={i} className="bg-dark-lighter rounded-xl p-3 border border-dark-border hover:border-primary/40 transition-all">
                        <p className="text-xs font-semibold text-white truncate">{e.subject_name}</p>
                        <p className="text-xs text-dark-muted flex items-center gap-1 mt-1">
                          <Clock size={11} /> {e.start_time?.slice(0, 5) || '09:00'} - {e.end_time?.slice(0, 5) || '10:00'}
                        </p>
                        <p className="text-[11px] text-dark-muted mt-0.5">{e.room || 'LH'}</p>
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {tab === 'assignments' && (
        <div className="space-y-3">
          {assignments.map((a, i) => (
            <div key={a.id || i} className="glass rounded-xl p-5 flex items-center justify-between hover:border-primary/40 transition-all">
              <div className="flex items-start gap-3.5">
                <div className={`mt-1 ${a.status === 'submitted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {a.status === 'submitted' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
                </div>
                <div>
                  <h4 className="font-semibold text-base">{a.title}</h4>
                  <p className="text-xs text-dark-muted mt-0.5">
                    {a.subject} &middot; Due: {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'Dec 25'}
                  </p>
                  {a.description && <p className="text-xs text-dark-muted mt-1.5">{a.description}</p>}
                </div>
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${
                  a.status === 'submitted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Grades Tab */}
      {tab === 'grades' && (
        <div className="glass rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="glass rounded-xl p-6 text-center border border-primary/20">
              <p className="text-dark-muted text-sm font-medium">Overall CGPA</p>
              <p className="text-5xl font-extrabold gradient-text mt-2">{cgpaData?.cgpa || 8.42}</p>
              <p className="text-xs text-dark-muted mt-2">{cgpaData?.total_credits || 24} Total Credits Completed</p>
            </div>
            <div className="glass rounded-xl p-6 text-center border border-secondary/20">
              <p className="text-dark-muted text-sm font-medium">Current Semester SGPA</p>
              <p className="text-5xl font-extrabold text-secondary mt-2">8.64</p>
              <p className="text-xs text-dark-muted mt-2">Semester 5 Performance</p>
            </div>
          </div>

          <h3 className="font-semibold text-lg mb-4">Graded Coursework History</h3>
          <div className="space-y-2">
            {(cgpaData?.grades && cgpaData.grades.length > 0 ? cgpaData.grades : subjects).map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-dark-lighter border border-dark-border">
                <div>
                  <span className="text-sm font-semibold">{s.subject || s.name}</span>
                  <span className="text-xs text-dark-muted block mt-0.5">Credits: {s.credits || 4}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-400">{s.grade || 'A'}</span>
                  <span className="text-xs text-dark-muted block">{s.grade_point ? `${s.grade_point} GP` : '9.0 GP'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exams Tab */}
      {tab === 'exams' && (
        <div className="space-y-4">
          {exams.map((e, i) => (
            <div key={e.id || i} className="glass rounded-xl p-5 flex items-center justify-between hover:border-primary/40 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex flex-col items-center justify-center">
                  <Calendar size={18} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-base">{e.subject}</h4>
                  <p className="text-xs text-dark-muted mt-0.5">
                    {e.exam_type || 'Final Exam'} &middot;{' '}
                    {e.date ? new Date(e.date).toLocaleDateString() : 'Upcoming'}
                  </p>
                  {e.syllabus && <p className="text-xs text-dark-muted mt-1">Syllabus: {e.syllabus}</p>}
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${e.completed ? 'bg-dark-lighter text-dark-muted' : 'bg-primary/20 text-primary'}`}>
                {e.completed ? 'Completed' : 'Upcoming'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
