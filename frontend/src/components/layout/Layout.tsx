import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import ThemeControl from '../theme/ThemeControl'
import {
  LayoutDashboard, BookOpen, Code, Briefcase, Heart,
  Wallet, Bell, BarChart3, User, LogOut, Menu, X,
  GraduationCap, Settings, Search, Sparkles, Users,
} from 'lucide-react'

const S = {
  sidebar: {
    width: 240, background: 'var(--app-sidebar-bg)',
    borderRight: '1px solid var(--app-border)',
  } as React.CSSProperties,
  topbar: {
    height: 60, background: 'var(--app-topbar-bg)',
    borderBottom: '1px solid var(--app-border)',
  } as React.CSSProperties,
}

const mainNav = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/productivity',  icon: BookOpen,         label: 'Study Hub' },
  { to: '/classroom',     icon: GraduationCap,    label: 'Classroom' },
  { to: '/academics',     icon: GraduationCap,    label: 'Academic Hub' },
  { to: '/coding',        icon: Code,              label: 'Coding Hub' },
  { to: '/campus',        icon: Users,             label: 'Campus Portal' },
  { to: '/placements',    icon: Briefcase,         label: 'Placement Hub' },
  { to: '/wellness',      icon: Heart,             label: 'Wellness Hub' },
  { to: '/expenses',      icon: Wallet,            label: 'Finance Hub' },
  { to: '/ai',            icon: Sparkles,          label: 'Chatbot' },
]

const secondNav = [
  { to: '/analytics',      icon: BarChart3, label: 'Analytics'     },
  { to: '/notifications',  icon: Bell,      label: 'Notifications' },
  { to: '/profile',        icon: User,      label: 'Profile'       },
  { to: '/settings',       icon: Settings,  label: 'Settings'      },
]

const mentorNav = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/mentor/students', icon: Users, label: 'My Students' },
  { to: '/mentor/sessions', icon: Bell, label: 'Sessions' },
  { to: '/mentor/goals', icon: GraduationCap, label: 'Goals & Plans' },
  { to: '/mentor/notes', icon: BookOpen, label: 'Private Notes' },
]

const recruiterNav = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/recruiter/candidates', icon: Users, label: 'Find Candidates' },
  { to: '/recruiter/shortlisted', icon: Shield, label: 'Shortlisted' },
  { to: '/recruiter/jobs', icon: Briefcase, label: 'Job Openings' },
  { to: '/recruiter/applications', icon: ClipboardList, label: 'Applications' },
]

const facultyNav = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/faculty/classes', icon: BookOpen, label: 'My Classes' },
  { to: '/faculty/students', icon: Users, label: 'My Students' },
  { to: '/faculty/attendance', icon: CheckCircle2, label: 'Attendance' },
  { to: '/faculty/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/faculty/marks', icon: BarChart3, label: 'Marks & Results' },
  { to: '/faculty/timetable', icon: Calendar, label: 'Timetable' },
  { to: '/faculty/notices', icon: Bell, label: 'Notices' },
  { to: '/faculty/materials', icon: BookOpen, label: 'Learning Materials' },
]

const adminNav = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/admin/students', icon: Users, label: 'Students' },
  { to: '/admin/staff', icon: Shield, label: 'Staff & Roles' },
  { to: '/admin/classes', icon: BookOpen, label: 'Class Assignments' },
  { to: '/admin/mentors', icon: GraduationCap, label: 'Mentor Assignments' },
]

