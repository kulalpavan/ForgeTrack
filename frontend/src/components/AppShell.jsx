import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { api } from '../lib/api';

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Sidebar 
        role={role} 
        displayName={displayName} 
        collapsed={collapsed} 
        onCollapse={() => setCollapsed(!collapsed)} 
      />
      
      {/* app-main applies the cosmic glow + dot-grid background per design system §6 */}
      <main className="app-main" style={{ 
        flex: 1, 
        padding: '32px 40px', 
        overflowY: 'auto',
        transition: 'padding 0.25s ease',
        minHeight: '100vh',
      }}>
        <Outlet context={{ role, displayName, studentId, user }} />
      </main>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
