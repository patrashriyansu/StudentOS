import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  AlertCircle, ArrowRight, BookOpen, Briefcase, CalendarDays, CheckCircle2,
  FileText, GraduationCap, Plus, RefreshCw, Search, ShieldCheck, Target, Users,
} from 'lucide-react'
import { api } from '../services/api'

type Row = Record<string, any>
type Subject = { id: number; name: string; code?: string | null; section: string; faculty_user_id?: number }
type Student = { id: number; name: string; email?: string; section?: string; registration_number?: string; total_problems_solved?: number }
type Job = { id: number; title: string; company: string; description: string; location?: string; employment_type: string; skills: string[]; graduation_year_min?: number; graduation_year_max?: number; deadline?: string; status: string; applied?: boolean }
type Candidate = { student_id: number; name: string; email?: string | null; college?: string | null; course?: string | null; branch?: string | null; passing_out_year?: number | null; skills: string[]; github_url?: string | null; linkedin_url?: string | null; portfolio_url?: string | null; resume_url?: string | null; leetcode_username?: string | null; total_problems_solved: number; easy_solved: number; medium_solved: number; hard_solved: number }

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`glass rounded-2xl border border-dark-border p-4 sm:p-5 space-y-4 ${className}`}>{children}</section>
}
function Header({ eyebrow, title, description, onRefresh }: { eyebrow: string; title: string; description: string; onRefresh?: () => void }) {
  return <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
    <div><p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">{eyebrow}</p><h1 className="text-2xl font-bold">{title}</h1><p className="text-sm text-dark-muted mt-1">{description}</p></div>
    {onRefresh && <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-dark-border px-3 py-2 text-sm"><RefreshCw size={14}/>Refresh</button>}
  </header>
}
function Stat({ label, value, detail, icon: Icon = BarIcon }: { label: string; value: number | string; detail?: string; icon?: any }) {
  return <div className="glass rounded-2xl border border-dark-border p-4"><div className="flex items-center justify-between gap-2 text-xs text-dark-muted"><span>{label}</span><Icon size={16} className="text-primary"/></div><p className="text-3xl font-bold mt-2">{value}</p>{detail && <p className="text-xs text-dark-muted mt-1">{detail}</p>}</div>
}
function BarIcon({ size = 16 }: { size?: number }) { return <GraduationCap size={size} /> }
function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-dark-border p-7 text-center"><p className="font-semibold">{title}</p><p className="text-sm text-dark-muted mt-1">{detail}</p></div>
}
function ErrorLine({ message }: { message: string }) {
  if (!message) return null
  return <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertCircle size={16} className="shrink-0 mt-0.5"/>{message}</div>
}
function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string | number; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="block text-xs text-dark-muted">{label}<input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white"/></label>
}
function TextArea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return <label className="block text-xs text-dark-muted">{label}<textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white"/></label>
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="block text-xs text-dark-muted">{label}<select value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white">{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
}
function Action({ children, onClick, disabled = false, secondary = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; secondary?: boolean }) {
  return <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${secondary ? 'border border-dark-border text-dark-muted' : 'bg-primary text-white'}`}>{children}</button>
}

function usePathSection() {
  const location = useLocation()
  return location.pathname.split('/')[2] || 'overview'
}

// ---------------------------------------------------------------------------
// Recruiter
// ---------------------------------------------------------------------------

export function RecruiterWorkspace() {
  const path = usePathSection()
  const [summary, setSummary] = useState<Row>({})
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [shortlist, setShortlist] = useState<Row[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Row[]>([])
  const [query, setQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [jobForm, setJobForm] = useState({ title: '', company: '', description: '', location: '', employment_type: 'Full-time', skills: '', graduation_year_min: '', graduation_year_max: '', deadline: '' })

  const load = async () => {
    setError('')
    try {
      const [s, c, sh, j, a] = await Promise.all([
        api.get('/workspaces/recruiter/summary'),
        api.get('/campus/recruiter/candidates'),
        api.get('/workspaces/recruiter/shortlist'),
        api.get('/workspaces/recruiter/jobs'),
        api.get('/workspaces/recruiter/applications'),
      ])
      setSummary(s.data || {})
      setCandidates(Array.isArray(c.data) ? c.data : [])
      setShortlist(Array.isArray(sh.data) ? sh.data : [])
      setJobs(Array.isArray(j.data) ? j.data : [])
      setApplications(Array.isArray(a.data) ? a.data : [])
    } catch (e: any) { setError(e?.response?.data?.detail || 'Could not load recruiter workspace.') }
  }
  useEffect(() => { void load() }, [])

  const filteredCandidates = useMemo(() => candidates.filter(candidate => {
    const branchMatch = !branchFilter || candidate.branch === branchFilter
    const yearMatch = !yearFilter || String(candidate.passing_out_year || '') === yearFilter
    const search = query.trim().toLowerCase()
    const searchMatch = !search || [candidate.name, candidate.branch, candidate.college, ...(candidate.skills || [])].filter(Boolean).join(' ').toLowerCase().includes(search)
    return branchMatch && yearMatch && searchMatch
  }), [candidates, branchFilter, yearFilter, query])
  const branches = [...new Set(candidates.map(c => c.branch).filter(Boolean))] as string[]
  const years = [...new Set(candidates.map(c => c.passing_out_year).filter(Boolean))] as number[]

  const createJob = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/workspaces/recruiter/jobs', {
        ...jobForm,
        skills: jobForm.skills.split(',').map(v => v.trim()).filter(Boolean),
        graduation_year_min: jobForm.graduation_year_min ? Number(jobForm.graduation_year_min) : null,
        graduation_year_max: jobForm.graduation_year_max ? Number(jobForm.graduation_year_max) : null,
        deadline: jobForm.deadline || null,
      })
      setJobForm({ title: '', company: '', description: '', location: '', employment_type: 'Full-time', skills: '', graduation_year_min: '', graduation_year_max: '', deadline: '' })
      await load()
    } catch (e: any) { setError(e?.response?.data?.detail || 'Could not publish this job.') }
    finally { setSaving(false) }
  }
  const saveCandidate = async (studentId: number) => {
    try { await api.post(`/workspaces/recruiter/shortlist/${studentId}`, { note: '' }); await load() }
    catch (e: any) { setError(e?.response?.data?.detail || 'Could not save candidate.') }
  }
  const updateJob = async (job: Job) => {
    try { await api.patch(`/workspaces/recruiter/jobs/${job.id}`, { status: job.status === 'open' ? 'closed' : 'open' }); await load() }
    catch (e: any) { setError(e?.response?.data?.detail || 'Could not update job.') }
  }
  const updateApplication = async (application: Row, status: string) => {
    try { await api.patch(`/workspaces/recruiter/applications/${application.id}`, { status, recruiter_note: application.recruiter_note || null }); await load() }
    catch (e: any) { setError(e?.response?.data?.detail || 'Could not update application.') }
  }

  return <div className="max-w-7xl mx-auto space-y-6">
    <Header eyebrow="Recruiter workspace" title={path === 'overview' ? 'Hiring overview' : path === 'candidates' ? 'Find candidates' : path === 'shortlisted' ? 'Shortlisted talent' : path === 'jobs' ? 'Job openings' : 'Applications'} description="Discover opted-in student talent, manage openings and track hiring progress." onRefresh={() => void load()}/>
    <ErrorLine message={error}/>
    {path === 'overview' && <>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <Stat label="Available candidates" value={summary.available_candidates ?? 0} icon={Users}/>
        <Stat label="My job openings" value={summary.jobs ?? 0} icon={Briefcase}/>
        <Stat label="Open jobs" value={summary.open_jobs ?? 0} icon={CheckCircle2}/>
        <Stat label="Applications" value={summary.applications ?? 0} icon={FileText}/>
        <Stat label="Shortlisted" value={summary.shortlisted ?? 0} icon={ShieldCheck}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel><h2 className="font-semibold">Hiring pipeline</h2><p className="text-sm text-dark-muted">Review applications, shortlist suitable candidates and update each candidate's status through the hiring process.</p><div className="flex flex-wrap gap-2"><Action onClick={() => window.location.assign('/recruiter/candidates')}>Find candidates <ArrowRight size={14}/></Action><Action secondary onClick={() => window.location.assign('/recruiter/jobs')}>Manage jobs</Action></div></Panel>
        <Panel><h2 className="font-semibold">Candidate privacy</h2><p className="text-sm text-dark-muted">Only students who have enabled recruiter profile sharing appear in this workspace. Contact information remains hidden until the student separately enables contact sharing.</p></Panel>
      </div>
    </>}
    {path === 'candidates' && <Panel>
      <div className="grid md:grid-cols-4 gap-2">
        <div className="md:col-span-2 relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, skills, branch or college" className="w-full bg-dark-lighter border border-dark-border rounded-xl pl-9 pr-3 py-2.5 text-sm"/></div>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2 text-sm"><option value="">All branches</option>{branches.map(b => <option key={b}>{b}</option>)}</select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2 text-sm"><option value="">All graduation years</option>{years.map(y => <option key={y}>{y}</option>)}</select>
      </div>
      <p className="text-xs text-dark-muted">{filteredCandidates.length} opted-in profile(s)</p>
      {filteredCandidates.length === 0 ? <Empty title="No shared candidates found" detail="Try a different filter. Students only appear after enabling recruiter profile sharing."/> :
        <div className="grid lg:grid-cols-2 gap-3">{filteredCandidates.map(c => <article key={c.student_id} className="rounded-xl border border-dark-border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{c.name}</h3><p className="text-xs text-dark-muted">{[c.course, c.branch].filter(Boolean).join(' · ') || 'Course not provided'} {c.passing_out_year ? '· Batch ' + c.passing_out_year : ''}</p><p className="text-xs text-dark-muted">{c.college || 'College not provided'}</p></div><Action secondary onClick={() => void saveCandidate(c.student_id)}>Save</Action></div>
          {c.email && <p className="text-xs break-all">{c.email}</p>}
          <div className="flex flex-wrap gap-1.5">{(c.skills || []).map(skill => <span key={skill} className="rounded-md bg-primary/10 text-primary px-2 py-1 text-xs">{skill}</span>)}{!c.skills?.length && <span className="text-xs text-dark-muted">No skills listed</span>}</div>
          <div className="grid grid-cols-4 gap-2 rounded-lg bg-dark-lighter p-3 text-center"><div><b>{c.total_problems_solved}</b><p className="text-[10px] text-dark-muted">Solved</p></div><div><b>{c.easy_solved}</b><p className="text-[10px] text-dark-muted">Easy</p></div><div><b>{c.medium_solved}</b><p className="text-[10px] text-dark-muted">Medium</p></div><div><b>{c.hard_solved}</b><p className="text-[10px] text-dark-muted">Hard</p></div></div>
          <div className="flex flex-wrap gap-3 text-xs text-primary">{c.github_url && <a href={c.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}{c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer">LinkedIn ↗</a>}{c.portfolio_url && <a href={c.portfolio_url} target="_blank" rel="noreferrer">Portfolio ↗</a>}{c.resume_url && <a href={c.resume_url} target="_blank" rel="noreferrer">Resume ↗</a>}{c.leetcode_username && <a href={`https://leetcode.com/u/${encodeURIComponent(c.leetcode_username)}/`} target="_blank" rel="noreferrer">LeetCode ↗</a>}</div>
        </article>)}</div>}
    </Panel>}
    {path === 'shortlisted' && <Panel><h2 className="font-semibold">Saved candidates</h2>{shortlist.length === 0 ? <Empty title="No candidates saved" detail="Use Find Candidates to save profiles for later review."/> : <div className="space-y-3">{shortlist.map(c => <div key={c.student_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dark-border p-3"><div><p className="font-semibold">{c.name}</p><p className="text-xs text-dark-muted">{[c.branch, c.college, c.passing_out_year].filter(Boolean).join(' · ')}</p>{c.email && <p className="text-xs text-dark-muted">{c.email}</p>}</div><Action secondary onClick={async () => { await api.delete(`/workspaces/recruiter/shortlist/${c.student_id}`); await load() }}>Remove</Action></div>)}</div>}</Panel>}
    {path === 'jobs' && <>
      <Panel><h2 className="font-semibold">Create job opening</h2><form onSubmit={createJob} className="grid md:grid-cols-2 gap-3">
        <Field label="Job title" required value={jobForm.title} onChange={v => setJobForm({ ...jobForm, title: v })}/>
        <Field label="Company" required value={jobForm.company} onChange={v => setJobForm({ ...jobForm, company: v })}/>
        <Field label="Location" value={jobForm.location} onChange={v => setJobForm({ ...jobForm, location: v })}/>
        <SelectField label="Employment type" value={jobForm.employment_type} onChange={v => setJobForm({ ...jobForm, employment_type: v })} options={['Full-time','Internship','Part-time','Contract'].map(v => ({ value: v, label: v }))}/>
        <Field label="Skills (comma separated)" value={jobForm.skills} onChange={v => setJobForm({ ...jobForm, skills: v })} placeholder="Python, React, SQL"/>
        <Field label="Application deadline" type="date" value={jobForm.deadline} onChange={v => setJobForm({ ...jobForm, deadline: v })}/>
        <Field label="Minimum graduation year" type="number" value={jobForm.graduation_year_min} onChange={v => setJobForm({ ...jobForm, graduation_year_min: v })}/>
        <Field label="Maximum graduation year" type="number" value={jobForm.graduation_year_max} onChange={v => setJobForm({ ...jobForm, graduation_year_max: v })}/>
        <div className="md:col-span-2"><TextArea label="Job description" value={jobForm.description} onChange={v => setJobForm({ ...jobForm, description: v })} placeholder="Responsibilities, requirements and application details"/></div>
        <div className="md:col-span-2"><Action disabled={saving}><Plus size={15}/>Publish opening</Action></div>
      </form></Panel>
      <Panel><h2 className="font-semibold">Your job openings</h2>{jobs.length === 0 ? <Empty title="No job openings yet" detail="Create an opening above to start receiving applications."/> : <div className="space-y-3">{jobs.map(job => <article key={job.id} className="rounded-xl border border-dark-border p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{job.title}</h3><p className="text-xs text-dark-muted">{job.company} · {job.employment_type} · {job.location || 'Location not specified'}</p></div><Action secondary onClick={() => void updateJob(job)}>{job.status === 'open' ? 'Close opening' : 'Reopen'}</Action></div><p className="text-sm mt-2 whitespace-pre-wrap">{job.description}</p><p className="text-xs text-dark-muted mt-2">{job.skills.join(' · ')}{job.deadline ? ' · Deadline ' + job.deadline : ''}</p></article>)}</div>}</Panel>
    </>}
    {path === 'applications' && <Panel><h2 className="font-semibold">Applications received</h2>{applications.length === 0 ? <Empty title="No applications yet" detail="Applications to your active job openings will appear here."/> : <div className="space-y-3">{applications.map(app => <article key={app.id} className="rounded-xl border border-dark-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{app.student_name}</h3><p className="text-xs text-dark-muted">{app.job_title} · {app.company}</p>{app.email && <p className="text-xs mt-1">{app.email}</p>}</div><SelectField label="Stage" value={app.status} onChange={v => void updateApplication(app, v)} options={['applied','shortlisted','interview','selected','rejected'].map(v => ({ value: v, label: v.replace('_',' ') }))}/></div><p className="text-sm mt-2">{app.cover_note || 'No cover note provided.'}</p><p className="text-xs text-dark-muted mt-2">Applied {new Date(app.created_at).toLocaleString()}</p></article>)}</div>}</Panel>}
  </div>
}

// ---------------------------------------------------------------------------
// Mentor
// ---------------------------------------------------------------------------

export function MentorWorkspace() {
  const path = usePathSection()
  const [summary, setSummary] = useState<Row>({})
  const [students, setStudents] = useState<Row[]>([])
  const [sessions, setSessions] = useState<Row[]>([])
  const [goals, setGoals] = useState<Row[]>([])
  const [notes, setNotes] = useState<Row[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [sessionForm, setSessionForm] = useState({ student_id: '', scheduled_at: '', duration_minutes: '30', meeting_link: '', agenda: '' })
  const [goalForm, setGoalForm] = useState({ student_id: '', title: '', description: '', due_date: '' })
  const [noteForm, setNoteForm] = useState({ student_id: '', body: '' })
  const load = async () => {
    setError('')
    try {
      const [s, st, se, g, n] = await Promise.all([
        api.get('/workspaces/mentor/summary'), api.get('/campus/mentor/students'),
        api.get('/workspaces/mentor/sessions'), api.get('/workspaces/mentor/goals'),
        api.get('/workspaces/mentor/notes'),
      ])
      setSummary(s.data || {}); setStudents(st.data || []); setSessions(se.data || []); setGoals(g.data || []); setNotes(n.data || [])
    } catch (e: any) { setError(e?.response?.data?.detail || 'Could not load mentor workspace.') }
  }
  useEffect(() => { void load() }, [])
  const submit = async (event: FormEvent, endpoint: string, payload: Row, reset: () => void) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const body = endpoint === '/workspaces/mentor/sessions' && typeof payload.scheduled_at === 'string'
        ? { ...payload, scheduled_at: new Date(payload.scheduled_at).toISOString() }
        : payload
      await api.post(endpoint, body); reset(); await load()
    }
    catch (e: any) { setError(e?.response?.data?.detail || 'Could not save this item.') }
    finally { setSaving(false) }
  }
  const updateSession = async (id: number, status: string) => { await api.patch(`/workspaces/mentor/sessions/${id}`, { status }); await load() }
  const updateGoal = async (id: number, status: string) => { await api.patch(`/workspaces/mentor/goals/${id}`, { status }); await load() }
  const title = path === 'overview' ? 'Mentoring overview' : path === 'students' ? 'My assigned students' : path === 'sessions' ? 'Mentoring sessions' : path === 'goals' ? 'Goals and action plans' : 'Private mentor notes'
  return <div className="max-w-7xl mx-auto space-y-6">
    <Header eyebrow="Mentor workspace" title={title} description="Guide only the students assigned to your mentor account. Record sessions, goals and private follow-up notes." onRefresh={() => void load()}/>
    <ErrorLine message={error}/>
    {path === 'overview' && <>
      <div className="grid sm:grid-cols-3 gap-3"><Stat label="Assigned students" value={summary.assigned_students ?? 0} icon={Users}/><Stat label="Scheduled sessions" value={summary.upcoming_sessions ?? 0} icon={CalendarDays}/><Stat label="Open goals" value={summary.open_goals ?? 0} icon={Target}/></div>
      <Panel><h2 className="font-semibold">Students assigned to you</h2>{students.length === 0 ? <Empty title="No students assigned yet" detail="An administrator must assign student accounts to your mentor account."/> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{students.slice(0,6).map(s => <article key={s.student_id} className="rounded-xl border border-dark-border p-4"><p className="font-semibold">{s.name}</p><p className="text-xs text-dark-muted">{[s.course, s.branch, s.section].filter(Boolean).join(' · ')}</p><p className="text-xs text-dark-muted mt-1">Semester {s.current_semester ?? '—'} · Batch {s.passing_out_year ?? '—'}</p></article>)}</div>}</Panel>
    </>}
    {path === 'students' && <Panel><h2 className="font-semibold">Your assigned students</h2>{students.length === 0 ? <Empty title="No students assigned" detail="Ask an administrator to create an assignment in the Admin workspace."/> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{students.map(s => <article key={s.student_id} className="rounded-xl border border-dark-border p-4 space-y-2"><div className="w-10 h-10 rounded-xl bg-primary/15 grid place-items-center text-primary font-bold">{s.name?.slice(0,1)}</div><h3 className="font-semibold">{s.name}</h3><p className="text-xs text-dark-muted">{[s.course,s.branch,s.college].filter(Boolean).join(' · ')}</p><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-dark-lighter px-2 py-1">{s.section || 'No section'}</span><span className="rounded-lg bg-dark-lighter px-2 py-1">Semester {s.current_semester ?? '—'}</span><span className="rounded-lg bg-dark-lighter px-2 py-1">Batch {s.passing_out_year ?? '—'}</span></div><p className="text-[11px] text-dark-muted">Academic scores and private placement information are not included.</p></article>)}</div>}</Panel>}
    {path === 'sessions' && <>
      <Panel><h2 className="font-semibold">Schedule mentoring session</h2><form onSubmit={e => void submit(e,'/workspaces/mentor/sessions',{...sessionForm,student_id:Number(sessionForm.student_id),duration_minutes:Number(sessionForm.duration_minutes)},()=>setSessionForm({student_id:'',scheduled_at:'',duration_minutes:'30',meeting_link:'',agenda:''}))} className="grid md:grid-cols-2 gap-3">
        <SelectField label="Student" value={sessionForm.student_id} onChange={v => setSessionForm({...sessionForm,student_id:v})} options={[{value:'',label:'Select assigned student'},...students.map(s=>({value:String(s.student_id),label:s.name}))]}/>
        <Field label="Date and time" type="datetime-local" required value={sessionForm.scheduled_at} onChange={v => setSessionForm({...sessionForm,scheduled_at:v})}/>
        <Field label="Duration (minutes)" type="number" value={sessionForm.duration_minutes} onChange={v=>setSessionForm({...sessionForm,duration_minutes:v})}/>
        <Field label="Meeting link" value={sessionForm.meeting_link} onChange={v=>setSessionForm({...sessionForm,meeting_link:v})}/>
        <div className="md:col-span-2"><TextArea label="Agenda" value={sessionForm.agenda} onChange={v=>setSessionForm({...sessionForm,agenda:v})}/></div><Action disabled={saving || !sessionForm.student_id}><Plus size={14}/>Schedule session</Action>
      </form></Panel>
      <Panel><h2 className="font-semibold">Session history</h2>{sessions.length===0?<Empty title="No sessions yet" detail="Schedule your first mentoring session above."/>:<div className="space-y-2">{sessions.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dark-border p-3"><div><p className="font-semibold">{s.student_name}</p><p className="text-xs text-dark-muted">{new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min</p>{s.agenda&&<p className="text-xs mt-1">{s.agenda}</p>}{s.meeting_link&&<a className="text-xs text-primary" href={s.meeting_link} target="_blank" rel="noreferrer">Open meeting link ↗</a>}</div><SelectField label="Status" value={s.status} onChange={v=>void updateSession(s.id,v)} options={['scheduled','completed','cancelled'].map(v=>({value:v,label:v}))}/></div>)}</div>}</Panel>
    </>}
    {path === 'goals' && <>
      <Panel><h2 className="font-semibold">Create student action plan</h2><form onSubmit={e=>void submit(e,'/workspaces/mentor/goals',{...goalForm,student_id:Number(goalForm.student_id),due_date:goalForm.due_date||null},()=>setGoalForm({student_id:'',title:'',description:'',due_date:''}))} className="grid md:grid-cols-2 gap-3">
        <SelectField label="Student" value={goalForm.student_id} onChange={v=>setGoalForm({...goalForm,student_id:v})} options={[{value:'',label:'Select assigned student'},...students.map(s=>({value:String(s.student_id),label:s.name}))]}/>
        <Field label="Goal title" required value={goalForm.title} onChange={v=>setGoalForm({...goalForm,title:v})}/>
        <Field label="Due date" type="date" value={goalForm.due_date} onChange={v=>setGoalForm({...goalForm,due_date:v})}/>
        <TextArea label="Description / next steps" value={goalForm.description} onChange={v=>setGoalForm({...goalForm,description:v})}/>
        <Action disabled={saving||!goalForm.student_id}><Plus size={14}/>Create goal</Action>
      </form></Panel>
      <Panel><h2 className="font-semibold">Action plans</h2>{goals.length===0?<Empty title="No goals created" detail="Create measurable goals and follow-up dates for your assigned students."/>:<div className="space-y-2">{goals.map(g=><div key={g.id} className="rounded-xl border border-dark-border p-3 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{g.title}</p><p className="text-xs text-dark-muted">{g.student_name} · {g.due_date||'No due date'}</p>{g.description&&<p className="text-sm mt-1">{g.description}</p>}</div><SelectField label="Progress" value={g.status} onChange={v=>void updateGoal(g.id,v)} options={['not_started','in_progress','completed','blocked'].map(v=>({value:v,label:v.replace('_',' ')}))}/></div>)}</div>}</Panel>
    </>}
    {path === 'notes' && <>
      <Panel><h2 className="font-semibold">Private mentoring note</h2><p className="text-xs text-dark-muted">Notes are visible only to the mentor who created them. They are not shared with recruiters or students.</p><form onSubmit={e=>void submit(e,'/workspaces/mentor/notes',{...noteForm,student_id:Number(noteForm.student_id)},()=>setNoteForm({student_id:'',body:''}))} className="space-y-3">
        <SelectField label="Student" value={noteForm.student_id} onChange={v=>setNoteForm({...noteForm,student_id:v})} options={[{value:'',label:'Select assigned student'},...students.map(s=>({value:String(s.student_id),label:s.name}))]}/>
        <TextArea label="Mentor note" value={noteForm.body} onChange={v=>setNoteForm({...noteForm,body:v})} placeholder="Private follow-up notes…" rows={5}/>
        <Action disabled={saving||!noteForm.student_id}><Plus size={14}/>Save private note</Action>
      </form></Panel>
      <Panel><h2 className="font-semibold">Saved notes</h2>{notes.length===0?<Empty title="No private notes" detail="Your notes for assigned students will appear here."/>:<div className="space-y-2">{notes.map(n=><article key={n.id} className="rounded-xl border border-dark-border p-3"><p className="font-semibold">{n.student_name}</p><p className="text-sm whitespace-pre-wrap mt-2">{n.body}</p><p className="text-[11px] text-dark-muted mt-2">Updated {new Date(n.updated_at).toLocaleString()}</p></article>)}</div>}</Panel>
    </>}
  </div>
}

// ---------------------------------------------------------------------------
// Faculty / teacher
// ---------------------------------------------------------------------------

export function FacultyWorkspace() {
  const path = usePathSection()
  const [summary,setSummary]=useState<Row>({})
  const [subjects,setSubjects]=useState<Subject[]>([])
  const [students,setStudents]=useState<Student[]>([])
  const [attendance,setAttendance]=useState<Row[]>([])
  const [assignments,setAssignments]=useState<Row[]>([])
  const [marks,setMarks]=useState<Row[]>([])
  const [resources,setResources]=useState<Row[]>([])
  const [timetable,setTimetable]=useState<Row[]>([])
  const [notices,setNotices]=useState<Row[]>([])
  const [sections,setSections]=useState<string[]>([])
  const [selectedSubject,setSelectedSubject]=useState('')
  const [selectedAssignment,setSelectedAssignment]=useState(0)
  const [submissions,setSubmissions]=useState<Row[]>([])
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const [subjectForm,setSubjectForm]=useState({name:'',code:'',section:''})
  const [assignmentForm,setAssignmentForm]=useState({subject_id:'',title:'',instructions:'',points:'100',due_at:''})
  const [markForm,setMarkForm]=useState({subject_id:'',student_id:'',assessment:'',marks_obtained:'',max_marks:'100',remarks:''})
  const [resourceForm,setResourceForm]=useState({subject_id:'',title:'',description:'',resource_url:''})
  const [timetableForm,setTimetableForm]=useState({subject_id:'',weekday:'0',starts_at:'09:00',ends_at:'10:00',room:''})
  const [noticeForm,setNoticeForm]=useState({title:'',message:'',audience_type:'section',section:'',priority:'normal'})
  const [sessionDate,setSessionDate]=useState(new Date().toISOString().slice(0,10))
  const [sessionId,setSessionId]=useState(0)
  const [attendanceMarks,setAttendanceMarks]=useState<Record<number,string>>({})

  const load=async()=>{
    setError('')
    try{
      const [s,sub,sec,att,ass,mar,res,tt,not]=await Promise.all([
        api.get('/workspaces/faculty/summary'),api.get('/campus/subjects'),api.get('/campus/sections'),
        api.get('/campus/attendance'),api.get('/workspaces/faculty/assignments'),
        api.get('/workspaces/faculty/marks'),api.get('/workspaces/faculty/resources'),
        api.get('/workspaces/faculty/timetable'),api.get('/campus/notices'),
      ])
      setSummary(s.data||{});setSubjects(sub.data||[]);setSections((sec.data||[]).map((v:Row)=>v.name));setAttendance(Array.isArray(att.data)?att.data:[])
      setAssignments(ass.data||[]);setMarks(mar.data||[]);setResources(res.data||[]);setTimetable(tt.data||[]);setNotices(not.data||[])
      const sectionList=(sec.data||[]).map((v:Row)=>v.name).filter(Boolean)
      const studentRows=await Promise.all(sectionList.map((section:string)=>api.get('/campus/students',{params:{section}}).then(r=>r.data||[]).catch(()=>[])))
      setStudents(studentRows.flat().filter((v:Student,i:number,a:Student[])=>a.findIndex(x=>x.id===v.id)===i))
    }catch(e:any){setError(e?.response?.data?.detail||'Could not load your faculty workspace.')}
  }
  useEffect(()=>{void load()},[])
  const runSave=async(event:FormEvent,endpoint:string,payload:Row,after:()=>void)=>{
    event.preventDefault();setSaving(true);setError('')
    try{await api.post(endpoint,payload);after();await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not save this record.')}
    finally{setSaving(false)}
  }
  const selected=subjects.find(s=>s.id===Number(selectedSubject))
  const studentsForSubject=students.filter(s=>s.section===selected?.section)
  const selectedForMark=subjects.find(s=>s.id===Number(markForm.subject_id))
  const markStudents=students.filter(s=>s.section===selectedForMark?.section)
  const createAttendanceSession=async()=>{
    if(!selectedSubject)return
    setSaving(true);setError('')
    try{
      const r=await api.post(`/campus/subjects/${selectedSubject}/sessions`,{session_date:sessionDate})
      setSessionId(r.data.id)
      const subject=subjects.find(s=>s.id===Number(selectedSubject))
      setAttendanceMarks(Object.fromEntries(students.filter(st=>st.section===subject?.section).map(st=>[st.id,'present'])))
    }catch(e:any){setError(e?.response?.data?.detail||'Could not create attendance session.')}
    finally{setSaving(false)}
  }
  const saveAttendance=async()=>{
    setSaving(true);setError('')
    try{
      await api.post(`/campus/sessions/${sessionId}/attendance`,{records:Object.entries(attendanceMarks).map(([student_id,status])=>({student_id:Number(student_id),status}))})
      setSessionId(0);await load()
    }catch(e:any){setError(e?.response?.data?.detail||'Could not save attendance.')}
    finally{setSaving(false)}
  }
  const reviewSubmissions=async(id:number)=>{
    setSelectedAssignment(id);setError('')
    try{const r=await api.get(`/workspaces/faculty/assignments/${id}/submissions`);setSubmissions(r.data||[])}
    catch(e:any){setError(e?.response?.data?.detail||'Could not load submissions.')}
  }
  const grade=async(submission:Row)=>{
    const marksAwarded=window.prompt(`Marks awarded (maximum ${assignments.find(a=>a.id===selectedAssignment)?.points??100})`,String(submission.marks_awarded??''))
    if(marksAwarded===null)return
    const feedback=window.prompt('Feedback for student',submission.feedback||'')
    try{await api.post(`/workspaces/faculty/submissions/${submission.id}/grade`,{marks_awarded:Number(marksAwarded),feedback});await reviewSubmissions(selectedAssignment)}
    catch(e:any){setError(e?.response?.data?.detail||'Could not grade submission.')}
  }
  const publishNotice=async(event:FormEvent)=>{
    event.preventDefault();setSaving(true);setError('')
    try{await api.post('/campus/notices',noticeForm);await load();setNoticeForm({...noticeForm,title:'',message:''})}
    catch(e:any){setError(e?.response?.data?.detail||'Could not publish notice.')}
    finally{setSaving(false)}
  }
  const titleMap:Record<string,string>={overview:'Teaching overview',classes:'My classes',students:'My students',attendance:'Attendance register',assignments:'Assignments',marks:'Marks and results',timetable:'Class timetable',notices:'Notices',materials:'Learning materials'}
  return <div className="max-w-7xl mx-auto space-y-6">
    <Header eyebrow="Teacher / faculty workspace" title={titleMap[path]||'Teaching workspace'} description="Manage only the subjects and sections assigned to your faculty account." onRefresh={()=>void load()}/>
    <ErrorLine message={error}/>
    {path==='overview'&&<>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3"><Stat label="Assigned classes" value={summary.classes??0} icon={BookOpen}/><Stat label="Assigned sections" value={summary.sections??0} icon={Users}/><Stat label="Students in your sections" value={summary.students??0} icon={GraduationCap}/><Stat label="Published assignments" value={summary.assignments??0} icon={FileText}/></div>
      <Panel><h2 className="font-semibold">Your teaching schedule</h2>{subjects.length===0?<Empty title="No classes assigned" detail="An administrator must assign subjects and sections to your faculty account."/>:<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{subjects.map(s=><article key={s.id} className="rounded-xl border border-dark-border p-4"><p className="font-semibold">{s.name}</p><p className="text-xs text-dark-muted">{s.code||'No course code'} · {s.section}</p></article>)}</div>}</Panel>
    </>}
    {path==='classes'&&<Panel><h2 className="font-semibold">My assigned classes</h2>{subjects.length===0?<Empty title="No classes assigned" detail="Ask your administrator to assign a class and section."/>:<div className="grid md:grid-cols-3 gap-3">{subjects.map(s=><article key={s.id} className="rounded-xl border border-dark-border p-4"><h3 className="font-semibold">{s.name}</h3><p className="text-xs text-dark-muted">{s.code||'—'} · {s.section}</p><p className="text-xs text-dark-muted mt-2">{students.filter(st=>st.section===s.section).length} student(s) in this section</p></article>)}</div>}</Panel>}
    {path==='students'&&<Panel><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Students in your assigned sections</h2><span className="text-xs text-dark-muted">{students.length} students</span></div>{students.length===0?<Empty title="No students in assigned sections" detail="When the administrator assigns classes and students complete registration, they will appear here."/>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-dark-muted"><tr><th className="p-2">Student</th><th className="p-2">Registration no.</th><th className="p-2">Section</th><th className="p-2">LeetCode solved</th></tr></thead><tbody>{students.map(s=><tr key={s.id} className="border-t border-dark-border"><td className="p-2">{s.name}<div className="text-xs text-dark-muted">{s.email}</div></td><td className="p-2">{s.registration_number||'Pending'}</td><td className="p-2">{s.section||'—'}</td><td className="p-2">{s.total_problems_solved||0}</td></tr>)}</tbody></table></div>}</Panel>}
    {path==='attendance'&&<Panel><h2 className="font-semibold">Mark attendance</h2><div className="grid md:grid-cols-3 gap-2"><SelectField label="Class" value={selectedSubject} onChange={setSelectedSubject} options={[{value:'',label:'Select your class'},...subjects.map(s=>({value:String(s.id),label:`${s.name} · ${s.section}`}))]}/><Field label="Class date" type="date" value={sessionDate} onChange={setSessionDate}/><div className="flex items-end"><Action disabled={!selectedSubject||saving} onClick={()=>void createAttendanceSession()}>Create register</Action></div></div>
      {sessionId>0&&<div className="rounded-xl border border-dark-border p-3 space-y-3"><h3 className="font-semibold">Present / absent · {selected?.section}</h3>{studentsForSubject.map(s=><div key={s.id} className="flex justify-between items-center py-2 border-b border-dark-border text-sm"><span>{s.name} <span className="text-xs text-dark-muted">{s.registration_number}</span></span><select value={attendanceMarks[s.id]||'absent'} onChange={e=>setAttendanceMarks({...attendanceMarks,[s.id]:e.target.value})} className="bg-dark-lighter border border-dark-border rounded-lg px-2 py-1"><option value="present">Present</option><option value="absent">Absent</option></select></div>)}<Action onClick={()=>void saveAttendance()} disabled={saving}>Save attendance</Action></div>}
      <h3 className="font-semibold pt-2">Attendance register</h3>{attendance.length===0?<Empty title="No attendance has been recorded" detail="Create a class session and mark attendance to populate this register."/>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-dark-muted"><tr><th className="p-2">Student</th><th className="p-2">Section</th><th className="p-2">Present</th><th className="p-2">Absent</th><th className="p-2">Percentage</th></tr></thead><tbody>{attendance.map(a=><tr key={a.student_id} className="border-t border-dark-border"><td className="p-2">{a.name}</td><td className="p-2">{a.section}</td><td className="p-2">{a.present}</td><td className="p-2">{a.absent}</td><td className="p-2">{a.percentage}%</td></tr>)}</tbody></table></div>}</Panel>}
    {path==='assignments'&&<>
      <Panel><h2 className="font-semibold">Publish assignment</h2><form onSubmit={e=>void runSave(e,'/workspaces/faculty/assignments',{...assignmentForm,subject_id:Number(assignmentForm.subject_id),points:Number(assignmentForm.points),due_at:assignmentForm.due_at?new Date(assignmentForm.due_at).toISOString():null},()=>setAssignmentForm({subject_id:'',title:'',instructions:'',points:'100',due_at:''}))} className="grid md:grid-cols-2 gap-3">
        <SelectField label="Class / subject" value={assignmentForm.subject_id} onChange={v=>setAssignmentForm({...assignmentForm,subject_id:v})} options={[{value:'',label:'Select class'},...subjects.map(s=>({value:String(s.id),label:`${s.name} · ${s.section}`}))]}/>
        <Field label="Title" required value={assignmentForm.title} onChange={v=>setAssignmentForm({...assignmentForm,title:v})}/>
        <Field label="Points" type="number" value={assignmentForm.points} onChange={v=>setAssignmentForm({...assignmentForm,points:v})}/>
        <Field label="Deadline" type="datetime-local" value={assignmentForm.due_at} onChange={v=>setAssignmentForm({...assignmentForm,due_at:v})}/>
        <div className="md:col-span-2"><TextArea label="Instructions" value={assignmentForm.instructions} onChange={v=>setAssignmentForm({...assignmentForm,instructions:v})}/></div><Action disabled={saving||!assignmentForm.subject_id}><Plus size={14}/>Publish assignment</Action>
      </form></Panel>
      <Panel><h2 className="font-semibold">Published assignments</h2>{assignments.length===0?<Empty title="No assignments yet" detail="Publish an assignment for one of your classes."/>:<div className="space-y-2">{assignments.map(a=><div key={a.id} className="rounded-xl border border-dark-border p-3 flex flex-wrap justify-between items-center gap-3"><div><p className="font-semibold">{a.title}</p><p className="text-xs text-dark-muted">{a.subject} · {a.section} · {a.points} points · {a.due_at?new Date(a.due_at).toLocaleString():'No deadline'}</p></div><Action secondary onClick={()=>void reviewSubmissions(a.id)}>Review submissions</Action></div>)}</div>}
        {selectedAssignment>0&&<div className="space-y-2 border-t border-dark-border pt-3"><h3 className="font-semibold">Submissions</h3>{submissions.length===0?<Empty title="No submissions" detail="Students' submitted work will appear here."/>:submissions.map(s=><div key={s.id} className="rounded-xl border border-dark-border p-3"><div className="flex flex-wrap justify-between gap-2"><b>{s.student_name}</b><Action secondary onClick={()=>void grade(s)}>Grade</Action></div><p className="text-sm whitespace-pre-wrap mt-2">{s.submission_text||'Link attachment only'}</p>{s.attachment_url&&<a className="text-xs text-primary" href={s.attachment_url} target="_blank" rel="noreferrer">Open submission ↗</a>}<p className="text-xs text-dark-muted mt-1">{s.marks_awarded==null?'Not graded':`Grade: ${s.marks_awarded}`} {s.feedback&&'· '+s.feedback}</p></div>)}</div>}
      </Panel>
    </>}
    {path==='marks'&&<><Panel><h2 className="font-semibold">Enter / update marks</h2><form onSubmit={e=>void runSave(e,'/workspaces/faculty/marks',{...markForm,subject_id:Number(markForm.subject_id),student_id:Number(markForm.student_id),marks_obtained:Number(markForm.marks_obtained),max_marks:Number(markForm.max_marks)},()=>setMarkForm({...markForm,assessment:'',marks_obtained:'',remarks:''}))} className="grid md:grid-cols-3 gap-3">
      <SelectField label="Class" value={markForm.subject_id} onChange={v=>setMarkForm({...markForm,subject_id:v,student_id:''})} options={[{value:'',label:'Select class'},...subjects.map(s=>({value:String(s.id),label:`${s.name} · ${s.section}`}))]}/>
      <SelectField label="Student" value={markForm.student_id} onChange={v=>setMarkForm({...markForm,student_id:v})} options={[{value:'',label:'Select student'},...markStudents.map(s=>({value:String(s.id),label:s.name}))]}/>
      <Field label="Assessment" value={markForm.assessment} onChange={v=>setMarkForm({...markForm,assessment:v})} placeholder="Mid-semester"/>
      <Field label="Marks obtained" type="number" value={markForm.marks_obtained} onChange={v=>setMarkForm({...markForm,marks_obtained:v})}/>
      <Field label="Maximum marks" type="number" value={markForm.max_marks} onChange={v=>setMarkForm({...markForm,max_marks:v})}/>
      <Field label="Remarks" value={markForm.remarks} onChange={v=>setMarkForm({...markForm,remarks:v})}/>
      <Action disabled={saving||!markForm.subject_id||!markForm.student_id}>Save marks</Action>
    </form></Panel><Panel><h2 className="font-semibold">Marks register</h2>{marks.length===0?<Empty title="No marks entered" detail="Recorded assessment marks will appear here."/>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-dark-muted"><tr><th className="p-2">Student</th><th className="p-2">Subject</th><th className="p-2">Assessment</th><th className="p-2">Score</th></tr></thead><tbody>{marks.map(m=><tr key={m.id} className="border-t border-dark-border"><td className="p-2">{m.student_name}</td><td className="p-2">{m.subject}</td><td className="p-2">{m.assessment}</td><td className="p-2">{m.marks_obtained} / {m.max_marks}</td></tr>)}</tbody></table></div>}</Panel></>}
    {path==='timetable'&&<><Panel><h2 className="font-semibold">Add class timetable entry</h2><form onSubmit={e=>void runSave(e,'/workspaces/faculty/timetable',{...timetableForm,subject_id:Number(timetableForm.subject_id),weekday:Number(timetableForm.weekday)},()=>setTimetableForm({...timetableForm,room:''}))} className="grid md:grid-cols-3 gap-3">
      <SelectField label="Class" value={timetableForm.subject_id} onChange={v=>setTimetableForm({...timetableForm,subject_id:v})} options={[{value:'',label:'Select class'},...subjects.map(s=>({value:String(s.id),label:`${s.name} · ${s.section}`}))]}/>
      <SelectField label="Day" value={timetableForm.weekday} onChange={v=>setTimetableForm({...timetableForm,weekday:v})} options={['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((v,i)=>({value:String(i),label:v}))}/>
      <Field label="Room" value={timetableForm.room} onChange={v=>setTimetableForm({...timetableForm,room:v})}/>
      <Field label="Start time" type="time" value={timetableForm.starts_at} onChange={v=>setTimetableForm({...timetableForm,starts_at:v})}/>
      <Field label="End time" type="time" value={timetableForm.ends_at} onChange={v=>setTimetableForm({...timetableForm,ends_at:v})}/>
      <div className="flex items-end"><Action disabled={saving||!timetableForm.subject_id}>Save timetable</Action></div>
    </form></Panel><Panel><h2 className="font-semibold">Weekly timetable</h2>{timetable.length===0?<Empty title="No timetable entries" detail="Add your class timings above."/>:<div className="space-y-2">{timetable.map(t=><div key={t.id} className="rounded-xl border border-dark-border p-3"><b>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][t.weekday]}</b><p className="text-sm">{t.subject} · {t.starts_at}–{t.ends_at} · {t.room||'Room not set'}</p><p className="text-xs text-dark-muted">{t.section}</p></div>)}</div>}</Panel></>}
    {path==='materials'&&<><Panel><h2 className="font-semibold">Publish learning material</h2><p className="text-xs text-dark-muted">Add a link to a document, PDF stored in your college drive, or other course resource. Students in the selected section will see it.</p><form onSubmit={e=>void runSave(e,'/workspaces/faculty/resources',{...resourceForm,subject_id:Number(resourceForm.subject_id)},()=>setResourceForm({subject_id:'',title:'',description:'',resource_url:''}))} className="grid md:grid-cols-2 gap-3">
      <SelectField label="Class" value={resourceForm.subject_id} onChange={v=>setResourceForm({...resourceForm,subject_id:v})} options={[{value:'',label:'Select class'},...subjects.map(s=>({value:String(s.id),label:`${s.name} · ${s.section}`}))]}/>
      <Field label="Title" value={resourceForm.title} onChange={v=>setResourceForm({...resourceForm,title:v})}/>
      <Field label="Resource URL" value={resourceForm.resource_url} onChange={v=>setResourceForm({...resourceForm,resource_url:v})} placeholder="https://..."/>
      <Field label="Description" value={resourceForm.description} onChange={v=>setResourceForm({...resourceForm,description:v})}/>
      <Action disabled={saving||!resourceForm.subject_id}>Publish resource</Action>
    </form></Panel><Panel><h2 className="font-semibold">Published learning materials</h2>{resources.length===0?<Empty title="No materials yet" detail="Published course links and PDFs appear here."/>:<div className="space-y-2">{resources.map(r=><div key={r.id} className="rounded-xl border border-dark-border p-3 flex justify-between gap-3"><div><p className="font-semibold">{r.title}</p><p className="text-xs text-dark-muted">{r.subject} · {r.section}</p><p className="text-xs">{r.description}</p></div><a className="text-primary text-sm" href={r.resource_url} target="_blank" rel="noreferrer">Open ↗</a></div>)}</div>}</Panel></>}
    {path==='notices'&&<><Panel><h2 className="font-semibold">Publish notice</h2><form onSubmit={publishNotice} className="space-y-3"><Field label="Title" value={noticeForm.title} onChange={v=>setNoticeForm({...noticeForm,title:v})}/><TextArea label="Announcement" value={noticeForm.message} onChange={v=>setNoticeForm({...noticeForm,message:v})}/><div className="grid md:grid-cols-3 gap-2"><SelectField label="Audience" value={noticeForm.audience_type} onChange={v=>setNoticeForm({...noticeForm,audience_type:v})} options={[{value:'section',label:'My assigned section'},{value:'all',label:'All students'}]}/><SelectField label="Section" value={noticeForm.section} onChange={v=>setNoticeForm({...noticeForm,section:v})} options={[{value:'',label:'Choose section'},...sections.map(v=>({value:v,label:v}))]}/><SelectField label="Priority" value={noticeForm.priority} onChange={v=>setNoticeForm({...noticeForm,priority:v})} options={['normal','important','urgent'].map(v=>({value:v,label:v}))}/></div><Action disabled={saving}>Publish notice</Action></form></Panel><Panel><h2 className="font-semibold">Current notices</h2>{notices.length===0?<Empty title="No notices" detail="Notices you publish appear here."/>:notices.map(n=><article key={n.id} className="rounded-xl border border-dark-border p-3"><b>{n.title}</b><p className="text-sm mt-1">{n.message}</p></article>)}</Panel></>}
  </div>
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export function AdminWorkspace() {
  const path=usePathSection()
  const [summary,setSummary]=useState<Row>({})
  const [staff,setStaff]=useState<Row[]>([])
  const [students,setStudents]=useState<Student[]>([])
  const [classes,setClasses]=useState<Subject[]>([])
  const [assignments,setAssignments]=useState<Row[]>([])
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const [facultyForm,setFacultyForm]=useState({email:''})
  const [classForm,setClassForm]=useState({faculty_email:'',name:'',code:'',section:''})
  const [mentorForm,setMentorForm]=useState({mentor_email:'',student_email:''})
  const [search,setSearch]=useState('')
  const load=async()=>{
    setError('')
    try{
      const [s,st,stu,cl,a]=await Promise.all([
        api.get('/workspaces/admin/summary'),api.get('/workspaces/admin/staff'),
        api.get('/campus/students'),api.get('/campus/subjects'),
        api.get('/workspaces/admin/mentor-assignments'),
      ])
      setSummary(s.data||{});setStaff(st.data||[]);setStudents(stu.data||[])
      setClasses(cl.data||[]);setAssignments(a.data||[])
    }catch(e:any){setError(e?.response?.data?.detail||'Could not load admin workspace.')}
  }
  useEffect(()=>{void load()},[])
  const save=async(event:FormEvent,endpoint:string,payload:Row,reset:()=>void)=>{
    event.preventDefault();setSaving(true);setError('')
    try{await api.post(endpoint,payload);reset();await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not save admin change.')}
    finally{setSaving(false)}
  }
  const updateStaff=async(id:number,patch:Row)=>{
    setSaving(true);setError('')
    try{await api.patch(`/workspaces/admin/staff/${id}`,patch);await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not update staff account.')}
    finally{setSaving(false)}
  }
  const titleMap:Record<string,string>={overview:'Institution overview',students:'Student directory',staff:'Staff and permissions',classes:'Class assignments',mentors:'Mentor assignments'}
  return <div className="max-w-7xl mx-auto space-y-6">
    <Header eyebrow="Administrator workspace" title={titleMap[path]||'Admin workspace'} description="Manage institutional accounts, faculty teaching assignments and mentor-student relationships." onRefresh={()=>void load()}/>
    <ErrorLine message={error}/>
    {path==='overview'&&<><div className="grid grid-cols-2 xl:grid-cols-6 gap-3"><Stat label="Students" value={summary.student??0} icon={Users}/><Stat label="Faculty" value={summary.faculty??0} icon={GraduationCap}/><Stat label="Mentors" value={summary.mentor??0} icon={ShieldCheck}/><Stat label="Recruiters" value={summary.recruiter??0} icon={Briefcase}/><Stat label="Classes" value={summary.classes??0} icon={BookOpen}/><Stat label="Mentor links" value={summary.mentor_assignments??0} icon={Target}/></div><Panel><h2 className="font-semibold">Administrative responsibilities</h2><p className="text-sm text-dark-muted">Create faculty permissions, allocate subjects and sections, and assign students to mentors. Teacher and mentor accounts remain limited to their own assignments.</p></Panel></>}
    {path==='students'&&<Panel><div className="flex justify-between gap-3"><h2 className="font-semibold">Student directory</h2><span className="text-xs text-dark-muted">{students.length} accounts</span></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students by name, email or registration no." className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm"/><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-dark-muted"><tr><th className="p-2">Student</th><th className="p-2">Registration</th><th className="p-2">Section</th><th className="p-2">LeetCode solved</th></tr></thead><tbody>{students.filter(s=>[s.name,s.email,s.registration_number,s.section].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())).map(s=><tr key={s.id} className="border-t border-dark-border"><td className="p-2">{s.name}<div className="text-xs text-dark-muted">{s.email}</div></td><td className="p-2">{s.registration_number||'Pending'}</td><td className="p-2">{s.section||'Pending'}</td><td className="p-2">{s.total_problems_solved||0}</td></tr>)}</tbody></table></div></Panel>}
    {path==='staff'&&<><Panel><h2 className="font-semibold">Staff roles and account status</h2>{staff.length===0?<Empty title="No staff accounts yet" detail="Create staff accounts first, then grant faculty, mentor or recruiter access."/>:<div className="space-y-3">{staff.map(s=><div key={s.id} className="rounded-xl border border-dark-border p-3 grid md:grid-cols-[1fr_180px_150px] items-center gap-3"><div><b>{s.name}</b><p className="text-xs text-dark-muted">{s.email}</p></div><SelectField label="Role" value={s.role} onChange={v=>void updateStaff(s.id,{role:v})} options={['faculty','mentor','recruiter'].map(v=>({value:v,label:v}))}/><div className="flex flex-col gap-1"><span className="text-[11px] text-dark-muted">Account status</span><Action secondary onClick={()=>void updateStaff(s.id,{is_active:!s.active})} disabled={saving}>{s.active?'Disable account':'Enable account'}</Action></div></div>)}</div>}</Panel><Panel><h2 className="font-semibold">Grant faculty access</h2><p className="text-xs text-dark-muted">The account must already exist. This changes its role to faculty.</p><form onSubmit={e=>void save(e,'/campus/faculty',facultyForm,()=>setFacultyForm({email:''}))} className="flex flex-wrap gap-2"><input type="email" required value={facultyForm.email} onChange={e=>setFacultyForm({email:e.target.value})} placeholder="faculty@college.edu" className="flex-1 min-w-60 bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm"/><Action disabled={saving}>Grant faculty role</Action></form></Panel></>}
    {path==='classes'&&<><Panel><h2 className="font-semibold">Assign class to faculty</h2><p className="text-xs text-dark-muted">Assign a subject and section to an existing faculty account. The teacher will only see students and attendance in this section.</p><form onSubmit={e=>void save(e,'/workspaces/admin/classes',classForm,()=>setClassForm({faculty_email:'',name:'',code:'',section:''}))} className="grid md:grid-cols-2 gap-3"><Field label="Faculty email" value={classForm.faculty_email} onChange={v=>setClassForm({...classForm,faculty_email:v})}/><Field label="Subject name" value={classForm.name} onChange={v=>setClassForm({...classForm,name:v})}/><Field label="Subject code" value={classForm.code} onChange={v=>setClassForm({...classForm,code:v})}/><Field label="Section" value={classForm.section} onChange={v=>setClassForm({...classForm,section:v})}/><Action disabled={saving}>Assign class</Action></form></Panel><Panel><h2 className="font-semibold">Current class allocations</h2>{classes.length===0?<Empty title="No classes allocated" detail="Assign a faculty member to a subject and section above."/>:<div className="space-y-2">{classes.map(item=><div key={item.id} className="rounded-xl border border-dark-border p-3 flex flex-wrap justify-between gap-2"><div><b>{item.name}</b><p className="text-xs text-dark-muted">{item.code||'No course code'} · {item.section}</p></div><span className="text-xs text-dark-muted">{staff.find(s=>s.id===item.faculty_user_id)?.name||'Faculty account'}</span></div>)}</div>}</Panel></>}
    {path==='mentors'&&<><Panel><h2 className="font-semibold">Assign mentor to student</h2><form onSubmit={e=>void save(e,'/campus/mentor/assignments',mentorForm,()=>setMentorForm({mentor_email:'',student_email:''}))} className="grid md:grid-cols-2 gap-3"><Field label="Mentor account email" value={mentorForm.mentor_email} onChange={v=>setMentorForm({...mentorForm,mentor_email:v})}/><Field label="Student account email" value={mentorForm.student_email} onChange={v=>setMentorForm({...mentorForm,student_email:v})}/><Action disabled={saving}>Assign student</Action></form></Panel><Panel><h2 className="font-semibold">Current mentor assignments</h2>{assignments.length===0?<Empty title="No mentor assignments" detail="Assign students above."/>:<div className="space-y-2">{assignments.map(a=><div key={a.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-dark-border p-3"><p className="text-sm"><b>{a.mentor_name}</b> → {a.student_name}</p><Action secondary onClick={async()=>{await api.delete(`/workspaces/admin/mentor-assignments/${a.id}`);await load()}}>Remove</Action></div>)}</div>}</Panel></>}
  </div>
}

// ---------------------------------------------------------------------------
// Student classroom
// ---------------------------------------------------------------------------

export function StudentClassroom() {
  const [data,setData]=useState<Row>({assignments:[],marks:[],resources:[],timetable:[]})
  const [jobs,setJobs]=useState<Job[]>([])
  const [applications,setApplications]=useState<Row[]>([])
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(0)
  const [submission,setSubmission]=useState<Record<number,string>>({})
  const [coverNotes,setCoverNotes]=useState<Record<number,string>>({})
  const load=async()=>{
    setError('')
    try{const [c,j,a]=await Promise.all([api.get('/workspaces/student/classroom'),api.get('/workspaces/student/jobs'),api.get('/workspaces/student/applications')]);setData(c.data||{});setJobs(j.data||[]);setApplications(a.data||[])}
    catch(e:any){setError(e?.response?.data?.detail||'Could not load your classroom.')}
  }
  useEffect(()=>{void load()},[])
  const submitAssignment=async(id:number)=>{
    setBusy(id);setError('')
    try{await api.post(`/workspaces/student/classroom/assignments/${id}/submit`,{submission_text:submission[id]||null});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not submit assignment.')}
    finally{setBusy(0)}
  }
  const apply=async(job:Job)=>{
    setBusy(job.id);setError('')
    try{await api.post(`/workspaces/student/jobs/${job.id}/apply`,{cover_note:coverNotes[job.id]||null});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not apply. Enable recruiter profile sharing in Profile first.')}
    finally{setBusy(0)}
  }
  return <div className="max-w-7xl mx-auto space-y-6">
    <Header eyebrow="Student workspace" title="Classroom & opportunities" description="Your faculty-published assignments, marks, learning materials, timetable and student job applications." onRefresh={()=>void load()}/>
    <ErrorLine message={error}/>
    {data.registration_required&&<Panel><p className="font-semibold">Complete your student registration details</p><p className="text-sm text-dark-muted">Add your registration number and section in Campus Portal to see classroom materials for your class.</p></Panel>}
    <Panel><h2 className="font-semibold">Assignments</h2>{(data.assignments||[]).length===0?<Empty title="No assignments published" detail="Assignments shared by your faculty will appear here."/>:<div className="space-y-3">{data.assignments.map((a:Row)=><article key={a.id} className="rounded-xl border border-dark-border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{a.title}</h3><p className="text-xs text-dark-muted">{a.subject} · {a.points} points · {a.due_at?new Date(a.due_at).toLocaleString():'No deadline'}</p></div>{a.submission&&<span className="text-xs text-emerald-300">Submitted · {a.submission.marks_awarded==null?'Awaiting review':`${a.submission.marks_awarded} points`}</span>}</div><p className="text-sm whitespace-pre-wrap">{a.instructions}</p>{a.attachment_url&&<a href={a.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-primary">Open assignment attachment ↗</a>}<TextArea label="Your submission / link" value={submission[a.id]||''} onChange={v=>setSubmission({...submission,[a.id]:v})} placeholder="Enter your answer or a shared document link"/>{a.submission?.feedback&&<p className="text-xs text-dark-muted">Faculty feedback: {a.submission.feedback}</p>}<Action onClick={()=>void submitAssignment(a.id)} disabled={busy===a.id}>{a.submission?'Update submission':'Submit assignment'}</Action></article>)}</div>}</Panel>
    <div className="grid lg:grid-cols-2 gap-4"><Panel><h2 className="font-semibold">Marks & results</h2>{(data.marks||[]).length===0?<Empty title="No marks published" detail="Your assessment marks will appear after faculty enters them."/>:(data.marks||[]).map((m:Row,i:number)=><div key={i} className="flex justify-between gap-3 border-b border-dark-border py-2 text-sm"><div><b>{m.subject}</b><p className="text-xs text-dark-muted">{m.assessment}</p></div><b>{m.marks_obtained} / {m.max_marks}</b></div>)}</Panel><Panel><h2 className="font-semibold">Learning materials</h2>{(data.resources||[]).length===0?<Empty title="No materials published" detail="Your teacher's PDF and study links will appear here."/>:(data.resources||[]).map((r:Row,i:number)=><div key={i} className="border-b border-dark-border py-2"><b className="text-sm">{r.title}</b><p className="text-xs text-dark-muted">{r.subject} · {r.description}</p><a href={r.resource_url} target="_blank" rel="noreferrer" className="text-xs text-primary">Open material ↗</a></div>)}</Panel></div>
    <Panel><h2 className="font-semibold">Weekly timetable</h2>{(data.timetable||[]).length===0?<Empty title="No class timetable yet" detail="Your teacher or administrator has not published any class timings."/>:<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">{data.timetable.map((t:Row,i:number)=><div key={i} className="rounded-xl border border-dark-border p-3"><b>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][t.weekday]}</b><p className="text-sm">{t.subject}</p><p className="text-xs text-dark-muted">{t.starts_at}–{t.ends_at} · {t.room||'Room not set'}</p></div>)}</div>}</Panel>
    <Panel><h2 className="font-semibold">Internships & job openings</h2>{jobs.length===0?<Empty title="No active job openings" detail="New openings from recruiters will appear here."/>:<div className="space-y-3">{jobs.map(job=><article key={job.id} className="rounded-xl border border-dark-border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><div><b>{job.title}</b><p className="text-xs text-dark-muted">{job.company} · {job.employment_type} · {job.location||'Location not specified'}</p></div>{job.applied?<span className="text-xs text-emerald-300">Applied</span>:<Action onClick={()=>void apply(job)} disabled={busy===job.id}>Apply</Action>}</div><p className="text-sm">{job.description}</p><p className="text-xs text-dark-muted">{job.skills.join(' · ')}{job.deadline?' · Deadline '+job.deadline:''}</p>{!job.applied&&<TextArea label="Optional cover note" value={coverNotes[job.id]||''} onChange={v=>setCoverNotes({...coverNotes,[job.id]:v})}/>}</article>)}</div>}</Panel>
    <Panel><h2 className="font-semibold">My applications</h2>{applications.length===0?<Empty title="No applications submitted" detail="Your job applications and hiring stage will appear here."/>:applications.map(a=><div key={a.id} className="flex justify-between gap-3 border-b border-dark-border py-2"><div><b>{a.job_title}</b><p className="text-xs text-dark-muted">{a.company}</p></div><span className="text-xs capitalize text-primary">{a.status}</span></div>)}</Panel>
  </div>
}
