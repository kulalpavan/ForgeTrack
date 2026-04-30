import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, ArrowRight, Bell, Video, Loader } from 'lucide-react';
import { api } from '../lib/api';

function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDayMonth(dateStr) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' })
  };
}

export default function Upcoming() {
  const [loading, setLoading] = useState(true);
  const [nextSession, setNextSession] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);

  useEffect(() => {
    async function loadSessions() {
      const today = getTodayString();
      
      try {
        const data = await api.getSessions();
        // Sort by date ascending
        data.sort((a, b) => new Date(a.date) - new Date(b.date));

        const future = data.filter(s => s.date.split('T')[0] >= today);
        const history = data.filter(s => s.date.split('T')[0] < today).reverse();

        if (future.length > 0) {
          setNextSession(future[0]);
          setUpcoming(future.slice(1));
        }
        setPast(history.slice(0, 5));
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <Loader size={32} className="text-tertiary" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-12)' }}>
        <p className="text-label text-tertiary" style={{ marginBottom: 'var(--space-2)' }}>SCHEDULE</p>
        <h1 className="text-h1 text-primary">Upcoming Sessions</h1>
      </div>

      {/* Next Session Hero */}
      {nextSession ? (
        <div className="card-hero" style={{ 
          marginBottom: 'var(--space-12)',
          background: 'linear-gradient(135deg, var(--bg-surface-raised) 0%, var(--bg-surface) 100%)',
          border: '1px solid var(--border-default)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Glow */}
          <div style={{ 
            position: 'absolute', 
            top: '-50px', 
            right: '-50px', 
            width: '200px', 
            height: '200px', 
            background: 'var(--accent-glow)', 
            filter: 'blur(100px)', 
            opacity: 0.1,
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
            <div>
              <div className="pill pill-info" style={{ marginBottom: 'var(--space-4)' }}>NEXT SESSION</div>
              <h2 className="text-display-sm text-primary">{nextSession.topic}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="text-h3 text-accent" style={{ fontWeight: '700' }}>{formatDate(nextSession.date)}</p>
              <p className="text-body-sm text-secondary">{nextSession.duration}h • {(nextSession.sessionType || 'offline').toUpperCase()}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-inset)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                <Video size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-label text-tertiary">TYPE</p>
                <p className="text-body-sm text-primary">{nextSession.sessionType === 'online' ? 'Online/Zoom' : 'Offline/Lab'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-inset)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                <MapPin size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-label text-tertiary">LOCATION</p>
                <p className="text-body-sm text-primary">{nextSession.sessionType === 'online' ? 'Remote (Zoom)' : 'Main Lab / Hall'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-inset)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                <User size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-label text-tertiary">MENTOR</p>
                <p className="text-body-sm text-primary">Assigned Mentor</p>
              </div>
            </div>
          </div>

          {nextSession.notes && (
            <div style={{ padding: 'var(--space-5)', background: 'var(--bg-surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: 'var(--space-8)' }}>
              <p className="text-caption text-tertiary" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <Bell size={12} /> MENTOR NOTES
              </p>
              <p className="text-body-sm text-secondary italic">"{nextSession.notes}"</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <button className="btn-primary">
              Add to Calendar
            </button>
            <button className="btn-secondary">
              View Syllabus
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '48px', textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <Calendar size={48} className="text-tertiary" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h2 className="text-h2 text-secondary">No upcoming sessions</h2>
          <p className="text-body text-tertiary" style={{ marginTop: '8px' }}>Check back later for new scheduled sessions.</p>
        </div>
      )}

      {/* Lists Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-8)' }}>
        {/* Upcoming List */}
        <div>
          <h3 className="text-h3 text-primary" style={{ marginBottom: 'var(--space-6)' }}>Queue</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {upcoming.length === 0 ? (
               <p className="text-body-sm text-tertiary">No more sessions in queue.</p>
            ) : upcoming.map((item, i) => {
              const { day, month } = formatDayMonth(item.date);
              return (
                <div key={i} className="card" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
                  <div style={{ textAlign: 'center', minWidth: '60px' }}>
                    <p className="text-h3 text-primary" style={{ fontWeight: '700' }}>{day}</p>
                    <p className="text-micro text-tertiary">{month}</p>
                  </div>
                  <div style={{ height: '32px', width: '1px', background: 'var(--border-subtle)' }} />
                  <div style={{ flex: 1 }}>
                    <p className="text-body text-primary" style={{ fontWeight: '500' }}>{item.topic}</p>
                    <p className="text-caption text-tertiary">{(item.sessionType || 'offline').toUpperCase()}</p>
                  </div>
                  <ArrowRight size={16} className="text-tertiary" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Past List */}
        <div>
          <h3 className="text-h3 text-primary" style={{ marginBottom: 'var(--space-6)' }}>Recently Completed</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {past.length === 0 ? (
               <p className="text-body-sm text-tertiary">No recently completed sessions.</p>
            ) : past.map((item, i) => {
              const { day, month } = formatDayMonth(item.date);
              return (
                <div key={i} className="card" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-5)', opacity: 0.7 }}>
                  <div style={{ textAlign: 'center', minWidth: '60px' }}>
                    <p className="text-h3 text-tertiary" style={{ fontWeight: '700' }}>{day}</p>
                    <p className="text-micro text-tertiary">{month}</p>
                  </div>
                  <div style={{ height: '32px', width: '1px', background: 'var(--border-subtle)' }} />
                  <div style={{ flex: 1 }}>
                    <p className="text-body text-secondary" style={{ fontWeight: '500' }}>{item.topic}</p>
                    <p className="text-caption text-tertiary">{(item.sessionType || 'offline').toUpperCase()}</p>
                  </div>
                  <div className="pill pill-success" style={{ fontSize: '10px', padding: '2px 8px' }}>Done</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
