import { useCallback, useEffect, useState } from 'react'
import { Code, ExternalLink, Activity, Trophy, Flame, Check, Edit2, RefreshCw, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../services/api'

type DifficultyStat = { name: string; value: number; color: string }

const emptyProfile = {
  leetcode_username: '',
  codeforces_username: '',
  codechef_username: '',
  total_problems_solved: 0,
  easy_solved: 0,
  medium_solved: 0,
  hard_solved: 0,
  total_contests: 0,
  current_streak: 0,
  max_streak: 0,
  rating: 0,
}

const defaultDifficulty: DifficultyStat[] = [
  { name: 'Easy', value: 0, color: '#10B981' },
  { name: 'Medium', value: 0, color: '#F59E0B' },
  { name: 'Hard', value: 0, color: '#EF4444' },
]

function normalizeLeetCodeInput(value: string) {
  const candidate = value.trim().replace(/^@/, '')
  const match = candidate.match(/^(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([^/?#]+)\/?(?:[?#].*)?$/i)
  return match ? match[1] : candidate
}

function apiErrorMessage(error: any) {
  return error?.response?.data?.detail || error?.message || 'Could not sync your LeetCode profile.'
}

export default function Coding() {
  const [profile, setProfile] = useState<any>(emptyProfile)
  const [dsaTopics, setDsaTopics] = useState<any[]>([])
  const [difficultyData, setDifficultyData] = useState<DifficultyStat[]>(defaultDifficulty)
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [savingPlatform, setSavingPlatform] = useState(false)
  const [syncingLeetCode, setSyncingLeetCode] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [collegeLeaderboard, setCollegeLeaderboard] = useState<any[]>([])

  const loadAnalytics = useCallback(async () => {
    const response = await api.get('/coding/analytics')
    const counts = response.data?.difficulty_breakdown || {}
    setDifficultyData([
      { name: 'Easy', value: Number(counts.easy) || 0, color: '#10B981' },
      { name: 'Medium', value: Number(counts.medium) || 0, color: '#F59E0B' },
      { name: 'Hard', value: Number(counts.hard) || 0, color: '#EF4444' },
    ])
  }, [])

  const syncLeetCode = useCallback(async (handle: string) => {
    if (!handle) return false
    setSyncingLeetCode(true)
    setSyncError('')
    setSyncMessage('')
    try {
      const response = await api.post('/coding/leetcode/sync')
      const syncedProfile = response.data?.profile
      if (syncedProfile) setProfile((previous: any) => ({ ...previous, ...syncedProfile }))
      setLastSynced(response.data?.synced_at || new Date().toISOString())
      setSyncMessage('LeetCode connected. Your solved count and difficulty breakdown are up to date.')
      await loadAnalytics()
      return true
    } catch (error) {
      setSyncError(apiErrorMessage(error))
      return false
    } finally {
      setSyncingLeetCode(false)
    }
  }, [loadAnalytics])

  useEffect(() => {
    let active = true

    const loadPage = async () => {
      const [profileResult, topicsResult, leaderboardResult] = await Promise.allSettled([
        api.get('/coding/profile'),
        api.get('/coding/dsa-progress'),
        api.get('/campus/leaderboard'),
      ])

      if (!active) return

      if (profileResult.status === 'fulfilled' && profileResult.value.data) {
        const savedProfile = { ...emptyProfile, ...profileResult.value.data }
        setProfile(savedProfile)
        if (savedProfile.leetcode_username) {
          await syncLeetCode(savedProfile.leetcode_username)
        } else {
          try {
            await loadAnalytics()
          } catch {
            // Keep the empty chart when analytics are not available yet.
          }
        }
      }

      if (active && topicsResult.status === 'fulfilled' && Array.isArray(topicsResult.value.data)) {
        setDsaTopics(topicsResult.value.data)
      }
      if (active && leaderboardResult.status === 'fulfilled' && Array.isArray(leaderboardResult.value.data?.students)) {
        setCollegeLeaderboard(leaderboardResult.value.data.students)
      }
    }

    void loadPage()
    return () => { active = false }
  }, [loadAnalytics, syncLeetCode])

  const handleSaveUsername = async (platform: string) => {
    const enteredValue = usernameInput.trim()
    const username = platform === 'leetcode' ? normalizeLeetCodeInput(enteredValue) : enteredValue
    if (!username) {
      setSyncError('Enter a username or profile URL first.')
      return
    }
    if (platform === 'leetcode' && !/^[A-Za-z0-9_-]{1,50}$/.test(username)) {
      setSyncError('Enter a valid LeetCode username or profile URL.')
      return
    }

    setSavingPlatform(true)
    setSyncError('')
    setSyncMessage('')
    try {
      await api.put('/coding/profile', { platform, username })
      setProfile((previous: any) => ({ ...previous, [`${platform}_username`]: username }))
      setEditingPlatform(null)

      if (platform === 'leetcode') {
        await syncLeetCode(username)
      }
    } catch (error) {
      setSyncError(apiErrorMessage(error))
    } finally {
      setSavingPlatform(false)
    }
  }

  const platforms = [
    { id: 'leetcode', name: 'LeetCode', color: '#F59E0B', username: profile.leetcode_username },
  ]

  const statCards = [
    { icon: Code, label: 'Problems Solved (All-time)', value: profile.total_problems_solved ?? 0, color: 'from-primary to-secondary' },
    { icon: Activity, label: 'Contests Attended', value: profile.total_contests ?? 0, color: 'from-emerald-500 to-teal-500' },
    { icon: Flame, label: 'Current Streak', value: `${profile.current_streak ?? 0} days`, color: 'from-red-500 to-pink-500' },
    { icon: Trophy, label: 'Contest Rating', value: profile.rating ?? 0, color: 'from-yellow-500 to-orange-500' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coding & DSA Command Center</h1>
          <p className="text-dark-muted">Track problem solving, contest ratings & DSA sheets across platforms</p>
        </div>
      </div>

      {syncError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}
      {syncMessage && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <Check size={17} className="mt-0.5 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      <section className="glass rounded-2xl p-5 border border-dark-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Trophy size={17} className="text-amber-400" /> College Coding Leaderboard</h2>
            <p className="text-xs text-dark-muted mt-1">All registered students, ranked by verified LeetCode solved questions.</p>
          </div>
          <span className="text-xs text-dark-muted">{collegeLeaderboard.length} students</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-dark-muted"><tr><th className="p-2">Rank</th><th className="p-2">Student</th><th className="p-2">Section</th><th className="p-2 text-right">Solved</th><th className="p-2 text-right">Easy</th><th className="p-2 text-right">Medium</th><th className="p-2 text-right">Hard</th></tr></thead>
            <tbody>
              {collegeLeaderboard.slice(0, 50).map((student: any, index: number) => (
                <tr key={student.student_id ?? index} className="border-t border-dark-border/70">
                  <td className="p-2 font-semibold">{student.rank ?? index + 1}</td>
                  <td className="p-2">{student.name}</td>
                  <td className="p-2">{student.section || '—'}</td>
                  <td className="p-2 text-right font-bold">{student.total_solved ?? 0}</td>
                  <td className="p-2 text-right">{student.easy_solved ?? 0}</td>
                  <td className="p-2 text-right">{student.medium_solved ?? 0}</td>
                  <td className="p-2 text-right">{student.hard_solved ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {collegeLeaderboard.length === 0 && <p className="text-xs text-dark-muted py-4 text-center">No student profiles yet. Connect LeetCode and sync to appear in the rankings.</p>}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="font-semibold text-base mb-4">Difficulty Distribution</h3>
          {difficultyData.every((item) => item.value === 0) ? (
            <p className="text-sm text-dark-muted text-center py-16">
              {profile.leetcode_username ? 'No accepted problems reported by this profile yet.' : 'Connect LeetCode to load your solved-question breakdown.'}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={difficultyData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={5} dataKey="value">
                  {difficultyData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-6 mt-3">
            {difficultyData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <span className="text-xs text-dark-muted font-medium">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="font-semibold text-base mb-4">Connected Coding Handles</h3>
          <div className="space-y-3.5">
            {platforms.map((item) => {
              const isEditing = editingPlatform === item.id
              const leetCodeUrl = item.id === 'leetcode' && item.username
                ? `https://leetcode.com/u/${normalizeLeetCodeInput(item.username)}/`
                : null

              return (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-dark-lighter border border-dark-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}25` }}>
                      <ExternalLink size={18} style={{ color: item.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{item.name}</p>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={usernameInput}
                          onChange={(event) => setUsernameInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void handleSaveUsername(item.id)
                            if (event.key === 'Escape') setEditingPlatform(null)
                          }}
                          placeholder="LeetCode username or profile URL"
                          className="w-full min-w-[180px] bg-dark border border-dark-border rounded px-2 py-1 text-xs text-white mt-1"
                        />
                      ) : item.username ? (
                        <a
                          href={leetCodeUrl || `https://leetcode.com/u/${item.username}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-xs text-dark-muted mt-0.5 font-mono hover:text-primary"
                        >
                          @{normalizeLeetCodeInput(item.username)}
                        </a>
                      ) : (
                        <p className="text-xs text-dark-muted mt-0.5">Not connected</p>
                      )}
                      {item.id === 'leetcode' && lastSynced && !isEditing && (
                        <p className="text-[11px] text-dark-muted mt-1">
                          Last synced {new Date(lastSynced).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => void handleSaveUsername(item.id)}
                          disabled={savingPlatform || syncingLeetCode}
                          className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                          {savingPlatform ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPlatform(null)}
                          disabled={savingPlatform}
                          className="text-xs text-dark-muted hover:text-white px-2 py-1.5"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {item.id === 'leetcode' && item.username && (
                          <button
                            onClick={() => void syncLeetCode(item.username)}
                            disabled={syncingLeetCode}
                            className="text-xs bg-dark-card border border-dark-border text-dark-muted hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
                          >
                            <RefreshCw size={12} className={syncingLeetCode ? 'animate-spin' : ''} />
                            {syncingLeetCode ? 'Syncing' : 'Sync stats'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingPlatform(item.id)
                            setUsernameInput(item.username || '')
                            setSyncError('')
                          }}
                          className="text-xs bg-dark-card border border-dark-border text-dark-muted hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Edit2 size={12} /> {item.username ? 'Edit' : 'Connect'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {syncingLeetCode && (
            <p className="text-xs text-dark-muted mt-3">Fetching your public LeetCode profile statistics…</p>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border border-dark-border">
        <h3 className="font-semibold text-base mb-4">DSA Sheet Topic Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {dsaTopics.length === 0 ? (
            <p className="col-span-2 text-sm text-dark-muted text-center py-6">No DSA progress tracked yet.</p>
          ) : (
            dsaTopics.map((topic: any) => {
              const percentage = Math.round(((topic.solved_problems || 0) / (topic.total_problems || 1)) * 100)
              return (
                <div key={topic.topic} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{topic.topic}</span>
                    <span className="text-dark-muted">
                      {topic.solved_problems}/{topic.total_problems} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-dark-lighter rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
