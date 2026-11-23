import { useState, useEffect } from 'react'
import { Briefcase, Upload, FileText, Clock, Star, Building2, Plus, X, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '../services/api'

const statusColors: Record<string, string> = {
  applied: 'bg-blue-500/20 text-blue-400',
  screening: 'bg-yellow-500/20 text-yellow-400',
  interview: 'bg-purple-500/20 text-purple-400',
  offer: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
}

export default function Placements() {
  const [tab, setTab] = useState<'opportunities' | 'applications' | 'resume' | 'builder' | 'interviews' | 'offers'>('applications')
  const [applications, setApplications] = useState<any[]>([])
  const [interviews, setInterviews] = useState<any[]>([])
  const [offers, setOffers] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [newApp, setNewApp] = useState({ company: '', role: '', salary: '', notes: '', deadline: '' })
  const [newInterview, setNewInterview] = useState({ company: '', role: '', interview_type: 'Technical', scheduled_at: '' })
  const [newOffer, setNewOffer] = useState({ company: '', role: '', ctc: '', location: '', joining_date: '' })
  const [actionError, setActionError] = useState('')
  const [resumeAnalyzing, setResumeAnalyzing] = useState(false)
  const [resumeResult, setResumeResult] = useState<any>(null)
  const [resumeDocuments, setResumeDocuments] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [studentJobApplications, setStudentJobApplications] = useState<any[]>([])
  const [resumeVersions, setResumeVersions] = useState<any[]>([])
  const [builderVersionId, setBuilderVersionId] = useState<number | null>(null)
  const [builderTitle, setBuilderTitle] = useState('General software engineering resume')
  const [builderForm, setBuilderForm] = useState({ full_name: '', headline: '', email: '', phone: '', location: '', summary: '', educationText: '', experienceText: '', projectsText: '', skillsText: '', certificationsText: '', achievementsText: '' })
  const [builderSaving, setBuilderSaving] = useState(false)
  const [interviewDrafts, setInterviewDrafts] = useState<Record<number, { feedback: string; rating: string; confidence_score: string; completed: boolean }>>({})
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [coverNote, setCoverNote] = useState('')
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null)
  const [jobBoardMessage, setJobBoardMessage] = useState('')

  const loadData = async () => {
    try {
      const [appRes, intRes, offRes, resumeRes, versionRes] = await Promise.all([
        api.get('/placements/applications'),
        api.get('/placements/interviews'),
        api.get('/placements/offers'),
        api.get('/placements/resume/documents'),
        api.get('/placements/resume-versions'),
      ])
      setApplications(appRes.data || [])
      setInterviews(intRes.data || [])
      setOffers(offRes.data || [])
      setResumeDocuments(resumeRes.data || [])
      setResumeVersions(versionRes.data || [])
      const [jobResponse, studentApplicationResponse] = await Promise.allSettled([
        api.get('/workspaces/student/jobs'),
        api.get('/workspaces/student/applications'),
      ])
      setJobs(jobResponse.status === 'fulfilled' && Array.isArray(jobResponse.value.data) ? jobResponse.value.data : [])
      setStudentJobApplications(studentApplicationResponse.status === 'fulfilled' && Array.isArray(studentApplicationResponse.value.data) ? studentApplicationResponse.value.data : [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newApp.company || !newApp.role) return
    try {
      await api.post('/placements/applications', {
        ...newApp,
        deadline: newApp.deadline || undefined,
      })
      setShowAddModal(false)
      setNewApp({ company: '', role: '', salary: '', notes: '', deadline: '' })
      setActionError('')
      loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not save the application.')
    }
  }

  const handleCreateInterview = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await api.post('/placements/interviews', newInterview)
      setShowInterviewModal(false)
      setNewInterview({ company: '', role: '', interview_type: 'Technical', scheduled_at: '' })
      setActionError('')
      await loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not schedule the interview.')
    }
  }

  const handleCreateOffer = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await api.post('/placements/offers', {
        ...newOffer,
        joining_date: newOffer.joining_date || undefined,
      })
      setShowOfferModal(false)
      setNewOffer({ company: '', role: '', ctc: '', location: '', joining_date: '' })
      setActionError('')
      await loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not save the offer.')
    }
  }

  const handleApplicationStatus = async (id: number, status: string) => {
    try {
      await api.put(`/placements/applications/${id}/status?status=${encodeURIComponent(status)}`)
      await loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not update the application status.')
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 5 * 1024 * 1024) {
      setActionError('Upload a PDF resume up to 5 MB so it can be attached to job applications.')
      e.target.value = ''
      return
    }
    setResumeAnalyzing(true)
    setActionError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post('/placements/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const [resumes, analysis] = await Promise.all([
        api.get('/placements/resume/documents'),
        api.post('/ai/analyze-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
      ])
      setResumeDocuments(resumes.data || [])
      setResumeResult(analysis.data)
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Resume upload or analysis failed.')
    } finally {
      setResumeAnalyzing(false)
      e.target.value = ''
    }
  }


  const parseResumeLines = (value: string, delimiter = '|') => value.split('\n').map(line => line.trim()).filter(Boolean).map(line => line.split(delimiter).map(part => part.trim()))
  const contentFromBuilder = () => ({
    full_name: builderForm.full_name.trim(),
    headline: builderForm.headline.trim(),
    email: builderForm.email.trim(),
    phone: builderForm.phone.trim(),
    location: builderForm.location.trim(),
    summary: builderForm.summary.trim(),
    education: parseResumeLines(builderForm.educationText).map(parts => ({
      degree: parts[0] || '', institution: parts[1] || '', start_year: parts[2] || '',
      end_year: parts[3] || '', location: parts[4] || '', details: parts.slice(5).join(' | '),
    })),
    experience: parseResumeLines(builderForm.experienceText).map(parts => ({
      role: parts[0] || '', company: parts[1] || '', start_date: parts[2] || '',
      end_date: parts[3] || '', location: parts[4] || '', details: parts.slice(5).join(' | '),
    })),
    projects: parseResumeLines(builderForm.projectsText).map(parts => ({
      name: parts[0] || '', technologies: (parts[1] || '').split(',').map(x => x.trim()).filter(Boolean),
      link: parts[2] || '', description: parts.slice(3).join(' | '),
    })),
    skills: builderForm.skillsText.split(',').map(x => x.trim()).filter(Boolean),
    certifications: builderForm.certificationsText.split('\n').map(x => x.trim()).filter(Boolean),
    achievements: builderForm.achievementsText.split('\n').map(x => x.trim()).filter(Boolean),
  })

  const loadBuilderVersion = (version: any) => {
    const c = version.content || {}
    setBuilderVersionId(version.id)
    setBuilderTitle(version.title)
    setBuilderForm({
      full_name: c.full_name || '', headline: c.headline || '', email: c.email || '',
      phone: c.phone || '', location: c.location || '', summary: c.summary || '',
      educationText: (c.education || []).map((e: any) => [e.degree,e.institution,e.start_year,e.end_year,e.location,e.details].join(' | ')).join('\n'),
      experienceText: (c.experience || []).map((e: any) => [e.role,e.company,e.start_date,e.end_date,e.location,e.details].join(' | ')).join('\n'),
      projectsText: (c.projects || []).map((p: any) => [p.name,(p.technologies || []).join(', '),p.link,p.description].join(' | ')).join('\n'),
      skillsText: (c.skills || []).join(', '),
      certificationsText: (c.certifications || []).join('\n'),
      achievementsText: (c.achievements || []).join('\n'),
    })
  }

  const saveBuilderVersion = async (saveAsNew = false) => {
    if (!builderForm.full_name.trim()) {
      setActionError('Add your full name before saving a resume.')
      return
    }
    const content = contentFromBuilder()
    if (content.education.some((e: any) => !e.degree || !e.institution) ||
        content.experience.some((e: any) => !e.role || !e.company) ||
        content.projects.some((p: any) => !p.name)) {
      setActionError('Each education, experience and project line needs its required name fields.')
      return
    }
    setBuilderSaving(true)
    setActionError('')
    try {
      const payload = { title: builderTitle.trim() || 'My resume', content }
      const response = builderVersionId && !saveAsNew
        ? await api.put('/placements/resume-versions/' + builderVersionId, payload)
        : await api.post('/placements/resume-versions', payload)
      setBuilderVersionId(response.data.id)
      const versions = await api.get('/placements/resume-versions')
      setResumeVersions(versions.data || [])
      setActionError('')
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not save your resume version.')
    } finally {
      setBuilderSaving(false)
    }
  }

  const deleteBuilderVersion = async (id: number) => {
    try {
      await api.delete('/placements/resume-versions/' + id)
      setResumeVersions((current) => current.filter(item => item.id !== id))
      if (builderVersionId === id) setBuilderVersionId(null)
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not delete this resume version.')
    }
  }

  const updateInterviewFeedback = async (interview: any) => {
    const draft = interviewDrafts[interview.id] || {
      feedback: interview.feedback || '',
      rating: String(interview.rating || 5),
      confidence_score: String(interview.confidence_score || 3),
      completed: Boolean(interview.completed),
    }
    try {
      await api.patch('/placements/interviews/' + interview.id, {
        feedback: draft.feedback,
        rating: Number(draft.rating),
        confidence_score: Number(draft.confidence_score),
        completed: draft.completed,
      })
      await loadData()
      setActionError('')
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not save interview feedback.')
    }
  }
