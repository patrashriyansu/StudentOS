import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  BookOpen, Code, Briefcase, Bot, Heart, Wallet,
  TrendingUp, Calendar, CheckCircle2, Circle, Sparkles,
  GraduationCap, BarChart3, Flame, Clock,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line,
  CartesianGrid,
} from 'recharts'
import { api } from '../services/api'

/* ── Ring SVG ──────────────────────────────────────────────────── */
function Ring({ value = 0, max = 100, color, size = 72, stroke = 7 }: {
  value?: number; max?: number; color: string; size?: number; stroke?: number
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(Math.max(value / max, 0), 1)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  )
}

/* ── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, iconColor, label, value, unit, trendLabel, trend, ringVal, ringMax = 100, ringColor, gradFrom, gradTo }: {
  icon: any; iconColor: string; label: string; value: string | null
  unit?: string; trendLabel?: string; trend?: 'up' | 'down' | null
  ringVal: number; ringMax?: number; ringColor: string
  gradFrom: string; gradTo: string
}) {
  return (
    <div style={{
      borderRadius: 16, padding: '20px 20px',
      background: `linear-gradient(135deg,${gradFrom},${gradTo})`,
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden', flex: 1,
    }} className="dashboard-stat-card">
      <div style={{ position: 'absolute', top: -30, right: 70, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${iconColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={15} style={{ color: iconColor }} />
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 6 }}>
          {value ?? '—'}
          {unit && <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4, opacity: 0.65 }}>{unit}</span>}
        </div>
        {trendLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            {trend === 'up' && <TrendingUp size={12} style={{ color: '#4ADE80' }} />}
            <span style={{ color: trend === 'up' ? '#4ADE80' : trend === 'down' ? '#F87171' : 'rgba(255,255,255,0.4)' }}>
              {trendLabel}
            </span>
          </div>
        )}
      </div>
      <Ring value={ringVal} max={ringMax} color={ringColor} size={72} stroke={7} />
    </div>
  )
}

/* ── Hub Tile ───────────────────────────────────────────────────── */
function HubTile({ icon: Icon, label, sub, color, to }: { icon: any; label: string; sub: string; color: string; to: string }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(to)}
      className="dashboard-hub-tile"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        borderRadius: 12, background: 'var(--app-subtle)',
        border: '1px solid var(--app-border)',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--app-muted)', marginTop: 1 }}>{sub}</div>
      </div>
      <span style={{ color: '#4B5563', fontSize: 18, lineHeight: 1 }}>›</span>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [academics, setAcademics] = useState<any>(null)
  const [gradeHistory, setGradeHistory] = useState<any[]>([])
  const [codingProfile, setCodingProfile] = useState<any>(null)
  const [taskStats, setTaskStats] = useState<any>({ completed: 0, total: 0 })
  const [tasks, setTasks] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [todaysClasses, setTodaysClasses] = useState<any[]>([])
  const [streak, setStreak] = useState<number>(0)
  const [streakPingedToday, setStreakPingedToday] = useState<boolean>(false)
  const [adminActivity, setAdminActivity] = useState<any>(null)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  useEffect(() => {
    // Academics
    Promise.all([
      api.get('/academics/subjects').catch(() => ({ data: [] })),
      api.get('/academics/cgpa').catch(() => ({ data: null })),
      api.get('/academics/exams').catch(() => ({ data: [] })),
      api.get('/campus/academic-profile').catch(() => ({ data: null })),
      api.get('/academics/grades').catch(() => ({ data: [] })),
    ]).then(([subjRes, cgpaRes, examRes, profileRes, gradesRes]) => {
      const subjects = subjRes.data || []
      const avgAttendance = subjects.length
        ? Math.round(subjects.reduce((s: number, sub: any) =>
            s + (sub.total_classes > 0 ? sub.attended_classes / sub.total_classes * 100 : 0), 0) / subjects.length)
        : null
      const savedCgpa = profileRes.data?.cgpa
      const gradeCgpa = Number(cgpaRes.data?.cgpa) > 0 ? Number(cgpaRes.data.cgpa) : null
      const grades = Array.isArray(gradesRes.data) ? gradesRes.data : []
      setGradeHistory(grades)
      setAcademics({
        cgpa: savedCgpa != null ? Number(savedCgpa) : gradeCgpa,
        attendance: avgAttendance,
        totalCredits: grades.reduce((total: number, grade: any) => total + (Number(grade.credits) || 0), 0),
      })
      setExams((examRes.data || [])
        .filter((e: any) => !e.completed)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4))
    })

    // Today's timetable (API uses 0=Monday; JavaScript uses 0=Sunday).
    api.get('/academics/timetable').then((response) => {
      const today = (new Date().getDay() + 6) % 7
      const classes = Array.isArray(response.data) ? response.data : []
      setTodaysClasses(classes.filter((item: any) => item.day_of_week === today).sort((a: any, b: any) => String(a.start_time).localeCompare(String(b.start_time))))
    }).catch(() => setTodaysClasses([]))

    // Coding
    api.get('/coding/profile').catch(() => ({ data: null })).then(r => setCodingProfile(r.data))

    // Tasks
    Promise.all([
      api.get('/productivity/tasks/stats').catch(() => ({ data: { completed: 0, total: 0 } })),
      api.get('/productivity/tasks').catch(() => ({ data: [] })),
    ]).then(([statsRes, tasksRes]) => {
      setTaskStats(statsRes.data)
      const all = Array.isArray(tasksRes.data) ? tasksRes.data : []
      setTasks(all.slice(0, 5))
    })

    // Streak
    api.post('/users/ping').then(r => {
      setStreak(r.data?.streak_days ?? 0)
      setStreakPingedToday(true)
    }).catch(() => {
      api.get('/users/streak').then(r => setStreak(r.data?.streak_days ?? 0)).catch(() => {})
    })
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') return
    api.get('/users/activity-overview')
      .then(r => setAdminActivity(r.data))
      .catch(() => setAdminActivity(null))
  }, [user?.role])

  /* ── derived ── */
  const attendance = academics?.attendance
  const cgpa = academics?.cgpa
  const lc = codingProfile?.total_problems_solved
  const easySolved = codingProfile?.easy_solved ?? 0
  const medSolved  = codingProfile?.medium_solved ?? 0
  const hardSolved = codingProfile?.hard_solved ?? 0
  const tasksTotal = taskStats?.total ?? 0
  const tasksDone  = taskStats?.completed ?? 0

  const daysUntil = (dateStr: string) => {
    const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    if (d < 0) return 'Past'
    if (d === 0) return 'Today'
    return `${d} days`
  }
  const examBadgeColor = (dateStr: string) => {
    const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    if (d <= 3) return '#EF4444'
    if (d <= 7) return '#F59E0B'
    return '#6C63FF'
  }

  /* Only saved semester-grade records are plotted; no placeholder history is generated. */
  const semesterTotals = new Map<number, { weighted: number; credits: number }>()
  gradeHistory.forEach((grade: any) => {
    const semester = Number(grade.semester)
    const credits = Number(grade.credits) || 0
    const gradePoint = Number(grade.grade_point) || 0
    if (!semester || credits <= 0) return
    const current = semesterTotals.get(semester) || { weighted: 0, credits: 0 }
    current.weighted += gradePoint * credits
    current.credits += credits
    semesterTotals.set(semester, current)
  })
  let cumulativeWeighted = 0
  let cumulativeCredits = 0
  const cgpaChartData = [...semesterTotals.entries()].sort((a, b) => a[0] - b[0]).map(([semester, total]) => {
    cumulativeWeighted += total.weighted
    cumulativeCredits += total.credits
    return {
      sem: `S${semester}`,
      sgpa: Number((total.weighted / total.credits).toFixed(2)),
      cgpa: Number((cumulativeWeighted / cumulativeCredits).toFixed(2)),
    }
  })
  const lcData = [
    { name: 'Easy',   value: easySolved, color: '#4ADE80' },
    { name: 'Medium', value: medSolved,  color: '#F59E0B' },
    { name: 'Hard',   value: hardSolved, color: '#EF4444' },
  ]
  const attTrend = attendance != null ? [{ month: 'Current', val: attendance }] : []

  /* panel style shorthand */
  const panel: React.CSSProperties = {
    borderRadius: 16, padding: 20,
    background: 'var(--app-panel)',
    border: '1px solid var(--app-border)',
  }
  const panelHead: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
  }
  const h3: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--app-text)', margin: 0 }

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1400 }}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="dashboard-hero" style={{
        borderRadius: 20, padding: '26px 32px',
        background: 'linear-gradient(135deg,#0C0829 0%,#160A40 50%,#0A1030 100%)',
        border: '1px solid rgba(108,99,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden', minHeight: 110,
      }}>
        {/* glow blobs */}
        <div style={{ position:'absolute', top:-50, right:220, width:200, height:200, borderRadius:'50%', background:'rgba(108,99,255,0.12)', filter:'blur(50px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-50, right:120, width:160, height:160, borderRadius:'50%', background:'rgba(168,85,247,0.08)', filter:'blur(40px)', pointerEvents:'none' }} />
        {/* building silhouette */}
        <svg width="280" height="110" viewBox="0 0 280 110" fill="rgba(255,255,255,0.05)"
          style={{ position:'absolute', right:0, bottom:0, pointerEvents:'none' }}>
          <rect x="105" y="30" width="70" height="80" />
          <rect x="70"  y="55" width="35" height="55" />
          <rect x="175" y="55" width="35" height="55" />
          <rect x="118" y="5"  width="10" height="25" />
          <polygon points="123,0 128,5 118,5" />
          <rect x="15"  y="75" width="30" height="35" />
          <rect x="235" y="75" width="30" height="35" />
          <rect x="230" y="60" width="20" height="50" />
          <rect x="30"  y="60" width="20" height="50" />
        </svg>

        <div className="dashboard-hero-copy">
          <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:28, fontWeight:800, color:'var(--app-text)' }}>👋 {greeting()},</span>
            <span style={{
              fontSize:28, fontWeight:800,
              background:'linear-gradient(135deg,#A78BFA,#EC4899)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>
              {user?.name?.split(' ')[0] || 'Student'}!
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--app-muted)', fontSize:13, marginTop:6 }}>
            <Sparkles size={13} style={{ color:'#A78BFA' }} />
            Your AI-powered student operating system
          </div>
        </div>

      </div>

      {user?.role === 'admin' && (
        <section style={{ ...panel, display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <div>
              <h3 style={{ ...h3, fontSize:16 }}>Website Engagement</h3>
              <p style={{ color:'var(--app-muted)', fontSize:12, margin:'5px 0 0' }}>Real account activity from saved sign-ins and daily visits.</p>
            </div>
            <span style={{ fontSize:11, color:'#10B981', background:'rgba(16,185,129,0.10)', padding:'5px 10px', borderRadius:20 }}>Live account data</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10 }}>
            {[
              { label:'Registered users', value:adminActivity?.total_users ?? '—', color:'#A78BFA' },
              { label:'Active today', value:adminActivity?.active_today ?? '—', color:'#10B981' },
              { label:'Active in 7 days', value:adminActivity?.active_7d ?? '—', color:'#06B6D4' },
              { label:'Active in 30 days', value:adminActivity?.active_30d ?? '—', color:'#F59E0B' },
            ].map(item => (
              <div key={item.label} style={{ padding:'14px 16px', borderRadius:12, background:'var(--app-subtle)', border:'1px solid var(--app-border)' }}>
                <div style={{ fontSize:25, fontWeight:800, color:item.color }}>{item.value}</div>
                <div style={{ fontSize:11, color:'var(--app-muted)', marginTop:4 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--app-text)', marginBottom:9 }}>Recent members</div>
            {!adminActivity ? (
              <div style={{ color:'var(--app-muted)', fontSize:12 }}>Loading engagement data…</div>
            ) : adminActivity.recent_users?.length ? (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {adminActivity.recent_users.slice(0,8).map((member:any) => {
                  const lastSeen = member.last_login ? new Date(member.last_login) : null
                  const activeToday = lastSeen && lastSeen.toDateString() === new Date().toDateString()
                  return (
                    <div key={member.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:10, background:'var(--app-subtle)' }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', overflow:'hidden', background:'rgba(108,99,255,0.18)', display:'grid', placeItems:'center', color:'#A78BFA', fontWeight:700, flexShrink:0 }}>
                        {member.avatar ? <img src={member.avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (member.name || member.email || 'U').slice(0,1).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:'var(--app-text)', fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.name}</div>
                        <div style={{ color:'var(--app-muted)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.email}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:11, color:activeToday ? '#10B981' : 'var(--app-muted)', fontWeight:600 }}>{activeToday ? 'Active today' : lastSeen ? lastSeen.toLocaleDateString() : 'Never signed in'}</div>
                        <div style={{ fontSize:10, color:'var(--app-muted)', marginTop:3 }}>{member.streak_days} day streak · {member.total_active_days} active days</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : <div style={{ color:'var(--app-muted)', fontSize:12 }}>No member activity recorded yet.</div>}
          </div>
        </section>
      )}

      {/* ── 4 Stat Cards ─────────────────────────────────── */}
      <div className="dashboard-stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <StatCard
          icon={GraduationCap} iconColor="#06B6D4" label="Attendance"
          value={attendance != null ? `${attendance}%` : '—'}
          trendLabel={attendance != null ? (attendance >= 75 ? 'At or above 75% requirement' : 'Below 75% requirement') : 'No subjects added'}
          trend={attendance != null && attendance >= 75 ? 'up' : 'down'}
          ringVal={attendance ?? 0} ringMax={100} ringColor="#06B6D4"
          gradFrom="rgba(6,182,212,0.14)" gradTo="rgba(8,145,178,0.04)"
        />
        <StatCard
          icon={BarChart3} iconColor="#A78BFA" label="CGPA"
          value={cgpa != null ? `${cgpa.toFixed(2)}` : '—'} unit="/10"
          trendLabel={cgpa != null ? (cgpa >= 7.5 ? 'On Track' : 'Needs Improvement') : 'No grades yet'}
          trend={cgpa != null && cgpa >= 7.5 ? 'up' : null}
          ringVal={cgpa != null ? cgpa * 10 : 0} ringMax={100} ringColor="#A78BFA"
          gradFrom="rgba(167,139,250,0.14)" gradTo="rgba(139,92,246,0.04)"
        />
        <StatCard
          icon={Code} iconColor="#F59E0B" label="LeetCode"
          value={lc != null ? `${lc}` : '—'} unit="Solved"
          trendLabel={lc ? 'Verified profile total' : 'Connect profile'}
          trend={lc ? 'up' : null}
          ringVal={Math.min(lc ?? 0, 500)} ringMax={500} ringColor="#F59E0B"
          gradFrom="rgba(245,158,11,0.14)" gradTo="rgba(217,119,6,0.04)"
        />
      </div>

      {/* ── Today's timetable ─────────────────────────────── */}
      <div className="dashboard-panel" style={panel}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><Calendar size={16} style={{ color:'#6C63FF' }}/><h3 style={h3}>Today's Classes</h3></div>
          <button onClick={() => navigate('/academics')} style={{ color:'#6C63FF', background:'none', border:'none', cursor:'pointer', fontSize:12 }}>Manage timetable →</button>
        </div>
        {todaysClasses.length === 0 ? <p style={{ color:'var(--app-muted)', fontSize:13 }}>No classes have been entered for today. Add your real timetable in Academic Hub.</p> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:9 }}>
            {todaysClasses.map((item, index) => <div key={item.id ?? index} style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:12, background:'var(--app-subtle)', border:'1px solid var(--app-border)' }}>
              <div style={{ minWidth:72, fontSize:12, fontWeight:700, color:'#A78BFA' }}>{item.start_time}–{item.end_time}</div>
              <div style={{ minWidth:0 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--app-text)' }}>{item.subject_name}</div><div style={{ marginTop:2, fontSize:11, color:'var(--app-muted)' }}>{[item.room, item.faculty].filter(Boolean).join(' · ') || 'Class details not provided'}</div></div>
            </div>)}
          </div>
        )}
      </div>

      {/* ── Middle: Hubs | Tasks | Exams ─────────────────── */}
      <div className="dashboard-overview-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0,5fr) minmax(0,4fr) minmax(0,3fr)', gap:14 }}>

        {/* My Hubs */}
        <div className="dashboard-panel" style={panel}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h3 style={h3}>My Hubs</h3>
            <button onClick={() => navigate('/')} style={{ fontSize:12, color:'#6C63FF', background:'none', border:'none', cursor:'pointer' }}>View All →</button>
          </div>
          <div className="dashboard-hub-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, marginBottom:10 }}>
            <HubTile icon={BookOpen}   label="Study Hub"    sub="Notes, PDFs, Summaries, Quiz"       color="#6C63FF" to="/study" />
            <HubTile icon={GraduationCap} label="Academic Hub" sub="Attendance, SGPA, Timetable"     color="#06B6D4" to="/academics" />
            <HubTile icon={Code}       label="Coding Hub"   sub="DSA, LeetCode, Contests"            color="#10B981" to="/coding" />
            <HubTile icon={Briefcase}  label="Placement Hub" sub="Resume, Mock Interview, Internships" color="#F59E0B" to="/placements" />
            <HubTile icon={Heart}      label="Wellness Hub" sub="Mood, Sleep, Meditation"            color="#F43F5E" to="/wellness" />
            <HubTile icon={Wallet}     label="Finance Hub"  sub="Expenses, Budget, Savings"          color="#A855F7" to="/expenses" />
          </div>
          {/* Chatbot quick access banner */}
          <div className="dashboard-chatbot-banner" style={{
            display:'flex', alignItems:'center', gap:14, padding:'13px 16px',
            borderRadius:12, background:'linear-gradient(135deg,rgba(108,99,255,0.12),rgba(168,85,247,0.08))',
            border:'1px solid rgba(108,99,255,0.22)',
          }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'rgba(108,99,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Bot size={17} style={{ color:'#A78BFA' }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Chatbot</div>
              <div style={{ fontSize:11, color:'#9CA3AF' }}>Chat, summarize, plan, solve & more</div>
            </div>
            <button onClick={() => navigate('/ai')} style={{
              padding:'8px 14px', borderRadius:8, cursor:'pointer',
              background:'linear-gradient(135deg,#6C63FF,#A855F7)',
              color:'#fff', fontSize:12, fontWeight:600, border:'none', whiteSpace:'nowrap',
            }}>
              Open Chatbot →
            </button>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="dashboard-panel" style={panel}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <CheckCircle2 size={15} style={{ color:'#6C63FF' }} />
              <h3 style={h3}>Today's Tasks</h3>
            </div>
            <span style={{ fontSize:11, color:'#9CA3AF', background:'rgba(255,255,255,0.05)', padding:'3px 8px', borderRadius:20 }}>
              {tasksDone} of {tasksTotal} completed
            </span>
          </div>
          {/* progress bar */}
          <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, marginBottom:14 }}>
            <div style={{
              height:4, background:'linear-gradient(90deg,#6C63FF,#A855F7)', borderRadius:2,
              width:`${tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0}%`,
              transition:'width 0.5s',
            }} />
          </div>
          {tasks.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px 0', color:'#4B5563', fontSize:13 }}>
              No tasks yet.{' '}
              <button onClick={() => navigate('/productivity')} style={{ color:'#6C63FF', background:'none', border:'none', cursor:'pointer', fontSize:13 }}>
                Add tasks →
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {tasks.map((task, i) => {
                const done = task.status === 'completed' || task.completed
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:10, background:'rgba(255,255,255,0.02)' }}>
                    {done
                      ? <CheckCircle2 size={15} style={{ color:'#6C63FF', flexShrink:0 }} />
                      : <Circle size={15} style={{ color:'#374151', flexShrink:0 }} />}
                    <span style={{ flex:1, fontSize:13, color: done ? '#6B7280' : '#fff', textDecoration: done ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {task.title}
                    </span>
                    {task.due_date && (
                      <span style={{ fontSize:11, color:'#6B7280', flexShrink:0, display:'flex', alignItems:'center', gap:3 }}>
                        <Clock size={10} />
                        {new Date(task.due_date).toLocaleTimeString('en-US',{ hour:'2-digit', minute:'2-digit' })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="dashboard-panel" style={panel}>
          <div style={panelHead}>
            <Calendar size={15} style={{ color:'#6C63FF' }} />
            <h3 style={h3}>Upcoming Exams</h3>
          </div>
          {exams.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px 0', color:'#4B5563', fontSize:13 }}>
              No upcoming exams.{' '}
              <button onClick={() => navigate('/academics')} style={{ color:'#6C63FF', background:'none', border:'none', cursor:'pointer', fontSize:13 }}>
                Add exams →
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {exams.slice(0, 4).map((exam, i) => {
                const c = examBadgeColor(exam.date)
                return (
                  <div key={i} style={{ padding:'11px 13px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{exam.subject}</div>
                        <div style={{ fontSize:11, color:'#6B7280', marginTop:3, display:'flex', alignItems:'center', gap:4 }}>
                          <Calendar size={10} />
                          {new Date(exam.date).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })}
                        </div>
                      </div>
                      <span style={{ padding:'3px 9px', borderRadius:20, background:`${c}20`, color:c, fontSize:11, fontWeight:700, flexShrink:0, whiteSpace:'nowrap' }}>
                        {daysUntil(exam.date)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {exams.length > 0 && (
            <button onClick={() => navigate('/academics')} style={{ width:'100%', marginTop:12, padding:'8px', borderRadius:10, background:'none', border:'1px solid rgba(108,99,255,0.3)', color:'#6C63FF', cursor:'pointer', fontSize:12, fontWeight:500 }}>
              View Exam Schedule →
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom: Academic | LeetCode | Attendance ─────── */}
      <div className="dashboard-insights-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0,5fr) minmax(0,4fr) minmax(0,3fr)', gap:14 }}>

        {/* Academic Overview */}
        <div className="dashboard-panel" style={panel}>
          <div style={panelHead}>
            <GraduationCap size={15} style={{ color:'#6C63FF' }} />
            <h3 style={h3}>Academic Overview</h3>
          </div>
          <div style={{ display:'flex', gap:16 }}>
            <div style={{ flex:1 }}>
              {cgpaChartData.length > 0 ? <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={cgpaChartData} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#6C63FF" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="sem" axisLine={false} tickLine={false} tick={{ fill:'#6B7280', fontSize:11 }} />
                  <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill:'#6B7280', fontSize:11 }} />
                  <Tooltip contentStyle={{ background:'#141430', border:'1px solid #2A2A4E', borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="sgpa" fill="url(#barGrad)" radius={[4,4,0,0]} />
                  <Line type="monotone" dataKey="cgpa" stroke="#06B6D4" strokeWidth={2} dot={{ fill:'#06B6D4', r:3 }} />
                </ComposedChart>
              </ResponsiveContainer> : <div className="h-40 flex items-center justify-center text-xs text-dark-muted text-center px-4">Semester-wise CGPA history will appear after you record grades in Academic Hub.</div>}
              <div style={{ display:'flex', gap:14, marginTop:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:'#6C63FF' }} />
                  <span style={{ fontSize:11, color:'#9CA3AF' }}>SGPA</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:12, height:2, background:'#06B6D4' }} />
                  <span style={{ fontSize:11, color:'#9CA3AF' }}>CGPA</span>
                </div>
              </div>
            </div>
            <div style={{ width:140, display:'flex', flexDirection:'column', gap:9 }}>
              {[
                { icon:BarChart3, label:'CGPA (Current)', value: cgpa != null ? cgpa.toFixed(2) : '—', color:'#6C63FF' },
                { icon:GraduationCap, label:'Credits Recorded', value: academics?.totalCredits ? String(academics.totalCredits) : '—', color:'#F59E0B' },
              ].map(({ icon:Icon2, label, value, color }) => (
                <div key={label} style={{ padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                    <Icon2 size={12} style={{ color }} />
                    <span style={{ fontSize:11, color:'#6B7280' }}>{label}</span>
                  </div>
                  <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LeetCode Progress */}
        <div className="dashboard-panel" style={panel}>
          <div style={panelHead}>
            <Code size={15} style={{ color:'#F59E0B' }} />
            <h3 style={h3}>LeetCode Progress</h3>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:14 }}>
            <div style={{ position:'relative', width:120, height:120, flexShrink:0 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={lcData.some(d => d.value > 0) ? lcData : [{ name:'None', value:1, color:'#1F2937' }]}
                    cx={55} cy={55} innerRadius={36} outerRadius={52}
                    dataKey="value" strokeWidth={0}
                  >
                    {(lcData.some(d => d.value > 0) ? lcData : [{ name:'None', value:1, color:'#1F2937' }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                <span style={{ fontSize:22, fontWeight:800, color:'#fff' }}>{lc ?? 0}</span>
                <span style={{ fontSize:10, color:'#6B7280' }}>Solved</span>
              </div>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
              {lcData.map(({ name, value, color }) => (
                <div key={name}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:9, height:9, borderRadius:2, background:color }} />
                      <span style={{ color:'#9CA3AF' }}>{name}</span>
                    </div>
                    <span style={{ color:'#fff', fontWeight:700 }}>{value}</span>
                  </div>
                  <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                    <div style={{ height:3, background:color, borderRadius:2, width:`${lc ? Math.round(value/lc*100) : 0}%`, transition:'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => navigate('/coding')} style={{ width:'100%', padding:'9px', borderRadius:10, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', color:'#F59E0B', cursor:'pointer', fontSize:12, fontWeight:600 }}>
            View Progress →
          </button>
        </div>

        {/* Attendance Trend */}
        <div className="dashboard-panel" style={panel}>
          <div style={panelHead}>
            <TrendingUp size={15} style={{ color:'#10B981' }} />
            <h3 style={h3}>Current Attendance</h3>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:14 }}>
            <span style={{ fontSize:30, fontWeight:800, color:'#fff' }}>
              {attendance != null ? `${attendance}%` : '—'}
            </span>

          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={attTrend} barSize={20} margin={{ top:0, right:0, bottom:0, left:-30 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill:'#6B7280', fontSize:10 }} />
              <Tooltip contentStyle={{ background:'#141430', border:'1px solid #2A2A4E', borderRadius:8, fontSize:11 }} formatter={(v: any) => [`${v}%`, 'Attendance']} />
              <Bar dataKey="val" radius={[4,4,0,0]}>
                {attTrend.map((_, i) => (
                  <Cell key={i} fill={i === attTrend.length - 1 ? '#6C63FF' : 'rgba(108,99,255,0.25)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Streak widget ─────────────────────────────────── */}
      {streak > 0 && (
        <div style={{ padding:'14px 20px', borderRadius:14, background:'#0E0E24', border:`1px solid ${streak>=7?'#F59E0B':'#6C63FF'}30`, display:'flex', alignItems:'center', gap:16 }}>
          <Flame size={22} style={{ color: streak >= 30 ? '#FF6B00' : streak >= 7 ? '#F59E0B' : '#6C63FF', flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{streak} Day Streak 🔥</span>
            <span style={{ fontSize:12, color:'#6B7280', marginLeft:8 }}>
              {streak >= 14 ? 'On Fire!' : streak >= 7 ? 'Hot Streak!' : streak >= 3 ? 'Building momentum' : 'Just started!'}
            </span>
          </div>
          {streakPingedToday && (
            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(16,185,129,0.12)', color:'#10B981', fontWeight:600 }}>✓ Active today</span>
          )}
          <div style={{ display:'flex', gap:5 }}>
            {Array.from({ length:7 }, (_, i) => {
              const daysAgo = 6 - i
              const active = daysAgo < streak
              const isToday = daysAgo === 0
              const col = streak >= 30 ? '#FF6B00' : streak >= 7 ? '#F59E0B' : '#6C63FF'
              return (
                <div key={i} title={isToday ? 'Today' : `${daysAgo}d ago`}
                  style={{ width:20, height:20, borderRadius:5, background: active ? col : 'rgba(255,255,255,0.06)', border: isToday ? `1px solid ${col}` : '1px solid transparent', transition:'all 0.2s' }} />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
