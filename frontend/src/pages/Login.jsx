import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, LogIn, AlertCircle, Loader } from 'lucide-react';
import { api } from '../lib/api';

/* ────────────────────────────────────────────────────────────
   Login Screen — Design System §11.1
   - No sidebar, full-screen centered form
   - Tab toggle: Mentor (email) / Student (USN)
   - Cosmic glow background, glass card, ForgeTrack logo
   ──────────────────────────────────────────────────────────── */
export default function Login() {
  const [tab, setTab]           = useState('mentor'); // 'mentor' | 'student'
  const [identifier, setId]     = useState('');       // email or USN
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  const isStudent = tab === 'student';

  // Redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem('forgeToken')) {
      const user = JSON.parse(localStorage.getItem('forgeUser') || '{}');
      if (user.role === 'mentor') navigate('/dashboard');
      else navigate('/me/attendance');
    }
  }, [navigate]);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your ' + (isStudent ? 'USN' : 'email') + ' and password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const loginId = identifier.trim();
      const data = await api.login(loginId, password.trim());

      if (data.user.role === 'mentor') {
        navigate('/dashboard');
      } else {
        navigate('/me/attendance');
      }
      
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-void)',
      backgroundImage: 'var(--glow-cosmic)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dot grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

      {/* Ambient glow blobs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '300px',
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Login Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-surface)',
        backgroundImage: 'var(--card-gradient)',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-raised)',
        border: '1px solid var(--border-default)',
        padding: '48px',
        animation: 'fadeSlideIn 0.4s ease',
      }}>

        {/* Logo + Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--accent-glow-soft)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Zap size={20} style={{ color: 'var(--accent-glow)' }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-h2" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>ForgeTrack</p>
            <p className="text-caption" style={{ color: 'var(--text-tertiary)', marginTop: '2px' }}>
              The Forge AI-ML Bootcamp
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface-inset)',
          borderRadius: 'var(--radius-lg)',
          padding: '4px',
          marginBottom: '28px',
          border: '1px solid var(--border-subtle)',
        }}>
          {['mentor', 'student'].map((t) => (
            <button
              key={t}
              id={`tab-${t}`}
              onClick={() => { setTab(t); setError(''); setId(''); setPassword(''); }}
              style={{
                flex: 1,
                height: '36px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
                transition: 'all 0.2s ease',
                background: tab === t ? 'var(--bg-surface-raised)' : 'transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
              }}
            >
              {t === 'mentor' ? '⚡ Mentor Login' : '🎓 Student Login'}
            </button>
          ))}
        </div>

        {/* Form heading */}
        <div style={{ marginBottom: '24px' }}>
          <h1 className="text-h2" style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>
            {isStudent ? 'Student Sign In' : 'Mentor Sign In'}
          </h1>
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
            {isStudent
              ? 'Sign in with your USN and password to view your attendance.'
              : 'Sign in with your email to access the full dashboard.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
          }}>
            <AlertCircle size={16} style={{ color: 'var(--danger-fg)', flexShrink: 0, marginTop: '1px' }} />
            <p className="text-caption" style={{ color: 'var(--danger-fg)', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {/* Email / USN Field */}
        <div style={{ marginBottom: '16px' }}>
          <label className="label" htmlFor="input-identifier">
            {isStudent ? 'USN (University Seat Number)' : 'Email Address'}
          </label>
          <input
            id="input-identifier"
            className="input"
            type={isStudent ? 'text' : 'email'}
            placeholder={isStudent ? '4SH24CS001' : 'you@theboringpeople.in'}
            value={identifier}
            onChange={e => setId(e.target.value)}
            onKeyDown={handleKeyDown}
            style={isStudent ? { fontFamily: 'var(--font-mono)', textTransform: 'uppercase' } : {}}
            autoComplete={isStudent ? 'username' : 'email'}
            autoFocus
          />
          {isStudent && (
            <p className="text-caption" style={{ color: 'var(--text-tertiary)', marginTop: '6px' }}>
              Your default password is your USN. You'll be asked to change it on first login.
            </p>
          )}
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="label" htmlFor="input-password" style={{ margin: 0 }}>Password</label>
            {!isStudent && (
              <button
                id="btn-forgot-password"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--accent-glow)',
                  fontFamily: 'var(--font-body)',
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="input-password"
              className="input"
              type={showPw ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ paddingRight: '48px' }}
              autoComplete="current-password"
            />
            <button
              id="btn-toggle-password"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                transition: 'color 0.15s',
              }}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw
                ? <EyeOff size={16} strokeWidth={1.75} />
                : <Eye size={16} strokeWidth={1.75} />
              }
            </button>
          </div>
        </div>

        {/* Sign In Button */}
        <button
          id="btn-sign-in"
          className="btn-primary"
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '15px' }}
        >
          {loading ? (
            <>
              <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
              Signing in…
            </>
          ) : (
            <>
              <LogIn size={16} strokeWidth={1.75} />
              Sign In
            </>
          )}
        </button>

        {/* Footer */}
        <p className="text-caption" style={{
          color: 'var(--text-tertiary)',
          textAlign: 'center',
          marginTop: '24px',
        }}>
          {isStudent
            ? 'Having trouble? Contact your mentor to reset your password.'
            : 'ForgeTrack · BOPPL Pvt. Ltd. · v1.0'}
        </p>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
