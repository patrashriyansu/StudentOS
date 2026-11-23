import { useState, useEffect } from 'react'
import { Droplets, Moon, Activity, Frown, Meh, Smile, Laugh, Check, Sparkles, Star } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../services/api'

const moodOptions = [
  { icon: Frown, label: 'Bad', color: '#EF4444', value: 1 },
  { icon: Meh, label: 'Okay', color: '#F59E0B', value: 2 },
  { icon: Smile, label: 'Good', color: '#10B981', value: 3 },
  { icon: Laugh, label: 'Great', color: '#6C63FF', value: 4 },
  { icon: Star, label: 'Excellent', color: '#FBBF24', value: 5 },
]

export default function Wellness() {
  const [tab, setTab] = useState<'overview' | 'mood' | 'water' | 'sleep' | 'activity'>('overview')
  const [water, setWater] = useState(0)
  const [sleep, setSleep] = useState(7.5)
  const [mood, setMood] = useState(3)
  const [hasWater, setHasWater] = useState(false)
  const [hasSleep, setHasSleep] = useState(false)
  const [hasMood, setHasMood] = useState(false)
  const [moodNote, setMoodNote] = useState('')
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [wellnessScore, setWellnessScore] = useState<any>(null)
  const [trendData, setTrendData] = useState<{ day: string; score: number }[]>([])
  const [exerciseDuration, setExerciseDuration] = useState(30)
  const [exerciseType, setExerciseType] = useState('walking')
  const [meditationDuration, setMeditationDuration] = useState(10)
  const [activityHistory, setActivityHistory] = useState<any[]>([])

  // Load wellness summary
  useEffect(() => {
    api.get('/wellness/summary')
      .then((res) => {
        if (res.data?.today) {
          if (res.data.today.water_glasses != null) {
            setWater(res.data.today.water_glasses)
            setHasWater(true)
          }
          if (res.data.today.mood != null) {
            setMood(res.data.today.mood)
            setHasMood(true)
          }
          if (res.data.today.sleep_hours != null) {
            setSleep(res.data.today.sleep_hours)
            setHasSleep(true)
          }
        }
      })
      .catch(() => {})

    api.get('/wellness/score')
      .then((res) => {
        if (res.data) setWellnessScore(res.data)
      })
      .catch(() => {})

    api.get('/wellness/exercise/history', { params: { days: 30 } })
      .then((res) => setActivityHistory(Array.isArray(res.data?.history) ? res.data.history : []))
      .catch(() => setActivityHistory([]))

    api.get('/wellness/history', { params: { days: 7 } })
      .then((res) => {
        const history = Array.isArray(res.data?.history) ? res.data.history : []
        setTrendData(history
          .filter((entry: { score?: number | null }) => entry.score !== null && entry.score !== undefined)
          .map((entry: { date: string; score: number }) => ({
            day: new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
            score: entry.score,
          })))
      })
      .catch(() => setTrendData([]))
  }, [])

  const notify = (msg: string) => {
    setSavedMessage(msg)
    setTimeout(() => setSavedMessage(null), 3000)
  }

  const refreshAnalytics = async () => {
    const [scoreResponse, historyResponse] = await Promise.all([
      api.get('/wellness/score'),
      api.get('/wellness/history', { params: { days: 7 } }),
    ])
    setWellnessScore(scoreResponse.data)
    const history = Array.isArray(historyResponse.data?.history) ? historyResponse.data.history : []
    setTrendData(history
      .filter((entry: { score?: number | null }) => entry.score !== null && entry.score !== undefined)
      .map((entry: { date: string; score: number }) => ({
        day: new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
        score: entry.score,
      })))
  }

  // Log Mood
  const handleLogMood = async () => {
    try {
      await api.post('/wellness/mood', { mood_score: mood, note: moodNote })
      setHasMood(true)
      notify('Mood logged successfully! Keep tracking daily.')
      void refreshAnalytics().catch(console.error)
    } catch (err) {
      console.error(err)
    }
  }

  // Log Water
  const handleLogWater = async (glasses: number) => {
    try {
      await api.post('/wellness/water', { glasses, goal: 8 })
      setWater(glasses)
      setHasWater(true)
      notify(`${glasses} glasses recorded! Stay hydrated.`)
      void refreshAnalytics().catch(console.error)
    } catch (err) {
      console.error(err)
    }
  }

  // Log Sleep
  const handleLogSleep = async () => {
    try {
      await api.post('/wellness/sleep', { hours: sleep, quality: 4 })
      setHasSleep(true)
      notify(`Logged ${sleep} hours of sleep!`)
      void refreshAnalytics().catch(console.error)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogExercise = async () => {
    try {
      await api.post('/wellness/exercise', { duration_minutes: exerciseDuration, exercise_type: exerciseType })
      notify('Exercise activity saved.')
      const history = await api.get('/wellness/exercise/history', { params: { days: 30 } })
      setActivityHistory(Array.isArray(history.data?.history) ? history.data.history : [])
    } catch (err) {
      notify('Could not save exercise activity. Please try again.')
      console.error(err)
    }
  }

  const handleLogMeditation = async () => {
    try {
      await api.post('/wellness/meditation', { duration_minutes: meditationDuration, session_type: 'mindfulness' })
      notify('Meditation session saved.')
    } catch (err) {
      notify('Could not save meditation session. Please try again.')
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Wellness & Vitality</h1>
          <p className="text-dark-muted">Balance sleep, hydration, mood and mental well-being for peak academic focus</p>
        </div>
        <div className="flex gap-1 glass rounded-xl p-1">
          {(['overview', 'mood', 'water', 'sleep', 'activity'] as const).map((t) => (
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
      </div>

      {/* Toast Notification */}
      {savedMessage && (
        <div className="glass border-emerald-500/40 rounded-xl p-3 flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-sm">
          <Check size={16} /> {savedMessage}
        </div>
      )}

      {/* Top 4 Stat Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            icon: Smile,
            label: 'Today Mood',
            value: hasMood ? (moodOptions.find((m) => m.value === mood)?.label || 'Not logged') : 'Not logged',
            color: 'from-purple-500 to-pink-500',
          },
          {
            icon: Droplets,
            label: 'Hydration',
            value: hasWater ? `${water}/8 glasses` : 'Not logged',
            color: 'from-blue-500 to-cyan-500',
          },
          {
            icon: Moon,
            label: 'Last Sleep',
            value: hasSleep ? `${sleep} hrs` : 'Not logged',
            color: 'from-indigo-500 to-purple-500',
          },
          {
            icon: Activity,
            label: 'Vitality Score',
            value: wellnessScore?.overall_score == null
              ? 'Not enough data'
              : `${wellnessScore.overall_score}/100`,
            color: 'from-emerald-500 to-teal-500',
          },
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

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass rounded-2xl p-6 border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">Wellness Vitality Score Trend</h3>
              {wellnessScore && (
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                  Status: {wellnessScore.trend === 'not_enough_data' ? 'Track your habits' : (wellnessScore.trend || 'Tracking')}
                </span>
              )}
            </div>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="score" stroke="#A855F7" strokeWidth={2.5} dot={{ fill: '#A855F7', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-dark-muted">Log mood, sleep or water entries to build your personal trend.</p>
            )}
          </div>

          <div className="glass rounded-2xl p-6 border border-dark-border space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> Wellness Guidance
            </h3>
            <div className="space-y-3">
              {(wellnessScore?.recommendations?.length
                ? wellnessScore.recommendations
                : ['Keep logging your daily habits to receive guidance based on your wellness history.']
              ).map((tip: string, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-dark-lighter border border-dark-border text-xs leading-relaxed text-slate-200">
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Mood */}
      {tab === 'mood' && (
        <div className="glass rounded-2xl p-8 text-center max-w-2xl mx-auto border border-dark-border">
          <h3 className="font-semibold text-lg mb-2">How are you feeling today?</h3>
          <p className="text-xs text-dark-muted mb-6">Tracking your emotional state helps correlate burnout and productivity peaks</p>
          <div className="flex justify-center gap-4 mb-6">
            {moodOptions.map((m) => (
              <button
                key={m.label}
                onClick={() => setMood(m.value)}
                className={`p-5 rounded-2xl transition-all flex flex-col items-center gap-2 ${
                  mood === m.value
                    ? 'border-2 scale-105 bg-dark-lighter'
                    : 'border border-dark-border hover:border-primary/50'
                }`}
                style={{ borderColor: mood === m.value ? m.color : undefined }}
              >
                <m.icon size={36} style={{ color: m.color }} />
                <p className="text-xs font-medium">{m.label}</p>
              </button>
            ))}
          </div>
          <textarea
            value={moodNote}
            onChange={(e) => setMoodNote(e.target.value)}
            className="w-full bg-dark-lighter border border-dark-border rounded-xl p-4 text-sm text-white focus:outline-none focus:border-primary mb-4"
            rows={3}
            placeholder="Add an optional reflection (e.g. Feeling accomplished after solving Graph problems)..."
          />
          <button
            onClick={handleLogMood}
            className="bg-primary hover:bg-primary/90 text-white font-medium px-8 py-2.5 rounded-xl text-sm transition-all"
          >
            Save Today&apos;s Mood
          </button>
        </div>
      )}

      {/* Tab: Water */}
      {tab === 'water' && (
        <div className="glass rounded-2xl p-8 text-center max-w-xl mx-auto border border-dark-border">
          <h3 className="font-semibold text-lg mb-1">Hydration Tracker</h3>
          <p className="text-xs text-dark-muted mb-6">Recommended daily intake: 8 glasses (2.5L)</p>
          <div className="flex justify-center flex-wrap gap-2.5 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleLogWater(i + 1)}
                className={`w-12 h-14 rounded-xl transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  i < water ? 'bg-blue-500/20 border-blue-400 text-blue-400' : 'bg-dark-lighter border-dark-border text-dark-muted'
                }`}
              >
                <Droplets size={20} />
                <span className="text-[10px] mt-1 font-semibold">{i + 1}</span>
              </button>
            ))}
          </div>
          <p className="text-xl font-bold mb-2">
            {water} / 8 glasses completed ({Math.min(100, Math.round((water / 8) * 100))}%)
          </p>
          <div className="w-full bg-dark-lighter rounded-full h-3 mb-6 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
              style={{ width: `${Math.min(100, (water / 8) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Tab: Activity and mindfulness */}
      {tab === 'activity' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="glass rounded-2xl border border-dark-border p-6 space-y-4">
            <div className="flex items-center gap-2"><Activity size={20} className="text-emerald-400"/><h3 className="font-semibold text-lg">Exercise log</h3></div>
            <p className="text-sm text-dark-muted">Record your actual movement and exercise sessions.</p>
            <label className="block text-xs text-dark-muted">Activity type</label>
            <select value={exerciseType} onChange={(event) => setExerciseType(event.target.value)} className="w-full rounded-xl border border-dark-border bg-dark-lighter px-3 py-2.5 text-sm text-white">
              {['walking', 'running', 'cycling', 'strength training', 'yoga', 'sports', 'other'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="block text-xs text-dark-muted">Duration · {exerciseDuration} minutes</label>
            <input type="range" min={5} max={180} step={5} value={exerciseDuration} onChange={(event) => setExerciseDuration(Number(event.target.value))} className="w-full accent-primary"/>
            <button onClick={() => void handleLogExercise()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">Save exercise</button>
            <div className="border-t border-dark-border pt-4"><h4 className="mb-2 text-sm font-semibold">Recent activity</h4>{activityHistory.length === 0 ? <p className="text-xs text-dark-muted">No exercise records yet.</p> : <div className="space-y-2">{activityHistory.slice(-7).reverse().map((item, index) => <div key={index} className="flex justify-between rounded-lg bg-dark-lighter p-3 text-xs"><span className="capitalize">{item.exercise_type} · {item.duration_minutes} min</span><span className="text-dark-muted">{new Date(item.date).toLocaleDateString()}</span></div>)}</div>}</div>
          </section>
          <section className="glass rounded-2xl border border-dark-border p-6 space-y-4">
            <div className="flex items-center gap-2"><Sparkles size={20} className="text-primary"/><h3 className="font-semibold text-lg">Mindfulness session</h3></div>
            <p className="text-sm text-dark-muted">Track a meditation session you completed. StudentOS records the duration; it does not assume a session took place.</p>
            <label className="block text-xs text-dark-muted">Meditation duration · {meditationDuration} minutes</label>
            <input type="range" min={1} max={60} step={1} value={meditationDuration} onChange={(event) => setMeditationDuration(Number(event.target.value))} className="w-full accent-primary"/>
            <div className="text-4xl font-bold">{meditationDuration}<span className="ml-2 text-base font-normal text-dark-muted">minutes</span></div>
            <button onClick={() => void handleLogMeditation()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">Record completed session</button>
          </section>
        </div>
      )}

      {/* Tab: Sleep */}
      {tab === 'sleep' && (
        <div className="glass rounded-2xl p-8 text-center max-w-xl mx-auto border border-dark-border">
          <h3 className="font-semibold text-lg mb-1">Sleep & Rest Log</h3>
          <p className="text-xs text-dark-muted mb-6">Healthy sleep stabilizes cognitive recall and lowers exam anxiety</p>
          <Moon size={44} className="text-indigo-400 mx-auto mb-3" />
          <p className="text-5xl font-black mb-2 font-mono">
            {sleep}
            <span className="text-lg font-normal text-dark-muted"> hrs</span>
          </p>
          <p className="text-xs text-dark-muted mb-6">Last night's total restful sleep duration</p>
          <div className="max-w-xs mx-auto mb-6">
            <input
              type="range"
              min={4}
              max={12}
              step={0.5}
              value={sleep}
              onChange={(e) => setSleep(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-dark-muted mt-2">
              <span>4h</span>
              <span>8h (ideal)</span>
              <span>12h</span>
            </div>
          </div>
          <button
            onClick={handleLogSleep}
            className="bg-primary hover:bg-primary/90 text-white font-medium px-8 py-2.5 rounded-xl text-sm transition-all"
          >
            Record Sleep Duration
          </button>
        </div>
      )}
    </div>
  )
}
