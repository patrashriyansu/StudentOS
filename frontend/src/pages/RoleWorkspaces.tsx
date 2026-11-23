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
  const [selectedCandidate, setSelectedCandidate] = useState<Row | null>(null)
  const [candidateLoading, setCandidateLoading] = useState(false)
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
  const openCandidate = async (studentId: number) => {
    setCandidateLoading(true); setError('')
    try {
      const response = await api.get(`/workspaces/recruiter/candidates/${studentId}`)
      setSelectedCandidate(response.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load the full candidate profile.')
    } finally { setCandidateLoading(false) }
  }
  const downloadPdf = async (endpoint: string, filename: string) => {
    try {
      const response = await api.get(endpoint, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = filename; anchor.click()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not download this resume.')
    }
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
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{c.name}</h3><p className="text-xs text-dark-muted">{[c.course, c.branch].filter(Boolean).join(' · ') || 'Course not provided'} {c.passing_out_year ? '· Batch ' + c.passing_out_year : ''}</p><p className="text-xs text-dark-muted">{c.college || 'College not provided'}</p></div><div className="flex gap-2"><Action secondary onClick={() => void saveCandidate(c.student_id)}>Save</Action><Action onClick={() => void openCandidate(c.student_id)}>Full profile</Action></div></div>
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
    {path === 'applications' && <Panel><h2 className="font-semibold">Applications received</h2>{applications.length === 0 ? <Empty title="No applications yet" detail="Applications to your active job openings will appear here."/> : <div className="space-y-3">{applications.map(app => <article key={app.id} className="rounded-xl border border-dark-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{app.student_name}</h3><p className="text-xs text-dark-muted">{app.job_title} · {app.company}</p>{app.email && <p className="text-xs mt-1">{app.email}</p>}</div><SelectField label="Stage" value={app.status} onChange={v => void updateApplication(app, v)} options={['applied','shortlisted','interview','selected','rejected'].map(v => ({ value: v, label: v.replace('_',' ') }))}/></div><p className="text-sm mt-2">{app.cover_note || 'No cover note provided.'}</p><div className="flex flex-wrap items-center justify-between gap-2 mt-3"><p className="text-xs text-dark-muted">Applied {new Date(app.created_at).toLocaleString()}</p>{app.resume_available && <Action secondary onClick={() => void downloadPdf(`/workspaces/recruiter/applications/${app.id}/resume`,app.resume_filename||`application-${app.id}-resume.pdf`)}>Download submitted resume</Action>}</div></article>)}</div>}</Panel>}
    {selectedCandidate && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
      <section role="dialog" aria-modal="true" aria-label="Full candidate profile" className="w-full max-w-4xl rounded-2xl border border-dark-border bg-dark-card p-4 sm:p-6 space-y-5 shadow-2xl my-4">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs uppercase tracking-widest text-primary font-semibold">Candidate profile</p><h2 className="text-2xl font-bold mt-1">{selectedCandidate.name}</h2><p className="text-sm text-dark-muted">{[selectedCandidate.college, selectedCandidate.branch, selectedCandidate.passing_out_year ? 'Batch ' + selectedCandidate.passing_out_year : null].filter(Boolean).join(' · ')}</p></div>
          <button type="button" onClick={() => setSelectedCandidate(null)} className="rounded-lg border border-dark-border px-3 py-2 text-sm">Close</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedCandidate.email && <span className="rounded-lg bg-dark-lighter border border-dark-border px-3 py-2 text-sm">{selectedCandidate.email}</span>}
          {selectedCandidate.phone && <span className="rounded-lg bg-dark-lighter border border-dark-border px-3 py-2 text-sm">{selectedCandidate.phone}</span>}
          {selectedCandidate.bio && <p className="basis-full text-sm text-dark-muted">{selectedCandidate.bio}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Panel><h3 className="font-semibold">Skills & interests</h3><div className="flex flex-wrap gap-1.5 mt-2">{(selectedCandidate.skills||[]).map((v:string)=><span key={v} className="rounded-md bg-primary/10 text-primary px-2 py-1 text-xs">{v}</span>)}</div><p className="text-xs text-dark-muted mt-2">{(selectedCandidate.interests||[]).join(' · ') || 'No interests added'}</p></Panel>
          <Panel><h3 className="font-semibold">Projects & achievements</h3><p className="text-sm text-dark-muted mt-2">{(selectedCandidate.achievements||[]).join(' · ') || 'No achievements added to the profile'}</p></Panel>
        </div>
        <Panel><h3 className="font-semibold">Professional links</h3><div className="flex flex-wrap gap-3 text-sm text-primary mt-2">{selectedCandidate.linkedin_url&&<a href={selectedCandidate.linkedin_url} target="_blank" rel="noreferrer">LinkedIn ↗</a>}{selectedCandidate.github_url&&<a href={selectedCandidate.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}{selectedCandidate.portfolio_url&&<a href={selectedCandidate.portfolio_url} target="_blank" rel="noreferrer">Portfolio ↗</a>}{selectedCandidate.leetcode_username&&<a href={`https://leetcode.com/u/${encodeURIComponent(selectedCandidate.leetcode_username)}/`} target="_blank" rel="noreferrer">LeetCode ↗</a>}</div><div className="grid grid-cols-4 gap-2 bg-dark-lighter rounded-xl p-3 mt-3 text-center">{[['Solved',selectedCandidate.total_problems_solved],['Easy',selectedCandidate.easy_solved],['Medium',selectedCandidate.medium_solved],['Hard',selectedCandidate.hard_solved]].map(([k,v])=><div key={String(k)}><b>{v as number}</b><p className="text-[10px] text-dark-muted">{k}</p></div>)}</div></Panel>
        <Panel><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Resume</h3><p className="text-xs text-dark-muted">Visible only because this student explicitly enabled resume sharing.</p></div>{selectedCandidate.resume_visible && selectedCandidate.resume_documents?.length>0 && <Action onClick={() => void downloadPdf(`/workspaces/recruiter/candidates/${selectedCandidate.student_id}/resume`,selectedCandidate.resume_documents[0].filename)}>Download PDF</Action>}</div>{!selectedCandidate.resume_visible?<p className="text-sm text-dark-muted mt-2">The student has not enabled resume sharing.</p>:selectedCandidate.resume_documents?.length ? <p className="text-sm mt-2">{selectedCandidate.resume_documents[0].filename} · {Math.ceil(selectedCandidate.resume_documents[0].file_size/1024)} KB</p>:<p className="text-sm text-dark-muted mt-2">No resume uploaded.</p>}{selectedCandidate.external_resume_url&&<a className="text-xs text-primary" href={selectedCandidate.external_resume_url} target="_blank" rel="noreferrer">Open external resume link ↗</a>}</Panel>
        <Panel><div className="flex items-center justify-between gap-2"><div><h3 className="font-semibold">Academic record</h3><p className="text-xs text-dark-muted">CGPA, SGPA and marks are shown only with separate academic consent.</p></div><span className={"rounded-full px-3 py-1 text-xs "+(selectedCandidate.academic_records_visible?"bg-emerald-500/10 text-emerald-300":"bg-dark-lighter text-dark-muted")}>{selectedCandidate.academic_records_visible?"Shared by student":"Not shared"}</span></div>
          {selectedCandidate.academic ? <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">{[['CGPA',selectedCandidate.academic.cgpa],['Latest SGPA',selectedCandidate.academic.sgpa],['Course',selectedCandidate.academic.course],['Semester',selectedCandidate.academic.current_semester]].map(([k,v])=><div key={String(k)} className="rounded-xl bg-dark-lighter p-3"><p className="text-xs text-dark-muted">{k}</p><b>{v??'—'}</b></div>)}</div>
            <h4 className="font-medium mt-4">Semester grade records</h4>{selectedCandidate.academic.semester_results?.length?<div className="overflow-x-auto mt-2"><table className="w-full text-sm"><thead><tr className="text-dark-muted text-left"><th className="p-2">Semester</th><th className="p-2">Subject</th><th className="p-2">Credits</th><th className="p-2">Grade</th><th className="p-2">Grade point</th></tr></thead><tbody>{selectedCandidate.academic.semester_results.map((g:Row,i:number)=><tr key={i} className="border-t border-dark-border"><td className="p-2">{g.semester}</td><td className="p-2">{g.subject}</td><td className="p-2">{g.credits}</td><td className="p-2">{g.grade||'—'}</td><td className="p-2">{g.grade_point}</td></tr>)}</tbody></table></div>:<p className="text-xs text-dark-muted mt-2">No semester grade records.</p>}
            <h4 className="font-medium mt-4">Assessment marks</h4>{selectedCandidate.academic.class_assessments?.length?<div className="overflow-x-auto mt-2"><table className="w-full text-sm"><thead><tr className="text-dark-muted text-left"><th className="p-2">Subject</th><th className="p-2">Assessment</th><th className="p-2">Marks</th><th className="p-2">Remarks</th></tr></thead><tbody>{selectedCandidate.academic.class_assessments.map((g:Row,i:number)=><tr key={i} className="border-t border-dark-border"><td className="p-2">{g.subject}</td><td className="p-2">{g.assessment}</td><td className="p-2">{g.marks_obtained} / {g.max_marks}</td><td className="p-2">{g.remarks||'—'}</td></tr>)}</tbody></table></div>:<p className="text-xs text-dark-muted mt-2">No assessment marks recorded.</p>}
          </>:<p className="text-sm text-dark-muted mt-3">Academic details are hidden by default. The student can enable this section in Profile → Recruiter Sharing.</p>}
        </Panel>
        <div className="flex justify-end"><button type="button" onClick={() => setSelectedCandidate(null)} className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold">Close profile</button></div>
      </section>
    </div>}
    {candidateLoading && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="rounded-xl bg-dark-card border border-dark-border p-5 text-sm">Loading full candidate profile…</div></div>}
  </div>
}

// ---------------------------------------------------------------------------
// Mentor
// ---------------------------------------------------------------------------

export function MentorWorkspace() {
  const path = usePathSection()
  const [summary,setSummary]=useState<Row>({})
  const [students,setStudents]=useState<Row[]>([])
  const [programmes,setProgrammes]=useState<Row[]>([])
  const [sessions,setSessions]=useState<Row[]>([])
  const [goals,setGoals]=useState<Row[]>([])
  const [actions,setActions]=useState<Row[]>([])
  const [checkins,setCheckins]=useState<Row[]>([])
  const [notes,setNotes]=useState<Row[]>([])
  const [sessionFeedback,setSessionFeedback]=useState<Row[]>([])
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const [programmeForm,setProgrammeForm]=useState({student_id:'',title:'',focus_area:'Career readiness',description:'',start_date:new Date().toISOString().slice(0,10),target_end_date:'',meeting_cadence:'biweekly'})
  const [sessionForm,setSessionForm]=useState({student_id:'',scheduled_at:'',duration_minutes:'30',meeting_link:'',agenda:''})
  const [goalForm,setGoalForm]=useState({program_id:'',title:'',category:'Career readiness',desired_outcome:'',success_measure:'',baseline:'',target:'',priority:'medium',due_date:''})
  const [actionForm,setActionForm]=useState({goal_id:'',title:'',description:'',owner:'student',due_date:'',resource_url:''})
  const [noteForm,setNoteForm]=useState({student_id:'',body:''})
  const [replies,setReplies]=useState<Record<number,string>>({})

  const load=async()=>{
    setError('')
    try{
      const [s,st,p,se,g,ac,ci,n,fb]=await Promise.all([
        api.get('/workspaces/mentor/program-dashboard'),
        api.get('/campus/mentor/students'),
        api.get('/workspaces/mentor/programmes'),
        api.get('/workspaces/mentor/sessions'),
        api.get('/workspaces/mentor/development-goals'),
        api.get('/workspaces/mentor/action-items'),
        api.get('/workspaces/mentor/check-ins'),
        api.get('/workspaces/mentor/notes'),
        api.get('/workspaces/mentor/session-feedback'),
      ])
      setSummary(s.data||{});setStudents(st.data||[]);setProgrammes(p.data||[])
      setSessions(se.data||[]);setGoals(g.data||[]);setActions(ac.data||[])
      setCheckins(ci.data||[]);setNotes(n.data||[]);setSessionFeedback(fb.data||[])
    }catch(e:any){setError(e?.response?.data?.detail||'Could not load the mentoring workspace.')}
  }
  useEffect(()=>{void load()},[])
  const submit=async(event:FormEvent,endpoint:string,payload:Row,reset:()=>void)=>{
    event.preventDefault();setSaving(true);setError('')
    try{
      const body=endpoint==='/workspaces/mentor/sessions'&&payload.scheduled_at
        ?{...payload,scheduled_at:new Date(payload.scheduled_at).toISOString()}
        :payload
      await api.post(endpoint,body);reset();await load()
    }catch(e:any){setError(e?.response?.data?.detail||'Could not save this mentoring record.')}
    finally{setSaving(false)}
  }
  const updateProgramme=async(id:number,status:string)=>{
    setSaving(true);setError('')
    try{await api.patch(`/workspaces/mentor/programmes/${id}`,{status});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not update the programme.')}
    finally{setSaving(false)}
  }
  const updateGoal=async(goal:Row)=>{
    const value=window.prompt('Progress percentage (0–100)',String(goal.progress_percent??0))
    if(value===null)return
    const progress=Number(value)
    if(!Number.isInteger(progress)||progress<0||progress>100){setError('Progress must be a whole number from 0 to 100.');return}
    const status=progress===100?'completed':progress===0?'not_started':'in_progress'
    setSaving(true);setError('')
    try{await api.patch(`/workspaces/mentor/development-goals/${goal.id}`,{progress_percent:progress,status});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not update goal progress.')}
    finally{setSaving(false)}
  }
  const updateAction=async(id:number,status:string)=>{
    setSaving(true);setError('')
    try{await api.patch(`/workspaces/mentor/action-items/${id}`,{status});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not update action item.')}
    finally{setSaving(false)}
  }
  const reply=async(id:number)=>{
    const body=replies[id]?.trim()
    if(!body){setError('Write a response before sending it.');return}
    setSaving(true);setError('')
    try{await api.post(`/workspaces/mentor/check-ins/${id}/reply`,{mentor_reply:body});setReplies({...replies,[id]:''});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not send the check-in response.')}
    finally{setSaving(false)}
  }
  const updateSession=async(id:number,status:string)=>{
    setSaving(true);setError('')
    try{await api.patch(`/workspaces/mentor/sessions/${id}`,{status});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not update this session.')}
    finally{setSaving(false)}
  }
  const titleMap:Record<string,string>={
    overview:'Mentoring portfolio',students:'Mentee directory',programmes:'Development programmes',
    sessions:'Mentoring sessions',goals:'Growth goals',actions:'Action items',
    'check-ins':'Progress check-ins',notes:'Private notes',
  }
  const pendingCheckins=checkins.filter(c=>!c.mentor_reply)
  const openActions=actions.filter(a=>a.status!=='completed')
  const activePrograms=programmes.filter(p=>p.status==='active')
  return <div className="max-w-7xl mx-auto space-y-6">
    <Header eyebrow="Mentor workspace" title={titleMap[path]||'Mentoring portfolio'} description="A structured mentoring programme with shared goals, clear ownership, regular check-ins and measurable outcomes." onRefresh={()=>void load()}/>
    <ErrorLine message={error}/>
    {path==='overview'&&<>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Stat label="Assigned mentees" value={summary.assigned_students??0} icon={Users}/>
        <Stat label="Programmes" value={summary.programmes??0} icon={ClipboardCheck}/>
        <Stat label="Active plans" value={summary.active_programmes??0} icon={Target}/>
        <Stat label="Awaiting acceptance" value={summary.awaiting_acceptance??0} icon={Clock3}/>
        <Stat label="Open goals" value={summary.open_goals??0} icon={GraduationCap}/>
        <Stat label="Open actions" value={summary.pending_actions??0} icon={CheckCircle2}/>
        <Stat label="Check-ins to review" value={summary.checkins_to_review??0} icon={FileText}/>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2"><div className="flex justify-between items-center gap-2"><h2 className="font-semibold">Programme activity</h2><span className="text-xs text-dark-muted">{programmes.length} plans</span></div>
          {programmes.length===0?<Empty title="No programmes created" detail="Start by choosing an assigned mentee and sending them a development programme to accept."/>:<div className="space-y-2">{programmes.slice(0,5).map(p=><div key={p.id} className="rounded-xl border border-dark-border p-3 flex flex-wrap items-center justify-between gap-2"><div><b>{p.title}</b><p className="text-xs text-dark-muted">{p.student_name} · {p.focus_area}</p></div><span className="text-xs rounded-full bg-dark-lighter px-3 py-1 capitalize">{p.status.replace('_',' ')}</span></div>)}</div>}
        </Panel>
        <Panel><h2 className="font-semibold">Needs your attention</h2><div className="space-y-3 text-sm"><div className="flex items-center justify-between"><span className="text-dark-muted">Check-ins awaiting reply</span><b>{pendingCheckins.length}</b></div><div className="flex items-center justify-between"><span className="text-dark-muted">Actions still open</span><b>{openActions.length}</b></div><div className="flex items-center justify-between"><span className="text-dark-muted">Upcoming sessions</span><b>{summary.upcoming_sessions??0}</b></div><p className="text-xs text-dark-muted border-t border-dark-border pt-3">Review the student’s updates before each meeting and close the loop with specific feedback and next steps.</p></div></Panel>
      </div>
      <Panel><h2 className="font-semibold">Your mentees</h2>{students.length===0?<Empty title="No mentees assigned yet" detail="Ask the administrator to assign students to your mentor account."/>:<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{students.slice(0,6).map(s=><article key={s.student_id} className="rounded-xl border border-dark-border p-3"><p className="font-semibold">{s.name}</p><p className="text-xs text-dark-muted">{[s.course,s.branch,s.section].filter(Boolean).join(' · ')}</p><p className="text-xs text-dark-muted mt-1">Semester {s.current_semester??'—'} · Batch {s.passing_out_year??'—'}</p></article>)}</div>}</Panel>
    </>}
    {path==='students'&&<Panel><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Assigned mentees</h2><span className="text-xs text-dark-muted">{students.length} assigned</span></div>{students.length===0?<Empty title="No mentees assigned" detail="Administrator-approved assignments will appear here."/>:<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{students.map(s=>{const plan=programmes.find(p=>p.student_id===s.student_id);return <article key={s.student_id} className="rounded-xl border border-dark-border p-4 space-y-2"><div className="flex items-center justify-between gap-2"><div className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center font-bold">{s.name?.slice(0,1)}</div><span className="text-xs bg-dark-lighter rounded-full px-2.5 py-1">{plan?.status?.replace('_',' ')||'No plan yet'}</span></div><h3 className="font-semibold">{s.name}</h3><p className="text-xs text-dark-muted">{[s.course,s.branch,s.college].filter(Boolean).join(' · ')}</p><p className="text-xs text-dark-muted">Section {s.section||'—'} · Year {s.current_year??'—'} · Semester {s.current_semester??'—'}</p><p className="text-xs text-dark-muted border-t border-dark-border pt-2">Academic scores and private placement information are not part of the mentor profile.</p></article>})}</div>}</Panel>}
    {path==='programmes'&&<>
      <Panel><div><h2 className="font-semibold">Create a development programme</h2><p className="text-xs text-dark-muted mt-1">Set an initial focus and meeting cadence. The student must review and accept before goals and actions become active.</p></div>
        <form onSubmit={e=>void submit(e,'/workspaces/mentor/programmes',{...programmeForm,student_id:Number(programmeForm.student_id),target_end_date:programmeForm.target_end_date||null},()=>setProgrammeForm({student_id:'',title:'',focus_area:'Career readiness',description:'',start_date:new Date().toISOString().slice(0,10),target_end_date:'',meeting_cadence:'biweekly'}))} className="grid md:grid-cols-2 gap-3">
          <SelectField label="Assigned mentee" value={programmeForm.student_id} onChange={v=>setProgrammeForm({...programmeForm,student_id:v})} options={[{value:'',label:'Select mentee'},...students.filter(s=>!programmes.some(p=>p.student_id===s.student_id)).map(s=>({value:String(s.student_id),label:s.name}))]}/>
          <Field label="Programme title" required value={programmeForm.title} onChange={v=>setProgrammeForm({...programmeForm,title:v})}/>
          <SelectField label="Focus area" value={programmeForm.focus_area} onChange={v=>setProgrammeForm({...programmeForm,focus_area:v})} options={['Career readiness','Technical skills','Academic progress','Communication','Leadership','Professional growth'].map(v=>({value:v,label:v}))}/>
          <SelectField label="Meeting cadence" value={programmeForm.meeting_cadence} onChange={v=>setProgrammeForm({...programmeForm,meeting_cadence:v})} options={[{value:'weekly',label:'Weekly'},{value:'biweekly',label:'Every two weeks'},{value:'monthly',label:'Monthly'}]}/>
          <Field label="Start date" type="date" required value={programmeForm.start_date} onChange={v=>setProgrammeForm({...programmeForm,start_date:v})}/>
          <Field label="Target review date" type="date" value={programmeForm.target_end_date} onChange={v=>setProgrammeForm({...programmeForm,target_end_date:v})}/>
          <div className="md:col-span-2"><TextArea label="Programme purpose and expectations" value={programmeForm.description} onChange={v=>setProgrammeForm({...programmeForm,description:v})} rows={3}/></div>
          <div className="md:col-span-2"><Action disabled={saving||!programmeForm.student_id}><Plus size={14}/>Send programme for acceptance</Action></div>
        </form>
      </Panel>
      <Panel><h2 className="font-semibold">Programme portfolio</h2>{programmes.length===0?<Empty title="No programmes yet" detail="Create a programme for one of your assigned mentees."/>:<div className="space-y-3">{programmes.map(p=><article key={p.id} className="rounded-xl border border-dark-border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{p.title}</h3><p className="text-xs text-dark-muted">{p.student_name} · {p.focus_area}</p><p className="text-xs text-dark-muted">{p.start_date}{p.target_end_date?' → '+p.target_end_date:''} · {p.meeting_cadence}</p></div><span className="text-xs rounded-full bg-dark-lighter px-3 py-1 capitalize">{p.status.replace('_',' ')}</span></div><p className="text-sm text-dark-muted mt-2">{p.description}</p>{p.status==='awaiting_student'&&<p className="text-xs text-amber-300 mt-2">Waiting for the mentee to review and accept the plan.</p>}{(p.status==='active'||p.status==='paused')&&<div className="flex gap-2 mt-3">{p.status==='active'?<Action secondary onClick={()=>void updateProgramme(p.id,'paused')} disabled={saving}>Pause</Action>:<Action onClick={()=>void updateProgramme(p.id,'active')} disabled={saving}>Resume</Action>}<Action secondary onClick={()=>void updateProgramme(p.id,'completed')} disabled={saving}>Close programme</Action></div>}</article>)}</div>}</Panel>
    </>}
    {path==='sessions'&&<>
      <Panel><h2 className="font-semibold">Schedule a mentoring session</h2><form onSubmit={e=>void submit(e,'/workspaces/mentor/sessions',{...sessionForm,student_id:Number(sessionForm.student_id),duration_minutes:Number(sessionForm.duration_minutes)},()=>setSessionForm({student_id:'',scheduled_at:'',duration_minutes:'30',meeting_link:'',agenda:''}))} className="grid md:grid-cols-2 gap-3">
        <SelectField label="Mentee" value={sessionForm.student_id} onChange={v=>setSessionForm({...sessionForm,student_id:v})} options={[{value:'',label:'Select mentee'},...students.map(s=>({value:String(s.student_id),label:s.name}))]}/>
        <Field label="Date and time" type="datetime-local" required value={sessionForm.scheduled_at} onChange={v=>setSessionForm({...sessionForm,scheduled_at:v})}/>
        <Field label="Duration (minutes)" type="number" value={sessionForm.duration_minutes} onChange={v=>setSessionForm({...sessionForm,duration_minutes:v})}/>
        <Field label="Meeting link" value={sessionForm.meeting_link} onChange={v=>setSessionForm({...sessionForm,meeting_link:v})}/>
        <div className="md:col-span-2"><TextArea label="Agenda and preparation" value={sessionForm.agenda} onChange={v=>setSessionForm({...sessionForm,agenda:v})} rows={3}/></div>
        <Action disabled={saving||!sessionForm.student_id}><Plus size={14}/>Schedule session</Action>
      </form></Panel>
      <Panel><h2 className="font-semibold">Sessions and outcomes</h2>{sessions.length===0?<Empty title="No sessions scheduled" detail="Schedule the first structured mentoring conversation above."/>:<div className="space-y-2">{sessions.map(s=><article key={s.id} className="rounded-xl border border-dark-border p-3 flex flex-wrap items-center justify-between gap-3"><div><b>{s.student_name}</b><p className="text-xs text-dark-muted">{new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min</p>{s.agenda&&<p className="text-sm mt-1">{s.agenda}</p>}{s.meeting_link&&<a className="text-xs text-primary" href={s.meeting_link} target="_blank" rel="noreferrer">Open meeting link ↗</a>}{sessionFeedback.filter(f=>f.session_id===s.id).map(f=><p key={f.id} className="text-xs text-dark-muted mt-2">Mentee feedback: {f.rating}/5 · {f.takeaways}</p>)}</div><SelectField label="Status" value={s.status} onChange={v=>void updateSession(s.id,v)} options={['scheduled','completed','cancelled'].map(v=>({value:v,label:v}))}/></article>)}</div>}</Panel>
    </>}
    {path==='goals'&&<>
      <Panel><h2 className="font-semibold">Create a measurable development goal</h2><form onSubmit={e=>void submit(e,'/workspaces/mentor/development-goals',{...goalForm,program_id:Number(goalForm.program_id),due_date:goalForm.due_date||null},()=>setGoalForm({program_id:'',title:'',category:'Career readiness',desired_outcome:'',success_measure:'',baseline:'',target:'',priority:'medium',due_date:''}))} className="grid md:grid-cols-2 gap-3">
        <SelectField label="Active programme" value={goalForm.program_id} onChange={v=>setGoalForm({...goalForm,program_id:v})} options={[{value:'',label:'Select active programme'},...activePrograms.map(p=>({value:String(p.id),label:`${p.student_name} · ${p.title}`}))]}/>
        <Field label="Goal title" required value={goalForm.title} onChange={v=>setGoalForm({...goalForm,title:v})}/>
        <SelectField label="Competency area" value={goalForm.category} onChange={v=>setGoalForm({...goalForm,category:v})} options={['Technical skills','Career readiness','Academic progress','Communication','Leadership','Professionalism','Teamwork','Technology','Personal growth'].map(v=>({value:v,label:v}))}/>
        <SelectField label="Priority" value={goalForm.priority} onChange={v=>setGoalForm({...goalForm,priority:v})} options={['low','medium','high'].map(v=>({value:v,label:v}))}/>
        <Field label="Baseline" value={goalForm.baseline} onChange={v=>setGoalForm({...goalForm,baseline:v})} placeholder="Current state"/>
        <Field label="Target" value={goalForm.target} onChange={v=>setGoalForm({...goalForm,target:v})} placeholder="Desired state"/>
        <Field label="Due date" type="date" value={goalForm.due_date} onChange={v=>setGoalForm({...goalForm,due_date:v})}/>
        <TextArea label="Desired outcome" value={goalForm.desired_outcome} onChange={v=>setGoalForm({...goalForm,desired_outcome:v})}/>
        <div className="md:col-span-2"><TextArea label="How will success be measured?" value={goalForm.success_measure} onChange={v=>setGoalForm({...goalForm,success_measure:v})}/></div>
        <div className="md:col-span-2"><Action disabled={saving||!goalForm.program_id}><Plus size={14}/>Create goal</Action></div>
      </form></Panel>
      <Panel><h2 className="font-semibold">Development goal tracker</h2>{goals.length===0?<Empty title="No goals recorded" detail="Goals can be created after a mentee accepts a programme."/>:<div className="space-y-3">{goals.map(g=><article key={g.id} className="rounded-xl border border-dark-border p-4"><div className="flex flex-wrap justify-between gap-2"><div><b>{g.title}</b><p className="text-xs text-dark-muted">{g.student_name} · {g.category} · {g.priority} priority</p></div><Action secondary onClick={()=>void updateGoal(g)} disabled={saving}>Update progress</Action></div><p className="text-sm mt-2">{g.desired_outcome}</p><p className="text-xs text-dark-muted mt-1">Measure: {g.success_measure} · {g.baseline||'—'} → {g.target||'—'}</p><div className="flex justify-between text-xs mt-3"><span className="capitalize text-dark-muted">{g.status.replace('_',' ')}</span><b>{g.progress_percent}%</b></div><div className="h-2 bg-dark-lighter rounded-full overflow-hidden mt-1"><div className="h-full bg-primary rounded-full" style={{width:`${g.progress_percent}%`}}/></div><p className="text-xs text-dark-muted mt-2">Due {g.due_date||'not set'}</p></article>)}</div>}</Panel>
    </>}
    {path==='actions'&&<>
      <Panel><h2 className="font-semibold">Assign a next action</h2><form onSubmit={e=>void submit(e,'/workspaces/mentor/action-items',{...actionForm,goal_id:Number(actionForm.goal_id),due_date:actionForm.due_date||null,resource_url:actionForm.resource_url||null},()=>setActionForm({goal_id:'',title:'',description:'',owner:'student',due_date:'',resource_url:''}))} className="grid md:grid-cols-2 gap-3">
        <SelectField label="Related growth goal" value={actionForm.goal_id} onChange={v=>setActionForm({...actionForm,goal_id:v})} options={[{value:'',label:'Select a growth goal'},...goals.map(g=>({value:String(g.id),label:`${g.student_name} · ${g.title}`}))]}/>
        <Field label="Action item" required value={actionForm.title} onChange={v=>setActionForm({...actionForm,title:v})}/>
        <SelectField label="Owner" value={actionForm.owner} onChange={v=>setActionForm({...actionForm,owner:v})} options={[{value:'student',label:'Mentee / Student'},{value:'mentor',label:'Mentor'}]}/>
        <Field label="Due date" type="date" value={actionForm.due_date} onChange={v=>setActionForm({...actionForm,due_date:v})}/>
        <Field label="Reference link (optional)" value={actionForm.resource_url} onChange={v=>setActionForm({...actionForm,resource_url:v})}/>
        <TextArea label="Instructions" value={actionForm.description} onChange={v=>setActionForm({...actionForm,description:v})}/>
        <Action disabled={saving||!actionForm.goal_id}><Plus size={14}/>Add action item</Action>
      </form></Panel>
      <Panel><h2 className="font-semibold">Shared action board</h2>{actions.length===0?<Empty title="No action items yet" detail="Add concrete tasks, assign an owner and add a due date."/>:<div className="space-y-2">{actions.map(item=><div key={item.id} className="rounded-xl border border-dark-border p-3 flex flex-wrap items-center justify-between gap-3"><div><b>{item.title}</b><p className="text-xs text-dark-muted">{item.student_name} · {item.goal_title} · {item.owner==='student'?'Mentee':'Mentor'} · {item.due_date||'No due date'}</p>{item.description&&<p className="text-sm mt-1">{item.description}</p>}{item.resource_url&&<a href={item.resource_url} target="_blank" rel="noreferrer" className="text-xs text-primary">Open resource ↗</a>}</div><SelectField label="Status" value={item.status} onChange={v=>void updateAction(item.id,v)} options={['not_started','in_progress','completed','blocked'].map(v=>({value:v,label:v.replace('_',' ')}))}/></div>)}</div>}</Panel>
    </>}
    {path==='check-ins'&&<Panel><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Mentee progress check-ins</h2><span className="text-xs text-dark-muted">{pendingCheckins.length} awaiting your reply</span></div>{checkins.length===0?<Empty title="No check-ins yet" detail="Student weekly updates will be delivered here."/>:<div className="space-y-3">{checkins.map(item=><article key={item.id} className="rounded-xl border border-dark-border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><div><b>{item.student_name}</b><p className="text-xs text-dark-muted">{item.program_title} · {new Date(item.submitted_at).toLocaleString()}</p></div><span className="text-xs rounded-full bg-dark-lighter px-3 py-1">{item.progress_status.replace('_',' ')} · confidence {item.confidence_rating}/5</span></div><div className="grid sm:grid-cols-3 gap-2 text-sm"><div><p className="text-xs text-dark-muted">Wins</p><p>{item.wins||'—'}</p></div><div><p className="text-xs text-dark-muted">Blockers</p><p>{item.blockers||'—'}</p></div><div><p className="text-xs text-dark-muted">Support needed</p><p>{item.support_needed||'—'}</p></div></div>{item.mentor_reply?<p className="text-sm text-emerald-300 border-t border-dark-border pt-2">Your reply: {item.mentor_reply}</p>:<div className="border-t border-dark-border pt-3 space-y-2"><TextArea label="Your coaching response" value={replies[item.id]||''} onChange={v=>setReplies({...replies,[item.id]:v})} placeholder="Acknowledge progress and give one or two concrete next steps."/><div className="flex justify-end"><Action disabled={saving} onClick={()=>void reply(item.id)}>Send reply</Action></div></div>}</article>)}</div>}</Panel>}
    {path==='notes'&&<>
      <Panel><h2 className="font-semibold">Private mentor note</h2><p className="text-xs text-dark-muted">Private to you as the note author. Do not store sensitive personal or medical information here.</p><form onSubmit={e=>void submit(e,'/workspaces/mentor/notes',{...noteForm,student_id:Number(noteForm.student_id)},()=>setNoteForm({student_id:'',body:''}))} className="space-y-3"><SelectField label="Mentee" value={noteForm.student_id} onChange={v=>setNoteForm({...noteForm,student_id:v})} options={[{value:'',label:'Select mentee'},...students.map(s=>({value:String(s.student_id),label:s.name}))]}/><TextArea label="Private meeting notes" value={noteForm.body} onChange={v=>setNoteForm({...noteForm,body:v})} rows={5}/><Action disabled={saving||!noteForm.student_id}><Plus size={14}/>Save note</Action></form></Panel>
      <Panel><h2 className="font-semibold">My notes</h2>{notes.length===0?<Empty title="No private notes" detail="Your one-to-one notes will appear here."/>:<div className="space-y-2">{notes.map(n=><article key={n.id} className="rounded-xl border border-dark-border p-3"><b>{n.student_name}</b><p className="text-sm whitespace-pre-wrap mt-2">{n.body}</p><p className="text-[11px] text-dark-muted mt-2">{new Date(n.updated_at).toLocaleString()}</p></article>)}</div>}</Panel>
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
    {path==='notices'&&<><Panel><h2 className="font-semibold">Publish notice</h2><form onSubmit={publishNotice} className="space-y-3"><Field label="Title" value={noticeForm.title} onChange={v=>setNoticeForm({...noticeForm,title:v})}/><TextArea label="Announcement" value={noticeForm.message} onChange={v=>setNoticeForm({...noticeForm,message:v})}/><div className="grid md:grid-cols-3 gap-2"><SelectField label="Audience" value={noticeForm.audience_type} onChange={v=>setNoticeForm({...noticeForm,audience_type:v})} options={[{value:'section',label:'My assigned section'}]}/><SelectField label="Section" value={noticeForm.section} onChange={v=>setNoticeForm({...noticeForm,section:v})} options={[{value:'',label:'Choose section'},...sections.map(v=>({value:v,label:v}))]}/><SelectField label="Priority" value={noticeForm.priority} onChange={v=>setNoticeForm({...noticeForm,priority:v})} options={['normal','important','urgent'].map(v=>({value:v,label:v}))}/></div><Action disabled={saving}>Publish notice</Action></form></Panel><Panel><h2 className="font-semibold">Current notices</h2>{notices.length===0?<Empty title="No notices" detail="Notices you publish appear here."/>:notices.map(n=><article key={n.id} className="rounded-xl border border-dark-border p-3"><b>{n.title}</b><p className="text-sm mt-1">{n.message}</p></article>)}</Panel></>}
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
  const [resumeDocuments,setResumeDocuments]=useState<Row[]>([])
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [submission,setSubmission]=useState<Record<number,string>>({})
  const [coverNote,setCoverNote]=useState('')
  const [applyingJob,setApplyingJob]=useState<Job|null>(null)
  const [selectedResumeId,setSelectedResumeId]=useState('')
  const [resumeFile,setResumeFile]=useState<File|null>(null)

  const load=async()=>{
    setError('')
    try{
      const [classroom,openJobs,myApplications,resumes]=await Promise.all([
        api.get('/workspaces/student/classroom'),api.get('/workspaces/student/jobs'),
        api.get('/workspaces/student/applications'),api.get('/placements/resume/documents'),
      ])
      setData(classroom.data||{})
      setJobs(Array.isArray(openJobs.data)?openJobs.data:[])
      setApplications(Array.isArray(myApplications.data)?myApplications.data:[])
      setResumeDocuments(Array.isArray(resumes.data)?resumes.data:[])
      if(!selectedResumeId && resumes.data?.length) setSelectedResumeId(String(resumes.data[0].id))
    }catch(e:any){setError(e?.response?.data?.detail||'Could not load your student workspace.')}
  }
  useEffect(()=>{void load()},[])

  const submitAssignment=async(id:number)=>{
    setBusy(true);setError('')
    try{await api.post(`/workspaces/student/classroom/assignments/${id}/submit`,{submission_text:submission[id]||null});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not submit assignment.')}
    finally{setBusy(false)}
  }
  const startApplication=(job:Job)=>{
    setApplyingJob(job);setCoverNote('');setResumeFile(null)
    setSelectedResumeId(resumeDocuments[0]?.id ? String(resumeDocuments[0].id) : '')
  }
  const downloadResume=async(id:number,filename:string)=>{
    try{
      const response=await api.get(`/placements/resume/documents/${id}/download`,{responseType:'blob'})
      const url=window.URL.createObjectURL(new Blob([response.data],{type:'application/pdf'}))
      const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click()
      window.URL.revokeObjectURL(url)
    }catch(e:any){setError(e?.response?.data?.detail||'Could not download the resume.')}
  }
  const removeResume=async(id:number)=>{
    try{await api.delete(`/placements/resume/documents/${id}`);setSelectedResumeId('');await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not remove this resume.')}
  }
  const submitJobApplication=async(event:FormEvent)=>{
    event.preventDefault()
    if(!applyingJob)return
    if(!resumeFile&&!selectedResumeId){setError('Choose an existing PDF resume or upload one before applying.');return}
    if(resumeFile && (!resumeFile.name.toLowerCase().endsWith('.pdf')||resumeFile.size>5*1024*1024)){
      setError('Choose a PDF resume up to 5 MB.');return
    }
    setBusy(true);setError('')
    try{
      let resumeId=Number(selectedResumeId)
      if(resumeFile){
        const form=new FormData();form.append('file',resumeFile)
        const upload=await api.post('/placements/resume/upload',form,{headers:{'Content-Type':'multipart/form-data'}})
        resumeId=Number(upload.data?.resume_document_id||upload.data?.id)
      }
      await api.post(`/workspaces/student/jobs/${applyingJob.id}/apply`,{
        resume_document_id:resumeId,cover_note:coverNote||null,
      })
      setApplyingJob(null);setResumeFile(null);setCoverNote('')
      await load()
    }catch(e:any){setError(e?.response?.data?.detail||'Application could not be submitted.')}
    finally{setBusy(false)}
  }

  return <div className="max-w-7xl mx-auto space-y-6">
    <Header eyebrow="Student workspace" title="Classroom & opportunities" description="Manage assignments and results, keep your resume library ready, and apply to opportunities with the right document." onRefresh={()=>void load()}/>
    <ErrorLine message={error}/>
    {data.registration_required&&<Panel><p className="font-semibold">Complete your student registration details</p><p className="text-sm text-dark-muted">Add your registration number and section in Profile to see classroom materials for your class.</p></Panel>}
    <Panel>
      <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold">My resume library</h2><p className="text-xs text-dark-muted mt-1">Upload and maintain your latest PDF resume. You choose which version to attach to each application.</p></div><span className="rounded-full bg-emerald-500/10 text-emerald-300 px-3 py-1 text-xs">Private by default</span></div>
      <div className="space-y-2">
        {resumeDocuments.length===0?<Empty title="No resume uploaded yet" detail="Upload a PDF resume when applying, or add one from Placement Hub first."/>:resumeDocuments.map(doc=><div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dark-border p-3"><div><p className="font-medium text-sm">{doc.filename}</p><p className="text-xs text-dark-muted">{Math.ceil(doc.file_size/1024)} KB · Added {new Date(doc.created_at).toLocaleDateString()}</p></div><div className="flex gap-2"><Action secondary onClick={()=>void downloadResume(doc.id,doc.filename)}>Download</Action><button type="button" onClick={()=>void removeResume(doc.id)} className="rounded-xl border border-dark-border px-3 py-2 text-xs text-dark-muted">Remove</button></div></div>)}
      </div>
    </Panel>
    <Panel><h2 className="font-semibold">Assignments</h2>{(data.assignments||[]).length===0?<Empty title="No assignments published" detail="Assignments shared by your faculty will appear here."/>:<div className="space-y-3">{data.assignments.map((a:Row)=><article key={a.id} className="rounded-xl border border-dark-border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{a.title}</h3><p className="text-xs text-dark-muted">{a.subject} · {a.points} points · {a.due_at?new Date(a.due_at).toLocaleString():'No deadline'}</p></div>{a.submission&&<span className="text-xs text-emerald-300">Submitted · {a.submission.marks_awarded==null?'Awaiting review':`${a.submission.marks_awarded} points`}</span>}</div><p className="text-sm whitespace-pre-wrap">{a.instructions}</p>{a.attachment_url&&<a href={a.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-primary">Open assignment attachment ↗</a>}<TextArea label="Your submission / link" value={submission[a.id]||''} onChange={v=>setSubmission({...submission,[a.id]:v})} placeholder="Enter your answer or a shared document link"/>{a.submission?.feedback&&<p className="text-xs text-dark-muted">Faculty feedback: {a.submission.feedback}</p>}<Action onClick={()=>void submitAssignment(a.id)} disabled={busy}>{a.submission?'Update submission':'Submit assignment'}</Action></article>)}</div>}</Panel>
    <div className="grid lg:grid-cols-2 gap-4"><Panel><h2 className="font-semibold">Marks & results</h2>{(data.marks||[]).length===0?<Empty title="No marks published" detail="Your assessment marks will appear after faculty enters them."/>:(data.marks||[]).map((m:Row,i:number)=><div key={i} className="flex justify-between gap-3 border-b border-dark-border py-2 text-sm"><div><b>{m.subject}</b><p className="text-xs text-dark-muted">{m.assessment}</p></div><b>{m.marks_obtained} / {m.max_marks}</b></div>)}</Panel><Panel><h2 className="font-semibold">Learning materials</h2>{(data.resources||[]).length===0?<Empty title="No materials published" detail="Your teacher's PDF and study links will appear here."/>:(data.resources||[]).map((r:Row,i:number)=><div key={i} className="border-b border-dark-border py-2"><b className="text-sm">{r.title}</b><p className="text-xs text-dark-muted">{r.subject} · {r.description}</p><a href={r.resource_url} target="_blank" rel="noreferrer" className="text-xs text-primary">Open material ↗</a></div>)}</Panel></div>
    <Panel><h2 className="font-semibold">Weekly timetable</h2>{(data.timetable||[]).length===0?<Empty title="No class timetable yet" detail="Your teacher or administrator has not published any class timings."/>:<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">{data.timetable.map((t:Row,i:number)=><div key={i} className="rounded-xl border border-dark-border p-3"><b>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][t.weekday]}</b><p className="text-sm">{t.subject}</p><p className="text-xs text-dark-muted">{t.starts_at}–{t.ends_at} · {t.room||'Room not set'}</p></div>)}</div>}</Panel>
    <Panel><h2 className="font-semibold">Internships & job openings</h2>{jobs.length===0?<Empty title="No active job openings" detail="New openings from recruiters will appear here."/>:<div className="space-y-3">{jobs.map(job=><article key={job.id} className="rounded-xl border border-dark-border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><div><b>{job.title}</b><p className="text-xs text-dark-muted">{job.company} · {job.employment_type} · {job.location||'Location not specified'}</p></div>{job.applied?<span className="text-xs text-emerald-300">Applied</span>:<Action onClick={()=>startApplication(job)}>Apply with resume</Action>}</div><p className="text-sm">{job.description}</p><p className="text-xs text-dark-muted">{job.skills.join(' · ')}{job.deadline?' · Deadline '+job.deadline:''}</p></article>)}</div>}</Panel>
    <Panel><h2 className="font-semibold">My applications</h2>{applications.length===0?<Empty title="No applications submitted" detail="Your job applications and hiring stage will appear here."/>:applications.map(a=><div key={a.id} className="flex flex-wrap justify-between items-center gap-3 border-b border-dark-border py-3"><div><b>{a.job_title}</b><p className="text-xs text-dark-muted">{a.company} · {a.status}</p><p className="text-xs text-dark-muted">{a.resume_filename ? `Resume attached: ${a.resume_filename}` : 'Resume attached'}</p></div><span className="text-xs capitalize text-primary">{a.status}</span></div>)}</Panel>
    {applyingJob&&<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label="Apply with resume" className="w-full max-w-xl rounded-2xl bg-dark-card border border-dark-border p-5 space-y-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-primary font-semibold">Application</p><h2 className="text-xl font-bold mt-1">{applyingJob.title}</h2><p className="text-sm text-dark-muted">{applyingJob.company}</p></div><button type="button" onClick={()=>setApplyingJob(null)} className="border border-dark-border rounded-lg px-3 py-2 text-sm">Close</button></div>
      <form onSubmit={submitJobApplication} className="space-y-4">
        <div><p className="text-sm font-semibold mb-2">Choose a resume <span className="text-rose-400">*</span></p><p className="text-xs text-dark-muted mb-2">The exact PDF selected here is copied to this application and shown only to this job's recruiter.</p>
          {resumeDocuments.length>0&&<div className="space-y-2">{resumeDocuments.map(doc=><label key={doc.id} className="flex items-center gap-3 rounded-xl border border-dark-border p-3 cursor-pointer"><input type="radio" name="applicationResume" checked={!resumeFile&&selectedResumeId===String(doc.id)} onChange={()=>{setSelectedResumeId(String(doc.id));setResumeFile(null)}}/><span className="flex-1"><span className="block text-sm font-medium">{doc.filename}</span><span className="block text-xs text-dark-muted">{Math.ceil(doc.file_size/1024)} KB · {new Date(doc.created_at).toLocaleDateString()}</span></span></label>)}</div>}
          <label className="block mt-3 rounded-xl border border-dashed border-dark-border p-4 cursor-pointer"><span className="block text-sm font-semibold">Upload a different PDF resume</span><span className="block text-xs text-dark-muted mt-1">{resumeFile?resumeFile.name:'PDF only · maximum 5 MB'}</span><input type="file" accept="application/pdf,.pdf" className="mt-2 block w-full text-xs" onChange={e=>{setResumeFile(e.target.files?.[0]||null);setSelectedResumeId('')}}/></label>
        </div>
        <TextArea label="Cover note (optional)" value={coverNote} onChange={setCoverNote} placeholder="Introduce yourself and explain why this role interests you."/>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setApplyingJob(null)} className="rounded-xl border border-dark-border px-4 py-2 text-sm">Cancel</button><Action disabled={busy}>Submit application</Action></div>
      </form>
    </section></div>}
  </div>
}


export function StudentMentoring() {
  const [data,setData]=useState<Row>({programmes:[],goals:[],action_items:[],sessions:[],check_ins:[]})
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [selectedProgram,setSelectedProgram]=useState('')
  const [checkIn,setCheckIn]=useState({confidence_rating:'3',progress_status:'on_track',wins:'',blockers:'',support_needed:''})
  const [feedback,setFeedback]=useState<Record<number,{rating:string;takeaways:string;next_steps:string}>>({})
  const load=async()=>{
    setError('')
    try{const r=await api.get('/workspaces/student/mentoring');setData(r.data||{programmes:[],goals:[],action_items:[],sessions:[],check_ins:[]})}
    catch(e:any){setError(e?.response?.data?.detail||'Could not load your mentoring plan.')}
  }
  useEffect(()=>{void load()},[])
  const respond=async(id:number,accepted:boolean)=>{
    setBusy(true);setError('')
    try{await api.post(`/workspaces/student/mentoring/programmes/${id}/respond`,{accepted});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not respond to this mentoring plan.')}
    finally{setBusy(false)}
  }
  const updateAction=async(id:number,status:string)=>{
    setBusy(true);setError('')
    try{await api.patch(`/workspaces/student/mentoring/action-items/${id}`,{status});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not update the action item.')}
    finally{setBusy(false)}
  }
  const submitCheckIn=async(event:FormEvent)=>{
    event.preventDefault()
    if(!selectedProgram){setError('Select an active mentoring programme first.');return}
    setBusy(true);setError('')
    try{await api.post(`/workspaces/student/mentoring/programmes/${selectedProgram}/check-ins`,{...checkIn,confidence_rating:Number(checkIn.confidence_rating)});setCheckIn({confidence_rating:'3',progress_status:'on_track',wins:'',blockers:'',support_needed:''});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not submit your weekly check-in.')}
    finally{setBusy(false)}
  }
  const sendFeedback=async(sessionId:number)=>{
    const values=feedback[sessionId]
    if(!values?.takeaways?.trim()){setError('Add at least one takeaway before submitting session feedback.');return}
    setBusy(true);setError('')
    try{await api.post(`/workspaces/student/mentoring/sessions/${sessionId}/feedback`,{rating:Number(values.rating||5),takeaways:values.takeaways,next_steps:values.next_steps||null});await load()}
    catch(e:any){setError(e?.response?.data?.detail||'Could not submit session feedback.')}
    finally{setBusy(false)}
  }
  const activePrograms=(data.programmes||[]).filter((p:Row)=>p.status==='active')
  useEffect(()=>{if(!selectedProgram&&activePrograms.length)setSelectedProgram(String(activePrograms[0].id))},[activePrograms.length,selectedProgram])
  return <div className="max-w-6xl mx-auto space-y-6">
    <Header eyebrow="Mentee workspace" title="My mentoring & growth plan" description="Review your mentor's plan, work through agreed actions, check in on progress and reflect after meetings." onRefresh={()=>void load()}/>
    <ErrorLine message={error}/>
    {(data.programmes||[]).length===0?<Panel><Empty title="No mentoring programme yet" detail="When a mentor creates a development plan for you, it will appear here for your review and acceptance."/></Panel>:
      <Panel><h2 className="font-semibold">Mentoring programmes</h2><div className="space-y-3">{data.programmes.map((p:Row)=><article key={p.id} className="rounded-xl border border-dark-border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{p.title}</h3><p className="text-xs text-dark-muted">{p.mentor_name} · {p.focus_area} · {p.meeting_cadence} meetings</p></div><span className="text-xs rounded-full bg-dark-lighter px-3 py-1 capitalize">{p.status.replace('_',' ')}</span></div><p className="text-sm text-dark-muted">{p.description}</p><p className="text-xs text-dark-muted">{p.start_date}{p.target_end_date?' → '+p.target_end_date:''}</p>{p.status==='awaiting_student'&&<div className="flex gap-2 pt-2"><Action onClick={()=>void respond(p.id,true)} disabled={busy}>Accept plan</Action><Action secondary onClick={()=>void respond(p.id,false)} disabled={busy}>Decline</Action></div>}</article>)}</div></Panel>}
    <Panel><h2 className="font-semibold">Growth goals</h2>{(data.goals||[]).length===0?<Empty title="No growth goals yet" detail="Goals agreed with your mentor will appear here after you accept a programme."/>:<div className="space-y-3">{data.goals.map((g:Row)=><div key={g.id} className="rounded-xl border border-dark-border p-4"><div className="flex flex-wrap justify-between gap-2"><div><b>{g.title}</b><p className="text-xs text-dark-muted">{g.category} · due {g.due_date||'not set'} · {g.priority} priority</p></div><b className="text-sm">{g.progress_percent}%</b></div><p className="text-sm mt-2">{g.desired_outcome}</p><p className="text-xs text-dark-muted mt-1">Success measure: {g.success_measure}</p><div className="h-2 rounded-full bg-dark-lighter overflow-hidden mt-3"><div className="h-full bg-primary rounded-full" style={{width:`${g.progress_percent}%`}}/></div></div>)}</div>}</Panel>
    <Panel><h2 className="font-semibold">My action items</h2>{(data.action_items||[]).length===0?<Empty title="No actions assigned" detail="Your agreed next steps will appear here."/>:<div className="space-y-2">{data.action_items.map((item:Row)=><div key={item.id} className="rounded-xl border border-dark-border p-3 flex flex-wrap items-center justify-between gap-3"><div><b>{item.title}</b><p className="text-xs text-dark-muted">{item.owner==='student'?'Your task':'Mentor task'} · due {item.due_date||'not set'}</p>{item.description&&<p className="text-sm mt-1">{item.description}</p>}{item.resource_url&&<a href={item.resource_url} target="_blank" rel="noreferrer" className="text-xs text-primary">Open resource ↗</a>}</div>{item.owner==='student'?<SelectField label="Status" value={item.status} onChange={v=>void updateAction(item.id,v)} options={['not_started','in_progress','completed','blocked'].map(v=>({value:v,label:v.replace('_',' ')}))}/>:<span className="text-xs text-dark-muted capitalize">{item.status.replace('_',' ')}</span>}</div>)}</div>}</Panel>
    <Panel><h2 className="font-semibold">Weekly progress check-in</h2>{activePrograms.length===0?<Empty title="Accept a mentoring plan first" detail="Weekly check-ins are available once an agreed programme is active."/>:<form onSubmit={submitCheckIn} className="space-y-3"><SelectField label="Programme" value={selectedProgram} onChange={setSelectedProgram} options={activePrograms.map((p:Row)=>({value:String(p.id),label:p.title}))}/><div className="grid sm:grid-cols-2 gap-3"><SelectField label="How is your progress?" value={checkIn.progress_status} onChange={v=>setCheckIn({...checkIn,progress_status:v})} options={[{value:'on_track',label:'On track'},{value:'needs_support',label:'Need support'},{value:'blocked',label:'Blocked'}]}/><SelectField label="Confidence this week (1–5)" value={checkIn.confidence_rating} onChange={v=>setCheckIn({...checkIn,confidence_rating:v})} options={[1,2,3,4,5].map(n=>({value:String(n),label:String(n)}))}/></div><TextArea label="What went well?" value={checkIn.wins} onChange={v=>setCheckIn({...checkIn,wins:v})}/><TextArea label="What blocked your progress?" value={checkIn.blockers} onChange={v=>setCheckIn({...checkIn,blockers:v})}/><TextArea label="What support do you need?" value={checkIn.support_needed} onChange={v=>setCheckIn({...checkIn,support_needed:v})}/><Action disabled={busy}>Submit weekly check-in</Action></form>}</Panel>
    <Panel><h2 className="font-semibold">Mentoring sessions & reflection</h2>{(data.sessions||[]).length===0?<Empty title="No sessions scheduled" detail="Your mentor will schedule meetings and add the agenda here."/>:<div className="space-y-3">{data.sessions.map((s:Row)=><article key={s.id} className="rounded-xl border border-dark-border p-4"><div className="flex flex-wrap justify-between gap-2"><div><b>{new Date(s.scheduled_at).toLocaleString()}</b><p className="text-xs text-dark-muted">{s.duration_minutes} min · {s.status}</p>{s.agenda&&<p className="text-sm mt-2">{s.agenda}</p>}</div>{s.meeting_link&&<a href={s.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-primary">Join meeting ↗</a>}</div>{s.status==='completed'&&!s.feedback&&<div className="mt-3 space-y-2 border-t border-dark-border pt-3"><p className="text-sm font-semibold">Share session feedback</p><SelectField label="Rating" value={feedback[s.id]?.rating||'5'} onChange={v=>setFeedback({...feedback,[s.id]:{rating:v,takeaways:feedback[s.id]?.takeaways||'',next_steps:feedback[s.id]?.next_steps||''}})} options={[1,2,3,4,5].map(n=>({value:String(n),label:`${n} / 5`}))}/><TextArea label="Key takeaways" value={feedback[s.id]?.takeaways||''} onChange={v=>setFeedback({...feedback,[s.id]:{rating:feedback[s.id]?.rating||'5',takeaways:v,next_steps:feedback[s.id]?.next_steps||''}})}/><TextArea label="Next steps" value={feedback[s.id]?.next_steps||''} onChange={v=>setFeedback({...feedback,[s.id]:{rating:feedback[s.id]?.rating||'5',takeaways:feedback[s.id]?.takeaways||'',next_steps:v}})}/><Action disabled={busy} onClick={()=>void sendFeedback(s.id)}>Submit reflection</Action></div>}{s.feedback&&<p className="text-xs text-dark-muted mt-3">Your rating: {s.feedback.rating}/5 · {s.feedback.takeaways}</p>}</article>)}</div>}</Panel>
    <Panel><h2 className="font-semibold">Mentor replies</h2>{(data.check_ins||[]).length===0?<Empty title="No check-ins yet" detail="After you submit a weekly update, your mentor's response appears here."/>:(data.check_ins||[]).map((c:Row)=><div key={c.id} className="border-b border-dark-border py-3"><p className="text-sm">{c.progress_status.replace('_',' ')} · confidence {c.confidence_rating}/5</p><p className="text-xs text-dark-muted">{c.mentor_reply||'Waiting for mentor response'}</p></div>)}</Panel>
  </div>
}
