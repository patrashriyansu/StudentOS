import { useState, useEffect } from 'react'
import { Code, ExternalLink, Activity, Trophy, Flame, Check, Edit2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../services/api'

export default function Coding() {
  const [platform, setPlatform] = useState('leetcode')
  const [profile, setProfile] = useState<any>({
    leetcode_username: 'arjun_sharma',
    codeforces_username: 'arjun_cf',
    codechef_username: '',
    total_problems_solved: 187,
    total_contests: 18,
    current_streak: 12,
    rating: 1642,
  })
  const [dsaTopics, setDsaTopics] = useState<any[]>([])
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null)
  const [usernameInput, setUsernameInput] = useState('')

  useEffect(() => {
    api.get('/coding/profile')
      .then((res) => {
        if (res.data) setProfile(res.data)
      })
      .catch(() => {})

    api.get('/coding/dsa-progress')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) setDsaTopics(res.data)
      })
      .catch(() => {})
  }, [])

  const handleSaveUsername = async (plt: string) => {
    try {
      await api.put('/coding/profile', { platform: plt, username: usernameInput })
      setProfile((prev: any) => ({ ...prev, [`${plt}_username`]: usernameInput }))
      setEditingPlatform(null)
    } catch (err) {
      console.error('Failed to update username', err)
    }
  }

  const platforms = [
    { id: 'leetcode', name: 'LeetCode', color: '#F59E0B', username: profile.leetcode_username },
    { id: 'codeforces', name: 'Codeforces', color: '#6C63FF', username: profile.codeforces_username },
    { id: 'codechef', name: 'CodeChef', color: '#A855F7', username: profile.codechef_username },
  ]

  const difficultyData = [
    { name: 'Easy', value: 75, color: '#10B981' },
    { name: 'Medium', value: 92, color: '#F59E0B' },
    { name: 'Hard', value: 20, color: '#EF4444' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coding & DSA Command Center</h1>
          <p className="text-dark-muted">Track problem solving, contest ratings & DSA sheets across platforms</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Code, label: 'Problems Solved', value: profile.total_problems_solved || 187, color: 'from-primary to-secondary' },
          { icon: Activity, label: 'Contests Attended', value: profile.total_contests || 18, color: 'from-emerald-500 to-teal-500' },
          { icon: Flame, label: 'Current Streak', value: `${profile.current_streak || 12} days`, color: 'from-red-500 to-pink-500' },
          { icon: Trophy, label: 'Max Rating', value: profile.rating || 1642, color: 'from-yellow-500 to-orange-500' },
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

      {/* Difficulty Breakdown & Platform Handles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="font-semibold text-base mb-4">Difficulty Distribution</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={difficultyData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={5} dataKey="value">
                {difficultyData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-3">
            {difficultyData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                <span className="text-xs text-dark-muted font-medium">
                  {d.name}: {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="font-semibold text-base mb-4">Connected Coding Handles</h3>
          <div className="space-y-3.5">
            {platforms.map((p) => {
              const isEditing = editingPlatform === p.id
              return (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-lighter border border-dark-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${p.color}25` }}>
                      <ExternalLink size={18} style={{ color: p.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm capitalize">{p.name}</p>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder="Enter handle"
                          className="bg-dark border border-dark-border rounded px-2 py-0.5 text-xs text-white mt-1"
                        />
                      ) : (
                        <p className="text-xs text-dark-muted mt-0.5 font-mono">
                          {p.username ? `@${p.username}` : 'Not connected'}
                        </p>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <button
                      onClick={() => handleSaveUsername(p.id)}
                      className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium hover:bg-primary/90"
                    >
                      <Check size={14} /> Save
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingPlatform(p.id)
                        setUsernameInput(p.username || '')
                      }}
                      className="text-xs bg-dark-card border border-dark-border text-dark-muted hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Edit2 size={12} /> {p.username ? 'Edit' : 'Connect'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* DSA Topic Progress Sheet */}
      <div className="glass rounded-2xl p-6 border border-dark-border">
        <h3 className="font-semibold text-base mb-4">DSA Sheet Topic Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {(dsaTopics.length > 0
            ? dsaTopics
            : [
                { topic: 'Arrays', solved_problems: 42, total_problems: 50 },
                { topic: 'Strings', solved_problems: 35, total_problems: 40 },
                { topic: 'Linked Lists', solved_problems: 28, total_problems: 30 },
                { topic: 'Stack & Queue', solved_problems: 22, total_problems: 25 },
                { topic: 'Trees & BST', solved_problems: 38, total_problems: 45 },
                { topic: 'Graphs', solved_problems: 30, total_problems: 50 },
                { topic: 'Dynamic Programming', solved_problems: 35, total_problems: 60 },
                { topic: 'Binary Search', solved_problems: 27, total_problems: 30 },
              ]
          ).map((t: any) => {
            const pct = Math.round(((t.solved_problems || 0) / (t.total_problems || 1)) * 100)
            return (
              <div key={t.topic} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span>{t.topic}</span>
                  <span className="text-dark-muted">
                    {t.solved_problems}/{t.total_problems} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-dark-lighter rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
