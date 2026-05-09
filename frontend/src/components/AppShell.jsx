import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import { api } from '../lib/api';
import { LayoutDashboard, CheckSquare, BookOpen, UserCheck, Calendar, Settings, Command } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

export default function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('forgeToken');
      if (!token) {
        if (!['/login', '/403', '/dev-tokens'].includes(location.pathname)) {
          navigate('/login');
        }
        setLoading(false);
        return;
      }

      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch (err) {
        console.error('Auth error:', err);
        api.logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-void)' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent-glow)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const role = user?.role || 'student';
  const displayName = user?.displayName || user?.email || '';
  const studentId = user?.studentId?._id || user?.studentId || null;

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', overflow: 'hidden', background: 'var(--bg-void)' }}>
      {!isMobile && (
        <Sidebar 
          role={role} 
          displayName={displayName} 
          collapsed={collapsed} 
          onCollapse={() => setCollapsed(!collapsed)} 
        />
      )}
      
      <CommandPalette role={role} />

      <main className="app-main" style={{ 
        flex: 1, 
        padding: isMobile ? '24px 20px 100px 20px' : '32px 40px', 
        overflowY: 'auto',
        height: '100%'
      }}>
        <Outlet context={{ role, displayName, studentId, user }} />
      </main>

      {isMobile && <BottomNav role={role} />}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function BottomNav({ role }) {
  const MENTOR_ITEMS = [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dash' },
    { to: '/attendance', icon: CheckSquare,     label: 'Mark' },
    { to: '/history',    icon: BookOpen,        label: 'Hist' }, // Using BookOpen for history space
    { to: '/materials',  icon: BookOpen,        label: 'Mats' },
    { to: '/settings',   icon: Settings,        label: 'Set' },
  ];

  const STUDENT_ITEMS = [
    { to: '/me/attendance', icon: UserCheck,  label: 'Att' },
    { to: '/me/upcoming',   icon: Calendar,   label: 'Up' },
    { to: '/me/materials',  icon: BookOpen,   label: 'Mats' },
    { to: '/me/settings',   icon: Settings,   label: 'Set' },
  ];

  const { theme, toggleTheme } = useTheme();
  const items = role === 'mentor' ? MENTOR_ITEMS : STUDENT_ITEMS;

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--bg-canvas)', borderTop: '1px solid var(--border-subtle)',
      display: 'flex', justifyContent: 'space-around', padding: '12px 8px',
      zIndex: 100, backdropFilter: 'blur(12px)'
    }}>
      {items.map(item => (
        <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          textDecoration: 'none', color: isActive ? 'var(--accent-glow)' : 'var(--text-tertiary)',
          transition: 'color 0.2s'
        })}>
          <item.icon size={20} />
          <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