const roleSecondaryNav = [
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function NavItem({ to, icon: Icon, label, badge, end, collapsed }: {
  to: string; icon: any; label: string; badge?: number; end?: boolean; collapsed?: boolean
}) {
  return (
    <NavLink to={to} end={end}
      title={collapsed ? label : undefined}
      aria-label={label}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
        padding: collapsed ? '10px 0' : '9px 12px', borderRadius: 10, marginBottom: 2,
        position: 'relative',
        cursor: 'pointer', textDecoration: 'none',
        background: isActive
          ? 'linear-gradient(135deg,rgba(108,99,255,0.22),rgba(168,85,247,0.12))'
          : 'transparent',
        border: isActive
          ? '1px solid rgba(108,99,255,0.28)'
          : '1px solid transparent',
        color: isActive ? 'var(--app-text)' : 'var(--app-sidebar-muted)',
        fontSize: 13, fontWeight: isActive ? 600 : 400,
        transition: 'all 0.15s',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={15} style={{ color: isActive ? '#7C6AF2' : 'var(--app-muted)', flexShrink: 0 }} />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: collapsed ? 'none' : 'block' }}>{label}</span>
          {badge != null && badge > 0 && !collapsed && (
            <span style={{
              background: '#6C63FF', color: '#fff', fontSize: 10,
              fontWeight: 700, padding: '1px 6px', borderRadius: 999,
            }}>{badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const currentMainNav = user?.role === 'mentor'
    ? mentorNav
    : user?.role === 'recruiter'
      ? recruiterNav
      : user?.role === 'faculty'
        ? facultyNav
        : user?.role === 'admin'
          ? adminNav
          : mainNav
  const currentSecondNav = ['mentor', 'recruiter', 'faculty', 'admin'].includes(user?.role || '')
    ? roleSecondaryNav
    : secondNav
  const workspaceLabel = user?.role === 'student'
    ? (user?.registration_number ? user.registration_number + ' · ' + (user?.section || 'Section pending') : 'Complete your student profile')
    : user?.role === 'mentor'
      ? 'Mentor workspace'
      : user?.role === 'recruiter'
        ? 'Recruiter workspace'
        : user?.role === 'faculty' || user?.role === 'admin'
          ? 'Faculty workspace'
          : 'StudentOS workspace'

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    let active = true
    api.get('/notifications/unread-count')
      .then((response) => {
        if (active) setUnreadCount(Number(response.data?.unread_count) || 0)
      })
      .catch(() => {
        if (active) setUnreadCount(0)
      })
    return () => { active = false }
  }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100dvh', minHeight: 0, overflow: 'hidden', background: 'var(--app-bg)', color: 'var(--app-text)', fontFamily: 'Inter,sans-serif' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.12)', zIndex: 40, backdropFilter: 'blur(1px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────── */}
      <aside style={{
        ...S.sidebar,
        width: sidebarCollapsed ? 72 : 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        zIndex: 50,
        overflowY: 'auto',
        transition: 'transform 0.25s ease, width 0.22s ease',
        transform: sidebarOpen ? 'translateX(0)' : undefined,
      }}
        className={`app-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''} ${sidebarOpen ? 'mobile-open' : ''}`}
      >
        {/* Logo */}
        <div style={{ padding: sidebarCollapsed ? '18px 10px 14px' : '18px 18px 14px', borderBottom: '1px solid var(--app-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#6C63FF,#A855F7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={18} color="#fff" />
            </div>
            {!sidebarCollapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)', lineHeight: 1 }}>StudentOS</div>
                <div style={{ fontSize: 10, color: 'var(--app-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>AI-Powered Student Platform</div>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia('(max-width: 1023px)').matches) {
                  setSidebarOpen(false)
                } else {
                  setSidebarCollapsed((current) => !current)
                }
              }}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                marginLeft: sidebarCollapsed ? 0 : 'auto',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--app-subtle)', border: '1px solid var(--app-border)',
                color: 'var(--app-muted)', cursor: 'pointer', flexShrink: 0,
              }}
            >
              {sidebarCollapsed ? <Menu size={15} /> : <X size={15} />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav aria-label={user?.role === "mentor" ? "Mentor navigation" : user?.role === "recruiter" ? "Recruiter navigation" : user?.role === "faculty" ? "Faculty navigation" : user?.role === "admin" ? "Admin navigation" : "StudentOS navigation"} style={{ flex: 1, padding: sidebarCollapsed ? '10px 8px 0' : '10px 10px 0' }}>
          {currentMainNav.map(({ to, icon, label, exact }) => (
            <NavItem key={label} to={to} icon={icon} label={label} end={exact || to === '/'} collapsed={sidebarCollapsed} />
          ))}

          <div style={{ height: 1, background: 'var(--app-border)', margin: '10px 4px' }} />

          {currentSecondNav.map(({ to, icon, label }) => (
            <NavItem key={label} to={to} icon={icon} label={label} badge={label === 'Notifications' ? unreadCount : undefined} collapsed={sidebarCollapsed} />
          ))}
        </nav>

      </aside>

      {/* ── Right: topbar + content ─────────────── */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', transition: 'margin-left 0.22s ease' }}
        className={`app-content-area ${sidebarCollapsed ? 'app-content-collapsed' : 'app-content-expanded'}`}
      >

        {/* Top Bar */}
        <header style={{
          ...S.topbar,
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '0 24px', flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 30,
        }} className="app-topbar">
          <button
            type="button"
            onClick={() => {
              if (window.matchMedia('(max-width: 1023px)').matches) {
                setSidebarOpen(true)
              } else {
                setSidebarCollapsed(false)
              }
            }}
            aria-label="Open navigation"
            title="Open navigation"
            style={{ background: 'none', border: 'none', color: 'var(--app-muted)', cursor: 'pointer', display: sidebarCollapsed ? 'inline-flex' : undefined }}
            className={sidebarCollapsed ? 'inline-flex' : 'lg:hidden'}
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <div className="app-search-wrap" style={{ flex: 1, maxWidth: 460, position: 'relative', minWidth: 0 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--app-muted)', pointerEvents: 'none' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search StudentOS..."
              style={{
                width: '100%', background: 'var(--app-input)',
                border: '1px solid var(--app-border)',
                borderRadius: 10, padding: '8px 50px 8px 34px',
                color: 'var(--app-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <span className="app-search-shortcut" style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'var(--app-subtle)', borderRadius: 5,
              padding: '2px 7px', fontSize: 10, color: 'var(--app-muted)',
            }}>Ctrl K</span>
          </div>

          <div style={{ flex: 1 }} />

          <ThemeControl compact />

          {/* Bell */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
              title="Notifications"
              onClick={() => navigate('/notifications')}
              style={{
                width: 36, height: 36, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: 'var(--app-subtle)', border: '1px solid var(--app-border)',
              }}
            >
              <Bell size={15} color="var(--app-muted)" />
            </button>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16,
                padding: '0 4px', borderRadius: 999, background: '#EF4444',
                border: '1.5px solid var(--app-topbar-bg)', color: '#fff', fontSize: 9,
                fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </div>

          {/* User */}
          <div
            className="app-user-profile"
            role="button"
            tabIndex={0}
            aria-label="Open profile"
            onClick={() => navigate('/profile')}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate('/profile') }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0 }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#6C63FF,#A855F7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff',
            }}>
              {user?.name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="app-user-details">
              <div className="app-user-name" style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text)', lineHeight: 1 }}>
                {user?.name || 'Student'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--app-muted)', marginTop: 2 }}>{workspaceLabel}</div>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', color: '#6B7280',
              cursor: 'pointer', fontSize: 12, padding: '6px 8px',
              borderRadius: 8,
            }}
            title="Logout">
            <LogOut size={15} />
          </button>
        </header>

        {/* Page Content */}
        <main className="app-page-content" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
