import { BarChart3, TrendingUp, BookOpen, Code, Briefcase, Heart, Wallet, Timer } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, PieChart, Pie, Cell } from 'recharts'

const academicData = [
  { semester: 'S1', sgpa: 7.2 }, { semester: 'S2', sgpa: 7.8 }, { semester: 'S3', sgpa: 8.1 },
  { semester: 'S4', sgpa: 8.4 }, { semester: 'S5', sgpa: 8.6 },
]

const codingData = [
  { month: 'Jan', solved: 15 }, { month: 'Feb', solved: 22 }, { month: 'Mar', solved: 18 },
  { month: 'Apr', solved: 30 }, { month: 'May', solved: 25 }, { month: 'Jun', solved: 36 },
]

const categories = [
  { icon: BookOpen, label: 'Academic', value: 8.6, unit: 'CGPA', color: '#6C63FF' },
  { icon: Code, label: 'Coding', value: 146, unit: 'solved', color: '#A855F7' },
  { icon: Briefcase, label: 'Placement', value: '78%', unit: 'ATS', color: '#00D4FF' },
  { icon: Heart, label: 'Wellness', value: 72, unit: 'score', color: '#F43F5E' },
  { icon: Wallet, label: 'Finance', value: '62%', unit: 'saved', color: '#10B981' },
  { icon: Timer, label: 'Productivity', value: '85%', unit: 'focus', color: '#F59E0B' },
]

export default function Analytics() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div><h1 className="text-2xl font-bold">Analytics Dashboard</h1><p className="text-dark-muted">Comprehensive view of your performance</p></div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map(({ icon: Icon, label, value, unit, color }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <div className="w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${color}20` }}><Icon size={16} style={{ color }} /></div>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs text-dark-muted">{unit}</p>
            <p className="text-xs text-dark-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">Academic Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={academicData}>
              <defs><linearGradient id="cgpaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} /><stop offset="95%" stopColor="#6C63FF" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="sgpa" stroke="#6C63FF" fill="url(#cgpaGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">Coding Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={codingData}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }} />
              <Bar dataKey="solved" fill="#A855F7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
