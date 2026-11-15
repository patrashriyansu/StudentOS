import { useState, useEffect } from 'react'
import { CheckCheck, Calendar, Award, Bell, AlertTriangle, Plus, Trash2, Mail, MailWarning } from 'lucide-react'
import { api } from '../services/api'

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderMessage, setReminderMessage] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [repeatInterval, setRepeatInterval] = useState<'none' | 'daily' | 'weekly'>('none')
  const [savingReminder, setSavingReminder] = useState(false)
  const [reminderError, setReminderError] = useState('')

  const loadNotifications = async () => {
    const [notificationsResult, remindersResult, statusResult] = await Promise.allSettled([
      api.get('/notifications/'),
      api.get('/notifications/reminders'),
      api.get('/notifications/reminders/status'),
    ])
    if (notificationsResult.status === 'fulfilled') setNotifications(notificationsResult.value.data || [])
    if (remindersResult.status === 'fulfilled') setReminders(remindersResult.value.data || [])
    if (statusResult.status === 'fulfilled') setEmailConfigured(Boolean(statusResult.value.data?.email_configured))
  }

  const handleCreateReminder = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!reminderTitle.trim() || !remindAt) return
    setSavingReminder(true)
    setReminderError('')
    try {
      await api.post('/notifications/reminders', {
        title: reminderTitle.trim(),
        message: reminderMessage.trim(),
        remind_at: new Date(remindAt).toISOString(),
        repeat_interval: repeatInterval,
      })
      setReminderTitle('')
      setReminderMessage('')
      setRemindAt('')
      setRepeatInterval('none')
      await loadNotifications()
    } catch (err: any) {
      setReminderError(err?.response?.data?.detail || 'Could not create the email reminder.')
    } finally {
      setSavingReminder(false)
    }
  }

  const handleCancelReminder = async (id: number) => {
    try {
      await api.delete(`/notifications/reminders/${id}`)
      setReminders((current) => current.filter((reminder) => reminder.id !== id))
    } catch (err) {
      console.error('Could not cancel reminder', err)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const displayed = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="text-primary" /> Smart Notifications
          </h1>
          <p className="text-dark-muted">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      <section className="glass rounded-2xl border border-dark-border p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Mail size={17} className="text-primary" /> Email Reminders</h2>
            <p className="text-xs text-dark-muted mt-1">Plan reminders for classes, deadlines, exams and anything else you need to remember.</p>
          </div>
          <span className={`text-xs rounded-full px-3 py-1 ${emailConfigured ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'}`}>
            {emailConfigured ? 'Email delivery configured' : 'Waiting for SMTP setup'}
          </span>
        </div>
        {!emailConfigured && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
            <MailWarning size={16} className="shrink-0 mt-0.5" />
            <span>Reminders can be saved now, but emails will be sent only after the backend SMTP settings are configured.</span>
          </div>
        )}
        <form onSubmit={handleCreateReminder} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            required
            value={reminderTitle}
            onChange={(event) => setReminderTitle(event.target.value)}
            placeholder="Reminder title"
            className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white"
          />
          <input
            required
            type="datetime-local"
            value={remindAt}
            onChange={(event) => setRemindAt(event.target.value)}
            className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white"
          />
          <input
            value={reminderMessage}
            onChange={(event) => setReminderMessage(event.target.value)}
            placeholder="Details (optional)"
            className="bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white"
          />
          <div className="flex gap-2">
            <select
              value={repeatInterval}
              onChange={(event) => setRepeatInterval(event.target.value as 'none' | 'daily' | 'weekly')}
              className="min-w-0 flex-1 bg-dark-lighter border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white"
            >
              <option value="none">One time</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
            </select>
            <button
              type="submit"
              disabled={savingReminder}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Plus size={15} /> {savingReminder ? 'Saving…' : 'Add reminder'}
            </button>
          </div>
        </form>
        {reminderError && <p role="alert" className="text-xs text-rose-300">{reminderError}</p>}
        <div className="space-y-2">
          {reminders.length === 0 ? (
            <p className="text-xs text-dark-muted py-2">No active email reminders. Dated items you add in Academics and Placement Hub will be queued automatically.</p>
          ) : reminders.map((reminder) => (
            <div key={reminder.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-dark-lighter border border-dark-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{reminder.title}</p>
                <p className="text-xs text-dark-muted mt-0.5">
                  {new Date(reminder.remind_at).toLocaleString()} · {reminder.repeat_interval === 'none' ? 'One time' : `Repeats ${reminder.repeat_interval}`}
                </p>
                {reminder.last_error && <p className="text-xs text-rose-300 mt-1">Last delivery issue: {reminder.last_error}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleCancelReminder(reminder.id)}
                className="text-xs text-dark-muted hover:text-rose-300 flex items-center gap-1 self-start sm:self-auto"
              >
                <Trash2 size={13} /> Cancel
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        {(['all', 'unread'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === t ? 'bg-primary text-white' : 'text-dark-muted hover:text-white'
            }`}
          >
            {t} {t === 'unread' && `(${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-dark-border">
            <Bell size={40} className="text-dark-muted mx-auto mb-3" />
            <p className="text-base font-semibold">No notifications</p>
            <p className="text-xs text-dark-muted mt-1">You have cleared all alerts and reminders</p>
          </div>
        ) : (
          displayed.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && handleMarkAsRead(n.id)}
              className={`glass rounded-xl p-4 flex items-start gap-4 transition-all cursor-pointer border ${
                !n.read ? 'border-primary/50 bg-primary/5' : 'border-dark-border opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === 'warning'
                    ? 'bg-amber-500/20 text-amber-400'
                    : n.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {n.type === 'warning' ? (
                  <AlertTriangle size={18} />
                ) : n.type === 'success' ? (
                  <Award size={18} />
                ) : (
                  <Calendar size={18} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-white">{n.title}</h4>
                  <span className="text-[11px] text-dark-muted">
                    {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <p className="text-xs text-dark-muted mt-1 leading-relaxed">{n.message}</p>
              </div>
              {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
