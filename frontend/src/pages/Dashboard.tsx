import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Zap, Trophy, Flame, CheckCircle, ArrowRight, BookOpen, Code, Briefcase, Bot, Heart, Timer, Wallet } from 'lucide-react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { api } from '../services/api'

const quickActions = [
  { icon: BookOpen, label: 'Academics', color: '#6C63FF', to: '/academics' },
  { icon: Code, label: 'Coding', color: '#A855F7', to: '/coding' },
  { icon: Briefcase, label: 'Placements', color: '#00D4FF', to: '/placements' },
  { icon: Bot, label: 'AI Assistant', color: '#10B981', to: '/ai' },
  { icon: Heart, label: 'Wellness', color: '#F43F5E', to: '/wellness' },
  { icon: Timer, label: 'Productivity', color: '#F59E0B', to: '/productivity' },
  { icon: Wallet, label: 'Expenses', color: '#8B5CF6', to: '/expenses' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [taskStats, setTaskStats] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 })
  const [activities, setActivities] = useState<any[]>([])
  const [studyChart, setStudyChart] = useState<any[]>([
    { day: 'Mon', hours: 2.5 }, { day: 'Tue', hours: 3 }, { day: 'Wed', hours: 1.8 },
    { day: 'Thu', hours: 4 }, { day: 'Fri', hours: 2.2 }, { day: 'Sat', hours: 5 }, { day: 'Sun', hours: 3.5 }
  ])

  useEffect(() => {
    // Fetch real task stats
    api.get('/productivity/tasks/stats')
      .then(res => setTaskStats(res.data))
      .catch(() => {})

    // Fetch real activities
    api.get('/users/activities')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setActivities(res.data)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'Student'}!</h1>
          <p className="text-dark-muted">Here&apos;s your academic superpower overview</p>
        </div>
        <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
          <Zap className="text-primary" size={18} />
          <span className="text-sm font-semibold">{user?.xp_points || 1250} XP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: 'XP Points', value: user?.xp_points || 1250, color: 'from-yellow-500 to-orange-500' },
          { icon: Trophy, label: 'Level', value: `Level ${user?.level || 3}`, color: 'from-primary to-secondary' },
          { icon: Flame, label: 'Streak', value: `${user?.streak_days || 12} days`, color: 'from-red-500 to-pink-500' },
          { icon: CheckCircle, label: 'Tasks Done', value: `${taskStats.completed}/${taskStats.total || 5}`, color: 'from-emerald-500 to-teal-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-xl p-5 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-dark-muted">{label}</span>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}><Icon size={16} /></div>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Study & Focus Hours This Week</h3>
            <span className="text-xs text-primary font-medium">Avg: 3.1 hrs/day</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={studyChart}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="hours" stroke="#6C63FF" fill="url(#colorHours)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ icon: Icon, label, color, to }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className="glass-hover rounded-xl p-3.5 text-center transition-all group flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${color}25` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent StudentOS Activity</h3>
          <button onClick={() => navigate('/analytics')} className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer">
            View Analytics <ArrowRight size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {(activities.length > 0 ? activities.slice(0, 5) : [
            { description: 'Completed DSA practice - 3 problems solved', activity_type: 'coding', created_at: '2h ago' },
            { description: 'Logged 8.0 hours sleep and logged water intake', activity_type: 'wellness', created_at: '5h ago' },
            { description: 'Attendance marked for Data Structures (92%)', activity_type: 'academic', created_at: '1d ago' },
            { description: 'Generated quiz and flashcards in AI Assistant', activity_type: 'ai', created_at: '2d ago' },
          ]).map((act, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-dark-lighter transition-colors">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                act.activity_type === 'coding' ? 'bg-secondary' :
                act.activity_type === 'wellness' ? 'bg-rose-400' :
                act.activity_type === 'ai' ? 'bg-emerald-400' : 'bg-primary'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{act.description}</p>
                <p className="text-xs text-dark-muted">{act.created_at ? new Date(act.created_at).toLocaleDateString() : 'Recent'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
