import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle, Briefcase, Code2, ExternalLink, FileText,
  Github, Globe, Linkedin, Search, Users,
} from 'lucide-react'
import { api } from '../services/api'

type Candidate = {
  student_id: number
  name: string
  email?: string | null
  college?: string | null
  course?: string | null
  branch?: string | null
  passing_out_year?: number | null
  skills: string[]
  github_url?: string | null
  linkedin_url?: string | null
  portfolio_url?: string | null
  resume_url?: string | null
  leetcode_username?: string | null
  total_problems_solved: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
}

function safeExternalUrl(value?: string | null) {
  if (!value) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export default function RecruiterCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCandidates = async (searchTerm: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/campus/recruiter/candidates', {
        params: searchTerm ? { q: searchTerm } : {},
      })
      setCandidates(Array.isArray(response.data) ? response.data : [])
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || 'Could not load student profiles shared with recruiters.')
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCandidates('')
  }, [])

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    const term = query.trim()
    setSubmittedQuery(term)
    void loadCandidates(term)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Recruiter workspace</p>
        <h1 className="text-2xl font-bold">Candidate Directory</h1>
        <p className="text-sm text-dark-muted mt-1">
          Discover students who have explicitly chosen to share their professional profiles with recruiters.
        </p>
      </div>

      <div className="glass rounded-2xl p-5 border border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Users size={20} /></div>
          <div>
            <p className="text-sm text-dark-muted">Profiles available to your account</p>
            <p className="text-2xl font-bold">{loading ? '—' : candidates.length}</p>
          </div>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, branch or college"
              className="w-full bg-dark-lighter border border-dark-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-white"
            />
          </div>
          <button type="submit" disabled={loading} className="bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Search</button>
        </form>
      </div>

      <div className="rounded-xl border border-dark-border bg-dark-lighter/60 p-3 text-xs text-dark-muted">
        Candidate details are limited to information students have opted to share. Student academic scores, semester results, attendance, exams, personal finance, study records and mentor notes are excluded.
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertCircle size={17} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-10 border border-dark-border text-center text-sm text-dark-muted">Loading shared candidate profiles…</div>
      ) : candidates.length === 0 ? (
        <div className="glass rounded-2xl p-10 border border-dark-border text-center">
          <Briefcase size={34} className="mx-auto text-dark-muted mb-3" />
          <h2 className="font-semibold">{submittedQuery ? 'No matching candidates' : 'No shared profiles yet'}</h2>
          <p className="text-sm text-dark-muted mt-2 max-w-lg mx-auto">
            {submittedQuery
              ? 'Try another name, branch or college.'
              : 'Students appear here only after they enable recruiter profile sharing in their StudentOS Profile settings.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {candidates.map((candidate) => {
            const links = [
              { label: 'GitHub', icon: Github, url: safeExternalUrl(candidate.github_url) },
              { label: 'LinkedIn', icon: Linkedin, url: safeExternalUrl(candidate.linkedin_url) },
              { label: 'Portfolio', icon: Globe, url: safeExternalUrl(candidate.portfolio_url) },
              { label: 'Resume', icon: FileText, url: safeExternalUrl(candidate.resume_url) },
            ].filter((item) => item.url)

            return (
              <article key={candidate.student_id} className="glass rounded-2xl border border-dark-border p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
                      {candidate.name?.slice(0, 1).toUpperCase() || 'S'}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold truncate">{candidate.name}</h2>
                      <p className="text-xs text-dark-muted truncate">{[candidate.course, candidate.branch].filter(Boolean).join(' · ') || 'Course details not provided'}</p>
                    </div>
                  </div>
                  {candidate.passing_out_year != null && (
                    <span className="text-xs whitespace-nowrap rounded-lg bg-dark-lighter border border-dark-border px-2.5 py-1">Graduating {candidate.passing_out_year}</span>
                  )}
                </div>

                <div className="space-y-2">
                  {candidate.college && <p className="text-xs text-dark-muted">{candidate.college}</p>}
                  {candidate.email && <p className="text-xs text-dark-muted break-all">{candidate.email}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {(candidate.skills || []).map((skill) => (
                      <span key={skill} className="text-xs rounded-md bg-primary/10 text-primary px-2 py-1">{skill}</span>
                    ))}
                    {(!candidate.skills || candidate.skills.length === 0) && <span className="text-xs text-dark-muted">No skills listed</span>}
                  </div>
                </div>

                <div className="rounded-xl bg-dark-lighter border border-dark-border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2"><Code2 size={15} className="text-primary" /> LeetCode activity</div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><p className="text-lg font-bold">{candidate.total_problems_solved || 0}</p><p className="text-[10px] text-dark-muted">Solved</p></div>
                    <div><p className="text-lg font-bold">{candidate.easy_solved || 0}</p><p className="text-[10px] text-dark-muted">Easy</p></div>
                    <div><p className="text-lg font-bold">{candidate.medium_solved || 0}</p><p className="text-[10px] text-dark-muted">Medium</p></div>
                    <div><p className="text-lg font-bold">{candidate.hard_solved || 0}</p><p className="text-[10px] text-dark-muted">Hard</p></div>
                  </div>
                </div>

                {links.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {links.map(({ label, icon: Icon, url }) => (
                      <a key={label} href={url || undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-2 text-xs text-dark-muted hover:text-white hover:border-primary/50">
                        <Icon size={13} /> {label} <ExternalLink size={11} />
                      </a>
                    ))}
                  </div>
                )}
                {candidate.leetcode_username && (
                  <a href={'https://leetcode.com/u/' + encodeURIComponent(candidate.leetcode_username) + '/'} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    LeetCode profile: {candidate.leetcode_username}
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
