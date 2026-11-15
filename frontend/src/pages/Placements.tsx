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
  const [tab, setTab] = useState<'applications' | 'resume' | 'interviews' | 'offers'>('applications')
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

  const loadData = async () => {
    try {
      const [appRes, intRes, offRes] = await Promise.all([
        api.get('/placements/applications'),
        api.get('/placements/interviews'),
        api.get('/placements/offers'),
      ])
      setApplications(appRes.data || [])
      setInterviews(intRes.data || [])
      setOffers(offRes.data || [])
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
    setResumeAnalyzing(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/ai/analyze-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResumeResult(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setResumeAnalyzing(false)
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
            {(['applications', 'resume', 'interviews', 'offers'] as const).map((t) => (
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

      {/* Tab: Resume AI */}
      {tab === 'resume' && (
        <div className="glass rounded-2xl p-8 max-w-2xl mx-auto border border-dark-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-primary/30">
            <FileText size={32} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-1">AI ATS Resume Optimizer</h3>
          <p className="text-xs text-dark-muted mb-6">Upload your PDF or text resume for instant ATS scoring & missing keywords analysis</p>

          <label className="cursor-pointer bg-primary hover:bg-primary/90 text-white font-medium px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 transition-all">
            {resumeAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {resumeAnalyzing ? 'Analyzing Resume...' : 'Choose Resume (PDF / TXT)'}
            <input type="file" onChange={handleResumeUpload} accept=".pdf,.txt,.docx" className="hidden" />
          </label>

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

      {/* Tab: Interviews */}
      {tab === 'interviews' && (
        <div className="space-y-4">
          {interviews.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-dashed border-dark-border">
              <Star size={36} className="text-dark-muted mx-auto mb-3" />
              <h3 className="font-semibold">No interviews scheduled</h3>
              <p className="text-xs text-dark-muted mt-1">Add an upcoming interview or mock interview to track the date and round.</p>
              <button onClick={() => setShowInterviewModal(true)} className="mt-4 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
                <Plus size={15} className="inline mr-1" /> Schedule interview
              </button>
            </div>
          ) : interviews.map((inv) => (
            <div key={inv.id} className="glass rounded-xl p-5 flex items-center justify-between border border-dark-border">
              <div>
                <h4 className="font-semibold text-base">{inv.company} · {inv.role}</h4>
                <p className="text-xs text-dark-muted mt-0.5">Scheduled: {new Date(inv.scheduled_at).toLocaleString()}</p>
              </div>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-medium">
                {inv.interview_type || 'Technical'}
              </span>
            </div>
          ))}
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
