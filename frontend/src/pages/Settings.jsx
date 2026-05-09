import { useState, useEffect } from 'react';
import {
  User, Bell, Shield, Palette, Save, LogOut,
  Moon, Globe, Mail, Loader, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, GraduationCap, Briefcase,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import { api } from '../lib/api';

/* ── Inline Toggle Component ───────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      style={{
        width: '42px',
        height: '22px',
        background: checked ? 'var(--accent-glow)' : 'var(--bg-surface-raised)',
        borderRadius: 'var(--radius-full)',
        position: 'relative',
        cursor: 'pointer',
        border: 'none',
        transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={{
        width: '18px',
        height: '18px',
        background: 'white',
        borderRadius: '50%',
        position: 'absolute',
        left: '2px',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

/* ── Toast / Banner ────────────────────────────────────────── */
function Banner({ type, message, onClose }) {
  if (!message) return null;
  const isSuccess = type === 'success';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      background: isSuccess ? 'var(--success-bg)' : 'var(--danger-bg)',
      border: `1px solid ${isSuccess ? 'var(--success-border)' : 'var(--danger-border)'}`,
      color: isSuccess ? 'var(--success-fg)' : 'var(--danger-fg)',
      marginBottom: 'var(--space-6)',
      fontSize: '13px',
      fontWeight: 500,
    }}>
      {isSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}>✕</button>
    </div>
  );
}

