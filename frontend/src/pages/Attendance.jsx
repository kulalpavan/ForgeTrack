import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, CheckSquare, Users, Save, AlertCircle, Loader } from 'lucide-react';
import { api } from '../lib/api';

function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export default function Attendance() {
  const { displayName } = useOutletContext();
  const [date, setDate] = useState(getTodayString());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Data state
  const [students, setStudents] = useState([]);
  const [session, setSession] = useState(null);
  
  // Form state
  const [topic, setTopic] = useState('');
  const [sessionType, setSessionType] = useState('offline');
  const [duration, setDuration] = useState('2.0');
  
  // Attendance state: Map of studentId -> boolean
  const [attendanceState, setAttendanceState] = useState({});
  const [hasExistingAttendance, setHasExistingAttendance] = useState(false);

  useEffect(() => {
    loadData(date);
  }, [date]);

  async function loadData(targetDate) {
    setLoading(true);
    setMessage('');
    try {
      // 1. Fetch active students
      const stds = await api.getStudents();
      setStudents(stds || []);

      // 2. Fetch session for date
      const sessions = await api.getSessions();
      const ses = sessions.find(s => s.date.split('T')[0] === targetDate);
      setSession(ses);

      // 3. Setup default state
      const newState = {};
      stds?.forEach(s => newState[s._id] = true); // default to present

      if (ses) {
        // If session exists, fetch attendance
        const att = await api.getAttendance(ses._id);
          
        if (att && att.length > 0) {
          setHasExistingAttendance(true);
          att.forEach(a => {
            newState[a.studentId] = a.present;
          });
        } else {
          setHasExistingAttendance(false);
        }
      } else {
        setHasExistingAttendance(false);
        setTopic('');
      }

      setAttendanceState(newState);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  function toggleAttendance(studentId) {
    setAttendanceState(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      let currentSessionId = session?._id;

      // 1. Create session if it doesn't exist
      if (!currentSessionId) {
        if (!topic.trim()) {
          setMessage('Topic is required for a new session.');
          setSaving(false);
          return;
        }

        const newSes = await api.fetch('/sessions', {
          method: 'POST',
          body: JSON.stringify({
            date,
            topic: topic.trim(),
            monthNumber: new Date(date).getMonth() + 1,
            sessionType,
            duration: Number(duration)
          })
        });
        currentSessionId = newSes._id;
        setSession(newSes);
      }

      // 2. Upsert attendance
      // Note: Backend currently handles single upsert. We'll loop or update backend.
      // Let's loop for now to avoid server.js rewrite until later.
      for (const studentId of Object.keys(attendanceState)) {
        await api.upsertAttendance({
          studentId,
          sessionId: currentSessionId,
          present: attendanceState[studentId]
        });
      }

      setMessage('Attendance saved successfully!');
      setHasExistingAttendance(true);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error saving attendance: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const presentCount = Object.values(attendanceState).filter(Boolean).length;
  const totalCount = students.length;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p className="text-label text-tertiary" style={{ marginBottom: 'var(--space-2)' }}>ACTIVITY</p>
        <h1 className="text-h1 text-primary">Mark Attendance</h1>
        <p className="text-body text-secondary" style={{ marginTop: '8px' }}>
          Select a date, configure the session, and mark students present or absent.
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div style={{
          padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px',
          background: message.includes('success') ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${message.includes('success') ? 'var(--success-border)' : 'var(--danger-border)'}`,
          color: message.includes('success') ? 'var(--success-fg)' : 'var(--danger-fg)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <AlertCircle size={18} />
          <p className="text-body-sm font-medium">{message}</p>
        </div>
      )}

      {/* Date & Session Config */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Date Picker */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label className="label">Session Date</label>
            <input 
              type="date" 
              className="input" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              max={getTodayString()}
              min="2025-08-04"
            />
          </div>

          {/* Session Details */}
          {loading ? (
            <div style={{ flex: '2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader className="text-tertiary" size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : session ? (
           <div style={{ flex: '2', minWidth: '300px' }}>
               <label className="label">Session Topic</label>
               <input className="input" value={session.topic} disabled style={{ background: 'var(--bg-surface-inset)' }} />
               <p className="text-caption text-tertiary" style={{ marginTop: '8px' }}>
                 {session.duration_hours || session.duration || '2.0'} hours • {(session.session_type || session.sessionType || 'offline').toUpperCase()}
               </p>
             </div>
          ) : (
            <div style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">New Session Topic <span className="text-danger">*</span></label>
                <input 
                  className="input" 
                  placeholder="e.g. LangChain Fundamentals" 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)} 
                />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Type</label>
                  <select className="input" value={sessionType} onChange={e => setSessionType(e.target.value)}>
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Duration (hrs)</label>
                  <input className="input" type="number" step="0.5" value={duration} onChange={e => setDuration(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface-raised)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} className="text-tertiary" />
            <h2 className="text-h3 text-primary">Student Roster</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', marginRight: '16px' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px 10px', fontSize: '11px', height: '28px' }}
                onClick={() => {
                  const newState = {};
                  students.forEach(s => newState[s._id] = true);
                  setAttendanceState(newState);
                }}
              >
                All Present
              </button>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px 10px', fontSize: '11px', height: '28px' }}
                onClick={() => {
                  const newState = {};
                  students.forEach(s => newState[s._id] = false);
                  setAttendanceState(newState);
                }}
              >
                All Absent
              </button>
            </div>
            <span className="text-body-sm text-secondary">
              {presentCount} of {totalCount} Present
            </span>
            <div style={{ width: '100px', height: '6px', background: 'var(--bg-surface-inset)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: totalCount ? `${(presentCount / totalCount) * 100}%` : '0%', 
                background: 'var(--success-fg)', 
                transition: 'width 0.3s' 
              }} />
            </div>
          </div>
        </div>

        {loading ? (
           <div style={{ padding: '40px', textAlign: 'center' }}>
             <Loader className="text-tertiary" size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
             <p className="text-body text-secondary">Loading roster...</p>
           </div>
        ) : students.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
             <p className="text-body text-secondary">No active students found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {students.map((s, i) => (
              <div 
                key={s._id} 
                onClick={() => toggleAttendance(s._id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '16px 24px',
                  borderBottom: i < students.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-inset)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1 }}>
                  <p className="text-body font-medium text-primary">{s.name}</p>
                  <p className="text-caption text-tertiary">{s.usn}</p>
                </div>
                
                {/* Custom Checkbox Pill */}
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${attendanceState[s._id] ? 'var(--success-border)' : 'var(--danger-border)'}`,
                  background: attendanceState[s._id] ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: attendanceState[s._id] ? 'var(--success-fg)' : 'var(--danger-fg)',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: '90px',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}>
                  {attendanceState[s._id] ? 'Present' : 'Absent'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div style={{ 
        marginTop: '32px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-raised)'
      }}>
        <div>
          {hasExistingAttendance && (
            <p className="text-body-sm text-warning" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} /> Modifying existing attendance
            </p>
          )}
        </div>
        <button 
          className="btn-primary" 
          onClick={handleSave} 
          disabled={loading || saving}
          style={{ minWidth: '160px', justifyContent: 'center' }}
        >
          {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
          Save Attendance
        </button>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
