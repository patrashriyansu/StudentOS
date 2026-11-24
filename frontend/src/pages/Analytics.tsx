import { useEffect, useState } from 'react'
import { BarChart3, BookOpen, Code, Briefcase, Heart, Wallet, Timer, Printer, Download } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Area, AreaChart, PieChart, Pie, Cell,
} from 'recharts'
import { api } from '../services/api'

const COLORS = ['#6C63FF', '#A855F7', '#00D4FF', '#F43F5E', '#10B981', '#F59E0B']

export default function Analytics() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [cgpaHistory, setCgpaHistory] = useState<any[]>([])
  const [codingHistory, setCodingHistory] = useState<any[]>([])
  const [wellnessScore, setWellnessScore] = useState<number | null>(null)
  const [financeData, setFinanceData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reportDownloading, setReportDownloading] = useState(false)
  const [reportError, setReportError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/analytics/overview').catch(() => ({ data: null })),
      api.get('/academics/cgpa').catch(() => ({ data: null })),
      api.get('/coding/profile').catch(() => ({ data: null })),
      api.get('/wellness/score').catch(() => ({ data: null })),
      api.get('/finance/expenses/summary').catch(() => ({ data: null })),
    ]).then(([analyticsRes, cgpaRes, codingRes, wellnessRes, financeRes]) => {
      setAnalytics(analyticsRes.data)
      if (cgpaRes.data?.grades?.length) {
        // Group grades by semester for the chart
        const bySemester: Record<number, { total: number; credits: number }> = {}
        for (const g of cgpaRes.data.grades) {
          if (!bySemester[g.semester]) bySemester[g.semester] = { total: 0, credits: 0 }
          bySemester[g.semester].total += g.grade_point * g.credits
          bySemester[g.semester].credits += g.credits
        }
        setCgpaHistory(
          Object.entries(bySemester)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([sem, d]) => ({ semester: `S${sem}`, sgpa: +(d.total / d.credits).toFixed(2) }))
        )
      }
      if (codingRes.data) {
        setCodingHistory([
          { label: 'Easy', value: codingRes.data.easy_solved ?? 0, color: '#10B981' },
          { label: 'Medium', value: codingRes.data.medium_solved ?? 0, color: '#F59E0B' },
          { label: 'Hard', value: codingRes.data.hard_solved ?? 0, color: '#EF4444' },
        ])
      }
      if (wellnessRes.data?.overall_score != null) setWellnessScore(wellnessRes.data.overall_score)
      setFinanceData(financeRes.data)
    }).finally(() => setLoading(false))
  }, [])


  const downloadProgressReport = async () => {
    setReportDownloading(true)
    setReportError('')
    try {
      const response = await api.get('/analytics/report.pdf', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'studentos-progress-report.pdf'
      anchor.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setReportError(err?.response?.data?.detail || 'Could not generate your PDF progress report.')
    } finally {
      setReportDownloading(false)
    }
  }

  const categories = [
    { icon: BookOpen, label: 'Academic', value: analytics?.cgpa != null ? `${analytics.cgpa} CGPA` : '—', color: '#6C63FF' },
    { icon: Code, label: 'Coding', value: analytics?.total_problems_solved != null ? `${analytics.total_problems_solved} solved` : '—', color: '#A855F7' },
    { icon: Briefcase, label: 'Placement', value: analytics?.placement_apps != null ? `${analytics.placement_apps} apps` : '—', color: '#00D4FF' },
    { icon: Heart, label: 'Wellness', value: wellnessScore != null ? `${wellnessScore}/100` : '—', color: '#F43F5E' },
    { icon: Wallet, label: 'Finance', value: financeData?.total_this_month != null ? `₹${financeData.total_this_month}` : '—', color: '#10B981' },
    { icon: Timer, label: 'Productivity', value: analytics?.tasks_completed != null ? `${analytics.tasks_completed} done` : '—', color: '#F59E0B' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <BarChart3 size={40} className="text-primary mx-auto animate-pulse" />
          <p className="text-dark-muted text-sm">Loading your analytics…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {reportError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{reportError}</div>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-dark-muted">Comprehensive view of your performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void downloadProgressReport()} disabled={reportDownloading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Download size={15}/>{reportDownloading?'Generating…':'Download PDF report'}</button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-dark-border px-3 py-2 text-sm"><Printer size={15}/>Print dashboard</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <div className="w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${color}20` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs text-dark-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic CGPA Trend */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">Academic Performance (by Semester)</h3>
          {cgpaHistory.length === 0 ? (
            <p className="text-sm text-dark-muted text-center py-10">Add grades in the Academics section to see your CGPA trend.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={cgpaHistory}>
                <defs>
                  <linearGradient id="cgpaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="sgpa" stroke="#6C63FF" fill="url(#cgpaGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Coding Difficulty Breakdown */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">Coding Problems by Difficulty</h3>
          {codingHistory.length === 0 || codingHistory.every(d => d.value === 0) ? (
            <p className="text-sm text-dark-muted text-center py-10">Solve problems and update your coding profile to see the breakdown.</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={codingHistory} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80}>
                    {codingHistory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {codingHistory.map((d) => (
                  <div key={d.label} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-dark-muted">{d.label}:</span>
                    <span className="font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Finance Summary */}
      {financeData?.by_category && (
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">Monthly Spending by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={Object.entries(financeData.by_category).map(([k, v]) => ({ name: k, amount: v }))}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }}
                formatter={(v: any) => [`₹${v}`, 'Spent']} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {Object.keys(financeData.by_category).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
