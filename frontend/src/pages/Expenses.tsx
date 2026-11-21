import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  TrendingDown, Wallet, PiggyBank, Plus, Trash2, X, CalendarDays,
  Target, IndianRupee, AlertCircle, Check,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../services/api'

const categories = [
  'food', 'transport', 'hostel', 'education', 'books',
  'entertainment', 'shopping', 'subscriptions', 'health', 'other',
]

const categoryColors: Record<string, string> = {
  food: '#F59E0B',
  transport: '#10B981',
  hostel: '#64748B',
  education: '#6366F1',
  books: '#8B5CF6',
  entertainment: '#A855F7',
  shopping: '#F43F5E',
  subscriptions: '#06B6D4',
  health: '#EC4899',
  other: '#9CA3AF',
}

type Expense = {
  id: number
  amount: number
  category: string
  description?: string | null
  date: string
  payment_method?: string | null
}

type Budget = {
  id: number
  category: string
  monthly_limit: number
  month: number
  year: number
}

type SavingsGoal = {
  id: number
  title: string
  current_amount: number
  target_amount: number
  deadline?: string | null
  percentage: number
  is_achieved: boolean
}

function localDateValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function currentPeriodLabel() {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
}

export default function Expenses() {
  const [tab, setTab] = useState<'overview' | 'budget' | 'savings'>('overview')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [savings, setSavings] = useState<SavingsGoal[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [allowance, setAllowance] = useState<number | null>(null)
  const [allowanceInput, setAllowanceInput] = useState('')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddBudget, setShowAddBudget] = useState(false)
  const [showAddSavings, setShowAddSavings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'food',
    description: '',
    payment_method: 'upi',
    date: localDateValue(),
  })
  const [budgetForm, setBudgetForm] = useState({ category: 'overall', monthly_limit: '' })
  const [savingsForm, setSavingsForm] = useState({
    title: '',
    current_amount: '0',
    target_amount: '',
    deadline: '',
  })
  const [savingAmounts, setSavingAmounts] = useState<Record<number, string>>({})

  const loadData = async () => {
    setError('')
    try {
      const results = await Promise.allSettled([
        api.get('/finance/expenses'),
        api.get('/finance/expenses/summary'),
        api.get('/finance/savings'),
        api.get('/finance/budgets'),
        api.get('/finance/allowance'),
      ])
      const [expenseResult, summaryResult, savingsResult, budgetResult, allowanceResult] = results
      if (expenseResult.status === 'rejected' || summaryResult.status === 'rejected') {
        throw new Error('Could not load your expense records.')
      }

      const expenseItems = Array.isArray(expenseResult.value.data) ? expenseResult.value.data : []
      const savingItems = savingsResult.status === 'fulfilled' && Array.isArray(savingsResult.value.data)
        ? savingsResult.value.data : []
      const budgetItems = budgetResult.status === 'fulfilled' && Array.isArray(budgetResult.value.data)
        ? budgetResult.value.data : []
      setExpenses(expenseItems)
      setSummary(summaryResult.value.data || null)
      setSavings(savingItems)
      setBudgets(budgetItems)

      const allowanceAmount = allowanceResult.status === 'fulfilled' && allowanceResult.value.data?.configured
        ? Number(allowanceResult.value.data.amount)
        : null
      setAllowance(allowanceAmount)
      setAllowanceInput(allowanceAmount == null ? '' : String(allowanceAmount))
      setSavingAmounts(Object.fromEntries(savingItems.map((goal: SavingsGoal) => [
        goal.id, String(goal.current_amount || 0),
      ])))

      if (allowanceResult.status === 'rejected' || savingsResult.status === 'rejected' || budgetResult.status === 'rejected') {
        setError('Some finance settings could not be loaded. Your available expense records are still shown.')
      }
    } catch (loadError: any) {
      setError(loadError?.response?.data?.detail || 'Could not load your finance records. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const totalSpent = Number(summary?.total_spent || 0)
  const overallBudget = budgets.find((item) => item.category === 'overall')
  const budgetLimit = overallBudget
    ? Number(overallBudget.monthly_limit)
    : budgets.reduce((total, item) => total + Number(item.monthly_limit || 0), 0)
  const budgetIsConfigured = budgets.length > 0
  const totalSaved = savings.reduce((total, goal) => total + Number(goal.current_amount || 0), 0)
  const totalSavingsTarget = savings.reduce((total, goal) => total + Number(goal.target_amount || 0), 0)
  const remainingAllowance = allowance == null ? null : allowance - totalSpent

  const pieData = useMemo(() => {
    const values = summary?.by_category || {}
    return Object.entries(values)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Number(value),
        color: categoryColors[name.toLowerCase()] || '#6C63FF',
      }))
      .filter((item) => item.value > 0)
  }, [summary])

  const handleCreateExpense = async (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(expenseForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an expense amount greater than zero.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/finance/expenses', {
        ...expenseForm,
        amount,
        date: expenseForm.date || localDateValue(),
      })
      setShowAddExpense(false)
      setExpenseForm({
        amount: '',
        category: 'food',
        description: '',
        payment_method: 'upi',
        date: localDateValue(),
      })
      await loadData()
    } catch (saveError: any) {
      setError(saveError?.response?.data?.detail || 'Could not save this expense.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async (id: number) => {
    setError('')
    try {
      await api.delete('/finance/expenses/' + id)
      await loadData()
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.detail || 'Could not delete this expense.')
    }
  }

  const handleSaveAllowance = async (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(allowanceInput)
    if (!Number.isFinite(amount) || amount < 0 || allowanceInput.trim() === '') {
      setError('Enter a valid monthly allowance. Use 0 if you do not receive an allowance.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.put('/finance/allowance', { amount })
      await loadData()
    } catch (saveError: any) {
      setError(saveError?.response?.data?.detail || 'Could not save your monthly allowance.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBudget = async (event: FormEvent) => {
    event.preventDefault()
    const limit = Number(budgetForm.monthly_limit)
    if (!Number.isFinite(limit) || limit <= 0) {
      setError('Enter a budget greater than zero.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/finance/budgets', {
        category: budgetForm.category,
        monthly_limit: limit,
      })
      setShowAddBudget(false)
      setBudgetForm({ category: 'overall', monthly_limit: '' })
      await loadData()
    } catch (saveError: any) {
      setError(saveError?.response?.data?.detail || 'Could not save this budget.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSavingsGoal = async (event: FormEvent) => {
    event.preventDefault()
    const target = Number(savingsForm.target_amount)
    const current = Number(savingsForm.current_amount || 0)
    if (!savingsForm.title.trim() || !Number.isFinite(target) || target <= 0 || current < 0) {
      setError('Enter a goal name, a valid target and a non-negative saved amount.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/finance/savings', {
        title: savingsForm.title.trim(),
        target_amount: target,
        current_amount: current,
        deadline: savingsForm.deadline || null,
      })
      setShowAddSavings(false)
      setSavingsForm({ title: '', current_amount: '0', target_amount: '', deadline: '' })
      await loadData()
    } catch (saveError: any) {
      setError(saveError?.response?.data?.detail || 'Could not create this savings goal.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSavings = async (goal: SavingsGoal) => {
    const current = Number(savingAmounts[goal.id])
    if (!Number.isFinite(current) || current < 0) {
      setError('Enter a valid saved amount.')
      return
    }
    setError('')
    try {
      await api.put('/finance/savings/' + goal.id, { current_amount: current })
      await loadData()
    } catch (saveError: any) {
      setError(saveError?.response?.data?.detail || 'Could not update savings progress.')
    }
  }

  const handleDeleteSavings = async (id: number) => {
    setError('')
    try {
      await api.delete('/finance/savings/' + id)
      await loadData()
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.detail || 'Could not delete this savings goal.')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Finance &amp; Expenses</h1>
          <p className="text-dark-muted">
            Manually record your allowance, daily expenses, budgets and savings for {currentPeriodLabel()}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 glass rounded-xl p-1">
            {(['overview', 'budget', 'savings'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={
                  'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ' +
                  (tab === item ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dark-muted hover:text-white')
                }
              >
                {item}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAddExpense(true)}
            className="bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} /> Log Expense
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertCircle size={17} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}

      {showAddExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-lg border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Log Daily Expense</h3>
              <button type="button" onClick={() => setShowAddExpense(false)} aria-label="Close expense form" className="text-dark-muted hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="text-xs text-dark-muted block mb-1">Expense amount (₹) *</label>
                <input
                  required min="0.01" step="0.01" type="number"
                  value={expenseForm.amount}
                  onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
                  placeholder="e.g. 120"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Category *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white capitalize"
                  >
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Date *</label>
                  <input
                    required type="date" value={expenseForm.date}
                    onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Payment method</label>
                  <select
                    value={expenseForm.payment_method}
                    onChange={(event) => setExpenseForm({ ...expenseForm, payment_method: event.target.value })}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white"
                  >
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card / NetBanking</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Description</label>
                  <input
                    value={expenseForm.description}
                    onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })}
                    placeholder="e.g. Lunch at canteen"
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddExpense(false)} className="px-4 py-2 rounded-xl text-sm text-dark-muted hover:bg-dark-lighter">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium">
                  {saving ? 'Saving…' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border border-dark-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-muted">Month Expenditure</span>
            <TrendingDown size={18} className="text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold">{money(totalSpent)}</p>
          <p className="text-xs text-dark-muted mt-1">{expenses.length} recorded transactions</p>
        </div>
        <div className="glass rounded-xl p-5 border border-dark-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-muted">Monthly Allowance</span>
            <Wallet size={18} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold">{allowance == null ? 'Not set' : money(allowance)}</p>
          <form onSubmit={handleSaveAllowance} className="mt-3 flex gap-2">
            <input
              aria-label="Monthly allowance amount"
              type="number" min="0" step="0.01" value={allowanceInput}
              onChange={(event) => setAllowanceInput(event.target.value)}
              placeholder="Enter allowance"
              className="min-w-0 flex-1 bg-dark-lighter border border-dark-border rounded-lg px-2.5 py-2 text-xs text-white"
            />
            <button type="submit" disabled={saving || allowanceInput.trim() === ''} className="bg-primary/20 text-primary rounded-lg px-3 text-xs font-semibold disabled:opacity-40">
              Save
            </button>
          </form>
        </div>
        <div className="glass rounded-xl p-5 border border-dark-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-muted">Remaining Allowance</span>
            <IndianRupee size={18} className="text-cyan-400" />
          </div>
          <p className="text-3xl font-extrabold">
            {remainingAllowance == null ? '—' : money(remainingAllowance)}
          </p>
          <p className="text-xs text-dark-muted mt-1">Allowance minus this month's expenses</p>
        </div>
        <div className="glass rounded-xl p-5 border border-dark-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-muted">Monthly Budget Limit</span>
            <Target size={18} className="text-primary" />
          </div>
          <p className="text-3xl font-extrabold">{budgetIsConfigured ? money(budgetLimit) : 'Not set'}</p>
          <p className="text-xs text-dark-muted mt-1">Set your own limit in Budget</p>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl border border-dark-border p-10 text-center text-sm text-dark-muted">Loading your finance records…</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="glass rounded-2xl p-6 border border-dark-border">
                <h3 className="font-semibold text-base mb-4">Categorized Spends</h3>
                {pieData.length === 0 ? (
                  <div className="h-60 flex flex-col items-center justify-center text-center">
                    <Wallet size={30} className="text-dark-muted mb-2" />
                    <p className="text-sm text-dark-muted">No expenses recorded for this month.</p>
                    <p className="text-xs text-dark-muted mt-1">Your chart will appear after you add transactions.</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                          {pieData.map((item) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => money(Number(value))}
                          contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2.5 mt-4">
                      {pieData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
                          <span className="text-xs text-dark-muted truncate">{item.name}: {money(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              <section className="glass rounded-2xl p-6 border border-dark-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-base">Daily Transactions</h3>
                  <span className="text-xs text-dark-muted">{expenses.length} records</span>
                </div>
                <div className="space-y-2.5 max-h-[390px] overflow-y-auto pr-1">
                  {expenses.length === 0 ? (
                    <p className="text-xs text-dark-muted py-10 text-center">No transactions yet. Log your first expense.</p>
                  ) : expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-dark-lighter border border-dark-border">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{expense.description || expense.category}</p>
                        <p className="text-xs text-dark-muted mt-0.5">
                          <CalendarDays size={11} className="inline mr-1" />
                          {expense.date} · {expense.category} · {expense.payment_method || 'Payment not specified'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-rose-400">-{money(Number(expense.amount))}</span>
                        <button type="button" onClick={() => handleDeleteExpense(expense.id)} className="text-dark-muted hover:text-rose-400 p-1" title="Delete transaction" aria-label="Delete transaction">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === 'budget' && (
            <section className="glass rounded-2xl p-6 border border-dark-border space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-base">Your Monthly Budgets</h3>
                  <p className="text-xs text-dark-muted mt-1">Set an overall limit or separate limits for spending categories.</p>
                </div>
                <button type="button" onClick={() => setShowAddBudget(true)} className="bg-primary/20 text-primary rounded-xl px-3 py-2 text-sm font-medium flex items-center gap-1.5">
                  <Plus size={15} /> Set budget
                </button>
              </div>
              {budgets.length === 0 ? (
                <div className="py-10 text-center">
                  <Target size={30} className="text-dark-muted mx-auto mb-2" />
                  <p className="text-sm text-dark-muted">You have not set a budget for this month.</p>
                  <p className="text-xs text-dark-muted mt-1">Create one to track your actual spending against your own limit.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {budgets.map((budget) => {
                    const spent = budget.category === 'overall'
                      ? totalSpent
                      : Number(summary?.by_category?.[budget.category] || 0)
                    const pct = budget.monthly_limit > 0 ? Math.min(100, (spent / budget.monthly_limit) * 100) : 0
                    return (
                      <div key={budget.id} className="p-4 rounded-xl bg-dark-lighter border border-dark-border space-y-2">
                        <div className="flex justify-between gap-3 text-sm font-semibold">
                          <span className="capitalize">{budget.category === 'overall' ? 'Overall budget' : budget.category}</span>
                          <span className={pct >= 90 ? 'text-rose-400' : 'text-slate-300'}>
                            {money(spent)} / {money(budget.monthly_limit)}
                          </span>
                        </div>
                        <div className="w-full bg-dark rounded-full h-2.5 overflow-hidden">
                          <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: pct + '%' }} />
                        </div>
                        <p className="text-xs text-dark-muted">{Math.round((spent / budget.monthly_limit) * 100)}% used</p>
                      </div>
                    )
                  })}
                </div>
              )}
              {showAddBudget && (
                <form onSubmit={handleSaveBudget} className="rounded-xl border border-dark-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Create or update budget</h4>
                    <button type="button" onClick={() => setShowAddBudget(false)} aria-label="Close budget form"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select value={budgetForm.category} onChange={(event) => setBudgetForm({ ...budgetForm, category: event.target.value })} className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white">
                      <option value="overall">Overall monthly budget</option>
                      {categories.map((category) => <option value={category} key={category}>{category}</option>)}
                    </select>
                    <input required type="number" min="0.01" step="0.01" value={budgetForm.monthly_limit} onChange={(event) => setBudgetForm({ ...budgetForm, monthly_limit: event.target.value })} placeholder="Monthly limit (₹)" className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
                  </div>
                  <button type="submit" disabled={saving} className="bg-primary text-white rounded-xl px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save budget'}</button>
                </form>
              )}
            </section>
          )}

          {tab === 'savings' && (
            <section className="glass rounded-2xl p-6 border border-dark-border space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-base">Your Savings Goals</h3>
                  <p className="text-xs text-dark-muted mt-1">Create goals and update the amount you have actually saved.</p>
                </div>
                <button type="button" onClick={() => setShowAddSavings(true)} className="bg-primary/20 text-primary rounded-xl px-3 py-2 text-sm font-medium flex items-center gap-1.5">
                  <Plus size={15} /> Add goal
                </button>
              </div>
              <div className="text-xs text-dark-muted">
                Total saved: <strong className="text-white">{money(totalSaved)}</strong>
                <span className="mx-2">·</span>
                Combined target: <strong className="text-white">{money(totalSavingsTarget)}</strong>
              </div>
              {savings.length === 0 ? (
                <div className="py-10 text-center">
                  <PiggyBank size={30} className="text-dark-muted mx-auto mb-2" />
                  <p className="text-sm text-dark-muted">No savings goals yet.</p>
                  <p className="text-xs text-dark-muted mt-1">Add your own goal and target amount to start tracking progress.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savings.map((goal) => {
                    const pct = goal.target_amount > 0
                      ? Math.min(100, (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100)
                      : 0
                    return (
                      <div key={goal.id} className="p-5 rounded-xl bg-dark-lighter border border-dark-border space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-base">{goal.title}</h4>
                            {goal.deadline && <p className="text-xs text-dark-muted mt-1">Target date: {goal.deadline}</p>}
                          </div>
                          <button type="button" onClick={() => handleDeleteSavings(goal.id)} className="text-dark-muted hover:text-rose-400 p-1" aria-label="Delete savings goal">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="w-full bg-dark rounded-full h-2.5 overflow-hidden">
                          <div className="h-2.5 rounded-full bg-gradient-to-r from-primary to-emerald-400" style={{ width: pct + '%' }} />
                        </div>
                        <div className="flex justify-between text-xs text-dark-muted">
                          <span>Saved: {money(Number(goal.current_amount || 0))}</span>
                          <span>Target: {money(Number(goal.target_amount || 0))}</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number" min="0" step="0.01"
                            aria-label={'Saved amount for ' + goal.title}
                            value={savingAmounts[goal.id] ?? String(goal.current_amount || 0)}
                            onChange={(event) => setSavingAmounts({ ...savingAmounts, [goal.id]: event.target.value })}
                            className="min-w-0 flex-1 bg-dark border border-dark-border rounded-lg px-2.5 py-2 text-xs text-white"
                          />
                          <button type="button" onClick={() => handleUpdateSavings(goal)} className="bg-primary/20 text-primary rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1">
                            <Check size={13} /> Update
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {showAddSavings && (
                <form onSubmit={handleCreateSavingsGoal} className="rounded-xl border border-dark-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Create savings goal</h4>
                    <button type="button" onClick={() => setShowAddSavings(false)} aria-label="Close savings form"><X size={16} /></button>
                  </div>
                  <input required value={savingsForm.title} onChange={(event) => setSavingsForm({ ...savingsForm, title: event.target.value })} placeholder="Goal name (e.g. New laptop)" className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input required type="number" min="0.01" step="0.01" value={savingsForm.target_amount} onChange={(event) => setSavingsForm({ ...savingsForm, target_amount: event.target.value })} placeholder="Target (₹)" className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
                    <input type="number" min="0" step="0.01" value={savingsForm.current_amount} onChange={(event) => setSavingsForm({ ...savingsForm, current_amount: event.target.value })} placeholder="Already saved (₹)" className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
                    <input type="date" value={savingsForm.deadline} onChange={(event) => setSavingsForm({ ...savingsForm, deadline: event.target.value })} className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white" />
                  </div>
                  <button type="submit" disabled={saving} className="bg-primary text-white rounded-xl px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Create goal'}</button>
                </form>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
