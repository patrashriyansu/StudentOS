import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, BookOpen, Code, Briefcase, Bot, Heart,
  Timer, Wallet, Bell, BarChart3, User, LogOut, Menu, X,
  GraduationCap, Settings, Search, ChevronRight,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',   color: '#6C63FF' },
  { to: '/academics',    icon: BookOpen,         label: 'Academics',   color: '#10B981' },
  { to: '/ai',           icon: Bot,              label: 'Study Hub',   color: '#A855F7' },
  { to: '/coding',       icon: Code,             label: 'Coding',      color: '#00D4FF' },
  { to: '/placements',   icon: Briefcase,        label: 'Placement',   color: '#F59E0B' },
  { to: '/wellness',     icon: Heart,            label: 'Wellness',    color: '#F43F5E' },
  { to: '/expenses',     icon: Wallet,           label: 'Finance',     color: '#8B5CF6' },
  { to: '/analytics',   icon: BarChart3,         label: 'Analytics',   color: '#06B6D4' },
]

const bottomItems = [
  { to: '/notifications', icon: Bell,     label: 'Notifications' },
  { to: '/profile',       icon: User,     label: 'Profile' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#070714' }}>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 flex flex-col
        transition-transform duration-250
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `} style={{ width: 220, background: '#0D0D1F', borderRight: '1px solid rgba(108,99,255,0.12)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(108,99,255,0.12)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#A855F7)' }}>
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">StudentOS</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#6C63FF' }}>AI-Powered Platform</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#4B5563' }}>
            Main Menu
          </p>
          {navItems.map(({ to, icon: Icon, label, color }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative
                ${isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`
              }
              style={({ isActive }) => isActive ? {
                background: `linear-gradient(90deg, ${color}22, transparent)`,
                borderLeft: `3px solid ${color}`,
              } : { borderLeft: '3px solid transparent' }}
            >
              {({ isActive }) => (
                <>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{ background: isActive ? `${color}25` : 'transparent' }}>
                    <Icon size={16} style={{ color: isActive ? color : 'inherit' }} />
                  </div>
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} style={{ color }} />}
                </>
              )}
            </NavLink>
          ))}

          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mt-4 mb-2" style={{ color: '#4B5563' }}>
            Account
          </p>
          {bottomItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                ${isActive ? 'text-white bg-white/8' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
              }
              style={{ borderLeft: '3px solid transparent' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                <Icon size={16} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(108,99,255,0.12)' }}>
          <div className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ background: 'rgba(108,99,255,0.08)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
              style={{ background: 'linear-gradient(135deg,#6C63FF,#A855F7)' }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Student'}</p>
              <p className="text-xs capitalize truncate" style={{ color: '#6C63FF' }}>{user?.role || 'student'}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
            style={{ color: '#6B7280' }}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(108,99,255,0.1)', background: 'rgba(13,13,31,0.8)', backdropFilter: 'blur(12px)' }}>

          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white mr-1">
            <Menu size={22} />
          </button>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md rounded-xl px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(108,99,255,0.15)' }}>
            <Search size={15} style={{ color: '#6B7280' }} />
            <input
              type="text"
              placeholder="Search anything…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Notifications */}
            <NavLink to="/notifications"
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(108,99,255,0.15)' }}>
              <Bell size={16} className="text-gray-400" />
            </NavLink>

            {/* Avatar */}
            <NavLink to="/profile" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#6C63FF,#A855F7)' }}>
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white leading-none">{user?.name?.split(' ')[0] || 'Student'}</p>
                <p className="text-xs" style={{ color: '#6C63FF' }}>{user?.xp_points ?? 0} XP</p>
              </div>
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
