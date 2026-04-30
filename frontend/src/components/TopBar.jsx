import { Search, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

/* ────────────────────────────────────────────────────────────
   TopBar — Design System §11.2 layout spec
   - Breadcrumb based on current route
   - Search input (placeholder, wired in Phase 3)
   - User avatar initial + display name
   ──────────────────────────────────────────────────────────── */

const ROUTE_LABELS = {
  '/dashboard':        ['Overview', 'Dashboard'],
  '/attendance':       ['Activity', 'Mark Attendance'],
  '/history':          ['Activity', 'Student History'],
  '/materials':        ['Activity', 'Materials'],
  '/upload':           ['Data', 'Upload CSV'],
  '/settings':         ['Account', 'Settings'],
  '/me/attendance':    ['My Learning', 'My Attendance'],
  '/me/upcoming':      ['My Learning', 'Upcoming'],
  '/me/materials':     ['My Learning', 'Materials'],
};

export default function TopBar({ displayName = '', role = 'mentor' }) {
  const { pathname } = useLocation();
  const [section, page] = ROUTE_LABELS[pathname] ?? ['', 'Page'];
  const initials = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <header style={{
      height: '64px',
      background: 'var(--bg-canvas)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '16px',
      position: 'sticky',
      top: 0,
      zIndex: 9,
    }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
        {section && (
          <>
            <span className="text-body-sm" style={{ color: 'var(--text-tertiary)' }}>{section}</span>
            <span style={{ color: 'var(--border-strong)', fontSize: '12px' }}>/</span>
          </>
        )}
        <span className="text-body-sm" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{page}</span>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', width: '240px', flexShrink: 0 }}>
        <Search size={14} style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-tertiary)', pointerEvents: 'none',
        }} strokeWidth={1.75} />
        <input
          id="topbar-search"
          className="input"
          placeholder="Search…"
          style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
          readOnly
        />
      </div>

      {/* Notification bell (placeholder) */}
      <button
        id="btn-notifications"
        style={{
          width: '36px', height: '36px',
          background: 'var(--bg-surface-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
          color: 'var(--text-tertiary)',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        aria-label="Notifications"
      >
        <Bell size={15} strokeWidth={1.75} />
      </button>

      {/* User avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{
          width: '32px', height: '32px',
          background: 'var(--bg-surface-raised)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-full)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
        }}>
          {initials}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="text-body-sm" style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.2 }}>
            {displayName || 'User'}
          </span>
          <span className="text-caption" style={{ color: 'var(--text-tertiary)', lineHeight: 1.2 }}>
            {role === 'mentor' ? 'Mentor' : 'Student'}
          </span>
        </div>
      </div>

    </header>
  );
}
