import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, CheckCircle, Clock, Filter, Download, Loader, Zap } from 'lucide-react';
import { api } from '../lib/api';

export default function StudentAttendance() {
  const { displayName, studentId } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, total: 0, percentage: 0, streak: 0 });
  const [sessions, setSessions] = useState([]);
  const [heatmap, setHeatmap] = useState([]);

  useEffect(() => {
    if (!studentId) return;

    async function loadData() {
      try {
        // 1. Fetch all attendance joined with sessions
        const att = await api.getStudentHistory();

        if (att && att.length > 0) {
          const presentCount = att.filter(a => a.present).length;
          const totalCount = att.length;
          const percentage = Math.round((presentCount / totalCount) * 100);

          // Streak: count consecutive present sessions from most recent
          let streak = 0;
          for (const a of att) {  // att is sorted desc (most recent first from API)
            if (a.present) streak++;
            else break;
          }

          setStats({ present: presentCount, total: totalCount, percentage, streak });
          
          // Map sessions for table
          const mappedSessions = att.map(a => ({
            date: a.sessionId ? new Date(a.sessionId.date).toLocaleDateString() : '—',
            topic: a.sessionId ? a.sessionId.topic : 'Unknown Session',
            status: a.present ? 'present' : 'absent',
            duration: '—'
          }));
          setSessions(mappedSessions);

          // Heatmap
          setHeatmap(att.slice(0, 35).reverse());
        }
      } catch (err) {
        console.error('Error loading student attendance:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <Loader size={32} className="text-tertiary" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header — text-display-hero per design system §11.7 */}
      <div style={{ marginBottom: 'var(--space-12)' }}>
        <p className="text-label text-tertiary" style={{ marginBottom: 'var(--space-2)' }}>STUDENT PORTAL</p>
        <h1 className="text-display-hero text-primary" style={
          stats.percentage >= 75
            ? { color: 'var(--success-fg)' }
            : stats.percentage >= 60
            ? { color: 'var(--warning-fg)' }
            : { color: 'var(--danger-fg)' }
        }>{stats.percentage}%</h1>
        <p className="text-body-lg text-secondary" style={{ marginTop: 'var(--space-2)' }}>
          Overall attendance for <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{displayName}</span>.{' '}
          You've attended <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{stats.present}</span> out of <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{stats.total}</span> sessions.
        </p>
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-12)' }}>
        <div className="card-hero" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <TrendingUp size={20} className={stats.percentage >= 75 ? "text-success" : "text-danger"} />
            <p className="text-label text-tertiary">CURRENT STATUS</p>
          </div>
          <h2 className={`text-display-sm ${stats.percentage >= 75 ? "text-success" : "text-danger"}`}>
            {stats.percentage >= 75 ? "Good Standing" : "Needs Attention"}
          </h2>
          <p className="text-body-sm text-secondary" style={{ marginTop: 'var(--space-2)' }}>
            {stats.percentage >= 75 ? "You are above the 75% threshold." : "You are below the minimum attendance requirement."}
          </p>
        </div>

        <div className="card-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <CheckCircle size={20} className="text-accent" />
            <p className="text-label text-tertiary">SESSIONS ATTENDED</p>
          </div>
          <h2 className="text-display-sm text-primary">{stats.present} <span className="text-h3 text-tertiary">/ {stats.total}</span></h2>
          <div style={{ height: '6px', background: 'var(--bg-surface-inset)', borderRadius: 'var(--radius-full)', marginTop: 'var(--space-4)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.percentage}%`, background: 'var(--accent-glow)' }} />
          </div>
        </div>

        <div className="card-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Clock size={20} className="text-warning" />
            <p className="text-label text-tertiary">CURRENT STREAK</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="text-display-sm text-primary">{stats.streak} <span className="text-h3 text-tertiary">Sessions</span></h2>
            {stats.streak > 0 && (
              <div style={{ 
                padding: '8px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', animation: 'streak-pulse 2s infinite'
              }}>
                <Zap size={20} fill="#EF4444" color="#EF4444" />
              </div>
            )}
          </div>
          <p className="text-body-sm text-secondary" style={{ marginTop: 'var(--space-2)' }}>
            {stats.streak >= 3 ? "You're on fire! 🔥" : "Keep it up! Consistency is key."}
          </p>
        </div>
      </div>

      {/* Heatmap & History */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-8)' }}>
        {/* Left: Heatmap */}
        <div>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 className="text-h3 text-primary">Attendance Heatmap</h3>
            <p className="text-caption text-secondary">Visualizing your presence over recent sessions.</p>
          </div>
          
          <div className="card" style={{ padding: 'var(--space-6)' }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {/* Visual grid based on real data */}
                {heatmap.map((a, i) => (
                  <div 
                    key={i}
                    title={a.sessionId ? `${new Date(a.sessionId.date).toLocaleDateString()}: ${a.present ? 'Present' : 'Absent'}` : 'Missing Session Info'}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: 'var(--radius-md)',
                      background: a.present ? 'var(--success-bg)' : 'var(--danger-bg)',
                      border: a.present ? '1px solid var(--success-border)' : '1px solid var(--danger-border)',
                      transition: 'transform 0.1s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
                {/* Padding with empty cells if less than 35 */}
                {heatmap.length < 35 && [...Array(35 - heatmap.length)].map((_, i) => (
                   <div key={`empty-${i}`} style={{ aspectRatio: '1/1', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-inset)', border: '1px solid var(--border-subtle)' }} />
                ))}
             </div>
             <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-6)', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--success-bg)', border: '1px solid var(--success-border)' }} />
                  <span className="text-micro text-tertiary">Present</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }} />
                  <span className="text-micro text-tertiary">Absent</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--bg-surface-inset)', border: '1px solid var(--border-subtle)' }} />
                  <span className="text-micro text-tertiary">Empty</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right: Detailed Table */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <div>
              <h3 className="text-h3 text-primary">Session History</h3>
              <p className="text-caption text-secondary">A detailed log of all sessions conducted.</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn-secondary" style={{ padding: '8px 12px' }}>
                <Filter size={16} />
              </button>
              <button className="btn-secondary" style={{ padding: '8px 12px' }}>
                <Download size={16} />
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>TOPIC</th>
                  <th>DURATION</th>
                  <th style={{ textAlign: 'right' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>No sessions found.</td>
                  </tr>
                ) : sessions.map((session, i) => (
                  <tr key={i}>
                    <td className="text-mono text-body-sm">{session.date}</td>
                    <td className="text-primary" style={{ fontWeight: '500' }}>{session.topic}</td>
                    <td className="text-secondary text-body-sm">{session.duration}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`pill ${session.status === 'present' ? 'pill-success' : 'pill-danger'}`}>
                        {session.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes streak-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
