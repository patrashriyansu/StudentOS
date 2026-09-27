import { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, Plus, PiggyBank, Trash2, X, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../services/api'

const categoryColors: Record<string, string> = {
  food: '#F59E0B',
  transport: '#10B981',
  books: '#6C63FF',
  entertainment: '#A855F7',
  shopping: '#F43F5E',
  subscriptions: '#00D4FF',
  other: '#9CA3AF',
}

export default function Expenses() {
  const [tab, setTab] = useState<'overview' | 'budget' | 'savings'>('overview')
  const [expenses, setExpenses] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [savings, setSavings] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'food',
    description: '',
    payment_method: 'upi',
  })

  // Load finance data
  const loadData = async () => {
    try {
      const [expRes, sumRes, savRes] = await Promise.all([
        api.get('/finance/expenses'),
        api.get('/finance/expenses/summary'),
        api.get('/finance/savings'),
      ])
      setExpenses(expRes.data || [])
      setSummary(sumRes.data || null)
      setSavings(savRes.data || [])
    } catch (err) {
      console.error('Failed to load finance data', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Create expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExpense.amount) return
    try {
      const res = await api.post('/finance/expenses', {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
      })
      setShowAddModal(false)
      setNewExpense({ amount: '', category: 'food', description: '', payment_method: 'upi' })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  // Delete expense
  const handleDeleteExpense = async (id: number) => {
    try {
      await api.delete(`/finance/expenses/${id}`)
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  // Prepare chart data
  const pieData = summary?.by_category
    ? Object.entries(summary.by_category).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Number(value),
        color: categoryColors[name.toLowerCase()] || '#6C63FF',
      }))
    : [
        { name: 'Food', value: 4500, color: '#F59E0B' },
        { name: 'Books', value: 1500, color: '#6C63FF' },
        { name: 'Transport', value: 800, color: '#10B981' },
      ]

  const totalSpent = summary?.total_spent || expenses.reduce((s, e) => s + (e.amount || 0), 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Finance & Expenses</h1>
          <p className="text-dark-muted">Track monthly allowances, categorize campus spends, and set savings goals</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 glass rounded-xl p-1">
            {(['overview', 'budget', 'savings'] as const).map((t) => (
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
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} /> Log Expense
          </button>
        </div>
      </div>

      {/* Modal: Add Expense */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Log New Expense</h3>
              <button onClick={() => setShowAddModal(false)} className="text-dark-muted hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="text-xs text-dark-muted block mb-1">Amount (&#8377;) *</label>
                <input
                  required
                  type="number"
                  step="any"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="e.g. 250"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary capitalize"
                  >
                    {['food', 'transport', 'books', 'entertainment', 'shopping', 'subscriptions', 'other'].map((c) => (
                      <option key={c} value={c} className="capitalize">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Payment Method</label>
                  <select
                    value={newExpense.payment_method}
                    onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card / NetBanking</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Description / Note</label>
                <input
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="e.g. Canteen lunch & juices"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-dark-muted hover:bg-dark-lighter"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5 hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-muted">Month Expenditure</span>
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <TrendingDown size={18} className="text-rose-400" />
            </div>
          </div>
          <p className="text-3xl font-extrabold">&#8377;{totalSpent.toLocaleString()}</p>
        </div>

        <div className="glass rounded-xl p-5 hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-muted">Target Budget Limit</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-extrabold">&#8377;15,000</p>
        </div>

        <div className="glass rounded-xl p-5 hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-muted">Active Savings Goals</span>
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <PiggyBank size={18} className="text-primary" />
            </div>
          </div>
          <p className="text-3xl font-extrabold">&#8377;18,000 / 60,000</p>
        </div>
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Breakdown */}
          <div className="glass rounded-2xl p-6 border border-dark-border">
            <h3 className="font-semibold text-base mb-4">Categorized Spends</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => `₹${val}`}
                  contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {pieData.map((e) => (
                <div key={e.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: e.color }} />
                  <span className="text-xs text-dark-muted truncate">
                    {e.name}: &#8377;{e.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          <div className="glass rounded-2xl p-6 border border-dark-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base">Recorded Transactions</h3>
                <span className="text-xs text-dark-muted">{expenses.length} records</span>
              </div>
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {expenses.length === 0 ? (
                  <p className="text-xs text-dark-muted py-8 text-center italic">No transactions logged yet.</p>
                ) : (
                  expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-dark-lighter border border-dark-border hover:border-primary/40 transition-all"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white capitalize">{exp.description || exp.category}</p>
                        <p className="text-xs text-dark-muted mt-0.5">
                          {exp.date} &middot; <span className="uppercase text-[10px]">{exp.payment_method || 'UPI'}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-rose-400">-&#8377;{exp.amount}</span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-dark-muted hover:text-rose-400 p-1"
                          title="Delete transaction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Budget */}
      {tab === 'budget' && (
        <div className="glass rounded-2xl p-6 border border-dark-border space-y-4">
          <h3 className="font-semibold text-base mb-4">Monthly Departmental Budgets</h3>
          <div className="space-y-4">
            {[
              { category: 'Food & Canteen', spent: 3200, limit: 5000, color: 'bg-amber-500' },
              { category: 'Books & Supplies', spent: 1500, limit: 3000, color: 'bg-indigo-500' },
              { category: 'Transport', spent: 800, limit: 1500, color: 'bg-emerald-500' },
              { category: 'Entertainment', spent: 1800, limit: 2000, color: 'bg-purple-500' },
            ].map((b) => {
              const pct = Math.round((b.spent / b.limit) * 100)
              return (
                <div key={b.category} className="space-y-1.5 p-4 rounded-xl bg-dark-lighter border border-dark-border">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{b.category}</span>
                    <span className={pct >= 90 ? 'text-rose-400' : 'text-slate-300'}>
                      &#8377;{b.spent} / &#8377;{b.limit} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-dark rounded-full h-2.5 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${b.color} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab: Savings */}
      {tab === 'savings' && (
        <div className="glass rounded-2xl p-6 border border-dark-border space-y-4">
          <h3 className="font-semibold text-base mb-4">Long-Term Savings Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(savings.length > 0
              ? savings
              : [
                  { title: 'New Coding Laptop', current_amount: 18000, target_amount: 60000 },
                  { title: 'Cloud Certifications (AWS/GCP)', current_amount: 3000, target_amount: 10000 },
                ]
            ).map((s: any, i: number) => {
              const pct = Math.round(((s.current_amount || 0) / (s.target_amount || 1)) * 100)
              return (
                <div key={i} className="p-5 rounded-xl bg-dark-lighter border border-dark-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-base">{s.title}</h4>
                    <span className="text-xs text-primary font-bold">{pct}%</span>
                  </div>
                  <div className="w-full bg-dark rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-primary to-emerald-400"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-dark-muted">
                    <span>Saved: &#8377;{(s.current_amount || 0).toLocaleString()}</span>
                    <span>Target: &#8377;{(s.target_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
