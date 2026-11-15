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
  const [grades, setGrades] = useState<any[]>([])
  const [cgpaData, setCgpaData] = useState<{ cgpa: number; total_credits: number } | null>(null)
  const [attendanceStreak, setAttendanceStreak] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [showAddTimetable, setShowAddTimetable] = useState(false)
  const [showAddAssignment, setShowAddAssignment] = useState(false)
  const [showAddExam, setShowAddExam] = useState(false)
  const [showAddGrade, setShowAddGrade] = useState(false)
  const [newSubject, setNewSubject] = useState({ name: '', code: '', faculty: '', credits: 3 })
  const [newTimetable, setNewTimetable] = useState({ day_of_week: '0', subject_name: '', faculty: '', room: '', start_time: '09:00', end_time: '10:00' })
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', subject: '', due_date: '' })
  const [newExam, setNewExam] = useState({ subject: '', exam_type: 'Mid-Semester', date: '', syllabus: '' })
  const [newGrade, setNewGrade] = useState({ semester: '', subject: '', credits: '3', grade_point: '', grade: '' })
  const [actionError, setActionError] = useState('')
  const [attendanceInsight, setAttendanceInsight] = useState<string | null>(null)

  // Fetch all academic data
  const loadData = async () => {
    setLoading(true)
    try {
      const [subjRes, ttRes, assignRes, examRes, cgpaRes, gradeRes, streakRes] = await Promise.all([
        api.get('/academics/subjects'),
        api.get('/academics/timetable'),
        api.get('/academics/assignments'),
        api.get('/academics/exams'),
        api.get('/academics/cgpa').catch(() => ({ data: { cgpa: 0, total_credits: 0 } })),
        api.get('/academics/grades'),
        api.get('/academics/attendance/streak').catch(() => ({ data: { current_streak: 0 } })),
      ])
      setSubjects(subjRes.data || [])
      setTimetable(ttRes.data || [])
      setAssignments(assignRes.data || [])
      setExams(examRes.data || [])
      setCgpaData(cgpaRes.data)
      setGrades(gradeRes.data || [])
      setAttendanceStreak(Number(streakRes.data?.current_streak) || 0)
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
      const attendanceDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
      await api.post('/academics/attendance', { subject_id: subjectId, status, date: attendanceDate })
      await loadData()
    } catch (err) {
      console.error('Failed to mark attendance', err)
    }
  }

  // Add Subject
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.name.trim()) return
    try {
      await api.post('/academics/subjects', newSubject)
      setNewSubject({ name: '', code: '', faculty: '', credits: 3 })
      setShowAddSubject(false)
      await loadData()
    } catch (err) {
      console.error('Failed to add subject', err)
    }
  }


  const handleAddTimetable = async (event: React.FormEvent) => {
    event.preventDefault()
    setActionError('')
    try {
      await api.post('/academics/timetable', { ...newTimetable, day_of_week: Number(newTimetable.day_of_week) })
      setShowAddTimetable(false)
      setNewTimetable({ day_of_week: '0', subject_name: '', faculty: '', room: '', start_time: '09:00', end_time: '10:00' })
      await loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not save the timetable entry.')
    }
  }

  const handleAddAssignment = async (event: React.FormEvent) => {
    event.preventDefault()
    setActionError('')
    try {
      await api.post('/academics/assignments', newAssignment)
      setShowAddAssignment(false)
      setNewAssignment({ title: '', description: '', subject: '', due_date: '' })
      await loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not save the assignment.')
    }
  }

  const handleAddExam = async (event: React.FormEvent) => {
    event.preventDefault()
    setActionError('')
    try {
      await api.post('/academics/exams', newExam)
      setShowAddExam(false)
      setNewExam({ subject: '', exam_type: 'Mid-Semester', date: '', syllabus: '' })
      await loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not save the exam.')
    }
  }

  const handleAddGrade = async (event: React.FormEvent) => {
    event.preventDefault()
    setActionError('')
    try {
      await api.post('/academics/grades', {
        ...newGrade,
        semester: Number(newGrade.semester),
        credits: Number(newGrade.credits),
        grade_point: Number(newGrade.grade_point),
      })
      setShowAddGrade(false)
      setNewGrade({ semester: '', subject: '', credits: '3', grade_point: '', grade: '' })
      await loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not save the marks.')
    }
  }

  const handleAssignmentStatus = async (assignmentId: number, status: string) => {
    try {
      await api.put(`/academics/assignments/${assignmentId}/status?status=${encodeURIComponent(status)}`)
      await loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not update the assignment status.')
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
  const semesters = grades.map((grade) => Number(grade.semester)).filter((semester) => Number.isFinite(semester))
  const latestSemester = semesters.length ? Math.max(...semesters) : null
  const latestSemesterGrades = latestSemester == null ? [] : grades.filter((grade) => Number(grade.semester) === latestSemester)
  const latestSemesterCredits = latestSemesterGrades.reduce((sum, grade) => sum + (Number(grade.credits) || 0), 0)
  const latestSemesterPoints = latestSemesterGrades.reduce((sum, grade) => sum + (Number(grade.credits) || 0) * (Number(grade.grade_point) || 0), 0)
  const latestSgpa = latestSemesterCredits > 0 ? latestSemesterPoints / latestSemesterCredits : 0

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
            <button onClick={() => setShowAddSubject(true)} className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5">
              <Plus size={16} /> Add Subject
            </button>
          )}
          {tab === 'timetable' && (
            <button onClick={() => setShowAddTimetable(true)} className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5">
              <Plus size={16} /> Add Class
            </button>
          )}
          {tab === 'assignments' && (
            <button onClick={() => setShowAddAssignment(true)} className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5">
              <Plus size={16} /> Add Assignment
            </button>
          )}
          {tab === 'grades' && (
            <button onClick={() => setShowAddGrade(true)} className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5">
              <Plus size={16} /> Add Marks
            </button>
          )}
          {tab === 'exams' && (
            <button onClick={() => setShowAddExam(true)} className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5">
              <Plus size={16} /> Add Exam
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{actionError}</div>
      )}

      {showAddTimetable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-lg border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Add Timetable Class</h3>
              <button type="button" onClick={() => setShowAddTimetable(false)} className="text-dark-muted"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTimetable} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select value={newTimetable.day_of_week} onChange={(e) => setNewTimetable({ ...newTimetable, day_of_week: e.target.value })} className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white">
                {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
              <input required value={newTimetable.subject_name} onChange={(e) => setNewTimetable({ ...newTimetable, subject_name: e.target.value })} placeholder="Subject / class name" className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <input value={newTimetable.faculty} onChange={(e) => setNewTimetable({ ...newTimetable, faculty: e.target.value })} placeholder="Faculty (optional)" className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <input value={newTimetable.room} onChange={(e) => setNewTimetable({ ...newTimetable, room: e.target.value })} placeholder="Room (optional)" className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <label className="text-xs text-dark-muted">Start time<input required type="time" value={newTimetable.start_time} onChange={(e) => setNewTimetable({ ...newTimetable, start_time: e.target.value })} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" /></label>
              <label className="text-xs text-dark-muted">End time<input required type="time" value={newTimetable.end_time} onChange={(e) => setNewTimetable({ ...newTimetable, end_time: e.target.value })} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" /></label>
              <p className="sm:col-span-2 text-xs text-dark-muted">A weekly email reminder will be queued 15 minutes before this class.</p>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddTimetable(false)} className="px-4 py-2 text-sm text-dark-muted">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddAssignment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Add Assignment</h3>
              <button type="button" onClick={() => setShowAddAssignment(false)} className="text-dark-muted"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddAssignment} className="space-y-3">
              <input required value={newAssignment.title} onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })} placeholder="Assignment title" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <input required value={newAssignment.subject} onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })} placeholder="Subject" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <textarea value={newAssignment.description} onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })} placeholder="Description (optional)" rows={2} className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <label className="block text-xs text-dark-muted">Due date and time<input required type="datetime-local" value={newAssignment.due_date} onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" /></label>
              <p className="text-xs text-dark-muted">An email reminder will be queued one day before the deadline.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddAssignment(false)} className="px-4 py-2 text-sm text-dark-muted">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">Save Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Add Exam</h3>
              <button type="button" onClick={() => setShowAddExam(false)} className="text-dark-muted"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddExam} className="space-y-3">
              <input required value={newExam.subject} onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })} placeholder="Subject" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <select value={newExam.exam_type} onChange={(e) => setNewExam({ ...newExam, exam_type: e.target.value })} className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white">
                <option>Mid-Semester</option><option>End-Semester</option><option>Quiz</option><option>Practical</option><option>Viva</option><option>Other</option>
              </select>
              <label className="block text-xs text-dark-muted">Exam date and time<input required type="datetime-local" value={newExam.date} onChange={(e) => setNewExam({ ...newExam, date: e.target.value })} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" /></label>
              <textarea value={newExam.syllabus} onChange={(e) => setNewExam({ ...newExam, syllabus: e.target.value })} placeholder="Syllabus / notes (optional)" rows={3} className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <p className="text-xs text-dark-muted">An email reminder will be queued one day before the exam.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddExam(false)} className="px-4 py-2 text-sm text-dark-muted">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">Save Exam</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddGrade && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Add Marks / Grade</h3>
              <button type="button" onClick={() => setShowAddGrade(false)} className="text-dark-muted"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddGrade} className="space-y-3">
              <input required type="number" min="1" value={newGrade.semester} onChange={(e) => setNewGrade({ ...newGrade, semester: e.target.value })} placeholder="Semester number" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <input required value={newGrade.subject} onChange={(e) => setNewGrade({ ...newGrade, subject: e.target.value })} placeholder="Subject" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" min="1" value={newGrade.credits} onChange={(e) => setNewGrade({ ...newGrade, credits: e.target.value })} placeholder="Credits" className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
                <input required type="number" min="0" max="10" step="0.01" value={newGrade.grade_point} onChange={(e) => setNewGrade({ ...newGrade, grade_point: e.target.value })} placeholder="Grade point (0–10)" className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <input required value={newGrade.grade} onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })} placeholder="Letter grade (A, A+, O…)" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddGrade(false)} className="px-4 py-2 text-sm text-dark-muted">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">Save Marks</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {tab === 'attendance' && (
        <div className="space-y-6">
          <div className="glass rounded-xl p-4 flex items-center justify-between gap-3 border border-primary/20">
            <div>
              <p className="text-sm font-semibold">Daily attendance streak</p>
              <p className="text-xs text-dark-muted mt-1">Mark your classes present every day to keep the streak alive. An absent or missed day resets it.</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-primary">{attendanceStreak}</p>
              <p className="text-xs text-dark-muted">day{attendanceStreak === 1 ? '' : 's'}</p>
            </div>
          </div>
          {subjects.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center border border-dark-border">
              <BookOpen size={40} className="text-dark-muted mx-auto mb-3" />
              <p className="text-base font-semibold">No subjects added yet</p>
              <p className="text-xs text-dark-muted mt-1">Click <strong>Add Subject</strong> above to start tracking your attendance.</p>
            </div>
          ) : (
            <>
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
                          {total > 0 ? (
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${badgeColor}`}>
                              {pct}%
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-medium bg-dark-lighter text-dark-muted">
                              N/A
                            </div>
                          )}
                        </div>

                        <div className="w-full bg-dark-lighter rounded-full h-2 mb-2 overflow-hidden">
                          <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>

                        <div className="flex justify-between text-xs text-dark-muted mb-4">
                          <span>
                            {total > 0 ? `${attended} / ${total} classes attended` : 'No classes recorded yet'}
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
                  {totalClasses > 0 ? (
                    <>
                      <div className="text-right">
                        <p className="text-3xl font-extrabold text-primary">{overallPercentage}%</p>
                        <p className="text-xs text-dark-muted">{totalAttended} / {totalClasses} classes attended</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${overallPercentage >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {overallPercentage >= 75 ? 'Eligible' : 'At Risk'}
                      </div>
                    </>
                  ) : (
                    <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-dark-lighter text-dark-muted">
                      No attendance data yet
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Timetable Tab */}
      {tab === 'timetable' && (
        <div className="glass rounded-xl p-6 space-y-4">
          <p className="text-xs text-dark-muted">Classes you add here repeat weekly. StudentOS queues an email reminder 15 minutes before each class.</p>
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
                    [...entries].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map((e) => (
                      <div key={e.id} className="bg-dark-lighter rounded-xl p-3 border border-dark-border hover:border-primary/40 transition-all">
                        <p className="text-xs font-semibold text-white truncate">{e.subject_name}</p>
                        <p className="text-xs text-dark-muted flex items-center gap-1 mt-1">
                          <Clock size={11} /> {e.start_time?.slice(0, 5)} - {e.end_time?.slice(0, 5)}
                        </p>
                        {e.room && <p className="text-[11px] text-dark-muted mt-0.5">{e.room}</p>}
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
          {assignments.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center border border-dashed border-dark-border">
              <BookOpen size={38} className="text-dark-muted mx-auto mb-3" />
              <p className="font-semibold">No assignments yet</p>
              <p className="text-xs text-dark-muted mt-1">Add an assignment to track its due date and completion.</p>
              <button onClick={() => setShowAddAssignment(true)} className="mt-4 bg-primary text-white px-4 py-2 rounded-xl text-sm"><Plus size={14} className="inline mr-1" /> Add Assignment</button>
            </div>
          ) : assignments.map((a) => (
            <div key={a.id} className="glass rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-all">
              <div className="flex items-start gap-3.5">
                <div className={`mt-1 ${a.status === 'submitted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {a.status === 'submitted' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
                </div>
                <div>
                  <h4 className="font-semibold text-base">{a.title}</h4>
                  <p className="text-xs text-dark-muted mt-0.5">{a.subject} · Due: {a.due_date ? new Date(a.due_date).toLocaleString() : 'Not set'}</p>
                  {a.description && <p className="text-xs text-dark-muted mt-1.5">{a.description}</p>}
                </div>
              </div>
              {a.status === 'submitted' ? (
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Submitted</span>
              ) : (
                <button onClick={() => handleAssignmentStatus(a.id, 'submitted')} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25">Mark submitted</button>
              )}
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
              <p className="text-5xl font-extrabold gradient-text mt-2">{Number(cgpaData?.cgpa ?? 0).toFixed(2)}</p>
              <p className="text-xs text-dark-muted mt-2">{cgpaData?.total_credits ?? 0} total credits completed</p>
            </div>
            <div className="glass rounded-xl p-6 text-center border border-secondary/20">
              <p className="text-dark-muted text-sm font-medium">Latest Semester SGPA</p>
              <p className="text-5xl font-extrabold text-secondary mt-2">{latestSgpa.toFixed(2)}</p>
              <p className="text-xs text-dark-muted mt-2">{latestSemester == null ? 'No semester marks entered' : `Semester ${latestSemester}`}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-lg">Graded Coursework History</h3>
            <button onClick={() => setShowAddGrade(true)} className="text-xs bg-primary/15 text-primary px-3 py-2 rounded-lg"><Plus size={13} className="inline mr-1" /> Add Marks</button>
          </div>
          {grades.length === 0 ? (
            <div className="rounded-xl border border-dashed border-dark-border p-10 text-center">
              <p className="font-semibold">No marks entered yet</p>
              <p className="text-xs text-dark-muted mt-1">Add your subject-wise credits and grade points to calculate CGPA and semester SGPA.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {grades.map((grade) => (
                <div key={grade.id} className="flex items-center justify-between p-3.5 rounded-xl bg-dark-lighter border border-dark-border">
                  <div>
                    <span className="text-sm font-semibold">{grade.subject}</span>
                    <span className="text-xs text-dark-muted block mt-0.5">Semester {grade.semester} · Credits: {grade.credits}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400">{grade.grade || '—'}</span>
                    <span className="text-xs text-dark-muted block">{Number(grade.grade_point).toFixed(2)} GP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exams Tab */}
      {tab === 'exams' && (
        <div className="space-y-4">
          {exams.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center border border-dashed border-dark-border">
              <Calendar size={38} className="text-dark-muted mx-auto mb-3" />
              <p className="font-semibold">No exams added yet</p>
              <p className="text-xs text-dark-muted mt-1">Add your exam dates and syllabus to build your own exam schedule.</p>
              <button onClick={() => setShowAddExam(true)} className="mt-4 bg-primary text-white px-4 py-2 rounded-xl text-sm"><Plus size={14} className="inline mr-1" /> Add Exam</button>
            </div>
          ) : exams.map((e) => (
            <div key={e.id} className="glass rounded-xl p-5 flex items-center justify-between hover:border-primary/40 transition-all">
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
