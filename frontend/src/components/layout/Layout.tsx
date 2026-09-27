import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { LayoutDashboard, BookOpen, Code, Briefcase, Bot, Heart, Timer, Wallet, Users, FolderGit2, Bell, BarChart3, User, LogOut, Menu, X, GraduationCap } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/academics', icon: BookOpen, label: 'Academics' },
  { to: '/coding', icon: Code, label: 'Coding' },
  { to: '/placements', icon: Briefcase, label: 'Placements' },
  { to: '/ai', icon: Bot, label: 'AI Assistant' },
  { to: '/wellness', icon: Heart, label: 'Wellness' },
  { to: '/productivity', icon: Timer, label: 'Productivity' },
  { to: '/expenses', icon: Wallet, label: 'Expenses' },
  { to: '/projects', icon: FolderGit2, label: 'Projects' },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-dark overflow-hidden">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark-card border-r border-dark-border transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-5 flex items-center justify-between border-b border-dark-border">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-primary" size={28} />
            <span className="text-xl font-bold gradient-text">StudentOS</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-dark-muted hover:text-white"><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-primary/20 text-primary border border-primary/30' : 'text-dark-muted hover:text-white hover:bg-dark-lighter'}`}>
              <Icon size={18} /><span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold">{user?.name?.[0]}</div>
            <div><p className="text-sm font-medium">{user?.name}</p><p className="text-xs text-dark-muted capitalize">{user?.role}</p></div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-dark-muted hover:text-red-400 text-sm w-full px-3 py-2 rounded-lg hover:bg-dark-lighter transition-colors"><LogOut size={16} /> Logout</button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-dark-card/80 backdrop-blur-xl border-b border-dark-border flex items-center px-6 gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-dark-muted hover:text-white"><Menu size={24} /></button>
          <GraduationCap className="text-primary" size={24} />
          <span className="text-lg font-bold gradient-text">StudentOS</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  )
}
