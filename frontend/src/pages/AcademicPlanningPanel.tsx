import { useState } from 'react'
import { CalendarDays, Calculator, RefreshCw } from 'lucide-react'
import { api } from '../services/api'

type CalendarEvent = {
  id: string
  source_id: number
  type: 'exam' | 'assignment'
  title: string
  subject: string
  starts_at: string
  date: string
  description: string
  status: string
}

type WhatIfResult = {
  current_cgpa: number | null
  current_credits: number
  future_semester_credits: number
  expected_sgpa: number
  projected_cgpa: number
  change: number | null
  persisted: false
}

export default function AcademicPlanningPanel() {
  const [credits, setCredits] = useState('')
  const [expectedSgpa, setExpectedSgpa] = useState('')
  const [scenario, setScenario] = useState<WhatIfResult | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState('')

  const calculateScenario = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setScenario(null)
    setCalculating(true)
    try {
      const response = await api.post('/academics/cgpa/what-if', {
        future_semester_credits: Number(credits),
        expected_sgpa: Number(expectedSgpa),
      })
      setScenario(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not calculate this CGPA scenario.')
    } finally {
      setCalculating(false)
    }
  }

  const loadCalendar = async (event?: React.FormEvent) => {
    event?.preventDefault()
    setError('')
    setLoadingCalendar(true)
    try {
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const response = await api.get('/academics/calendar', { params })
      setEvents(Array.isArray(response.data) ? response.data : [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not load your academic calendar.')
      setEvents([])
    } finally {
      setLoadingCalendar(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid xl:grid-cols-2 gap-4">
        <div className="glass rounded-2xl border border-dark-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2.5 text-primary"><Calculator size={20}/></div>
            <div>
              <h2 className="font-semibold">CGPA what-if planner</h2>
              <p className="text-xs text-dark-muted">Estimate the result of a future semester using your saved grades.</p>
            </div>
          </div>
          <form onSubmit={calculateScenario} className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-dark-muted">Future semester credits
              <input required type="number" min="1" max="100" step="1" value={credits}
                onChange={e=>setCredits(e.target.value)}
                className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/>
            </label>
            <label className="text-xs text-dark-muted">Expected SGPA (0–10)
              <input required type="number" min="0" max="10" step="0.01" value={expectedSgpa}
                onChange={e=>setExpectedSgpa(e.target.value)}
                className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/>
            </label>
            <button disabled={calculating} className="sm:col-span-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {calculating ? 'Calculating…' : 'Calculate projected CGPA'}
            </button>
          </form>
          {scenario && <div className="rounded-xl border border-dark-border bg-dark-lighter p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-dark-muted">Current CGPA</p><p className="text-xl font-bold">{scenario.current_cgpa == null ? 'No grades saved' : scenario.current_cgpa.toFixed(2)}</p></div>
              <div><p className="text-xs text-dark-muted">Projected CGPA</p><p className="text-xl font-bold text-primary">{scenario.projected_cgpa.toFixed(2)}</p></div>
            </div>
            <p className="text-xs text-dark-muted">Based on {scenario.current_credits} saved credits plus {scenario.future_semester_credits} future credits at SGPA {scenario.expected_sgpa.toFixed(2)}.</p>
            {scenario.change != null && <p className="text-sm">Estimated change: <b>{scenario.change > 0 ? '+' : ''}{scenario.change.toFixed(2)}</b></p>}
            <p className="text-[11px] text-dark-muted">This is a non-persistent estimate. Your academic records are not modified.</p>
          </div>}
        </div>

        <div className="glass rounded-2xl border border-dark-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2.5 text-primary"><CalendarDays size={20}/></div>
            <div>
              <h2 className="font-semibold">Academic calendar</h2>
              <p className="text-xs text-dark-muted">Saved exams and assignment deadlines in one timeline.</p>
            </div>
          </div>
          <form onSubmit={loadCalendar} className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-dark-muted">From
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/>
            </label>
            <label className="text-xs text-dark-muted">To
              <input type="date" min={startDate || undefined} value={endDate} onChange={e=>setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/>
            </label>
            <button disabled={loadingCalendar} className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-dark-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
              <RefreshCw size={14} className={loadingCalendar ? 'animate-spin' : ''}/>
              {loadingCalendar ? 'Loading…' : 'Load calendar'}
            </button>
          </form>
          {events.length === 0
            ? <p className="rounded-xl border border-dashed border-dark-border p-4 text-sm text-dark-muted">No saved exams or assignment deadlines in this range. Add them in the tabs above to see them here.</p>
            : <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {events.map(item=><article key={item.id} className="rounded-xl border border-dark-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs uppercase tracking-wide text-primary">{item.type}</p><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-dark-muted">{item.subject} · {new Date(item.starts_at).toLocaleString()}</p></div>
                    <span className="rounded-full bg-dark-lighter px-2 py-1 text-[10px] capitalize text-dark-muted">{item.status.replaceAll('_',' ')}</span>
                  </div>
                  {item.description && <p className="mt-2 text-xs text-dark-muted">{item.description}</p>}
                </article>)}
              </div>}
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
    </section>
  )
}