\n  const applyToRecruiterJob = async (job: any) => {
    if (!selectedResumeId) {
      setActionError('Upload a PDF resume in the Resume tab, then select it here before applying.')
      setTab('resume')
      return
    }
    setApplyingJobId(job.id)
    setActionError('')
    setJobBoardMessage('')
    try {
      await api.post('/workspaces/student/jobs/' + job.id + '/apply', {
        resume_document_id: Number(selectedResumeId),
        cover_note: coverNote.trim() || null,
      })
      setJobBoardMessage('Application submitted to ' + job.company + '. Your selected resume is attached to this application.')
      setCoverNote('')
      await loadData()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not submit this application.')
    } finally {
      setApplyingJobId(null)
    }
  }

  const downloadResumeDocument = async (id: number, filename: string) => {
    try {
      const response = await api.get(`/placements/resume/documents/${id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = filename; anchor.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not download this resume.')
    }
  }

  const deleteResumeDocument = async (id: number) => {
    try {
      await api.delete(`/placements/resume/documents/${id}`)
      setResumeDocuments((current) => current.filter((doc) => doc.id !== id))
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not remove this resume.')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="text-primary" /> Placement & Career Command
          </h1>
          <p className="text-dark-muted">Job applications tracking, mock interviews, AI ATS resume optimizer</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 glass rounded-xl p-1">
            {(['opportunities', 'applications', 'resume', 'builder', 'interviews', 'offers'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  tab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dark-muted hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'applications' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all"
            >
              <Plus size={16} /> Add Application
            </button>
          )}
          {tab === 'interviews' && (
            <button
              onClick={() => setShowInterviewModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Plus size={16} /> Schedule Interview
            </button>
          )}
          {tab === 'offers' && (
            <button
              onClick={() => setShowOfferModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Plus size={16} /> Add Offer
            </button>
          )}
        </div>
      </div>

      {/* Modal: Add Application */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Add Application</h3>
              <button onClick={() => setShowAddModal(false)} className="text-dark-muted hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateApp} className="space-y-4">
              <div>
                <label className="text-xs text-dark-muted block mb-1">Company *</label>
                <input
                  required
                  value={newApp.company}
                  onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                  placeholder="Company name"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Role *</label>
                <input
                  required
                  value={newApp.role}
                  onChange={(e) => setNewApp({ ...newApp, role: e.target.value })}
                  placeholder="Job title / role"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Package / CTC (optional)</label>
                <input
                  value={newApp.salary}
                  onChange={(e) => setNewApp({ ...newApp, salary: e.target.value })}
                  placeholder="e.g. 18 LPA"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Application deadline (optional)</label>
                <input
                  type="datetime-local"
                  value={newApp.deadline}
                  onChange={(e) => setNewApp({ ...newApp, deadline: e.target.value })}
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Notes (optional)</label>
                <textarea
                  value={newApp.notes}
                  onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
                  rows={2}
                  placeholder="Recruiter, job link, next step…"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-dark-muted hover:bg-dark-lighter"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInterviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Schedule Interview</h3>
              <button type="button" onClick={() => setShowInterviewModal(false)} className="text-dark-muted hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateInterview} className="space-y-3">
              <input required value={newInterview.company} onChange={(e) => setNewInterview({ ...newInterview, company: e.target.value })} placeholder="Company" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <input required value={newInterview.role} onChange={(e) => setNewInterview({ ...newInterview, role: e.target.value })} placeholder="Role" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <select value={newInterview.interview_type} onChange={(e) => setNewInterview({ ...newInterview, interview_type: e.target.value })} className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white">
                <option>Technical</option><option>HR</option><option>Mock Interview</option><option>Managerial</option><option>System Design</option>
              </select>
              <input required type="datetime-local" value={newInterview.scheduled_at} onChange={(e) => setNewInterview({ ...newInterview, scheduled_at: e.target.value })} className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <p className="text-xs text-dark-muted">An email reminder will be queued for one day before the interview.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInterviewModal(false)} className="px-4 py-2 rounded-xl text-sm text-dark-muted">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">Save Interview</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Add Offer</h3>
              <button type="button" onClick={() => setShowOfferModal(false)} className="text-dark-muted hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateOffer} className="space-y-3">
              <input required value={newOffer.company} onChange={(e) => setNewOffer({ ...newOffer, company: e.target.value })} placeholder="Company" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <input required value={newOffer.role} onChange={(e) => setNewOffer({ ...newOffer, role: e.target.value })} placeholder="Role" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <input value={newOffer.ctc} onChange={(e) => setNewOffer({ ...newOffer, ctc: e.target.value })} placeholder="CTC / Package" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <input value={newOffer.location} onChange={(e) => setNewOffer({ ...newOffer, location: e.target.value })} placeholder="Location" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <input type="date" value={newOffer.joining_date} onChange={(e) => setNewOffer({ ...newOffer, joining_date: e.target.value ? `${e.target.value}T09:00` : '' })} className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowOfferModal(false)} className="px-4 py-2 rounded-xl text-sm text-dark-muted">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">Save Offer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{actionError}</div>}

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Briefcase, label: 'Applications', value: applications.length, color: 'from-blue-500 to-cyan-500' },
          { icon: Clock, label: 'In Review', value: applications.filter((a) => a.status === 'screening').length, color: 'from-yellow-500 to-orange-500' },
          { icon: Star, label: 'Interviews Scheduled', value: interviews.length, color: 'from-purple-500 to-pink-500' },
          { icon: CheckCircle2, label: 'Offers In Hand', value: offers.length || 0, color: 'from-emerald-500 to-teal-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-xl p-5 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-dark-muted">{label}</span>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Tab: Applications */}
      {tab === 'applications' && (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-dashed border-dark-border">
              <Briefcase size={38} className="text-dark-muted mx-auto mb-3" />
              <h3 className="font-semibold">No applications yet</h3>
              <p className="text-xs text-dark-muted mt-1">Add a job application to start tracking its progress. Your dashboard will update from your saved records.</p>
              <button onClick={() => setShowAddModal(true)} className="mt-4 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
                <Plus size={15} className="inline mr-1" /> Add your first application
              </button>
            </div>
          ) : applications.map((a) => (
            <div key={a.id} className="glass rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-dark-lighter border border-dark-border flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-base">{a.company}</h4>
                  <p className="text-xs text-dark-muted mt-0.5">{a.role}</p>
                  {a.deadline && <p className="text-xs text-dark-muted mt-1">Deadline: {new Date(a.deadline).toLocaleString()}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-dark-muted">{a.application_date?.slice(0, 10) || '—'}</span>
                <select
                  value={a.status}
                  onChange={(event) => handleApplicationStatus(a.id, event.target.value)}
                  aria-label={`Application status for ${a.company}`}
                  className={`text-xs px-3 py-1.5 rounded-lg border border-dark-border bg-dark-lighter capitalize ${statusColors[a.status] || 'text-slate-300'}`}
                >
                  {['applied', 'screening', 'interview', 'offer', 'rejected'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Recruiter-published opportunities */}
      {tab === 'opportunities' && (
        <div className="space-y-5">
          {jobBoardMessage && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{jobBoardMessage}</div>}
          <section className="glass space-y-4 rounded-2xl border border-dark-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-lg">Open opportunities</h3><p className="mt-1 text-xs text-dark-muted">Recruiter-published jobs and internships, with eligibility checks and your PDF resume attached at submission.</p></div><button onClick={() => void loadData()} className="rounded-lg border border-dark-border px-3 py-2 text-xs">Refresh jobs</button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {jobs.map((job) => (
                <article key={job.id} className="rounded-xl border border-dark-border p-4">
                  <div className="flex items-start justify-between gap-2"><div><h4 className="font-semibold">{job.title}</h4><p className="text-sm text-primary">{job.company}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{job.employment_type}</span></div>
                  <p className="mt-3 line-clamp-3 text-sm text-dark-muted">{job.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-dark-muted">{job.location && <span>{job.location}</span>}{job.deadline && <span>Apply by {new Date(job.deadline).toLocaleDateString()}</span>}{job.graduation_year_min && <span>Batch {job.graduation_year_min}{job.graduation_year_max ? '–' + job.graduation_year_max : '+'}</span>}</div>
                  {job.skills?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{job.skills.map((skill: string) => <span key={skill} className="rounded-md bg-dark-lighter px-2 py-1 text-xs text-dark-muted">{skill}</span>)}</div>}
                  {job.applied ? <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">Application already submitted</p> : <div className="mt-4 space-y-2">
                    <select value={selectedResumeId} onChange={(event) => setSelectedResumeId(event.target.value)} className="w-full rounded-lg border border-dark-border bg-dark-lighter px-3 py-2 text-xs text-white"><option value="">Choose a PDF resume</option>{resumeDocuments.map((resume: any) => <option key={resume.id} value={resume.id}>{resume.filename}</option>)}</select>
                    <textarea value={coverNote} onChange={(event) => setCoverNote(event.target.value)} rows={2} placeholder="Optional cover note to the recruiter" className="w-full rounded-lg border border-dark-border bg-dark-lighter px-3 py-2 text-xs text-white"/>
                    <button onClick={() => void applyToRecruiterJob(job)} disabled={applyingJobId === job.id} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{applyingJobId === job.id ? 'Submitting…' : 'Apply with selected resume'}</button>
                  </div>}
                </article>
              ))}
            </div>
            {jobs.length === 0 && <div className="rounded-xl border border-dashed border-dark-border p-7 text-center"><Briefcase size={30} className="mx-auto text-dark-muted"/><p className="mt-2 font-semibold">No published openings right now</p><p className="mt-1 text-xs text-dark-muted">Recruiter-created jobs will appear here when they are open and accepting applications.</p></div>}
            {resumeDocuments.length === 0 && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">You need a saved PDF resume to apply. Upload one from the Resume tab first.</p>}
          </section>
          <section className="glass space-y-3 rounded-2xl border border-dark-border p-5"><h3 className="font-semibold">Your StudentOS job applications</h3>{studentJobApplications.length === 0 ? <p className="text-sm text-dark-muted">Applications submitted to recruiters will appear here with their latest status and the exact resume filename attached.</p> : studentJobApplications.map((application: any) => <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dark-border p-3"><div><p className="font-medium">{application.job_title} · {application.company}</p><p className="mt-1 text-xs text-dark-muted">Resume: {application.resume_filename || 'Not recorded'} · {application.created_at?.slice(0,10)}</p></div><span className={'rounded-full px-3 py-1 text-xs capitalize ' + (statusColors[application.status] || 'bg-dark-lighter text-dark-muted')}>{application.status}</span></div>)}</section>
        </div>
      )}

      {/* Tab: Resume AI */}
      {tab === 'resume' && (
        <div className="glass rounded-2xl p-8 max-w-2xl mx-auto border border-dark-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-primary/30">
            <FileText size={32} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-1">AI ATS Resume Optimizer</h3>
          <p className="text-xs text-dark-muted mb-6">Upload a PDF for ATS analysis and save it to your private resume library. You can attach it to job applications later.</p>

          <label className="cursor-pointer bg-primary hover:bg-primary/90 text-white font-medium px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 transition-all">
            {resumeAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {resumeAnalyzing ? 'Analyzing Resume...' : 'Choose Resume (PDF)'}
            <input type="file" onChange={handleResumeUpload} accept=".pdf" className="hidden" />
          </label>

          {actionError && <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-left text-sm text-rose-200">{actionError}</div>}
          <div className="mt-8 text-left space-y-3 border-t border-dark-border pt-6">
            <div><h4 className="font-semibold">Saved resume library</h4><p className="text-xs text-dark-muted">Private files you can select when applying to a recruiter job. Removing a library copy does not remove a resume already attached to an application.</p></div>
            {resumeDocuments.length === 0 ? <p className="text-xs text-dark-muted rounded-xl border border-dashed border-dark-border p-4">No PDF resumes saved yet.</p> : resumeDocuments.map((doc:any) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dark-border p-3">
                <div><p className="text-sm font-medium">{doc.filename}</p><p className="text-xs text-dark-muted">{Math.ceil(doc.file_size/1024)} KB · {new Date(doc.created_at).toLocaleDateString()}</p></div>
                <div className="flex gap-2"><button type="button" onClick={()=>void downloadResumeDocument(doc.id,doc.filename)} className="rounded-lg border border-dark-border px-3 py-2 text-xs">Download</button><button type="button" onClick={()=>void deleteResumeDocument(doc.id)} className="rounded-lg border border-dark-border px-3 py-2 text-xs text-dark-muted">Remove</button></div>
              </div>
            ))}
          </div>
          {resumeResult && (
            <div className="mt-8 text-left space-y-4 pt-6 border-t border-dark-border">
              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-lighter border border-dark-border">
                <span className="font-semibold text-sm">Estimated ATS Score</span>
                <span className="text-3xl font-extrabold text-emerald-400">{resumeResult.ats_score} / 100</span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-dark-muted mb-2">Detected Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {resumeResult.skills_found?.map((s: string) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-dark-muted mb-2">Missing Recommended Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {resumeResult.missing_skills?.map((s: string) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-dark-muted mb-2">AI Suggestions</p>
                <div className="space-y-1.5">
                  {resumeResult.suggestions?.map((s: string, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-dark-lighter text-xs text-slate-300 border border-dark-border">
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {tab === 'builder' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <section className="glass space-y-4 rounded-2xl border border-dark-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Resume builder & versions</h2><p className="text-xs text-dark-muted">Create tailored versions for different roles. Your drafts are private to your account.</p></div><button type="button" onClick={()=>{setBuilderVersionId(null);setBuilderTitle('New role-specific resume');setBuilderForm({full_name:'',headline:'',email:'',phone:'',location:'',summary:'',educationText:'',experienceText:'',projectsText:'',skillsText:'',certificationsText:'',achievementsText:''})}} className="rounded-lg border border-dark-border px-3 py-2 text-xs"><Plus size={13} className="mr-1 inline"/>New draft</button></div>
            <div className="flex flex-wrap items-center gap-2"><input value={builderTitle} onChange={e=>setBuilderTitle(e.target.value)} placeholder="Version name, e.g. Backend Intern" className="min-w-0 flex-1 rounded-xl border border-dark-border bg-dark-lighter px-3 py-2.5 text-sm text-white"/><span className="text-xs text-dark-muted">{builderVersionId ? 'Editing saved version' : 'Unsaved draft'}</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-dark-muted">Full name<input value={builderForm.full_name} onChange={e=>setBuilderForm({...builderForm,full_name:e.target.value})} className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
              <label className="text-xs text-dark-muted">Professional headline<input value={builderForm.headline} onChange={e=>setBuilderForm({...builderForm,headline:e.target.value})} placeholder="e.g. Full-Stack Developer" className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
              <label className="text-xs text-dark-muted">Email<input type="email" value={builderForm.email} onChange={e=>setBuilderForm({...builderForm,email:e.target.value})} className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
              <label className="text-xs text-dark-muted">Phone<input value={builderForm.phone} onChange={e=>setBuilderForm({...builderForm,phone:e.target.value})} className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
              <label className="text-xs text-dark-muted sm:col-span-2">Location<input value={builderForm.location} onChange={e=>setBuilderForm({...builderForm,location:e.target.value})} placeholder="City, Country" className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
            </div>
            <label className="block text-xs text-dark-muted">Professional summary<textarea rows={4} value={builderForm.summary} onChange={e=>setBuilderForm({...builderForm,summary:e.target.value})} className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-3 text-sm text-white"/></label>
            <label className="block text-xs text-dark-muted">Education · one entry per line: Degree | Institution | Start year | End year | Location | Details<textarea rows={4} value={builderForm.educationText} onChange={e=>setBuilderForm({...builderForm,educationText:e.target.value})} placeholder="B.Tech CSE | University | 2024 | 2028 | Bhubaneswar | CGPA: 8.4" className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-3 text-xs text-white"/></label>
            <label className="block text-xs text-dark-muted">Experience · one entry per line: Role | Company | Start | End | Location | Details<textarea rows={4} value={builderForm.experienceText} onChange={e=>setBuilderForm({...builderForm,experienceText:e.target.value})} placeholder="Software Intern | Company | Jun 2026 | Aug 2026 | India | Built a full-stack app…" className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-3 text-xs text-white"/></label>
            <label className="block text-xs text-dark-muted">Projects · one entry per line: Name | Technologies (comma separated) | Link | Description<textarea rows={4} value={builderForm.projectsText} onChange={e=>setBuilderForm({...builderForm,projectsText:e.target.value})} placeholder="StudentOS | React, FastAPI | https://github.com/... | Student productivity workspace" className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-3 text-xs text-white"/></label>
            <label className="block text-xs text-dark-muted">Skills · comma separated<input value={builderForm.skillsText} onChange={e=>setBuilderForm({...builderForm,skillsText:e.target.value})} className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-dark-muted">Certifications · one per line<textarea rows={3} value={builderForm.certificationsText} onChange={e=>setBuilderForm({...builderForm,certificationsText:e.target.value})} className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-3 text-sm text-white"/></label><label className="text-xs text-dark-muted">Achievements · one per line<textarea rows={3} value={builderForm.achievementsText} onChange={e=>setBuilderForm({...builderForm,achievementsText:e.target.value})} className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-3 text-sm text-white"/></label></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void saveBuilderVersion(false)} disabled={builderSaving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">{builderSaving?'Saving…':builderVersionId?'Save changes':'Save version'}</button><button type="button" onClick={()=>void saveBuilderVersion(true)} disabled={builderSaving} className="rounded-xl border border-dark-border px-4 py-2.5 text-sm">Save as new version</button><button type="button" onClick={()=>window.print()} className="rounded-xl border border-dark-border px-4 py-2.5 text-sm">Print / Save PDF</button></div>
          </section>
          <div className="space-y-4">
            <section className="glass space-y-3 rounded-2xl border border-dark-border p-4"><h3 className="font-semibold">Saved resume versions ({resumeVersions.length}/20)</h3>{resumeVersions.length===0?<p className="text-xs text-dark-muted">Save your first role-specific version to keep it here.</p>:resumeVersions.map(version=><div key={version.id} className={'flex items-center gap-2 rounded-xl border p-3 '+(builderVersionId===version.id?'border-primary bg-primary/10':'border-dark-border')}><button type="button" onClick={()=>loadBuilderVersion(version)} className="min-w-0 flex-1 text-left"><b className="block truncate text-sm">{version.title}</b><span className="text-xs text-dark-muted">Version {version.version_number} · {new Date(version.updated_at).toLocaleDateString()}</span></button><button type="button" onClick={()=>void deleteBuilderVersion(version.id)} className="rounded-lg border border-dark-border px-2 py-1.5 text-xs text-rose-300">Delete</button></div>)}</section>
            <section id="resume-preview" className="resume-paper rounded-2xl bg-white p-6 text-slate-900 shadow-xl print:shadow-none">
              <h2 className="text-2xl font-bold">{builderForm.full_name || 'Your Name'}</h2><p className="mt-1 text-sm font-semibold text-slate-700">{builderForm.headline}</p><p className="mt-2 text-xs text-slate-600">{[builderForm.email,builderForm.phone,builderForm.location].filter(Boolean).join(' · ')}</p>
              {builderForm.summary&&<><h3 className="mt-5 border-b border-slate-300 pb-1 text-sm font-bold uppercase">Summary</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">{builderForm.summary}</p></>}
              {builderForm.educationText&&<><h3 className="mt-5 border-b border-slate-300 pb-1 text-sm font-bold uppercase">Education</h3><p className="mt-2 whitespace-pre-wrap text-xs">{builderForm.educationText}</p></>}
              {builderForm.experienceText&&<><h3 className="mt-5 border-b border-slate-300 pb-1 text-sm font-bold uppercase">Experience</h3><p className="mt-2 whitespace-pre-wrap text-xs">{builderForm.experienceText}</p></>}
              {builderForm.projectsText&&<><h3 className="mt-5 border-b border-slate-300 pb-1 text-sm font-bold uppercase">Projects</h3><p className="mt-2 whitespace-pre-wrap text-xs">{builderForm.projectsText}</p></>}
              {builderForm.skillsText&&<><h3 className="mt-5 border-b border-slate-300 pb-1 text-sm font-bold uppercase">Skills</h3><p className="mt-2 text-xs">{builderForm.skillsText}</p></>}
              {builderForm.certificationsText&&<><h3 className="mt-5 border-b border-slate-300 pb-1 text-sm font-bold uppercase">Certifications</h3><p className="mt-2 whitespace-pre-wrap text-xs">{builderForm.certificationsText}</p></>}
              {builderForm.achievementsText&&<><h3 className="mt-5 border-b border-slate-300 pb-1 text-sm font-bold uppercase">Achievements</h3><p className="mt-2 whitespace-pre-wrap text-xs">{builderForm.achievementsText}</p></>}
            </section>
          </div>
        </div>
      )}

      {/* Tab: Interviews */}
      {tab === 'interviews' && (
        <div className="space-y-4">
          {interviews.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-dashed border-dark-border">
              <Star size={36} className="text-dark-muted mx-auto mb-3" />
              <h3 className="font-semibold">No interviews scheduled</h3>
              <p className="text-xs text-dark-muted mt-1">Add an upcoming interview or mock interview to track the date and round.</p>
              <button onClick={() => setShowInterviewModal(true)} className="mt-4 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium"><Plus size={15} className="inline mr-1" /> Schedule interview</button>
            </div>
          ) : interviews.map((inv) => {
            const draft = interviewDrafts[inv.id] || { feedback: inv.feedback || '', rating: String(inv.rating || 5), confidence_score: String(inv.confidence_score || 3), completed: Boolean(inv.completed) }
            return <article key={inv.id} className="glass space-y-3 rounded-xl border border-dark-border p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold text-base">{inv.company} · {inv.role}</h4><p className="text-xs text-dark-muted mt-0.5">Scheduled: {new Date(inv.scheduled_at).toLocaleString()}</p></div><span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-300">{inv.interview_type || 'Technical'}</span></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-dark-muted">Your rating<select value={draft.rating} onChange={e=>setInterviewDrafts({...interviewDrafts,[inv.id]:{...draft,rating:e.target.value}})} className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-2.5 text-sm text-white">{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>
                <label className="text-xs text-dark-muted">Confidence level<select value={draft.confidence_score} onChange={e=>setInterviewDrafts({...interviewDrafts,[inv.id]:{...draft,confidence_score:e.target.value}})} className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-2.5 text-sm text-white">{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>
              </div>
              <label className="block text-xs text-dark-muted">Interview feedback and lessons<textarea rows={3} value={draft.feedback} onChange={e=>setInterviewDrafts({...interviewDrafts,[inv.id]:{...draft,feedback:e.target.value}})} placeholder="What went well? Which topics were difficult? What should you revise?" className="mt-1 w-full rounded-lg border border-dark-border bg-dark-lighter p-3 text-sm text-white"/></label>
              <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs text-dark-muted"><input type="checkbox" checked={draft.completed} onChange={e=>setInterviewDrafts({...interviewDrafts,[inv.id]:{...draft,completed:e.target.checked}})}/> Mark interview completed</label><button type="button" onClick={()=>void updateInterviewFeedback(inv)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Save feedback</button></div>
            </article>
          })}
        </div>
      )}

      {/* Tab: Offers */}
      {tab === 'offers' && (
        <div className="space-y-3">
          {offers.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-dashed border-dark-border">
              <Star size={38} className="text-dark-muted mx-auto mb-3" />
              <h3 className="font-semibold">No offers saved yet</h3>
              <p className="text-xs text-dark-muted mt-1">Save an offer here to track company, role, compensation and joining date.</p>
              <button onClick={() => setShowOfferModal(true)} className="mt-4 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
                <Plus size={15} className="inline mr-1" /> Add offer
              </button>
            </div>
          ) : offers.map((offer) => (
            <div key={offer.id} className="glass rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-dark-border">
              <div>
                <h4 className="font-semibold">{offer.company} · {offer.role}</h4>
                <p className="text-xs text-dark-muted mt-1">{offer.location || 'Location not provided'} · {offer.ctc || 'Compensation not provided'}</p>
                {offer.joining_date && <p className="text-xs text-dark-muted mt-1">Joining: {new Date(offer.joining_date).toLocaleDateString()}</p>}
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full capitalize">{offer.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
