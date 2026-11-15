import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  BookOpen, Code, Briefcase, Bot, Heart, Timer, Wallet,
  ArrowRight, TrendingUp, TrendingDown, Calendar, CheckCircle2,
  AlertCircle, Clock, Sparkles, ChevronRight, BarChart3, Flame,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis,
} from 'recharts'
import { api } from '../services/api'

/* ── helpers ─────────────────────────────────────────────────── */
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/* ── hub cards shown in image ────────────────────────────────── */
const hubs = [
  { icon: BookOpen, label: 'Academics',  sub: 'Attendance, CGPA, Exams', color: '#10B981', to: '/academics' },
  { icon: Bot,      label: 'Study Hub',  sub: 'Notes, Quiz, Flashcards',  color: '#A855F7', to: '/ai' },
  { icon: Code,     label: 'Coding',     sub: 'LeetCode, Contests, DSA',  color: '#00D4FF', to: '/coding' },
  { icon: Briefcase,label: 'Placement',  sub: 'Resume, Mock, ATS Score',  color: '#F59E0B', to: '/placements' },
  { icon: Heart,    label: 'Wellness',   sub: 'Mood, Sleep, Water',       color: '#F43F5E', to: '/wellness' },
  { icon: Wallet,   label: 'Finance',    sub: 'Expenses, Budget, Goals',  color: '#8B5CF6', to: '/expenses' },
]

/* ── stat card component ─────────────────────────────────────── */
function StatCard({ label, value, unit, sub, color, Icon, trend }: any) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: '#12122A', border: '1px solid rgba(108,99,255,0.12)' }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-8 translate-x-8"
        style={{ background: color, filter: 'blur(24px)' }} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{unit}</p>
      </div>
      {sub && (
        <div className="flex items-center gap-1 text-xs font-medium"
          style={{ color: trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#9CA3AF' }}>
          {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
          {sub}
        </div>
      )}
    </div>
  )
}

/* ── donut progress ──────────────────────────────────────────── */
function DonutProgress({ value, max = 100, color, size = 100, stroke = 10 }: any) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  )
}

