import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, XCircle, Clock, BookOpen, TrendingUp, Calendar, Loader } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function StudentDashboard() {
  const { displayName } = useOutletContext();
  const [stats, setStats] = useState({ present: 0, total: 0, percentage: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const attendance = await api.getStudentHistory();

        if (attendance) {
          const present = attendance.filter(a => a.present).length;
          const total = attendance.length;
          const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
          setStats({ present, total, percentage });

          // Sort and take last 5
          const sorted = attendance
            .sort((a, b) => new Date(b.sessionId.date) - new Date(a.sessionId.date))
            .slice(0, 5);
          setRecentSessions(sorted);
        }
      } catch (err) {
        console.error('Error loading student dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [displayName]);

  if (loading) {
    return <div className="text-secondary">Loading your dashboard...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <p className="text-label text-tertiary" style={{ marginBottom: '8px' }}>STUDENT PORTAL</p>
        <h1 className="text-display-md text-primary">Hello, {displayName}</h1>
        <p className="text-body text-secondary" style={{ marginTop: '8px' }}>
          Track your progress and access bootcamp materials.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Stat Card 1: Attendance Percentage */}
        <div className="card-hero" style={{ background: 'var(--bg-surface-raised)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={20} className="text-accent" />
            <p className="text-label text-tertiary">OVERALL ATTENDANCE</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h2 className={`text-display-lg ${stats.percentage >= 75 ? 'text-success' : 'text-danger'}`}>
              {stats.percentage}%
            </h2>
          </div>
          <div style={{ height: '6px', background: 'var(--bg-surface-inset)', borderRadius: 'var(--radius-full)', marginTop: '16px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${stats.percentage}%`, 
              background: stats.percentage >= 75 ? 'var(--success-fg)' : 'var(--danger-fg)',
              transition: 'width 1s ease-out'
            }} />
          </div>
          <p className="text-caption text-tertiary" style={{ marginTop: '12px' }}>
            {stats.percentage >= 75 ? 'Good standing.' : 'Below 75% requirement!'}
          </p>
        </div>

        {/* Stat Card 2: Presence Count */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckCircle size={20} className="text-success" />
            <p className="text-label text-tertiary">SESSIONS ATTENDED</p>
          </div>
          <h2 className="text-display-md text-primary">{stats.present} <span className="text-h3 text-tertiary">/ {stats.total}</span></h2>
          <p className="text-body-sm text-secondary" style={{ marginTop: '8px' }}>
            Total sessions conducted to date.
          </p>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Recent Attendance Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-raised)' }}>
            <h3 className="text-h3 text-primary">Recent Sessions</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '12px 24px' }} className="text-label text-tertiary">DATE</th>
                <th style={{ padding: '12px 24px' }} className="text-label text-tertiary">TOPIC</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }} className="text-label text-tertiary">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((rs, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} className="text-tertiary" />
                      <span className="text-body-sm text-secondary">
                        {formatDate(rs.sessionId.date)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span className="text-body-sm font-medium text-primary">{rs.sessionId.topic}</span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    {rs.present ? (
                      <span className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success-fg)', border: '1px solid var(--success-border)' }}>Present</span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger-fg)', border: '1px solid var(--danger-border)' }}>Absent</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentSessions.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ padding: '32px', textAlign: 'center' }} className="text-body text-tertiary">
                    No session data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Links / Resources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ border: '1px solid var(--accent-glow-soft)', background: 'linear-gradient(to bottom right, var(--bg-surface), rgba(99,102,241,0.05))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BookOpen size={20} className="text-accent" />
              <h3 className="text-h3 text-primary">Study Materials</h3>
            </div>
            <p className="text-body-sm text-secondary" style={{ marginBottom: '20px' }}>
              Access recordings and slides from previous sessions.
            </p>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => window.location.href = '/me/materials'}>
              View Library
            </button>
          </div>
          
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock size={20} className="text-tertiary" />
              <h3 className="text-h3 text-primary">Support</h3>
            </div>
            <p className="text-body-sm text-secondary">
              Need to report a correction in your attendance? Contact your mentor.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
