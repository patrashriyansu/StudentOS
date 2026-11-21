import { Link } from 'react-router-dom'
import { Bell, Moon, Shield, UserRound } from 'lucide-react'
import ThemeControl from '../components/theme/ThemeControl'

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-dark-muted text-sm mt-1">
          Manage the appearance and account areas of your existing StudentOS workspace.
        </p>
      </div>

      <section className="glass rounded-2xl border border-dark-border p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Moon size={19} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold">Appearance</h2>
            <p className="text-xs text-dark-muted mt-1">
              Choose the theme used throughout StudentOS. Your selection is saved in this browser and restored on your next visit.
            </p>
          </div>
        </div>
        <ThemeControl />
      </section>

      <section className="glass rounded-2xl border border-dark-border p-5 space-y-4">
        <h2 className="font-semibold">Account and notifications</h2>
        <Link to="/profile" className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-lighter p-3 hover:border-primary/40 transition-colors">
          <UserRound size={18} className="text-primary" />
          <span className="flex-1 text-sm">Profile information</span>
          <span className="text-dark-muted text-sm">Open →</span>
        </Link>
        <Link to="/notifications" className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-lighter p-3 hover:border-primary/40 transition-colors">
          <Bell size={18} className="text-primary" />
          <span className="flex-1 text-sm">Notifications and email reminders</span>
          <span className="text-dark-muted text-sm">Open →</span>
        </Link>
      </section>

      <section className="rounded-2xl border border-dark-border p-4 flex items-start gap-3">
        <Shield size={18} className="text-dark-muted mt-0.5 shrink-0" />
        <p className="text-xs text-dark-muted">
          Password, sign-in provider and account security changes remain managed by the existing authentication and profile flows. This page does not claim to change settings that are not yet supported by the backend.
        </p>
      </section>
    </div>
  )
}
