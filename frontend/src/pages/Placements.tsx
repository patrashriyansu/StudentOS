import { useState, useEffect } from 'react'
import { Briefcase, Upload, FileText, Clock, Star, Building2, Plus, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
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
  const [newApp, setNewApp] = useState({ company: '', role: '', salary: '', notes: '' })
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
      await api.post('/placements/applications', newApp)
      setShowAddModal(false)
      setNewApp({ company: '', role: '', salary: '', notes: '' })
      loadData()
    } catch (err) {
      console.error(err)
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
                  placeholder="e.g. Google"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Role *</label>
                <input
                  required
                  value={newApp.role}
                  onChange={(e) => setNewApp({ ...newApp, role: e.target.value })}
                  placeholder="e.g. Software Engineer Intern"
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

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Briefcase, label: 'Applications', value: applications.length || 4, color: 'from-blue-500 to-cyan-500' },
          { icon: Clock, label: 'In Review', value: applications.filter((a) => a.status === 'screening').length || 1, color: 'from-yellow-500 to-orange-500' },
          { icon: Star, label: 'Interviews Scheduled', value: interviews.length || 2, color: 'from-purple-500 to-pink-500' },
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
          {(applications.length > 0
            ? applications
            : [
                { company: 'Google', role: 'SDE Intern', status: 'interview', application_date: '2024-12-20' },
                { company: 'Microsoft', role: 'SWE Intern', status: 'screening', application_date: '2024-12-18' },
                { company: 'Amazon', role: 'SDE-1', status: 'applied', application_date: '2024-12-15' },
              ]
          ).map((a, i) => (
            <div key={i} className="glass rounded-xl p-5 flex items-center justify-between hover:border-primary/40 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-dark-lighter border border-dark-border flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-base">{a.company}</h4>
                  <p className="text-xs text-dark-muted mt-0.5">{a.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-dark-muted">{a.application_date?.slice(0, 10) || 'Recent'}</span>
                <span className={`text-xs px-3 py-1 rounded-full capitalize font-medium ${statusColors[a.status] || 'bg-slate-500/20 text-slate-300'}`}>
                  {a.status}
                </span>
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
          {(interviews.length > 0
            ? interviews
            : [
                { company: 'Google', role: 'SDE Intern', interview_type: 'Technical Round 1', scheduled_at: '2024-12-28T10:00:00' },
                { company: 'Microsoft', role: 'SWE Intern', interview_type: 'DSA & Systems', scheduled_at: '2024-12-30T14:00:00' },
              ]
          ).map((inv, i) => (
            <div key={i} className="glass rounded-xl p-5 flex items-center justify-between border border-dark-border">
              <div>
                <h4 className="font-semibold text-base">{inv.company} &middot; {inv.role}</h4>
                <p className="text-xs text-dark-muted mt-0.5">
                  Scheduled: {new Date(inv.scheduled_at).toLocaleString()}
                </p>
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
        <div className="glass rounded-2xl p-12 text-center border border-dark-border">
          <Star size={44} className="text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold">Offer Letters Hub</h3>
          <p className="text-xs text-dark-muted mt-1 max-w-sm mx-auto">
            When recruiters release formal offers, they will be archived here alongside CTC compensation breakdowns.
          </p>
        </div>
      )}
    </div>
  )
}
