import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Award, BookOpen, CheckCircle2, ClipboardCheck, Loader2, Megaphone, RefreshCw, Search, Users } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'

type Student = {
  id?: number; student_id?: number; rank?: number; name: string; email?: string
  registration_number?: string | null; section?: string | null; leetcode_username?: string | null
  total_problems_solved?: number; total_solved?: number; easy_solved?: number; medium_solved?: number; hard_solved?: number
  last_login?: string | null
}
type Notice = { id: number; title: string; message: string; audience_type: string; section?: string | null; priority: string; read: boolean; created_at: string }
type Subject = { id: number; name: string; code?: string | null; section: string }
type AttendanceRow = { student_id: number; name: string; registration_number?: string | null; section?: string | null; total_classes: number; present: number; absent: number; percentage: number }

const tabs = [
  { id: 'leaderboard', label: 'Coding rankings', icon: Award },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'notices', label: 'Notice board', icon: Megaphone },
  { id: 'profile', label: 'My details', icon: BookOpen },
] as const

export default function Campus() {
  const { user } = useAuth()
  const isFaculty = user?.role === 'faculty' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('leaderboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [leaderboard, setLeaderboard] = useState<Student[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([])
  const [myAttendance, setMyAttendance] = useState<{ section?: string; subjects?: any[] } | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [profile, setProfile] = useState({ registration_number: '', section: '' })
  const [profileMessage, setProfileMessage] = useState('')
  const [noticeForm, setNoticeForm] = useState({ title: '', message: '', audience_type: 'all', section: '', priority: 'normal' })
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', section: '' })
  const [facultyEmail, setFacultyEmail] = useState('')
  const [sessionSubject, setSessionSubject] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [marks, setMarks] = useState<Record<number, 'present' | 'absent'>>({})

  const load = async () => {
    setLoading(true)
    setError('')
    const requests: Promise<any>[] = [
      api.get('/campus/leaderboard'),
      api.get('/campus/notices'),
      api.get('/campus/profile'),
      api.get('/campus/attendance'),
    ]
    if (isFaculty) requests.push(api.get('/campus/students'), api.get('/campus/subjects'))
    const results = await Promise.allSettled(requests)
    const dataAt = (index: number) => results[index]?.status === 'fulfilled' ? results[index].value.data : null
    if (dataAt(0)) setLeaderboard(dataAt(0).students || [])
    if (dataAt(1)) setNotices(dataAt(1))
    if (dataAt(2)) setProfile({ registration_number: dataAt(2).registration_number || '', section: dataAt(2).section || '' })
    if (dataAt(3)) {
      if (isFaculty) setAttendanceRows(dataAt(3))
      else setMyAttendance(dataAt(3))
    }
    if (isFaculty) {
      if (dataAt(4)) setStudents(dataAt(4))
      if (dataAt(5)) setSubjects(dataAt(5))
    }
    if (results.some((item) => item.status === 'rejected')) setError('Some campus data could not be loaded. Confirm your account role and that the latest backend deployment is live.')
    setLoading(false)
  }

  useEffect(() => { void load() }, [isFaculty])

  const sections = useMemo(
    () => Array.from(new Set([...students.map((s) => s.section), ...leaderboard.map((s) => s.section)].filter(Boolean))) as string[],
    [students, leaderboard],
  )
  const matches = (student: Student) => {
    const text = search.toLowerCase()
    return (!sectionFilter || student.section === sectionFilter) &&
      (!text || [student.name, student.email || '', student.registration_number || '', student.leetcode_username || ''].some((value) => value.toLowerCase().includes(text)))
  }
  const visibleLeaderboard = leaderboard.filter(matches)
  const visibleStudents = students.filter(matches)

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setProfileMessage(''); setError('')
    try {
      await api.put('/campus/profile', profile)
      setProfileMessage('Registration number and section saved.')
      await load()
    } catch (e: any) { setProfileMessage(e?.response?.data?.detail || 'Could not save your details.') }
    finally { setSaving(false) }
  }

  const publishNotice = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      await api.post('/campus/notices', noticeForm)
      setNoticeForm({ title: '', message: '', audience_type: 'all', section: '', priority: 'normal' })
      await load()
    } catch (e: any) { setError(e?.response?.data?.detail || 'Could not publish notice.') }
    finally { setSaving(false) }
  }

  const addSubject = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const result = await api.post('/campus/subjects', subjectForm)
      setSubjects((previous) => [...previous, result.data])
      setSubjectForm({ name: '', code: '', section: '' })
    } catch (e: any) { setError(e?.response?.data?.detail || 'Could not add the class.') }
    finally { setSaving(false) }
  }

  const createSession = async () => {
    if (!sessionSubject) return
    setSaving(true); setError('')
    try {
      const result = await api.post(`/campus/subjects/${sessionSubject}/sessions`, { session_date: sessionDate })
      setSessionId(result.data.id)
      const section = subjects.find((subject) => subject.id === Number(sessionSubject))?.section
      setMarks(Object.fromEntries(students.filter((student) => student.section === section && student.id).map((student) => [student.id!, 'present'])))
    } catch (e: any) { setError(e?.response?.data?.detail || 'Could not create the attendance session.') }
    finally { setSaving(false) }
  }

  const saveAttendance = async () => {
    if (!sessionId) return
    setSaving(true); setError('')
    try {
      const records = Object.entries(marks).map(([student_id, status]) => ({ student_id: Number(student_id), status }))
      await api.post(`/campus/sessions/${sessionId}/attendance`, { records })
      setSessionId(null)
      await load()
    } catch (e: any) { setError(e?.response?.data?.detail || 'Could not save attendance.') }
    finally { setSaving(false) }
  }

  const markNoticeRead = async (notice: Notice) => {
    if (isFaculty || notice.read) return
    try {
      await api.post(`/campus/notices/${notice.id}/read`)
      setNotices((previous) => previous.map((item) => item.id === notice.id ? { ...item, read: true } : item))
    } catch { setError('Could not update the notice read status.') }
  }

  const grantFaculty = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(''); setProfileMessage('')
    try {
      await api.post('/campus/faculty', { email: facultyEmail })
      setFacultyEmail('')
      setProfileMessage('Faculty access granted.')
    } catch (e: any) { setError(e?.response?.data?.detail || 'Could not grant faculty access.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-dark-muted"><Loader2 className="animate-spin mr-2" size={18}/>Loading campus workspace…</div>

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-primary"/>{isFaculty ? 'Faculty Campus Portal' : 'Campus Portal'}</h1>
          <p className="text-sm text-dark-muted mt-1">{isFaculty ? 'Manage student coding, attendance and section announcements.' : 'College coding rankings, your attendance and college notices.'}</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-dark-border px-3 py-2 text-sm"><RefreshCw size={14}/>Refresh data</button>
      </header>
      {error && <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{error}</div>}
      <nav className="flex flex-wrap gap-2">
        {tabs.filter((item) => isFaculty || item.id !== 'students').map(({ id, label, icon: Icon }) =>
          <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${tab === id ? 'bg-primary text-white' : 'glass border border-dark-border text-dark-muted'}`}><Icon size={15}/>{label}</button>
        )}
      </nav>

      {tab === 'leaderboard' && <section className="glass border border-dark-border rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div><h2 className="font-semibold flex items-center gap-2"><Award size={18} className="text-amber-400"/>College Coding Leaderboard</h2><p className="text-xs text-dark-muted mt-1">Verified LeetCode solved counts, sorted highest first.</p></div>
          <div className="flex gap-2 flex-wrap"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student" className="bg-dark-lighter border border-dark-border rounded-lg pl-8 pr-3 py-2 text-sm"/></div><select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"><option value="">All sections</option>{sections.map((section) => <option key={section}>{section}</option>)}</select></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-dark-muted text-left"><tr><th className="p-2">Rank</th><th className="p-2">Student</th><th className="p-2">Reg. No.</th><th className="p-2">Section</th><th className="p-2 text-right">Solved</th><th className="p-2 text-right">Easy</th><th className="p-2 text-right">Medium</th><th className="p-2 text-right">Hard</th></tr></thead><tbody>{visibleLeaderboard.map((student, index) => <tr key={student.student_id ?? student.id ?? index} className="border-t border-dark-border/70"><td className="p-2 font-semibold">{student.rank ?? index + 1}</td><td className="p-2">{student.name}</td><td className="p-2">{student.registration_number || 'Not added'}</td><td className="p-2">{student.section || '—'}</td><td className="p-2 text-right font-bold">{student.total_solved ?? student.total_problems_solved ?? 0}</td><td className="p-2 text-right">{student.easy_solved || 0}</td><td className="p-2 text-right">{student.medium_solved || 0}</td><td className="p-2 text-right">{student.hard_solved || 0}</td></tr>)}</tbody></table></div>
        {visibleLeaderboard.length === 0 && <p className="text-sm text-dark-muted text-center py-6">No students yet. Students appear here after registering; coding totals update when they sync LeetCode.</p>}
      </section>}

      {tab === 'students' && isFaculty && <section className="glass border border-dark-border rounded-2xl p-4 sm:p-5 space-y-4">
        <div><h2 className="font-semibold">All student accounts</h2><p className="text-xs text-dark-muted mt-1">{visibleStudents.length} students shown.</p></div>
        <div className="flex flex-wrap gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or registration number" className="flex-1 min-w-[220px] bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"/><select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"><option value="">All sections</option>{sections.map((section) => <option key={section}>{section}</option>)}</select></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-dark-muted"><tr><th className="p-2">Student</th><th className="p-2">Registration No.</th><th className="p-2">Section</th><th className="p-2">LeetCode</th><th className="p-2 text-right">Solved</th><th className="p-2">Last login</th></tr></thead><tbody>{visibleStudents.map((student) => <tr key={student.id} className="border-t border-dark-border/70"><td className="p-2">{student.name}<div className="text-xs text-dark-muted">{student.email}</div></td><td className="p-2">{student.registration_number || 'Pending'}</td><td className="p-2">{student.section || 'Pending'}</td><td className="p-2">{student.leetcode_username || 'Not connected'}</td><td className="p-2 text-right font-semibold">{student.total_problems_solved || 0}</td><td className="p-2 text-xs">{student.last_login ? new Date(student.last_login).toLocaleString() : 'Never'}</td></tr>)}</tbody></table></div>
      </section>}

      {tab === 'attendance' && <section className="glass border border-dark-border rounded-2xl p-4 sm:p-5 space-y-5">
        <div><h2 className="font-semibold flex items-center gap-2"><ClipboardCheck size={18}/>{isFaculty ? 'Faculty attendance register' : 'My attendance'}</h2><p className="text-xs text-dark-muted mt-1">{isFaculty ? 'Create class sessions and mark every registered student in the class section.' : `Attendance summary for section ${myAttendance?.section || profile.section || '—'}.`}</p></div>
        {isFaculty ? <>
          <form onSubmit={addSubject} className="grid md:grid-cols-4 gap-2"><input required value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="Subject name" className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"/><input value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} placeholder="Subject code" className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"/><input required value={subjectForm.section} onChange={(e) => setSubjectForm({ ...subjectForm, section: e.target.value })} placeholder="Section e.g. CSE-A" className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"/><button disabled={saving} className="bg-primary rounded-lg px-3 py-2 text-sm text-white">Add class</button></form>
          <div className="grid sm:grid-cols-3 gap-2"><select value={sessionSubject} onChange={(e) => { setSessionSubject(e.target.value); setSessionId(null) }} className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"><option value="">Select subject</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name} · {subject.section}</option>)}</select><input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"/><button onClick={createSession} disabled={!sessionSubject || saving} className="bg-primary rounded-lg px-3 py-2 text-sm text-white">Create attendance session</button></div>
          {sessionId && <div className="space-y-3 border border-dark-border rounded-xl p-3"><h3 className="text-sm font-semibold">Mark attendance</h3>{students.filter((student) => student.section === subjects.find((subject) => subject.id === Number(sessionSubject))?.section).map((student) => <div key={student.id} className="flex items-center justify-between gap-3 border-b border-dark-border/60 py-2 text-sm"><span>{student.name} <span className="text-dark-muted">· {student.registration_number || 'No reg. no.'}</span></span><select value={marks[student.id!] || 'absent'} onChange={(e) => setMarks((current) => ({ ...current, [student.id!]: e.target.value as 'present' | 'absent' }))} className="bg-dark-lighter border border-dark-border rounded-lg px-2 py-1"><option value="present">Present</option><option value="absent">Absent</option></select></div>)}<button onClick={saveAttendance} disabled={saving} className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm">{saving ? 'Saving…' : 'Save attendance'}</button></div>}
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-dark-muted"><tr><th className="p-2">Student</th><th className="p-2">Reg. No.</th><th className="p-2">Section</th><th className="p-2">Present</th><th className="p-2">Absent</th><th className="p-2">Attendance</th></tr></thead><tbody>{attendanceRows.filter((row) => !sectionFilter || row.section === sectionFilter).map((row) => <tr key={row.student_id} className="border-t border-dark-border/70"><td className="p-2">{row.name}</td><td className="p-2">{row.registration_number || 'Pending'}</td><td className="p-2">{row.section || 'Pending'}</td><td className="p-2">{row.present}</td><td className="p-2">{row.absent}</td><td className="p-2">{row.percentage}%</td></tr>)}</tbody></table></div>
        </> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{(myAttendance?.subjects || []).map((subject: any) => <div key={subject.subject} className="rounded-xl bg-dark-lighter border border-dark-border p-4"><p className="font-semibold">{subject.subject}</p><p className="text-xs text-dark-muted mt-1">{subject.present} present · {subject.absent} absent</p><p className="text-2xl font-bold mt-3">{subject.percentage}%</p></div>)}{!(myAttendance?.subjects || []).length && <p className="text-sm text-dark-muted">No faculty-marked attendance is available yet.</p>}</div>}
      </section>}

      {tab === 'notices' && <section className="glass border border-dark-border rounded-2xl p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Megaphone size={18}/>College notice board</h2>
        {isFaculty && <form onSubmit={publishNotice} className="space-y-2 border border-dark-border rounded-xl p-3"><input required value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="Notice title" className="w-full bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"/><textarea required rows={3} value={noticeForm.message} onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })} placeholder="Write announcement…" className="w-full bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"/><div className="flex flex-wrap gap-2"><select value={noticeForm.audience_type} onChange={(e) => setNoticeForm({ ...noticeForm, audience_type: e.target.value })} className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"><option value="all">All students</option><option value="section">Specific section</option></select>{noticeForm.audience_type === 'section' && <input required value={noticeForm.section} onChange={(e) => setNoticeForm({ ...noticeForm, section: e.target.value })} placeholder="Section e.g. CSE-A" className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"/>}<select value={noticeForm.priority} onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })} className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select><button disabled={saving} className="bg-primary text-white rounded-lg px-4 py-2 text-sm">Publish notice</button></div></form>}
        <div className="space-y-3">{notices.map((notice) => <article key={notice.id} onClick={() => void markNoticeRead(notice)} className={`rounded-xl border p-4 ${notice.read ? 'border-dark-border opacity-75' : 'border-primary/40 bg-primary/5'}`}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{notice.title}</h3><div className="flex items-center gap-2 text-xs text-dark-muted">{notice.audience_type === 'all' ? 'All students' : notice.section}{notice.priority !== 'normal' && <span className="text-amber-300 uppercase">{notice.priority}</span>}{notice.read && <CheckCircle2 size={14}/>}</div></div><p className="text-sm text-dark-muted mt-2 whitespace-pre-wrap">{notice.message}</p><p className="text-[11px] text-dark-muted mt-3">{new Date(notice.created_at).toLocaleString()}</p></article>)}{notices.length === 0 && <p className="text-sm text-dark-muted text-center py-8">No current notices.</p>}</div>
      </section>}

      {tab === 'profile' && <section className="glass border border-dark-border rounded-2xl p-4 sm:p-5 max-w-xl space-y-3"><h2 className="font-semibold">Student registration details</h2>{isFaculty ? <p className="text-sm text-dark-muted">Faculty/admin identity is managed by the administrator.</p> : <form onSubmit={saveProfile} className="space-y-3"><label className="block text-sm">Registration number<input required value={profile.registration_number} onChange={(e) => setProfile({ ...profile, registration_number: e.target.value })} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-lg px-3 py-2"/></label><label className="block text-sm">Section<input required value={profile.section} onChange={(e) => setProfile({ ...profile, section: e.target.value })} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-lg px-3 py-2"/></label><button disabled={saving} className="bg-primary text-white rounded-lg px-4 py-2 text-sm">{saving ? 'Saving…' : 'Save details'}</button><p className="text-xs text-emerald-300">{profileMessage}</p></form>}</section>}

      {isAdmin && <form onSubmit={grantFaculty} className="glass border border-dark-border rounded-2xl p-4 space-y-3"><h2 className="font-semibold">Grant faculty access</h2><p className="text-xs text-dark-muted">Create the staff account first, then enter its email here. Only admins can grant faculty permissions.</p><div className="flex gap-2"><input type="email" required value={facultyEmail} onChange={(e) => setFacultyEmail(e.target.value)} placeholder="faculty@college.edu" className="flex-1 bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm"/><button disabled={saving} className="bg-primary text-white rounded-lg px-4 py-2 text-sm">Grant access</button></div>{profileMessage && <p className="text-xs text-emerald-300">{profileMessage}</p>}</form>}
    </div>
  )
}