/* ── Main Settings Page ─────────────────────────────────────── */
export default function Settings() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const ctx = useOutletContext();
  const isMobile = window.innerWidth < 768;
  const displayName = ctx?.displayName || '';
  const role = ctx?.role || 'mentor';
  const user = ctx?.user || null;

  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });

  // Profile fields
  const [name, setName] = useState(displayName);
  const [bio, setBio] = useState(user?.bio || '');

  // Notification toggles — mentor vs student have different defaults
  const defaultNotifs = role === 'mentor'
    ? [
        { id: 'email',   title: 'Email Summaries',    desc: 'Receive daily attendance summaries via email.', active: true },
        { id: 'browser', title: 'Browser Alerts',     desc: 'Real-time push notifications for attendance events.', active: false },
        { id: 'reports', title: 'Weekly Reports',     desc: 'Automated student performance insights on Mondays.', active: true },
        { id: 'security',title: 'Security Alerts',    desc: 'Alerts for login attempts from new devices.', active: true },
      ]
    : [
        { id: 'email',   title: 'Email Notifications', desc: 'Get notified when new materials are posted.', active: true },
        { id: 'browser', title: 'Browser Alerts',      desc: 'In-browser alerts for upcoming sessions.', active: false },
        { id: 'security',title: 'Security Alerts',     desc: 'Alerts for login attempts from new devices.', active: true },
      ];

  const [notifs, setNotifs] = useState(defaultNotifs);

  // Security / Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwError, setPwError] = useState('');

  // Appearance state
  const [density, setDensity] = useState(localStorage.getItem('forgeDensity') || 'comfortable');

  useEffect(() => {
    const root = window.document.body;
    root.classList.remove('density-comfortable', 'density-compact');
    root.classList.add(`density-${density}`);
    localStorage.setItem('forgeDensity', density);
  }, [density]);


  const tabs = [
    { id: 'profile',       name: 'Profile',       icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance',    name: 'Appearance',    icon: Palette },
    { id: 'security',      name: 'Security',      icon: Shield },
  ];

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4000);
  };

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleLogout = () => {
    api.logout();
    window.location.href = '/login';
  };

  const handleSave = async () => {
    if (activeTab === 'profile') {
      if (!name.trim()) {
        showBanner('error', 'Display name cannot be empty.');
        return;
      }
      setSaving(true);
      try {
        await api.updateProfile({ displayName: name.trim(), bio: bio.trim() });
        showBanner('success', 'Profile updated successfully!');
      } catch (err) {
        showBanner('error', err.message || 'Failed to save profile.');
      } finally {
        setSaving(false);
      }
    } else if (activeTab === 'notifications') {
      // Notifications are stored client-side for now (no backend persistence)
      setSaving(true);
      setTimeout(() => {
        setSaving(false);
        showBanner('success', 'Notification preferences saved.');
      }, 600);
    } else if (activeTab === 'appearance') {
      setSaving(true);
      setTimeout(() => {
        setSaving(false);
        showBanner('success', 'Appearance settings saved.');
      }, 600);
    } else if (activeTab === 'security') {
      // Password change
      setPwError('');
      if (!currentPw || !newPw || !confirmPw) {
        setPwError('Please fill in all password fields.');
        return;
      }
      if (newPw.length < 6) {
        setPwError('New password must be at least 6 characters.');
        return;
      }
      if (newPw !== confirmPw) {
        setPwError('New passwords do not match.');
        return;
      }
      setSaving(true);
      try {
        // Password change endpoint (future feature — show friendly message for now)
        showBanner('success', 'Password update is not yet enabled on this server.');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
      } catch (err) {
        showBanner('error', err.message || 'Failed to update password.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleReset = () => {
    if (activeTab === 'profile') {
      setName(displayName);
      setBio(user?.bio || '');
    } else if (activeTab === 'notifications') {
      setNotifs(defaultNotifs);
    } else if (activeTab === 'security') {
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError('');
    }
    setBanner({ type: '', message: '' });
  };

  const toggleNotif = (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, active: !n.active } : n));
  };

  const togglePwVisibility = (field) => {
    setShowPw(prev => ({ ...prev, [field]: !prev[field] }));
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-2)' }}>
          {role === 'mentor'
            ? <Briefcase size={14} style={{ color: 'var(--text-tertiary)' }} />
            : <GraduationCap size={14} style={{ color: 'var(--text-tertiary)' }} />
          }
          <p className="text-label text-tertiary">
            {role === 'mentor' ? 'MENTOR ACCOUNT' : 'STUDENT ACCOUNT'} · SETTINGS
          </p>
        </div>
        <h1 className="text-h1 text-primary">Settings</h1>
        <p className="text-body-sm text-secondary" style={{ marginTop: '4px' }}>
          Manage your profile, notifications, and preferences.
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: 'var(--space-10)', 
        alignItems: 'start' 
      }}>

        {/* ── Sidebar Nav ───────────────────────────────────── */}
        <div style={{ 
          width: isMobile ? '100%' : '240px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'var(--space-2)',
          flexShrink: 0
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              onClick={() => { setActiveTab(tab.id); setBanner({ type: '', message: '' }); setPwError(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: '11px 14px',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                position: 'relative',
                boxShadow: activeTab === tab.id ? 'var(--shadow-card), inset 2px 0 0 var(--accent-glow)' : 'none',
                border: activeTab === tab.id ? '1px solid var(--border-default)' : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'var(--bg-surface-inset)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <tab.icon size={18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span className="text-body-sm" style={{ fontWeight: activeTab === tab.id ? 600 : 400 }}>
                {tab.name}
              </span>
            </button>
          ))}

          {/* Support Section */}
          {!isMobile && (
            <div style={{ 
              marginTop: 'var(--space-8)', 
              padding: '16px', 
              background: 'var(--bg-surface-inset)', 
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-subtle)'
            }}>
              <p className="text-label text-tertiary" style={{ marginBottom: '8px' }}>Support</p>
              <p className="text-caption text-secondary" style={{ marginBottom: '12px' }}>
                Need help with your account or found a bug?
              </p>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px' }}>
                View Documentation
              </button>
            </div>
          )}
        </div>

        {/* ── Content Panel ─────────────────────────────────── */}
        <div className="card" style={{ flex: 1, minWidth: 0, border: '1px solid var(--border-subtle)' }}>
          <Banner type={banner.type} message={banner.message} onClose={() => setBanner({ type: '', message: '' })} />

          {/* ── PROFILE TAB ───────────────────────────────── */}
          {activeTab === 'profile' && (
            <div>
              <div style={{ marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-6)' }}>
                <h2 className="text-h2 text-primary">Profile Information</h2>
                <p className="text-body-sm text-secondary">Update your personal details and how others see you.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                {/* Avatar Row */}
                <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center' }}>
                  <div style={{
                    width: '72px', height: '72px',
                    borderRadius: '50%',
                    background: 'var(--accent-glow-soft)',
                    border: '2px solid rgba(99,102,241,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px', fontWeight: 700, color: 'var(--accent-glow)',
                    flexShrink: 0,
                  }}>
                    {name.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-body-sm text-primary" style={{ fontWeight: 600, marginBottom: '4px' }}>
                      {name || 'No Name Set'}
                    </p>
                    <span className="pill pill-info" style={{ fontSize: '10px' }}>
                      {role === 'mentor' ? '🔑 Mentor' : '🎓 Student'}
                    </span>
                  </div>
                </div>

                {/* Name + Role Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                  <div>
                    <label className="label" htmlFor="settings-name">Display Name</label>
                    <input
                      id="settings-name"
                      className="input"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="settings-role">Account Role</label>
                    <input
                      id="settings-role"
                      className="input"
                      value={role.toUpperCase()}
                      disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="label" htmlFor="settings-email">
                    {role === 'student' ? 'USN / Email' : 'Email Address'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-tertiary)' }} />
                    <input
                      id="settings-email"
                      className="input"
                      style={{ paddingLeft: '42px', opacity: 0.6, cursor: 'not-allowed' }}
                      value={role === 'student'
                        ? (user?.usn || user?.email || 'Not set')
                        : (user?.email || 'No email set')}
                      disabled
                    />
                  </div>
                  <p className="text-micro text-tertiary" style={{ marginTop: '4px' }}>
                    Managed by ForgeTrack Identity — contact your admin to change.
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <label className="label" htmlFor="settings-bio">Bio</label>
                  <textarea
                    id="settings-bio"
                    className="input"
                    style={{ height: '96px', resize: 'none', padding: '12px 16px' }}
                    placeholder={role === 'mentor' ? 'Tell students about yourself...' : 'Tell us a bit about yourself...'}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                  />
                  <p className="text-micro text-tertiary" style={{ marginTop: '4px' }}>
                    {bio.length}/200 characters
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ─────────────────────────── */}
          {activeTab === 'notifications' && (
            <div>
              <div style={{ marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-6)' }}>
                <h2 className="text-h2 text-primary">Notifications</h2>
                <p className="text-body-sm text-secondary">Manage how you receive alerts and updates.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {notifs.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-4)',
                      background: 'var(--bg-surface-inset)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      gap: 'var(--space-4)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                    onClick={() => toggleNotif(item.id)}
                  >
                    <div>
                      <p className="text-body-sm text-primary" style={{ fontWeight: 500 }}>{item.title}</p>
                      <p className="text-caption text-secondary">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={item.active}
                      onChange={() => toggleNotif(item.id)}
                    />
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 'var(--space-6)',
                padding: 'var(--space-4)',
                background: 'var(--info-bg)',
                border: '1px solid var(--info-border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <p className="text-caption" style={{ color: 'var(--info-fg)' }}>
                  ℹ️  Preferences are saved per session. Email integration coming in a future update.
                </p>
              </div>
            </div>
          )}

          {/* ── APPEARANCE TAB ────────────────────────────── */}
          {activeTab === 'appearance' && (
            <div>
              <div style={{ marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-6)' }}>
                <h2 className="text-h2 text-primary">Appearance</h2>
                <p className="text-body-sm text-secondary">Customize the visual experience of ForgeTrack.</p>
              </div>

              <div>
                <label className="label">Interface Theme</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                  {/* Cosmic Dark */}
                  <div
                    onClick={() => setTheme('dark')}
                    style={{
                      border: theme === 'dark' ? '2px solid var(--accent-glow)' : '1px solid var(--border-default)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      padding: 'var(--space-6)',
                      background: theme === 'dark' ? 'var(--bg-surface-raised)' : 'var(--bg-surface-inset)',
                      borderRadius: 'var(--radius-xl)',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {theme === 'dark' && (
                      <span style={{
                        position: 'absolute', top: '8px', right: '8px',
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                        color: 'var(--accent-glow)',
                        background: 'var(--accent-glow-soft)',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 8px',
                      }}>ACTIVE</span>
                    )}
                    <div style={{ 
                      width: '40px', height: '40px', background: '#0B0B11', 
                      borderRadius: '50%', margin: '0 auto 12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                      <Moon size={20} style={{ color: '#F5F5F7' }} />
                    </div>
                    <p className="text-caption text-primary" style={{ fontWeight: 600 }}>Cosmic Dark</p>
                  </div>

                  {/* Light Bloom */}
                  <div
                    onClick={() => setTheme('light')}
                    style={{
                      border: theme === 'light' ? '2px solid var(--accent-glow)' : '1px solid var(--border-default)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      padding: 'var(--space-6)',
                      background: theme === 'light' ? 'var(--bg-surface-raised)' : 'var(--bg-surface-inset)',
                      borderRadius: 'var(--radius-xl)',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {theme === 'light' && (
                      <span style={{
                        position: 'absolute', top: '8px', right: '8px',
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                        color: 'var(--accent-glow)',
                        background: 'var(--accent-glow-soft)',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 8px',
                      }}>ACTIVE</span>
                    )}
                    <div style={{ 
                      width: '40px', height: '40px', background: '#FFFFFF', 
                      borderRadius: '50%', margin: '0 auto 12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: '1px solid #E5E5E7'
                    }}>
                      <Globe size={20} style={{ color: '#6366F1' }} />
                    </div>
                    <p className="text-caption text-primary" style={{ fontWeight: 600 }}>Light Bloom</p>
                  </div>
                </div>

                {/* Sidebar density */}
                <div style={{ marginTop: 'var(--space-10)' }}>
                  <label className="label">Interface Density</label>
                  <p className="text-caption text-tertiary" style={{ marginBottom: '12px' }}>
                    Adjust the spacing and font sizing of the application interface.
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    padding: '4px',
                    background: 'var(--bg-surface-inset)',
                    borderRadius: 'var(--radius-lg)',
                    width: 'fit-content',
                    border: '1px solid var(--border-default)'
                  }}>
                    {[
                      { id: 'comfortable', label: 'Comfortable' },
                      { id: 'compact', label: 'Compact' }
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDensity(d.id)}
                        style={{ 
                          fontSize: '13px', 
                          padding: '8px 20px',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          background: density === d.id ? 'var(--bg-surface)' : 'transparent',
                          color: density === d.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                          boxShadow: density === d.id ? 'var(--shadow-card)' : 'none'
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY TAB ──────────────────────────────── */}
          {activeTab === 'security' && (
            <div>
              <div style={{ marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-6)' }}>
                <h2 className="text-h2 text-primary">Security</h2>
                <p className="text-body-sm text-secondary">Keep your account safe and secure.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                {/* Auth method info */}
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <Lock size={16} style={{ color: 'var(--success-fg)', flexShrink: 0 }} />
                  <div>
                    <p className="text-body-sm" style={{ color: 'var(--success-fg)', fontWeight: 600 }}>
                      Secured via ForgeTrack JWT Auth
                    </p>
                    <p className="text-caption text-secondary">Token expires in 7 days from last login.</p>
                  </div>
                </div>

                {/* Password change */}
                <div>
                  <h3 className="text-h3 text-primary" style={{ marginBottom: 'var(--space-4)' }}>Change Password</h3>
                  {pwError && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px',
                      background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--danger-fg)',
                      marginBottom: 'var(--space-4)', fontSize: '13px',
                    }}>
                      <AlertCircle size={15} /> {pwError}
                    </div>
                  )}

                  {[
                    { id: 'current', label: 'Current Password', value: currentPw, setter: setCurrentPw, field: 'current' },
                    { id: 'new',     label: 'New Password',     value: newPw,     setter: setNewPw,     field: 'new' },
                    { id: 'confirm', label: 'Confirm New Password', value: confirmPw, setter: setConfirmPw, field: 'confirm' },
                  ].map(({ id, label, value, setter, field }) => (
                    <div key={id} style={{ marginBottom: 'var(--space-4)' }}>
                      <label className="label" htmlFor={`settings-pw-${id}`}>{label}</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={15} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-tertiary)' }} />
                        <input
                          id={`settings-pw-${id}`}
                          className="input"
                          type={showPw[field] ? 'text' : 'password'}
                          value={value}
                          onChange={e => setter(e.target.value)}
                          placeholder="••••••••"
                          style={{ paddingLeft: '42px', paddingRight: '42px' }}
                        />
                        <button
                          type="button"
                          onClick={() => togglePwVisibility(field)}
                          style={{
                            position: 'absolute', right: '12px', top: '12px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-tertiary)', display: 'flex', padding: '2px',
                          }}
                        >
                          {showPw[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2FA info */}
                <div style={{
                  padding: 'var(--space-5)',
                  background: 'var(--bg-surface-inset)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <h4 className="text-body text-primary" style={{ fontWeight: 600 }}>Two-Factor Authentication</h4>
                    <p className="text-caption text-secondary">Add an extra layer of security to your account.</p>
                  </div>
                  <span className="pill pill-danger" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>Coming Soon</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Footer Actions ────────────────────────────── */}
          <div style={{
            marginTop: 'var(--space-10)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 'var(--space-6)',
          }}>
            <button className="btn-secondary" onClick={handleReset}>
              Reset
            </button>
            <button
              id="settings-btn-save"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ minWidth: '130px', justifyContent: 'center' }}
            >
              {saving
                ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <Save size={16} />
              }
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
