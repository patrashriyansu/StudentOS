import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, BookOpen, Code, Briefcase, Bot, Heart,
  Wallet, Bell, BarChart3, User, LogOut, Menu, X,
  GraduationCap, Settings, Search, Sparkles, Zap,
} from 'lucide-react'

const S = {
  sidebar: {
    width: 240, background: '#0B0B1E',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  } as React.CSSProperties,
  topbar: {
    height: 60, background: '#0B0B1E',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  } as React.CSSProperties,
}

const mainNav = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/ai',         icon: BookOpen,         label: 'Study Hub'    },
  { to: '/academics',  icon: GraduationCap,    label: 'Academic Hub' },
  { to: '/coding',     icon: Code,             label: 'Coding Hub'   },
  { to: '/placements', icon: Briefcase,        label: 'Placement Hub'},
  { to: '/wellness',   icon: Heart,            label: 'Wellness Hub' },
  { to: '/expenses',   icon: Wallet,           label: 'Finance Hub'  },
  { to: '/ai',         icon: Sparkles,         label: 'AI Copilot', exact: true },
]

const secondNav = [
  { to: '/analytics',      icon: BarChart3, label: 'Analytics'     },
  { to: '/notifications',  icon: Bell,      label: 'Notifications', badge: 0 },
  { to: '/profile',        icon: User,      label: 'Profile'       },
  { to: '/settings',       icon: Settings,  label: 'Settings'      },
]

function NavItem({ to, icon: Icon, label, badge, end }: {
  to: string; icon: any; label: string; badge?: number; end?: boolean
}) {
  return (
    <NavLink to={to} end={end}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 10, marginBottom: 2,
        cursor: 'pointer', textDecoration: 'none',
        background: isActive
          ? 'linear-gradient(135deg,rgba(108,99,255,0.22),rgba(168,85,247,0.12))'
          : 'transparent',
        border: isActive
          ? '1px solid rgba(108,99,255,0.28)'
          : '1px solid transparent',
        color: isActive ? '#fff' : '#9CA3AF',
        fontSize: 13, fontWeight: isActive ? 600 : 400,
        transition: 'all 0.15s',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={15} style={{ color: isActive ? '#A78BFA' : '#6B7280', flexShrink: 0 }} />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          {badge != null && badge > 0 && (
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
  const [searchQuery, setSearchQuery] = useState('')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#080818', color: '#fff', fontFamily: 'Inter,sans-serif' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────── */}
      <aside style={{
        ...S.sidebar,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : undefined,
        overflowY: 'auto',
      }}
        className={`lg-static ${sidebarOpen ? '' : 'hidden-mobile'}`}
      >
        {/* Logo */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#6C63FF,#A855F7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1 }}>StudentOS</div>
              <div style={{ fontSize: 10, color: '#6C63FF', marginTop: 2 }}>AI-Powered Student Platform</div>
            </div>
            <button onClick={() => setSidebarOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
              className="lg:hidden">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 10px 0' }}>
          {mainNav.map(({ to, icon, label, exact }) => (
            <NavItem key={label} to={to} icon={icon} label={label} end={exact || to === '/'} />
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '10px 4px' }} />

          {secondNav.map(({ to, icon, label, badge }) => (
            <NavItem key={label} to={to} icon={icon} label={label} badge={badge} />
          ))}
        </nav>

        {/* Pro Upgrade Card */}
        <div style={{ padding: '12px 12px 14px' }}>
          <div style={{
            borderRadius: 14, padding: '14px 16px',
            background: 'linear-gradient(135deg,#1E1060,#3B1A6B)',
            border: '1px solid rgba(139,92,246,0.35)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={14} color="#C4B5FD" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>StudentOS Pro</span>
            </div>
            <p style={{ fontSize: 11, color: '#C4B5FD', marginBottom: 12, lineHeight: 1.5, margin: '0 0 12px' }}>
              Unlock AI tools, advanced analytics &amp; more.
            </p>
            <button style={{
              width: '100%', padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
              background: 'linear-gradient(135deg,#6C63FF,#A855F7)',
              color: '#fff', fontSize: 12, fontWeight: 600, border: 'none',
            }}>
              Upgrade Now →
            </button>
          </div>
        </div>
      </aside>

      {/* ── Right: topbar + content ─────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 240, minWidth: 0, overflow: 'hidden' }}>

        {/* Top Bar */}
        <header style={{
          ...S.topbar,
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '0 24px', flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
            className="lg:hidden">
            <Menu size={20} />
          </button>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 460, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', pointerEvents: 'none' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes, tasks, exams, DSA, or ask AI..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '8px 50px 8px 34px',
                color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <span style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.08)', borderRadius: 5,
              padding: '2px 7px', fontSize: 10, color: '#6B7280',
            }}>Ctrl K</span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Bell */}
          <div style={{ position: 'relative' }}>
            <button style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <Bell size={15} color="#9CA3AF" />
            </button>
            <span style={{
              position: 'absolute', top: 7, right: 7, width: 7, height: 7,
              borderRadius: '50%', background: '#EF4444',
              border: '1.5px solid #0B0B1E',
            }} />
          </div>

          {/* User */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => navigate('/profile')}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#6C63FF,#A855F7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff',
            }}>
              {user?.name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
                {user?.name || 'Student'}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>B.Tech CSE '28</div>
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
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
