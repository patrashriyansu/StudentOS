import { useState, useEffect } from 'react'
import { CheckCheck, Calendar, Award, Bell, AlertTriangle } from 'lucide-react'
import { api } from '../services/api'

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<any[]>([])

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications/')
      setNotifications(res.data || [])
    } catch (err) {
      console.error('Failed to load notifications', err)
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
