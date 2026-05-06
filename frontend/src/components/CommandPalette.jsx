import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, CheckSquare, Users, BookOpen, Upload, Settings, X, Command } from 'lucide-react';

const ACTIONS = [
  { id: 'dash',  label: 'Go to Dashboard', icon: LayoutDashboard, to: '/dashboard', roles: ['mentor'] },
  { id: 'mark',  label: 'Mark Attendance', icon: CheckSquare,     to: '/attendance', roles: ['mentor'] },
  { id: 'hist',  label: 'Student History', icon: Users,           to: '/history',    roles: ['mentor'] },
  { id: 'mats',  label: 'Materials Library', icon: BookOpen,      to: '/materials',  roles: ['mentor', 'student'] },
  { id: 'upload', label: 'Upload CSV',      icon: Upload,        to: '/upload',     roles: ['mentor'] },
  { id: 'set',   label: 'Settings',         icon: Settings,      to: '/settings',   roles: ['mentor', 'student'] },
];

export default function CommandPalette({ role }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filtered = ACTIONS.filter(a => 
    a.roles.includes(role) && 
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const runAction = useCallback((action) => {
    navigate(action.to);
    close();
  }, [navigate, close]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    const handleKeys = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) runAction(filtered[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [open, filtered, selectedIndex, runAction]);

  if (!open) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', zIndex: 10000 }}>
      <div className="card" style={{ 
        width: '100%', maxWidth: '600px', padding: 0, overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5), var(--shadow-raised)',
        border: '1px solid var(--border-strong)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={20} className="text-tertiary" style={{ marginRight: '12px' }} />
          <input 
            autoFocus
            className="text-body-lg"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            style={{ 
              background: 'none', border: 'none', color: 'var(--text-primary)', 
              width: '100%', outline: 'none' 
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-surface-inset)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <span className="text-micro text-tertiary">ESC</span>
          </div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <p className="text-body text-tertiary">No results found for "{query}"</p>
            </div>
          ) : (
            filtered.map((action, i) => (
              <button
                key={action.id}
                onClick={() => runAction(action)}
                onMouseEnter={() => setSelectedIndex(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                  padding: '12px 16px', borderRadius: 'var(--radius-md)', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                  background: i === selectedIndex ? 'var(--bg-surface-raised)' : 'transparent',
                  color: i === selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                <action.icon size={18} strokeWidth={1.75} />
                <span className="text-body" style={{ flex: 1 }}>{action.label}</span>
                {i === selectedIndex && <Command size={14} className="text-tertiary" />}
              </button>
            ))
          )}
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--bg-surface-inset)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'flex', padding: '2px 4px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '10px' }}>↑↓</span>
              <span className="text-caption text-tertiary">Navigate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'flex', padding: '2px 4px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '10px' }}>Enter</span>
              <span className="text-caption text-tertiary">Select</span>
            </div>
          </div>
          <p className="text-caption text-tertiary">Quick Actions</p>
        </div>
      </div>
    </div>
  );
}
