import { useState, useEffect } from 'react'
import { Timer, Target, CheckCircle, Plus, Play, Pause, RotateCcw, ListTodo, X, Flame } from 'lucide-react'
import { api } from '../services/api'

export default function Productivity() {
  const [tab, setTab] = useState<'pomodoro' | 'tasks' | 'habits'>('tasks')

  // Tasks state
  const [tasks, setTasks] = useState<any[]>([])
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', category: 'academic', priority: 'medium', due_date: '' })

  // Habits state
  const [habits, setHabits] = useState<any[]>([])
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [newHabit, setNewHabit] = useState({ name: '', description: '', color: '#6C63FF' })

  // Pomodoro state
  const [pomodoro, setPomodoro] = useState(25 * 60)
  const [initialPomodoro, setInitialPomodoro] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [pomodoroSubject, setPomodoroSubject] = useState('Data Structures')

  // Load data
  const loadData = async () => {
    try {
      const [taskRes, habitRes] = await Promise.all([
        api.get('/productivity/tasks'),
        api.get('/productivity/habits'),
      ])
      setTasks(taskRes.data || [])
      setHabits(habitRes.data || [])
    } catch (err) {
      console.error('Failed to load productivity data', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Pomodoro timer tick
  useEffect(() => {
    let interval: any = null
    if (isRunning && pomodoro > 0) {
      interval = setInterval(() => setPomodoro((prev) => prev - 1), 1000)
    } else if (pomodoro === 0 && isRunning) {
      setIsRunning(false)
      // Log session to backend
      api.post('/productivity/pomodoro', {
        duration_minutes: Math.round(initialPomodoro / 60),
        subject: pomodoroSubject,
        completed: true,
      }).catch(() => {})
      alert('Focus session complete! 🎉 Great job!')
    }
    return () => clearInterval(interval)
  }, [isRunning, pomodoro])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // Toggle Task Completion
  const toggleTask = async (task: any) => {
    try {
      const updated = await api.put(`/productivity/tasks/${task.id}`, { completed: !task.completed })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated.data : t)))
    } catch (err) {
      console.error('Failed to toggle task', err)
    }
  }

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    try {
      const res = await api.post('/productivity/tasks', newTask)
      setTasks((prev) => [res.data, ...prev])
      setNewTask({ title: '', category: 'academic', priority: 'medium', due_date: '' })
      setShowAddTask(false)
    } catch (err) {
      console.error('Failed to create task', err)
    }
  }

  // Toggle Habit
  const handleToggleHabit = async (habitId: number) => {
    try {
      const res = await api.post(`/productivity/habits/${habitId}/log`)
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId ? { ...h, done_today: res.data.done_today, current_streak: res.data.streak } : h
        )
      )
    } catch (err) {
      console.error('Failed to toggle habit', err)
    }
  }

  // Create Habit
  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHabit.name.trim()) return
    try {
      const res = await api.post('/productivity/habits', newHabit)
      setHabits((prev) => [...prev, { ...res.data, done_today: false, current_streak: 0 }])
      setNewHabit({ name: '', description: '', color: '#6C63FF' })
      setShowAddHabit(false)
    } catch (err) {
      console.error('Failed to create habit', err)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Productivity Center</h1>
          <p className="text-dark-muted">Stay in deep focus, track tasks, build daily habits and earn XP</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 glass rounded-xl p-1">
            {(['tasks', 'habits', 'pomodoro'] as const).map((t) => (
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
          {tab === 'tasks' && (
            <button
              onClick={() => setShowAddTask(true)}
              className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all"
            >
              <Plus size={16} /> New Task
            </button>
          )}
          {tab === 'habits' && (
            <button
              onClick={() => setShowAddHabit(true)}
              className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all"
            >
              <Plus size={16} /> Add Habit
            </button>
          )}
        </div>
      </div>

      {/* Modal: Add Task */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Create New Task</h3>
              <button onClick={() => setShowAddTask(false)} className="text-dark-muted hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs text-dark-muted block mb-1">Task Title *</label>
                <input
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Finish Binary Search problems"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="academic">Academic</option>
                    <option value="coding">Coding</option>
                    <option value="placement">Placement</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 rounded-xl text-sm text-dark-muted hover:bg-dark-lighter"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium">
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Habit */}
      {showAddHabit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Add New Daily Habit</h3>
              <button onClick={() => setShowAddHabit(false)} className="text-dark-muted hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div>
                <label className="text-xs text-dark-muted block mb-1">Habit Name *</label>
                <input
                  required
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                  placeholder="e.g. Read 1 Research Paper"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Description (optional)</label>
                <input
                  value={newHabit.description}
                  onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                  placeholder="e.g. 20 minutes before sleeping"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHabit(false)}
                  className="px-4 py-2 rounded-xl text-sm text-dark-muted hover:bg-dark-lighter"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium">
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Tasks */}
      {tab === 'tasks' && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-dark-border">
              <ListTodo size={40} className="text-dark-muted mx-auto mb-3" />
              <p className="text-base font-semibold">No tasks scheduled yet</p>
              <p className="text-xs text-dark-muted mt-1">Create your first task to start earning completion XP</p>
            </div>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTask(t)}
                className={`glass rounded-xl p-4 flex items-center justify-between cursor-pointer border transition-all ${
                  t.completed ? 'opacity-60 border-dark-border/50' : 'hover:border-primary/40 border-dark-border'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={t.completed ? 'text-emerald-400' : 'text-dark-muted'}>
                    <CheckCircle size={22} className={t.completed ? 'fill-emerald-400/20' : ''} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold ${t.completed ? 'line-through text-dark-muted' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-dark-lighter capitalize text-dark-muted">
                        {t.category || 'General'}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md capitalize ${
                          t.priority === 'high'
                            ? 'bg-rose-500/20 text-rose-400'
                            : t.priority === 'medium'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-500/20 text-slate-300'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${t.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-dark-lighter text-dark-muted'}`}>
                  {t.completed ? '+10 XP Earned' : 'In Progress'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Habits */}
      {tab === 'habits' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((h) => (
            <div
              key={h.id}
              onClick={() => handleToggleHabit(h.id)}
              className={`glass rounded-xl p-5 flex items-center justify-between cursor-pointer border transition-all ${
                h.done_today ? 'border-emerald-500/40 bg-emerald-500/5' : 'hover:border-primary/40 border-dark-border'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${h.done_today ? 'bg-emerald-500/20 text-emerald-400' : 'bg-dark-lighter text-dark-muted'}`}>
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{h.name}</h4>
                  <p className="text-xs text-dark-muted flex items-center gap-1 mt-0.5">
                    <Flame size={12} className="text-orange-400" />
                    {h.current_streak || 0} day streak
                  </p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${h.done_today ? 'bg-emerald-500/20 text-emerald-400' : 'bg-dark-lighter text-dark-muted'}`}>
                {h.done_today ? 'Completed' : 'Tap to Mark Done'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Pomodoro */}
      {tab === 'pomodoro' && (
        <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto border border-dark-border">
          <Timer size={44} className="text-primary mx-auto mb-4" />
          <p className="text-6xl font-black mb-3 font-mono tracking-tight">{formatTime(pomodoro)}</p>
          <div className="mb-6">
            <label className="text-xs text-dark-muted block mb-1">Focus Target</label>
            <input
              value={pomodoroSubject}
              onChange={(e) => setPomodoroSubject(e.target.value)}
              className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-1.5 text-xs text-white text-center focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
            >
              {isRunning ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
            </button>
            <button
              onClick={() => {
                setIsRunning(false)
                setPomodoro(initialPomodoro)
              }}
              className="w-14 h-14 rounded-full bg-dark-lighter border border-dark-border flex items-center justify-center hover:border-primary/50 transition-all"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          <div className="flex justify-center gap-3">
            {[
              { label: '25 min', mins: 25 },
              { label: '45 min', mins: 45 },
              { label: '5 min break', mins: 5 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setInitialPomodoro(p.mins * 60)
                  setPomodoro(p.mins * 60)
                  setIsRunning(false)
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  initialPomodoro === p.mins * 60
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-dark-lighter border-dark-border hover:border-primary/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
