import { useAuth } from '../hooks/useAuth'
import {
  Mail, Calendar, Award, Github, Linkedin, Globe, Edit2, Save, Sparkles,
  GraduationCap, ShieldCheck, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { useState, useEffect, type FormEvent } from 'react'
import { api } from '../services/api'

type AcademicProfile = {
  registration_number: string
  section: string
  course: string
  branch: string
  admission_year: string
  passing_out_year: string
  current_year: string
  current_semester: string
  cgpa: string
  sgpa: string
}

const emptyAcademicProfile: AcademicProfile = {
  registration_number: '',
  section: '',
  course: '',
  branch: '',
  admission_year: '',
  passing_out_year: '',
  current_year: '',
  current_semester: '',
  cgpa: '',
  sgpa: '',
}

export default function Profile() {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [profileData, setProfileData] = useState<any>({
    bio: '',
    department: '',
    college: '',
    github_url: '',
    linkedin_url: '',
    portfolio_url: '',
    skills: [],
  })
  const [academicData, setAcademicData] = useState<AcademicProfile>(emptyAcademicProfile)
  const [visibility, setVisibility] = useState({ profile_visible: false, contact_visible: false })
  const [disclosures, setDisclosures] = useState({ academics_visible: false, phone_visible: false, resume_visible: false })
  const [badges, setBadges] = useState<any[]>([])
  const [academicBusy, setAcademicBusy] = useState(false)
  const [visibilityBusy, setVisibilityBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    api.get('/users/profile')
      .then((res) => {
        if (res.data?.profile) setProfileData(res.data.profile)
      })
      .catch(() => {})

    api.get('/users/badges')
      .then((res) => {
        if (Array.isArray(res.data)) setBadges(res.data)
      })
      .catch(() => {})

    if (user?.role === 'student') {
      api.get('/campus/academic-profile')
        .then((res) => {
          const data = res.data || {}
          setAcademicData({
            registration_number: data.registration_number || '',
            section: data.section || '',
            course: data.course || '',
            branch: data.branch || '',
            admission_year: data.admission_year == null ? '' : String(data.admission_year),
            passing_out_year: data.passing_out_year == null ? '' : String(data.passing_out_year),
            current_year: data.current_year == null ? '' : String(data.current_year),
            current_semester: data.current_semester == null ? '' : String(data.current_semester),
            cgpa: data.cgpa == null ? '' : String(data.cgpa),
            sgpa: data.sgpa == null ? '' : String(data.sgpa),
          })
        })
        .catch(() => setPageError('Could not load your academic profile.'))
      api.get('/campus/recruiter/visibility')
        .then((res) => setVisibility({
          profile_visible: Boolean(res.data?.profile_visible),
          contact_visible: Boolean(res.data?.contact_visible),
        }))
        .catch(() => {})
      api.get('/campus/recruiter/disclosures')
        .then((res) => setDisclosures({
          academics_visible: Boolean(res.data?.academics_visible),
          phone_visible: Boolean(res.data?.phone_visible),
          resume_visible: Boolean(res.data?.resume_visible),
        }))
        .catch(() => {})
    }
  }, [user?.id, user?.role])

  const handleSave = async () => {
    try {
      await api.put('/users/profile', profileData)
      setEditing(false)
      setFeedback('Profile information saved.')
      setPageError('')
    } catch (err: any) {
      setPageError(err?.response?.data?.detail || 'Failed to update profile information.')
    }
  }

  const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value)

  const handleAcademicSave = async (event: FormEvent) => {
    event.preventDefault()
    const cgpa = numberOrNull(academicData.cgpa)
    const sgpa = numberOrNull(academicData.sgpa)
    if ((cgpa != null && (cgpa < 0 || cgpa > 10)) || (sgpa != null && (sgpa < 0 || sgpa > 10))) {
      setPageError('CGPA and SGPA must be between 0 and 10.')
      return
    }
    setAcademicBusy(true)
    setPageError('')
    setFeedback('')
    try {
      await api.put('/campus/academic-profile', {
        registration_number: academicData.registration_number,
        section: academicData.section,
        course: academicData.course,
        branch: academicData.branch,
        admission_year: numberOrNull(academicData.admission_year),
        passing_out_year: numberOrNull(academicData.passing_out_year),
        current_year: numberOrNull(academicData.current_year),
        current_semester: numberOrNull(academicData.current_semester),
        cgpa,
        sgpa,
      })
      setFeedback('Academic details saved.')
    } catch (err: any) {
      setPageError(err?.response?.data?.detail || 'Could not save your academic details.')
    } finally {
      setAcademicBusy(false)
    }
  }

  const handleVisibilitySave = async (event: FormEvent) => {
    event.preventDefault()
    setVisibilityBusy(true)
    setPageError('')
    setFeedback('')
    try {
      const response = await api.put('/campus/recruiter/visibility', visibility)
      setVisibility({
        profile_visible: Boolean(response.data?.profile_visible),
        contact_visible: Boolean(response.data?.contact_visible),
      })
      setFeedback('Recruiter visibility preferences saved.')
    } catch (err: any) {
      setPageError(err?.response?.data?.detail || 'Could not save recruiter visibility preferences.')
    } finally {
      setVisibilityBusy(false)
    }
  }

  const handleDisclosureSave = async (event: FormEvent) => {
    event.preventDefault()
    setVisibilityBusy(true)
    setPageError('')
    setFeedback('')
    try {
      const payload = visibility.profile_visible ? disclosures : {
        academics_visible: false, phone_visible: false, resume_visible: false,
      }
      const response = await api.put('/campus/recruiter/disclosures', payload)
      setDisclosures({
        academics_visible: Boolean(response.data?.academics_visible),
        phone_visible: Boolean(response.data?.phone_visible),
        resume_visible: Boolean(response.data?.resume_visible),
      })
      setFeedback('Detailed recruiter sharing preferences saved.')
    } catch (err: any) {
      setPageError(err?.response?.data?.detail || 'Could not save detailed sharing preferences.')
    } finally {
      setVisibilityBusy(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {pageError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertCircle size={17} className="shrink-0 mt-0.5" /> {pageError}
        </div>
      )}
      {feedback && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 size={17} /> {feedback}
        </div>
      )}

      <div className="glass rounded-2xl p-8 border border-dark-border">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{user?.name || 'Your Name'}</h1>
                <p className="text-dark-muted capitalize text-sm">
                  {[profileData.department, profileData.college].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (editing) void handleSave()
                  else setEditing(true)
                }}
                className="flex items-center gap-2 text-sm bg-primary/20 text-primary px-4 py-2 rounded-xl hover:bg-primary/30 transition-all font-medium"
              >
                {editing ? <Save size={16} /> : <Edit2 size={16} />}
                {editing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-dark-muted">
              <span className="flex items-center gap-1"><Mail size={14} /> {user?.email || ''}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> Joined {user?.created_at?.slice(0, 10) || '—'}</span>
              <span className="flex items-center gap-1 text-primary font-semibold"><Award size={14} /> Level {user?.level ?? 1} ({user?.xp_points ?? 0} XP)</span>
            </div>

            {editing ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={profileData.bio || ''}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Bio..."
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input value={profileData.department || ''} onChange={(e) => setProfileData({ ...profileData, department: e.target.value })} placeholder="Department" className="bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-xs text-white" />
                  <input value={profileData.college || ''} onChange={(e) => setProfileData({ ...profileData, college: e.target.value })} placeholder="College" className="bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-xs text-white" />
                </div>
                <input value={profileData.github_url || ''} onChange={(e) => setProfileData({ ...profileData, github_url: e.target.value })} placeholder="GitHub URL (https://github.com/username)" className="w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-xs text-white" />
                <input value={profileData.linkedin_url || ''} onChange={(e) => setProfileData({ ...profileData, linkedin_url: e.target.value })} placeholder="LinkedIn URL (https://linkedin.com/in/username)" className="w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-xs text-white" />
                <input value={profileData.portfolio_url || ''} onChange={(e) => setProfileData({ ...profileData, portfolio_url: e.target.value })} placeholder="Portfolio URL" className="w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-xs text-white" />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">{profileData.bio}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-dark-border">
          {[
            { icon: Github, label: 'GitHub', url: profileData.github_url },
            { icon: Linkedin, label: 'LinkedIn', url: profileData.linkedin_url },
            { icon: Globe, label: 'Portfolio', url: profileData.portfolio_url },
          ].filter(({ url }) => !!url).map(({ icon: Icon, label, url }) => (
            <a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs bg-dark-lighter border border-dark-border px-4 py-2 rounded-xl hover:border-primary/50 text-dark-muted hover:text-white transition-all">
              <Icon size={14} /> {label}
            </a>
          ))}
          {!profileData.github_url && !profileData.linkedin_url && !profileData.portfolio_url && (
            <p className="text-xs text-dark-muted">Click <strong>Edit Profile</strong> to add your GitHub, LinkedIn or Portfolio links.</p>
          )}
        </div>
      </div>

      {user?.role === 'student' && (
        <>
          <section className="glass rounded-2xl p-6 border border-dark-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><GraduationCap size={20} /></div>
              <div>
                <h2 className="font-semibold text-lg">Academic Profile</h2>
                <p className="text-xs text-dark-muted">Enter your actual college details. Nothing is prefilled with sample semester or CGPA values.</p>
              </div>
            </div>
            <form onSubmit={handleAcademicSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-dark-muted">Course
                  <input value={academicData.course} onChange={(e) => setAcademicData({ ...academicData, course: e.target.value })} placeholder="e.g. B.Tech" className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white" />
                </label>
                <label className="text-xs text-dark-muted">Branch / Department
                  <input value={academicData.branch} onChange={(e) => setAcademicData({ ...academicData, branch: e.target.value })} placeholder="e.g. Computer Science" className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white" />
                </label>
                <label className="text-xs text-dark-muted">Registration number
                  <input required value={academicData.registration_number} onChange={(e) => setAcademicData({ ...academicData, registration_number: e.target.value })} placeholder="Your college registration number" className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white" />
                </label>
                <label className="text-xs text-dark-muted">Section
                  <input required value={academicData.section} onChange={(e) => setAcademicData({ ...academicData, section: e.target.value })} placeholder="e.g. CSE-A" className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white" />
                </label>
                <label className="text-xs text-dark-muted">Admission year
                  <input type="number" min="2000" max="2200" value={academicData.admission_year} onChange={(e) => setAcademicData({ ...academicData, admission_year: e.target.value })} placeholder="e.g. 2024" className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white" />
                </label>
                <label className="text-xs text-dark-muted">Passing-out year
                  <input required type="number" min="2000" max="2200" value={academicData.passing_out_year} onChange={(e) => setAcademicData({ ...academicData, passing_out_year: e.target.value })} placeholder="Expected graduation year" className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white" />
                </label>
                <label className="text-xs text-dark-muted">Current year
                  <select value={academicData.current_year} onChange={(e) => setAcademicData({ ...academicData, current_year: e.target.value })} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white">
                    <option value="">Select year</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => <option key={year} value={year}>{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year</option>)}
                  </select>
                </label>
                <label className="text-xs text-dark-muted">Current semester
                  <select value={academicData.current_semester} onChange={(e) => setAcademicData({ ...academicData, current_semester: e.target.value })} className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white">
                    <option value="">Select semester</option>
                    {Array.from({ length: 16 }, (_, index) => index + 1).map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
                  </select>
                </label>
                <label className="text-xs text-dark-muted">Current CGPA (0–10)
                  <input type="number" min="0" max="10" step="0.01" value={academicData.cgpa} onChange={(e) => setAcademicData({ ...academicData, cgpa: e.target.value })} placeholder="Enter your actual CGPA" className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white" />
                </label>
                <label className="text-xs text-dark-muted">Latest SGPA (0–10)
                  <input type="number" min="0" max="10" step="0.01" value={academicData.sgpa} onChange={(e) => setAcademicData({ ...academicData, sgpa: e.target.value })} placeholder="Enter your latest SGPA" className="mt-1 w-full bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-sm text-white" />
                </label>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={academicBusy} className="bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                  {academicBusy ? 'Saving…' : 'Save Academic Profile'}
                </button>
              </div>
            </form>
          </section>

          <section className="glass rounded-2xl p-6 border border-dark-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center"><ShieldCheck size={20} /></div>
              <div>
                <h2 className="font-semibold text-lg">Recruiter Profile Sharing</h2>
                <p className="text-xs text-dark-muted">Your career profile is private until you opt in. Academic results, phone number and your resume each have a separate sharing control below.</p>
              </div>
            </div>
            <form onSubmit={handleVisibilitySave} className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-dark-lighter border border-dark-border">
                <input type="checkbox" checked={visibility.profile_visible} onChange={(e) => setVisibility({
                  profile_visible: e.target.checked,
                  contact_visible: e.target.checked ? visibility.contact_visible : false,
                })
                  if (!e.target.checked) setDisclosures({ academics_visible: false, phone_visible: false, resume_visible: false })
                } className="mt-0.5 accent-primary" />
                <span>
                  <span className="block text-sm font-medium text-white">Show my career profile to recruiters</span>
                  <span className="block text-xs text-dark-muted mt-1">Share your career identity, course/branch, passing-out year, skills, public links and coding statistics. Detailed fields below remain separately controlled.</span>
                </span>
              </label>
              <label className={'flex items-start gap-3 p-3 rounded-xl bg-dark-lighter border border-dark-border ' + (!visibility.profile_visible ? 'opacity-50' : '')}>
                <input type="checkbox" disabled={!visibility.profile_visible} checked={visibility.contact_visible} onChange={(e) => setVisibility({ ...visibility, contact_visible: e.target.checked })} className="mt-0.5 accent-primary" />
                <span>
                  <span className="block text-sm font-medium text-white">Allow recruiters to see my email address</span>
                  <span className="block text-xs text-dark-muted mt-1">This is separate from career-profile visibility and can be turned off at any time.</span>
                </span>
              </label>
              <div className="flex justify-end">
                <button type="submit" disabled={visibilityBusy} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                  {visibilityBusy ? 'Saving…' : 'Save Sharing Preferences'}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {([
                  ['academics_visible', 'Share academic results', 'Allow recruiters to see CGPA, SGPA, semester grades and assessment marks.'],
                  ['phone_visible', 'Share phone number', 'Allow recruiters to see the phone number saved in your profile.'],
                  ['resume_visible', 'Share my resume library', 'Allow recruiters to view and download the latest PDF in your resume library.'],
                ] as const).map(([key, title, description]) => (
                  <label key={key} className={'flex items-start gap-3 p-3 rounded-xl bg-dark-lighter border border-dark-border ' + (!visibility.profile_visible ? 'opacity-50' : '')}>
                    <input type="checkbox" disabled={!visibility.profile_visible} checked={disclosures[key]} onChange={(e) => setDisclosures({ ...disclosures, [key]: e.target.checked })} className="mt-0.5 accent-primary" />
                    <span><span className="block text-sm font-medium text-white">{title}</span><span className="block text-xs text-dark-muted mt-1">{description}</span></span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => void handleDisclosureSave({ preventDefault: () => {} } as FormEvent)} disabled={visibilityBusy || !visibility.profile_visible} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                  {visibilityBusy ? 'Saving…' : 'Save Detail Sharing'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="font-semibold text-base mb-4">Mastered Technical Skills</h3>
          <div className="flex flex-wrap gap-2">
            {(profileData.skills || []).map((skill: string) => (
              <span key={skill} className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold">{skill}</span>
            ))}
            {(profileData.skills || []).length === 0 && <p className="text-xs text-dark-muted">No skills added yet.</p>}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="font-semibold text-base mb-4">Badges &amp; Gamification Milestones</h3>
          <div className="space-y-3">
            {badges.length === 0 ? (
              <p className="text-sm text-dark-muted text-center py-4">No badges yet. Keep using StudentOS to earn them!</p>
            ) : badges.map((achievement: any, index: number) => (
              <div key={achievement.id || index} className="flex items-center gap-3.5 p-3 rounded-xl bg-dark-lighter border border-dark-border">
                <div className={'w-9 h-9 rounded-xl bg-gradient-to-br ' + (achievement.color || 'from-primary to-secondary') + ' flex items-center justify-center shrink-0'}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{achievement.badge_name || achievement.title}</p>
                  <p className="text-xs text-dark-muted">{achievement.desc || achievement.badge_icon}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
