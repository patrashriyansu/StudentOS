import { useAuth } from '../hooks/useAuth'
import { Mail, Calendar, Award, Github, Linkedin, Globe, Edit2, Save, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Profile() {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [profileData, setProfileData] = useState<any>({
    bio: 'CS student passionate about full-stack engineering and AI.',
    department: 'Computer Science',
    college: 'IIT Delhi',
    github_url: 'https://github.com/arjunsharma',
    linkedin_url: 'https://linkedin.com/in/arjunsharma',
    skills: ['Python', 'JavaScript', 'TypeScript', 'React', 'FastAPI', 'SQL', 'Docker'],
  })

  useEffect(() => {
    api.get('/users/profile')
      .then((res) => {
        if (res.data?.profile) {
          setProfileData(res.data.profile)
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      await api.put('/users/profile', profileData)
      setEditing(false)
    } catch (err) {
      console.error('Failed to update profile', err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass rounded-2xl p-8 border border-dark-border">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold shrink-0">
            {user?.name?.[0] || 'A'}
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{user?.name || 'Arjun Sharma'}</h1>
                <p className="text-dark-muted capitalize text-sm">
                  {profileData.department || 'Computer Science'} &middot; {profileData.college || 'IIT Delhi'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (editing) handleSave()
                  else setEditing(true)
                }}
                className="flex items-center gap-2 text-sm bg-primary/20 text-primary px-4 py-2 rounded-xl hover:bg-primary/30 transition-all font-medium"
              >
                {editing ? <Save size={16} /> : <Edit2 size={16} />}
                {editing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-dark-muted">
              <span className="flex items-center gap-1">
                <Mail size={14} /> {user?.email || 'demo@studentos.app'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} /> Joined {user?.created_at?.slice(0, 10) || '2024'}
              </span>
              <span className="flex items-center gap-1 text-primary font-semibold">
                <Award size={14} /> Level {user?.level || 3} ({user?.xp_points || 1250} XP)
              </span>
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
                  <input
                    value={profileData.department || ''}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                    placeholder="Department"
                    className="bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-xs text-white"
                  />
                  <input
                    value={profileData.college || ''}
                    onChange={(e) => setProfileData({ ...profileData, college: e.target.value })}
                    placeholder="College"
                    className="bg-dark-lighter border border-dark-border rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
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
          ].map(({ icon: Icon, label, url }) => (
            <a
              key={label}
              href={url || '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs bg-dark-lighter border border-dark-border px-4 py-2 rounded-xl hover:border-primary/50 text-dark-muted hover:text-white transition-all"
            >
              <Icon size={14} />
              {label}
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="font-semibold text-base mb-4">Mastered Technical Skills</h3>
          <div className="flex flex-wrap gap-2">
            {(profileData.skills || ['Python', 'React', 'FastAPI', 'Data Structures', 'SQL', 'Docker']).map((s: string) => (
              <span key={s} className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="font-semibold text-base mb-4">Badges & Gamification Milestones</h3>
          <div className="space-y-3">
            {[
              { title: '12-Day Study Streak', desc: 'Maintained consecutive daily logins', color: 'from-yellow-500 to-orange-500' },
              { title: '100+ Problems Solved', desc: 'Conquered core DSA problem sheets', color: 'from-primary to-secondary' },
              { title: 'Consistent Hydration', desc: 'Met 8-glass goal for 5 days', color: 'from-emerald-500 to-teal-500' },
            ].map((ach, i) => (
              <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl bg-dark-lighter border border-dark-border">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ach.color} flex items-center justify-center shrink-0`}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{ach.title}</p>
                  <p className="text-xs text-dark-muted">{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
