import { useState, useEffect } from 'react'
import { Droplets, Moon, Activity, Frown, Meh, Smile, Laugh, Check, Sparkles } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../services/api'

const moodOptions = [
  { icon: Frown, label: 'Bad', color: '#EF4444', value: 1 },
  { icon: Meh, label: 'Okay', color: '#F59E0B', value: 2 },
  { icon: Smile, label: 'Good', color: '#10B981', value: 3 },
  { icon: Laugh, label: 'Great', color: '#6C63FF', value: 4 },
]

export default function Wellness() {
  const [tab, setTab] = useState<'overview' | 'mood' | 'water' | 'sleep'>('overview')
  const [water, setWater] = useState(6)
  const [sleep, setSleep] = useState(7.5)
  const [mood, setMood] = useState(3)
  const [moodNote, setMoodNote] = useState('')
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [wellnessScore, setWellnessScore] = useState<any>({
    overall_score: 78,
    components: { mood: 80, sleep: 75, water: 80 },
    trend: 'improving',
  })

  // Load wellness summary
  useEffect(() => {
    api.get('/wellness/summary')
      .then((res) => {
        if (res.data?.today) {
          if (res.data.today.water_glasses) setWater(res.data.today.water_glasses)
          if (res.data.today.mood) setMood(res.data.today.mood)
          if (res.data.today.sleep_hours) setSleep(res.data.today.sleep_hours)
        }
      })
      .catch(() => {})

    api.get('/wellness/score')
      .then((res) => {
        if (res.data) setWellnessScore(res.data)
      })
      .catch(() => {})
  }, [])

  const notify = (msg: string) => {
    setSavedMessage(msg)
    setTimeout(() => setSavedMessage(null), 3000)
  }

  // Log Mood
  const handleLogMood = async () => {
    try {
      await api.post('/wellness/mood', { mood_score: mood, note: moodNote })
      notify('Mood logged successfully! Keep tracking daily.')
    } catch (err) {
      console.error(err)
    }
  }

  // Log Water
  const handleLogWater = async (glasses: number) => {
    setWater(glasses)
    try {
      await api.post('/wellness/water', { glasses, goal: 8 })
      notify(`${glasses} glasses recorded! Stay hydrated.`)
    } catch (err) {
      console.error(err)
    }
  }

  // Log Sleep
  const handleLogSleep = async () => {
    try {
      await api.post('/wellness/sleep', { hours: sleep, quality: 4 })
      notify(`Logged ${sleep} hours of sleep!`)
    } catch (err) {
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
          {(['overview', 'mood', 'water', 'sleep'] as const).map((t) => (
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
            value: moodOptions.find((m) => m.value === mood)?.label || 'Good',
            color: 'from-purple-500 to-pink-500',
          },
          {
            icon: Droplets,
            label: 'Hydration',
            value: `${water}/8 glasses`,
            color: 'from-blue-500 to-cyan-500',
          },
          {
            icon: Moon,
            label: 'Last Sleep',
            value: `${sleep} hrs`,
            color: 'from-indigo-500 to-purple-500',
          },
          {
            icon: Activity,
            label: 'Vitality Score',
            value: `${wellnessScore.overall_score || 78}/100`,
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
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                Status: {wellnessScore.trend || 'Improving'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={[
                  { day: 'Mon', score: 72 },
                  { day: 'Tue', score: 76 },
                  { day: 'Wed', score: 70 },
                  { day: 'Thu', score: 82 },
                  { day: 'Fri', score: 78 },
                  { day: 'Sat', score: 85 },
                  { day: 'Sun', score: 80 },
                ]}
              >
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} domain={[50, 100]} />
                <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="score" stroke="#A855F7" strokeWidth={2.5} dot={{ fill: '#A855F7', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-6 border border-dark-border space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> AI Health Recommendations
            </h3>
            <div className="space-y-3">
              {[
                'Maintain a consistent 11:00 PM sleep schedule to optimize memory consolidation.',
                'Drink at least 2 more glasses of water in the afternoon study stretch.',
                'Take a 5-minute eye rest break every 45 minutes of coding.',
              ].map((tip, i) => (
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
