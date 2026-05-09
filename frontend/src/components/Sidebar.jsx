import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Users, BookOpen,
  Upload, UserCheck, Calendar, Settings, LogOut,
  Zap, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { api } from '../lib/api';

/* ────────────────────────────────────────────────────────────
   Sidebar — Design System §8.1
   - Role-aware nav items (mentor / student)
   - Active state: bg-surface-raised + 2px left accent-glow border
   - 260px desktop, icon-only 72px tablet, bottom nav mobile
   ──────────────────────────────────────────────────────────── */

const MENTOR_NAV = [
  { label: 'Overview', items: [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { label: 'Activity', items: [
    { to: '/attendance', icon: CheckSquare,     label: 'Mark Attendance' },
    { to: '/history',    icon: Users,           label: 'Student History' },
    { to: '/materials',  icon: BookOpen,        label: 'Materials' },
  ]},
  { label: 'Data', items: [
    { to: '/upload',     icon: Upload,          label: 'Upload CSV', badge: 'AI' },
  ]},
  { label: 'Account', items: [
    { to: '/settings',   icon: Settings,        label: 'Settings' },
  ]},
];

const STUDENT_NAV = [
  { label: 'My Learning', items: [
    { to: '/me/attendance', icon: UserCheck,  label: 'My Attendance' },
    { to: '/me/upcoming',   icon: Calendar,   label: 'Upcoming' },
    { to: '/me/materials',  icon: BookOpen,   label: 'Materials' },
  ]},
  { label: 'Account', items: [
    { to: '/me/settings',   icon: Settings,   label: 'Settings' },
  ]},
];

export default function Sidebar({ role = 'mentor', displayName = '', collapsed = false, onCollapse }) {
  const { theme, toggleTheme } = useTheme();
  const nav = role === 'mentor' ? MENTOR_NAV : STUDENT_NAV;
  const initials = displayName ? displayName.charAt(0).toUpperCase() : '?';

  async function handleLogout() {
    api.logout();
    window.location.href = '/login';
  }

  return (
    <aside className="no-scrollbar" style={{
      width: collapsed ? '72px' : '260px',
      height: '100%',
      background: 'var(--bg-canvas)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>

      {/* Logo + Collapse */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '20px 0' : '20px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        minHeight: '64px',
        position: 'relative',
      }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'var(--accent-glow-soft)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={16} style={{ color: 'var(--accent-glow)' }} strokeWidth={1.75} />
            </div>
            <span className="text-h3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              ForgeTrack
            </span>
          </div>
        ) : (
          <div style={{
            width: '32px', height: '32px',
            background: 'var(--accent-glow-soft)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} style={{ color: 'var(--accent-glow)' }} strokeWidth={1.75} />
          </div>
        )}

        {onCollapse && (
          <button
            id="btn-sidebar-collapse"
            onClick={onCollapse}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', 
              display: 'flex',
              padding: '4px', borderRadius: 'var(--radius-sm)',
              transition: 'color 0.15s',
              position: collapsed ? 'absolute' : 'static',
              right: collapsed ? '-12px' : 'auto',
              top: collapsed ? '50%' : 'auto',
              transform: collapsed ? 'translateY(-50%)' : 'none',
              zIndex: 20,
              backgroundColor: collapsed ? 'var(--bg-surface-raised)' : 'transparent',
              border: collapsed ? '1px solid var(--border-subtle)' : 'none',
              borderRadius: collapsed ? '50%' : 'var(--radius-sm)',
              boxShadow: collapsed ? 'var(--shadow-card)' : 'none',
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} strokeWidth={2} /> : <ChevronLeft size={16} strokeWidth={1.75} />}
          </button>
        )}
      </div>

      {/* Welcome block */}
      {!collapsed && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'var(--bg-surface-raised)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-full)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="text-body-sm" style={{ color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName || 'Welcome'}
              </p>
              <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
                {role === 'mentor' ? 'Mentor' : 'Student'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav groups — Internal scroll only if needed, hidden scrollbar */}
      <nav className="no-scrollbar" style={{ flex: 1, padding: collapsed ? '12px 8px' : '12px 12px', overflowY: 'auto' }}>
        {nav.map((group) => (
          <div key={group.label} style={{ marginBottom: '24px' }}>
            {!collapsed && (
              <p className="text-label" style={{
                color: 'var(--text-tertiary)',
                padding: '0 8px',
                marginBottom: '6px',
              }}>
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <NavItem key={item.to} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px 12px',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <button
          id="btn-logout"
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            height: '44px',
            padding: collapsed ? '0' : '0 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'none',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            color: 'var(--danger-fg)',
            fontSize: '14px',
            fontFamily: 'var(--font-body)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          title="Logout"
        >
          <LogOut size={20} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

/* ── Individual Nav Item ─────────────────────────────────── */
function NavItem({ item, collapsed }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      id={`nav-${item.to.replace(/\//g, '-').slice(1)}`}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        height: '44px',
        padding: collapsed ? '0' : '0 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 'var(--radius-lg)',
        textDecoration: 'none',
        marginBottom: '2px',
        position: 'relative',
        transition: 'background 0.15s',
        background: isActive ? 'var(--bg-surface-raised)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        // Active 2px left accent border
        boxShadow: isActive ? 'inset 2px 0 0 var(--accent-glow)' : 'none',
      })}
    >
      <Icon size={20} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      {!collapsed && (
        <span style={{ fontSize: '14px', fontFamily: 'var(--font-body)', fontWeight: 400 }}>
          {item.label}
        </span>
      )}
      {!collapsed && item.badge && (
        <span style={{
          marginLeft: 'auto',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '2px 6px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-glow-soft)',
          color: 'var(--accent-glow)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}
