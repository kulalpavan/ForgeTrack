import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, CheckSquare, Users, Save, AlertCircle, Loader, Search as SearchIcon, ChevronLeft, ChevronRight, Lock, Trash2, Edit3, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, formatMonth } from '../lib/utils';
import { useToast } from '../lib/ToastContext';

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Attendance() {
  const { displayName } = useOutletContext();
  const { showToast } = useToast();
  
  const todayStr = getTodayString();
  const [date, setDate] = useState(todayStr);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(todayStr));
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);
  
  // Data state
  const [students, setStudents] = useState([]);
  const [session, setSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  
  // Form state
  const [topic, setTopic] = useState('');
  const [sessionType, setSessionType] = useState('offline');
  const [duration, setDuration] = useState('2.0');
  
  // Attendance state: Map of studentId -> boolean
  const [attendanceState, setAttendanceState] = useState({});
  const [hasExistingAttendance, setHasExistingAttendance] = useState(false);

  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editTopicValue, setEditTopicValue] = useState('');

  // Derived calendar properties
  const isPast = date < todayStr;
  const isFuture = date > todayStr;
  const isToday = date === todayStr;

  useEffect(() => {
    loadData(date);
  }, [date]);

  useEffect(() => {
    const handleKeys = (e) => {
      if (e.key.toLowerCase() === 's' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  async function loadData(targetDate) {
    setLoading(true);
    try {
      const stds = await api.getStudents();
      setStudents(stds || []);

      const sessions = await api.getSessions();
      setAllSessions(sessions || []);

      const ses = sessions.find(s => s.date.split('T')[0] === targetDate);
      setSession(ses);
      if (ses) {
        setTopic(ses.topic);
        setEditTopicValue(ses.topic);
        setSessionType(ses.session_type || ses.sessionType || 'offline');
        setDuration(String(ses.duration_hours || ses.duration || '2.0'));
      } else {
        setTopic('');
        setEditTopicValue('');
      }
      setIsEditingTopic(false);

      const newState = {};
      stds?.forEach(s => newState[s._id] = true); // Default present if today

      if (ses) {
        const att = await api.getAttendance(ses._id);
        if (att && att.length > 0) {
          setHasExistingAttendance(true);
          att.forEach(a => {
            newState[a.studentId] = a.present;
          });
        } else {
          setHasExistingAttendance(false);
          // If past and no attendance, default to absent so they don't look "Present" magically
          if (targetDate < todayStr) stds?.forEach(s => newState[s._id] = false);
        }
      } else {
        setHasExistingAttendance(false);
        setTopic('');
        if (targetDate < todayStr) stds?.forEach(s => newState[s._id] = false);
      }
      setAttendanceState(newState);
    } catch (err) {
      console.error(err);
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function toggleAttendance(studentId) {
    if (isPast || isFuture) return;
    setAttendanceState(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  function markAll(present) {
    if (isPast || isFuture) return;
    const ns = {};
    students.forEach(s => ns[s._id] = present);
    setAttendanceState(ns);
  }

  async function handleSave() {
    if (isPast || isFuture) return;
    setSaving(true);
    try {
      let currentSessionId = session?._id;
      if (!currentSessionId) {
        if (!topic.trim()) {
          showToast('Topic is required for a new session.', 'warning');
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

      // Build batch payload — single API call instead of N sequential calls
      const records = Object.entries(attendanceState).map(([studentId, present]) => ({
        studentId,
        present
      }));

      await api.batchUpsertAttendance(currentSessionId, records);

      showToast('Attendance saved successfully!', 'success');
      setHasExistingAttendance(true);
      // Reload sessions to update calendar dots
      const sessions = await api.getSessions();
      setAllSessions(sessions || []);
    } catch (err) {
      console.error(err);
      showToast('Error saving attendance: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSessionTopic() {
    if (!editTopicValue.trim() || editTopicValue === session.topic) {
      setIsEditingTopic(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateSession(session._id, { topic: editTopicValue });
      setSession(updated);
      setTopic(updated.topic);
      setIsEditingTopic(false);
      showToast('Session name updated', 'success');
      
      // Update local allSessions list
      const sessions = await api.getSessions();
      setAllSessions(sessions || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to update session name: ' + (err.msg || err.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSession() {
    if (!session) return;
    if (!window.confirm(`Are you sure you want to delete the session "${session.topic}"? This will also delete all attendance records for this session. This action cannot be undone.`)) return;

    setSaving(true);
    try {
      await api.deleteSession(session._id);
      showToast('Session deleted successfully', 'success');
      
      // Reset state
      setSession(null);
      setTopic('');
      setHasExistingAttendance(false);
      
      // Update calendar dots
      const sessions = await api.getSessions();
      setAllSessions(sessions || []);
      
      // Clear attendance selection visually
      const ns = {};
      students.forEach(s => ns[s._id] = false);
      setAttendanceState(ns);
      
    } catch (err) {
      console.error(err);
      showToast('Error deleting session', 'error');
    } finally {
      setSaving(false);
    }
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.usn.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = Object.values(attendanceState).filter(Boolean).length;
  const totalCount = students.length;

  // Calendar rendering logic
  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => i + 1));
  const sessionDates = new Set(allSessions.map(s => s.date.split('T')[0]));

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <div style={{ marginBottom: '32px' }}>
        <p className="text-label text-tertiary" style={{ marginBottom: 'var(--space-2)' }}>ACTIVITY</p>
        <h1 className="text-h1 text-primary">Mark Attendance</h1>
        <p className="text-body text-secondary" style={{ marginTop: '8px' }}>
          Select a date — past sessions are read-only, today is editable, future dates are locked.
        </p>
      </div>

      {/* Calendar Card */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <span className="text-body-lg font-medium text-primary">
            {formatMonth(currentMonth)}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ padding: '6px', height: 'auto' }} onClick={prevMonth}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn-secondary" style={{ padding: '6px', height: 'auto' }} onClick={nextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <div key={d} className="text-micro text-tertiary" style={{ marginBottom: '8px' }}>{d}</div>
          ))}
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            
            const cellDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isCellSelected = cellDateStr === date;
            const isCellToday = cellDateStr === todayStr;
            const hasSession = sessionDates.has(cellDateStr);
            const isCellFuture = cellDateStr > todayStr;
            
            return (
              <div 
                key={`day-${d}`} 
                onClick={() => setDate(cellDateStr)}
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer',
                  padding: '8px 0',
                  opacity: isCellFuture ? 0.3 : 1
                }}
              >
                <div style={{
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: isCellSelected ? (isCellToday ? 'var(--accent-glow)' : 'var(--text-primary)') : (isCellToday ? 'var(--bg-surface-raised)' : 'transparent'),
                  color: isCellSelected ? (isCellToday ? 'var(--text-primary)' : 'var(--bg-void)') : (isCellToday ? 'var(--text-primary)' : 'var(--text-secondary)'),
                  fontWeight: isCellSelected || isCellToday ? '600' : '400',
                  border: isCellToday && !isCellSelected ? '1px solid var(--border-default)' : 'none'
                }}>
                  {d}
                </div>
                {/* Dot */}
                {!isCellFuture && (
                  <div style={{
                    width: '4px', height: '4px', borderRadius: '50%',
                    background: hasSession ? 'var(--success-fg)' : 'var(--text-tertiary)'
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* State Alerts */}
      {isPast && (
        <div style={{ padding: '16px', background: 'var(--bg-surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={18} className="text-tertiary" />
          <span className="text-body-sm text-secondary">Viewing past session — <span className="text-primary font-medium">read-only</span>. Changes are locked.</span>
        </div>
      )}
      {isFuture && (
        <div style={{ padding: '16px', background: 'var(--bg-surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Lock size={18} className="text-warning" />
          <span className="text-body-sm text-secondary">Viewing future date — <span className="text-primary font-medium">locked</span>. You cannot mark attendance yet.</span>
        </div>
      )}

      {/* Inputs block */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px', opacity: isFuture ? 0.5 : 1, pointerEvents: isFuture ? 'none' : 'auto' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <p className="text-micro text-tertiary" style={{ marginBottom: '8px' }}>SESSION DATE</p>
          <div className="input" style={{ background: 'var(--bg-surface-inset)', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
            {formatDate(date)} <Calendar size={14} className="text-tertiary" style={{ marginLeft: 'auto' }} />
          </div>
        </div>

        {loading ? (
          <div style={{ flex: '2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader className="text-tertiary spin" size={24} />
          </div>
        ) : session ? (
          <div style={{ flex: '2', minWidth: '300px' }}>
             <p className="text-micro text-tertiary" style={{ marginBottom: '8px' }}>SESSION TOPIC</p>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditingTopic ? (
                  <>
                    <input 
                      className="input" 
                      value={editTopicValue} 
                      onChange={e => setEditTopicValue(e.target.value)}
                      autoFocus
                    />
                    <button className="btn-primary" style={{ padding: '8px' }} onClick={handleUpdateSessionTopic}>
                      <Check size={18} />
                    </button>
                    <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => { setIsEditingTopic(false); setEditTopicValue(session.topic); }}>
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <input className="input" value={session.topic} disabled style={{ background: 'var(--bg-surface-inset)', flex: 1 }} />
                    <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => setIsEditingTopic(true)}>
                      <Edit3 size={18} className="text-tertiary" />
                    </button>
                  </>
                )}
             </div>
             <p className="text-caption text-tertiary" style={{ marginTop: '8px' }}>
               {session.duration_hours || session.duration || '2.0'} hours • {(session.session_type || session.sessionType || 'offline').toUpperCase()}
             </p>
           </div>
        ) : (
          <div style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <div>
               <p className="text-micro text-accent" style={{ marginBottom: '8px', fontWeight: '600' }}>CREATE NEW SESSION</p>
               <input className="input" placeholder={isPast ? "No session recorded for this past date" : "e.g. LangChain Fundamentals"} value={topic} onChange={e => setTopic(e.target.value)} disabled={isPast} style={{ background: isPast ? 'var(--bg-surface-inset)' : 'var(--bg-canvas)' }} />
             </div>
             {!isPast && (
               <div style={{ display: 'flex', gap: '16px' }}>
                 <div style={{ flex: 1 }}>
                   <p className="text-micro text-tertiary" style={{ marginBottom: '8px' }}>TYPE</p>
                   <select className="input" value={sessionType} onChange={e => setSessionType(e.target.value)}>
                     <option value="offline">Offline</option>
                     <option value="online">Online</option>
                   </select>
                 </div>
                 <div style={{ flex: 1 }}>
                   <p className="text-micro text-tertiary" style={{ marginBottom: '8px' }}>DURATION (HRS)</p>
                   <input className="input" type="number" step="0.5" value={duration} onChange={e => setDuration(e.target.value)} />
                 </div>
               </div>
             )}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', opacity: isFuture ? 0.5 : 1, pointerEvents: isFuture ? 'none' : 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-raised)', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <SearchIcon size={16} className="text-tertiary" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                ref={searchInputRef}
                className="input" 
                placeholder="Search students... (S)" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ height: '36px', paddingLeft: '36px', width: '240px', fontSize: '13px', background: 'var(--bg-canvas)' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', marginRight: '16px' }}>
              <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', height: '28px', opacity: isPast ? 0.5 : 1 }} onClick={() => markAll(true)} disabled={isPast}>All Present</button>
              <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', height: '28px', opacity: isPast ? 0.5 : 1 }} onClick={() => markAll(false)} disabled={isPast}>All Absent</button>
            </div>
            <span className="text-body-sm text-secondary">{presentCount}/{totalCount}</span>
            <div style={{ width: '80px', height: '4px', background: 'var(--bg-surface-inset)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: totalCount ? `${(presentCount / totalCount) * 100}%` : '0%', background: 'var(--success-fg)', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {loading ? (
           <div style={{ padding: '80px', textAlign: 'center' }}>
             <Loader className="text-tertiary spin" size={32} style={{ margin: '0 auto' }} />
           </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
             <p className="text-body text-secondary">No students found matching "{search}"</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredStudents.map((s, i) => (
              <div key={s._id} onClick={() => toggleAttendance(s._id)} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: i < filteredStudents.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: isPast || isFuture ? 'default' : 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => { if (!isPast && !isFuture) e.currentTarget.style.background = 'var(--bg-surface-inset)' }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-glow-soft)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--accent-glow)', marginRight: '16px', fontWeight: '600' }}>
                  {s.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p className="text-body font-medium text-primary">{s.name}</p>
                  <p className="text-caption text-tertiary font-mono">{s.usn}</p>
                </div>
                <div style={{ 
                  padding: '6px 12px', 
                  borderRadius: 'var(--radius-md)', 
                  border: `1px solid ${(isPast && !session) ? 'var(--border-subtle)' : attendanceState[s._id] ? (isPast ? 'var(--border-subtle)' : 'var(--success-border)') : 'var(--border-subtle)'}`, 
                  background: (isPast && !session) ? 'transparent' : attendanceState[s._id] ? (isPast ? 'transparent' : 'var(--success-bg)') : 'transparent', 
                  color: (isPast && !session) ? 'var(--text-tertiary)' : attendanceState[s._id] ? (isPast ? 'var(--text-secondary)' : 'var(--success-fg)') : 'var(--text-tertiary)', 
                  fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px', textAlign: 'center', transition: 'all 0.2s',
                  opacity: isPast ? 0.8 : 1
                }}>
                  {(isPast && !session) ? 'No Class' : (attendanceState[s._id] ? 'Present' : 'Absent')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPast ? (
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-raised)' }}>
          <div>
            <p className="text-body-sm text-warning" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> Read-only — contact admin to modify past records
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {session && (
              <button className="btn-secondary" onClick={handleDeleteSession} disabled={saving} style={{ color: 'var(--danger-fg)', borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }}>
                <Trash2 size={16} /> Delete
              </button>
            )}
            <button className="btn-secondary" disabled style={{ minWidth: '160px', justifyContent: 'center', opacity: 0.5 }}>
              <Lock size={16} /> Locked
            </button>
          </div>
        </div>
      ) : !isFuture && (
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-raised)' }}>
          <div>
            {hasExistingAttendance ? (
              <p className="text-body-sm text-warning" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={16} /> Modifying existing attendance</p>
            ) : (
              <p className="text-body-sm text-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckSquare size={16} /> Saving will create a new session</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {session && (
              <button className="btn-secondary" onClick={handleDeleteSession} disabled={saving} style={{ color: 'var(--danger-fg)', borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }}>
                <Trash2 size={16} /> Delete
              </button>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={loading || saving} style={{ minWidth: '160px', justifyContent: 'center' }}>
              {saving ? <Loader size={16} className="spin" /> : <Save size={16} />}
              {session ? 'Update Attendance' : 'Create & Save'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
