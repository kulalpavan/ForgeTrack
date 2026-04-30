import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Users, Calendar, CheckSquare, Clock, Zap, Upload } from 'lucide-react';
import { api } from '../lib/api';

function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/* ── Skeletons ── */
const SkeletonLine = ({ width = '100%', height = '14px', mb = '0' }) => (
  <div style={{ width, height, marginBottom: mb, background: 'var(--bg-surface-inset)', borderRadius: '4px', animation: 'pulse 2s infinite' }} />
);

/* ────────────────────────────────────────────────────────────
   Dashboard — Mentor Home
   ──────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { displayName } = useOutletContext();
  
  return (
    <div>
      {/* Hero — text-display-hero per design system §11.2 */}
      <div style={{ marginBottom: '12px' }}>
        <p className="text-label text-tertiary" style={{ marginBottom: 'var(--space-3)' }}>OVERVIEW</p>
        <h1 className="text-display-hero text-primary">Welcome Back, {displayName.split(' ')[0]}</h1>
        <p className="text-body-sm text-secondary" style={{ marginTop: 'var(--space-2)', letterSpacing: 0 }}>
          Here is your program overview for today.
        </p>
      </div>

      <StatStrip />

      {/* Top Row: 2-up Hero Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginTop: '32px' }}>
        <TodaysSessionCard />
        <TodaysAttendanceCard />
      </div>

      {/* Bottom Row: 2-up Secondary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginTop: '24px' }}>
        <RecentActivityCard />
        <ProgramOverviewCard />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/* ── Stat Strip ── */
function StatStrip() {
  const [stats, setStats] = useState({ totalSessions: '—', avgAttendance: '—', activeStudents: '—', lastSession: '—' });

  useEffect(() => {
    async function load() {
      try {
        const overview = await api.getStats();
        const sessions = await api.getSessions();
        
        let lastDate = '—';
        if (sessions.length > 0) {
          const d = new Date(sessions[0].date);
          lastDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        setStats({
          totalSessions: overview.totalSessions,
          activeStudents: overview.totalStudents,
          avgAttendance: `${overview.avgAttendance}%`,
          lastSession: lastDate
        });
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  return (
    <div style={{
      display: 'flex', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-card)', overflowX: 'auto', marginTop: '24px',
    }}>
      {[
        { icon: <Calendar size={16} />, label: 'Total Sessions', value: stats.totalSessions },
        { icon: <TrendingUp size={16} />, label: 'Overall Attendance', value: stats.avgAttendance },
        { icon: <Users size={16} />, label: 'Active Students', value: stats.activeStudents },
        { icon: <Clock size={16} />, label: 'Last Session', value: stats.lastSession },
      ].map((item, i, arr) => (
        <div key={i} style={{
          flex: '1', minWidth: '140px', padding: '20px 24px',
          borderRight: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>{item.icon}</span>
            <span className="text-caption text-tertiary">{item.label}</span>
          </div>
          <span className="text-body-lg text-primary" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Card 1: Today's Session ── */
function TodaysSessionCard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const today = getTodayString();
      const sessions = await api.getSessions();
      const found = sessions.find(s => s.date.split('T')[0] === today);
      setSession(found);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="card-hero" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ color: 'var(--accent-glow)' }}><Calendar size={20} /></span>
        <p className="text-label text-tertiary">TODAY'S SESSION</p>
      </div>

      {loading ? (
        <div style={{ flex: 1 }}>
          <SkeletonLine height="32px" width="80%" mb="12px" />
          <SkeletonLine width="60%" />
        </div>
      ) : session ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 className="text-display-sm text-primary" style={{ marginBottom: '8px' }}>{session.topic}</h2>
          <p className="text-body text-secondary" style={{ marginBottom: '24px' }}>
            {new Date(session.date).toLocaleDateString()}
          </p>
          <div style={{ marginTop: 'auto' }}>
            <button className="btn-primary" onClick={() => navigate('/attendance')}>
              Mark Attendance
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 className="text-display-sm text-primary" style={{ marginBottom: '8px' }}>No session today</h2>
          <p className="text-body text-secondary" style={{ marginBottom: '24px' }}>There is no session scheduled for today.</p>
          <div style={{ marginTop: 'auto' }}>
            <button className="btn-secondary" onClick={() => navigate('/attendance')}>
              Create Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Card 2: Today's Attendance ── */
function TodaysAttendanceCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const today = getTodayString();
      const sessions = await api.getSessions();
      const session = sessions.find(s => s.date.split('T')[0] === today);
      
      if (!session) {
        setData(null);
        setLoading(false);
        return;
      }
      
      const att = await api.getAttendance(session._id);
      
      if (!att || att.length === 0) {
        setData({ count: 0, total: 0, absentNames: [] });
      } else {
        const present = att.filter(a => a.present).length;
        const total = att.length;
        setData({ count: present, total, absentNames: [] });
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="card-hero" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ color: 'var(--accent-glow)' }}><CheckSquare size={20} /></span>
        <p className="text-label text-tertiary">TODAY'S ATTENDANCE</p>
      </div>

      {loading ? (
        <div style={{ flex: 1 }}>
          <SkeletonLine height="48px" width="40%" mb="16px" />
          <SkeletonLine height="8px" mb="16px" />
          <SkeletonLine width="70%" />
        </div>
      ) : !data ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 className="text-display-sm text-primary" style={{ marginBottom: '8px' }}>—</h2>
          <p className="text-body text-secondary" style={{ marginBottom: '24px' }}>No session exists for today.</p>
        </div>
      ) : data.total === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 className="text-display-sm text-primary" style={{ marginBottom: '8px' }}>Not yet marked</h2>
          <p className="text-body text-secondary" style={{ marginBottom: '24px' }}>Attendance hasn't been recorded for today's session.</p>
          <div style={{ marginTop: 'auto' }}>
            <button className="btn-primary" onClick={() => navigate('/attendance')}>
              Mark Now
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span className="text-display-md text-success">{Math.round((data.count / data.total) * 100)}%</span>
            <span className="text-body text-secondary">{data.count} of {data.total} present</span>
          </div>

          <div style={{ height: '4px', background: 'var(--bg-surface-inset)', borderRadius: '999px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ height: '100%', width: `${(data.count / data.total) * 100}%`, background: 'var(--success-fg)', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Card 3: Program Overview ── */
function ProgramOverviewCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const overview = await api.getStats();
        setData({ 
          totalSessions: overview.totalSessions, 
          avgAttendance: `${overview.avgAttendance}%`,
          activeMentors: overview.activeMentors
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <span style={{ color: 'var(--accent-glow)' }}><TrendingUp size={20} /></span>
        <p className="text-label text-tertiary">PROGRAM OVERVIEW</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SkeletonLine width="100%" />
          <SkeletonLine width="100%" />
          <SkeletonLine width="100%" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <span className="text-body text-secondary">Total Sessions</span>
            <span className="text-body-lg text-primary">{data?.totalSessions || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <span className="text-body text-secondary">Avg Attendance</span>
            <span className="text-body text-success">{data?.avgAttendance || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-body text-secondary">Active Mentors</span>
            <span className="text-body text-primary">{data?.activeMentors || '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Card 4: Recent Activity ── */
function RecentActivityCard() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const logs = await api.getActivity();
        setActivities(logs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <span style={{ color: 'var(--accent-glow)' }}><Clock size={20} /></span>
        <p className="text-label text-tertiary">RECENT ACTIVITY</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SkeletonLine width="100%" />
          <SkeletonLine width="100%" />
          <SkeletonLine width="100%" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-body text-secondary">No recent activity found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activities.map((act, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
                background: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {act.action.includes('Import') ? <Upload size={14} className="text-tertiary" /> : <Zap size={14} className="text-tertiary" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="text-body text-primary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.details}</p>
                <p className="text-caption text-tertiary">{new Date(act.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