/* ── streak banner ─────────────────────────────────────────────────── */
function StreakBanner({ streak, pinged }: { streak: number; pinged: boolean }) {
  const milestones = [3, 7, 14, 30, 60, 100]
  const nextMilestone = milestones.find(m => m > streak) ?? 100
  const prevMilestone = [...milestones].reverse().find(m => m <= streak) ?? 0
  const progress = nextMilestone === prevMilestone ? 100
    : Math.round(((streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100)

  const flameColor = streak >= 30 ? '#FF6B00'
    : streak >= 14 ? '#F59E0B'
    : streak >= 7  ? '#EF4444'
    : streak >= 3  ? '#F97316'
    : streak >= 1  ? '#6C63FF'
    : '#374151'

  const label = streak >= 30 ? 'Legend 🏆'
    : streak >= 14 ? 'On Fire! 🔥'
    : streak >= 7  ? 'Hot Streak ⚡'
    : streak >= 3  ? 'Building Momentum 💪'
    : streak >= 1  ? 'Just Started!'
    : 'No streak yet'

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: '#12122A', border: `1px solid ${flameColor}40` }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-10 translate-x-10"
        style={{ background: flameColor, filter: 'blur(30px)' }} />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={20} style={{ color: flameColor }} />
          <span className="font-semibold text-white">Daily Streak</span>
        </div>
        {pinged && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: '#10B98120', color: '#10B981' }}>
            ✓ Active today
          </span>
        )}
      </div>
      <div className="flex items-end gap-3 mb-4">
        <span className="text-5xl font-bold" style={{ color: flameColor }}>{streak}</span>
        <div className="mb-1">
          <p className="text-sm text-white font-medium">day{streak !== 1 ? 's' : ''}</p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>{label}</p>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: '#6B7280' }}>Next: {nextMilestone} days</span>
          <span style={{ color: flameColor }}>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${flameColor}99, ${flameColor})` }} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs" style={{ color: '#6B7280' }}>Past 7 days:</span>
        <div className="flex gap-1">
          {Array.from({ length: 7 }, (_, i) => {
            const daysAgo = 6 - i
            const active = daysAgo < streak
            return (
              <div key={i}
                title={daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
                className="w-5 h-5 rounded-md transition-all"
                style={{
                  background: active ? flameColor : 'rgba(255,255,255,0.06)',
                  border: daysAgo === 0 ? `1px solid ${flameColor}` : '1px solid transparent',
                }} />
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [academics, setAcademics] = useState<any>(null)
  const [codingProfile, setCodingProfile] = useState<any>(null)
  const [taskStats, setTaskStats] = useState<any>({ completed: 0, total: 0 })
  const [exams, setExams] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [studyData, setStudyData] = useState<any[]>([])
  const [wellnessSummary, setWellnessSummary] = useState<any>(null)
  const [streak, setStreak] = useState<number>(0)
  const [streakPingedToday, setStreakPingedToday] = useState<boolean>(false)

  useEffect(() => {
    // Academics
    Promise.all([
      api.get('/academics/subjects').catch(() => ({ data: [] })),
      api.get('/academics/cgpa').catch(() => ({ data: null })),
      api.get('/academics/exams').catch(() => ({ data: [] })),
      api.get('/academics/study-sessions').catch(() => ({ data: [] })),
    ]).then(([subjRes, cgpaRes, examRes, sessRes]) => {
      const subjects = subjRes.data || []
      const avgAttendance = subjects.length
        ? Math.round(subjects.reduce((s: number, sub: any) =>
            s + (sub.total_classes > 0 ? sub.attended_classes / sub.total_classes * 100 : 0), 0) / subjects.length)
        : null
      setAcademics({ cgpa: cgpaRes.data?.cgpa, attendance: avgAttendance })
      setExams((examRes.data || [])
        .filter((e: any) => !e.completed)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4))
      // Build 7-day study chart from sessions
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const map: Record<string, number> = {}
      for (const s of sessRes.data || []) {
        const d = days[new Date(s.date).getDay()]
        map[d] = (map[d] || 0) + s.duration_minutes / 60
      }
      setStudyData(days.map(d => ({ day: d, hours: parseFloat((map[d] || 0).toFixed(1)) })))
    })

    // Coding
    api.get('/coding/profile').catch(() => ({ data: null })).then(r => setCodingProfile(r.data))

    // Tasks
    api.get('/productivity/tasks/stats').catch(() => ({ data: { completed: 0, total: 0 } })).then(r => setTaskStats(r.data))

    // Activities
    api.get('/users/activities').catch(() => ({ data: [] })).then(r => {
      if (Array.isArray(r.data)) setActivities(r.data.slice(0, 5))
    })

    // Wellness
    api.get('/wellness/summary').catch(() => ({ data: null })).then(r => setWellnessSummary(r.data))

    // Streak — ping backend to record daily visit
    api.post('/users/ping').then(r => {
      setStreak(r.data?.streak_days ?? 0)
      setStreakPingedToday(true)
    }).catch(() => {
      api.get('/users/streak').then(r => setStreak(r.data?.streak_days ?? 0)).catch(() => {})
    })
  }, [])

  /* Derived */
  const attendance = academics?.attendance
  const cgpa = academics?.cgpa
  const lc = codingProfile?.total_problems_solved
  const tasksTotal = taskStats?.total ?? 0
  const tasksDone = taskStats?.completed ?? 0
  const semesterProgress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now()
    const d = Math.ceil(diff / 86400000)
    if (d < 0) return 'Past'
    if (d === 0) return 'Today!'
    if (d === 1) return '1 day left'
    return `${d} days left`
  }
  const examUrgency = (dateStr: string) => {
    const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    if (d <= 2) return '#EF4444'
    if (d <= 7) return '#F59E0B'
    return '#10B981'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            Here's your StudentOS overview for today
          </p>
        </div>
        <button onClick={() => navigate('/analytics')}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff' }}>
          <BarChart3 size={15} /> View Analytics
        </button>
      </div>

      {/* ── Streak + Stat Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-2">
        <StreakBanner streak={streak} pinged={streakPingedToday} />
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            label="Attendance"
            value={attendance != null ? `${attendance}%` : '—'}
            unit="Overall this semester"
            sub={attendance != null ? (attendance >= 75 ? '+Good standing' : '⚠ Below 75%') : 'No subjects added'}
            trend={attendance != null ? (attendance >= 75 ? 'up' : 'down') : null}
            color="#10B981" Icon={BookOpen}
          />
          <StatCard
            label="CGPA"
            value={cgpa != null ? cgpa.toFixed(2) : '—'}
            unit="Cumulative grade points"
            sub={cgpa != null ? (cgpa >= 8 ? 'Excellent performance' : 'Keep improving') : 'No grades yet'}
            trend={cgpa != null ? (cgpa >= 8 ? 'up' : null) : null}
            color="#6C63FF" Icon={BarChart3}
          />
          <StatCard
            label="LeetCode"
            value={lc != null ? `${lc}+` : '—'}
            unit="Problems solved"
            sub={lc != null ? (lc > 0 ? 'Keep solving!' : 'Start solving today') : 'Connect your profile'}
            trend={lc ? 'up' : null}
            color="#F59E0B" Icon={Code}
          />
          <StatCard
            label="Tasks Done"
            value={tasksTotal > 0 ? `${tasksDone}/${tasksTotal}` : '—'}
            unit="Productivity this period"
            sub={tasksTotal > 0 ? `${Math.round((tasksDone / tasksTotal) * 100)}% completion rate` : 'No tasks added yet'}
            trend={tasksTotal > 0 && tasksDone / tasksTotal >= 0.6 ? 'up' : null}
            color="#A855F7" Icon={CheckCircle2}
          />
        </div>
      </div>

      {/* ── Middle Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Semester Progress */}
        <div className="rounded-2xl p-6" style={{ background: '#12122A', border: '1px solid rgba(108,99,255,0.12)' }}>
          <h3 className="font-semibold text-white mb-5">Semester Progress</h3>
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <DonutProgress value={semesterProgress} color="#6C63FF" size={130} stroke={12} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{semesterProgress}%</span>
                <span className="text-xs" style={{ color: '#6B7280' }}>Completed</span>
              </div>
            </div>
            <div className="w-full space-y-2">
              {[
                { label: 'Tasks', val: tasksTotal > 0 ? Math.round(tasksDone / tasksTotal * 100) : 0, color: '#6C63FF' },
                { label: 'Attendance', val: attendance ?? 0, color: '#10B981' },
                { label: 'Study hrs', val: studyData.reduce((s, d) => s + d.hours, 0) > 0 ? Math.min(100, Math.round(studyData.reduce((s, d) => s + d.hours, 0) / 0.3)) : 0, color: '#F59E0B' },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#9CA3AF' }}>{label}</span>
                    <span className="font-medium text-white">{val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${val}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="rounded-2xl p-6" style={{ background: '#12122A', border: '1px solid rgba(108,99,255,0.12)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white">Upcoming Exams</h3>
            <button onClick={() => navigate('/academics')}
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: '#6C63FF' }}>
              View all <ChevronRight size={12} />
            </button>
          </div>
          {exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Calendar size={28} style={{ color: '#374151' }} className="mb-2" />
              <p className="text-sm" style={{ color: '#6B7280' }}>No upcoming exams</p>
              <button onClick={() => navigate('/academics')}
                className="text-xs mt-2 hover:underline" style={{ color: '#6C63FF' }}>
                Add exams →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: examUrgency(exam.date) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{exam.subject}</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {exam.exam_type} · {new Date(exam.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="text-xs font-semibold shrink-0" style={{ color: examUrgency(exam.date) }}>
                    {daysUntil(exam.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Study Hours Chart */}
        <div className="rounded-2xl p-6" style={{ background: '#12122A', border: '1px solid rgba(108,99,255,0.12)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white">Study Hours</h3>
            {studyData.some(d => d.hours > 0) && (
              <span className="text-xs font-medium" style={{ color: '#6C63FF' }}>
                {(studyData.reduce((s, d) => s + d.hours, 0)).toFixed(1)}h this week
              </span>
            )}
          </div>
          {studyData.every(d => d.hours === 0) ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Clock size={28} style={{ color: '#374151' }} className="mb-2" />
              <p className="text-sm" style={{ color: '#6B7280' }}>No study sessions logged yet</p>
              <button onClick={() => navigate('/academics')}
                className="text-xs mt-2 hover:underline" style={{ color: '#6C63FF' }}>
                Log a session →
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={studyData}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: any) => [`${v}h`, 'Study']} />
                <Area type="monotone" dataKey="hours" stroke="#6C63FF" fill="url(#sg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Hubs Grid ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Your Hubs</h3>
          <span className="text-xs" style={{ color: '#6B7280' }}>AI-powered tools for every area</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {hubs.map(({ icon: Icon, label, sub, color, to }) => (
            <button key={to} onClick={() => navigate(to)}
              className="rounded-2xl p-4 text-left transition-all group hover:scale-[1.03] hover:shadow-lg"
              style={{ background: '#12122A', border: '1px solid rgba(108,99,255,0.12)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                style={{ background: `${color}18` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <p className="text-sm font-semibold text-white leading-tight">{label}</p>
              <p className="text-[11px] mt-1 leading-tight" style={{ color: '#6B7280' }}>{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────── */}
      <div className="rounded-2xl p-6" style={{ background: '#12122A', border: '1px solid rgba(108,99,255,0.12)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Sparkles size={16} style={{ color: '#6C63FF' }} /> Recent Activity
          </h3>
          <button onClick={() => navigate('/analytics')}
            className="text-xs flex items-center gap-1 hover:opacity-80" style={{ color: '#6C63FF' }}>
            All activity <ArrowRight size={12} />
          </button>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle size={28} style={{ color: '#374151' }} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: '#6B7280' }}>No activity yet. Start using StudentOS!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((act, i) => {
              const typeColor =
                act.activity_type === 'coding' ? '#00D4FF' :
                act.activity_type === 'wellness' ? '#F43F5E' :
                act.activity_type === 'ai' ? '#10B981' :
                act.activity_type === 'academic' ? '#10B981' : '#6C63FF'
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor }} />
                  <p className="text-sm text-white flex-1">{act.description}</p>
                  <span className="text-xs shrink-0" style={{ color: '#6B7280' }}>
                    {relativeTime(act.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
