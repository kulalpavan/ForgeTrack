import { useState, useEffect } from 'react';
import { Search, User, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function History() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const [studentData, setStudentData] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // 1. Fetch active students on mount
  useEffect(() => {
    async function loadStudents() {
      try {
        const data = await api.getStudents();
        setStudents(data || []);
      } catch (err) {
        console.error('Failed to load students', err);
      } finally {
        setLoadingList(false);
      }
    }
    loadStudents();
  }, []);

  // 2. Fetch history when selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentData(null);
      return;
    }

    async function loadHistory() {
      setLoadingData(true);
      try {
        const { student, attendance } = await api.getAnyStudentHistory(selectedStudentId);
        const allSessions = await api.getSessions();

        const attMap = {};
        let presentCount = 0;
        let totalCount = attendance?.length || 0;

        if (attendance) {
          attendance.forEach(a => {
            if (a.sessionId && a.sessionId._id) {
              attMap[a.sessionId._id] = a.present;
            }
            if (a.present) presentCount++;
          });
        }

        const overallPct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

        // Merge sessions with attendance state
        const historyList = (allSessions || []).map(ses => {
          const present = attMap[ses._id];
          return {
            ...ses,
            status: present === undefined ? 'unmarked' : present ? 'present' : 'absent'
          };
        });

        setStudentData({
          profile: student,
          overallPct,
          presentCount,
          totalCount,
          historyList
        });

      } catch (err) {
        console.error('Failed to load student history', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadHistory();
  }, [selectedStudentId]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <p className="text-label text-tertiary" style={{ marginBottom: 'var(--space-2)' }}>ACTIVITY</p>
        <h1 className="text-h1 text-primary">Student History</h1>
        <p className="text-body text-secondary" style={{ marginTop: '8px' }}>
          View detailed attendance records and statistics for individual students.
        </p>
      </div>

      {/* Selector */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Search size={18} className="text-tertiary" />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label" style={{ display: 'none' }}>Select Student</label>
          {loadingList ? (
            <p className="text-body text-secondary">Loading students...</p>
          ) : (
            <select 
              className="input" 
              value={selectedStudentId} 
              onChange={e => setSelectedStudentId(e.target.value)}
              style={{ height: '48px', fontSize: '15px' }}
            >
              <option value="">-- Select a Student --</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.usn})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!selectedStudentId ? (
        <div style={{ 
          padding: '64px', textAlign: 'center', background: 'var(--bg-surface)', 
          borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border-default)' 
        }}>
          <User size={48} className="text-tertiary" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3 className="text-h2 text-secondary">No Student Selected</h3>
          <p className="text-body text-tertiary" style={{ marginTop: '8px' }}>Search and select a student above to view their history.</p>
        </div>
      ) : loadingData ? (
        <div style={{ padding: '64px', textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent-glow)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      ) : studentData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Col: Profile & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ 
                width: '80px', height: '80px', background: 'var(--bg-surface-raised)', 
                borderRadius: '50%', margin: '0 auto 16px', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-default)'
              }}>
                <span className="text-h1 text-primary">{studentData.profile.name.charAt(0)}</span>
              </div>
              <h2 className="text-h2 text-primary">{studentData.profile.name}</h2>
              <p className="text-body-sm text-tertiary" style={{ marginTop: '4px' }}>{studentData.profile.usn}</p>
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                <span className="pill" style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: '11px' }}>
                  {studentData.profile.branchCode}
                </span>
                <span className="pill" style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: '11px' }}>
                  {studentData.profile.batch}
                </span>
              </div>
            </div>

            <div className="card">
              <p className="text-label text-tertiary" style={{ marginBottom: '16px' }}>ATTENDANCE OVERVIEW</p>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                <span className={`text-display-md ${studentData.overallPct >= 75 ? 'text-success' : 'text-danger'}`}>
                  {studentData.overallPct}%
                </span>
              </div>
              
              <div style={{ height: '6px', background: 'var(--bg-surface-inset)', borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${studentData.overallPct}%`, 
                  background: studentData.overallPct >= 75 ? 'var(--success-fg)' : 'var(--danger-fg)' 
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p className="text-body-sm text-secondary">Present: <span className="text-primary font-medium">{studentData.presentCount}</span></p>
                <p className="text-body-sm text-secondary">Total: <span className="text-primary font-medium">{studentData.totalCount}</span></p>
              </div>

              {studentData.overallPct < 75 && studentData.totalCount > 0 && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-border)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertCircle size={16} className="text-danger" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p className="text-caption text-danger">Attendance is below 75% minimum requirement.</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Col: Heatmap & Session List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Heatmap Card */}
            <div className="card">
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <h3 className="text-h3 text-primary">Attendance Heatmap</h3>
                <p className="text-caption text-secondary">Visualizing presence over recent sessions.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
                {studentData.historyList.slice(0, 30).map((ses, i) => (
                  <div 
                    key={i}
                    title={`${formatDate(ses.date)}: ${ses.status === 'present' ? 'Present' : ses.status === 'absent' ? 'Absent' : 'No Class'}`}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: 'var(--radius-md)',
                      background: ses.status === 'present' ? 'var(--success-bg)' : ses.status === 'absent' ? 'var(--danger-bg)' : 'var(--bg-surface-inset)',
                      border: ses.status === 'present' ? '1px solid var(--success-border)' : ses.status === 'absent' ? '1px solid var(--danger-border)' : 'none',
                      transition: 'transform 0.1s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
                {studentData.historyList.length < 30 && [...Array(30 - studentData.historyList.length)].map((_, i) => (
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
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--bg-surface-inset)', border: 'none' }} />
                  <span className="text-micro text-tertiary">No Class</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-raised)' }}>
                <h3 className="text-h3 text-primary">Session History</h3>
              </div>
            
            {studentData.historyList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p className="text-body text-secondary">No sessions recorded yet.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 24px' }} className="text-label text-tertiary">DATE</th>
                    <th style={{ padding: '12px 24px' }} className="text-label text-tertiary">TOPIC</th>
                    <th style={{ padding: '12px 24px', textAlign: 'right' }} className="text-label text-tertiary">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {studentData.historyList.map(ses => (
                    <tr key={ses._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={14} className="text-tertiary" />
                          <span className="text-body-sm text-secondary">
                            {formatDate(ses.date)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span className="text-body font-medium text-primary">{ses.topic}</span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        {ses.status === 'present' && (
                          <span className="pill pill-success">Present</span>
                        )}
                        {ses.status === 'absent' && (
                          <span className="pill pill-danger">Absent</span>
                        )}
                        {ses.status === 'unmarked' && (
                          <span className="pill" style={{ background: 'var(--bg-surface-inset)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>No Class</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </div>

        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
