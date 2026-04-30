import {
  CheckCircle,
  XCircle,
  Zap,
  BookOpen,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

/**
 * Phase 0 Gate: /dev-tokens
 * Renders one Card, one Button, one Input, and status pills.
 * Remove this route before shipping Phase 6.
 */
export default function DevTokens() {
  return (
    <div className="app-main" style={{ minHeight: '100vh', padding: '48px 32px' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '48px' }}>
        <p className="text-label text-tertiary" style={{ marginBottom: '8px' }}>
          PHASE 0 GATE
        </p>
        <h1 className="text-display-sm text-primary">
          ForgeTrack Design System
        </h1>
        <p className="text-body-lg text-secondary" style={{ marginTop: '8px' }}>
          Token verification page — confirm all components match the spec before advancing to Phase 1.
        </p>
      </div>

      {/* ── Section: Cards ────────────────────────────────── */}
      <SectionLabel label="Cards" icon={<BookOpen size={16} />} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>

        {/* Default Card */}
        <div className="card">
          <p className="text-label text-tertiary" style={{ marginBottom: '8px' }}>TODAY'S SESSION</p>
          <h2 className="text-h2 text-primary" style={{ marginBottom: '16px' }}>8-Layer AI Stack</h2>
          <p className="text-body text-secondary">Monday, April 28, 2026 · 2.0 hrs · Offline</p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <span className="pill pill-success"><CheckCircle size={12} /> Present</span>
            <span className="pill pill-danger"><XCircle size={12} /> Absent</span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="card-hero">
          <p className="text-label text-tertiary" style={{ marginBottom: '8px' }}>ATTENDANCE RATE</p>
          <div className="text-display-md" style={{ color: 'var(--success-fg)', marginBottom: '8px' }}>87%</div>
          <p className="text-body text-secondary">22 of 25 students present</p>
          {/* Progress bar */}
          <div style={{
            marginTop: '20px',
            height: '4px',
            background: 'var(--bg-surface-inset)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: '87%',
              background: 'var(--success-fg)',
              borderRadius: '999px',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* Program Overview Card */}
        <div className="card">
          <p className="text-label text-tertiary" style={{ marginBottom: '16px' }}>PROGRAM OVERVIEW</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StatRow label="Total Sessions" value="42" />
            <StatRow label="Avg Attendance" value="83%" />
            <StatRow label="Active Students" value="25" />
          </div>
        </div>
      </div>

      {/* ── Section: Buttons ─────────────────────────────── */}
      <SectionLabel label="Buttons" icon={<Zap size={16} />} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '48px' }}>
        <button id="btn-primary" className="btn-primary">
          <CheckCircle size={16} /> Primary Action
        </button>
        <button id="btn-secondary" className="btn-secondary">
          <BookOpen size={16} /> Secondary
        </button>
        <button id="btn-destructive" className="btn-destructive">
          <XCircle size={16} /> Destructive
        </button>
      </div>

      {/* ── Section: Inputs ──────────────────────────────── */}
      <SectionLabel label="Inputs & Forms" icon={<TrendingUp size={16} />} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        <div>
          <label className="label" htmlFor="input-normal">Student Name</label>
          <input id="input-normal" className="input" placeholder="Search students..." />
        </div>
        <div>
          <label className="label" htmlFor="input-usn">USN</label>
          <input
            id="input-usn"
            className="input"
            placeholder="4SH24CS001"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <p className="text-caption" style={{ color: 'var(--text-tertiary)', marginTop: '6px' }}>
            University Seat Number
          </p>
        </div>
        <div>
          <label className="label" htmlFor="input-error">Password</label>
          <input
            id="input-error"
            className="input"
            type="password"
            placeholder="Enter password"
            style={{ borderColor: 'var(--danger-border)' }}
          />
          <p className="text-caption" style={{ color: 'var(--danger-fg)', marginTop: '6px' }}>
            Invalid credentials
          </p>
        </div>
      </div>

      {/* ── Section: Status Pills ────────────────────────── */}
      <SectionLabel label="Status Pills" icon={<AlertTriangle size={16} />} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '48px' }}>
        <span className="pill pill-success"><CheckCircle size={12} /> Present</span>
        <span className="pill pill-success">+8.3%</span>
        <span className="pill pill-danger"><XCircle size={12} /> Absent</span>
        <span className="pill pill-danger">−3.1%</span>
        <span className="pill pill-warning"><AlertTriangle size={12} /> 3 Warnings</span>
        <span className="pill pill-info">Offline</span>
      </div>

      {/* ── Section: Typography Scale ─────────────────────── */}
      <SectionLabel label="Typography Scale" icon={<BookOpen size={16} />} />

      <div className="card" style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <p className="text-label text-tertiary" style={{ marginBottom: '4px' }}>text-display-hero (72px)</p>
            <p className="text-display-hero" style={{ color: 'var(--text-primary)' }}>87%</p>
          </div>
          <div>
            <p className="text-label text-tertiary" style={{ marginBottom: '4px' }}>text-display-md (40px)</p>
            <p className="text-display-md text-primary">Welcome Back, Nischay</p>
          </div>
          <div>
            <p className="text-label text-tertiary" style={{ marginBottom: '4px' }}>text-h1 (28px)</p>
            <p className="text-h1 text-primary">Mark Attendance</p>
          </div>
          <div>
            <p className="text-label text-tertiary" style={{ marginBottom: '4px' }}>text-body (14px) + font-mono</p>
            <p className="text-body" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              4SH24CS001 · CS · 2024-2028
            </p>
          </div>
          <div>
            <p className="text-label text-tertiary" style={{ marginBottom: '4px' }}>text-label (11px uppercase)</p>
            <p className="text-label text-tertiary">OVERVIEW SECTION</p>
          </div>
        </div>
      </div>

      {/* ── Section: Stat Strip ──────────────────────────── */}
      <SectionLabel label="Stat Strip (Ticker)" icon={<TrendingUp size={16} />} />

      <div style={{
        display: 'flex',
        gap: '0',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
        padding: '0',
        overflowX: 'auto',
        marginBottom: '48px',
      }}>
        {[
          { icon: <BookOpen size={16} />, label: 'Total Sessions', value: '42' },
          { icon: <CheckCircle size={16} />, label: 'Overall Attendance', value: '83%' },
          { icon: <TrendingUp size={16} />, label: 'Active Students', value: '25' },
          { icon: <Zap size={16} />, label: 'Last Session', value: 'Apr 28' },
        ].map((item, i, arr) => (
          <div key={i} style={{
            flex: '1',
            minWidth: '140px',
            padding: '20px 24px',
            borderRight: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{item.icon}</span>
              <span className="text-caption text-tertiary">{item.label}</span>
            </div>
            <span className="text-body-lg text-primary" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Gate confirmation */}
      <div style={{
        padding: '20px 24px',
        background: 'var(--success-bg)',
        border: '1px solid var(--success-border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <CheckCircle size={20} style={{ color: 'var(--success-fg)', flexShrink: 0 }} />
        <div>
          <p className="text-body text-primary" style={{ fontWeight: 600 }}>Phase 0 Gate Ready</p>
          <p className="text-body-sm text-secondary">
            If you can see dark backgrounds, cosmic glow, correctly styled cards, buttons, inputs, and pills above — the design system is working. Proceed to Phase 1.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ color: 'var(--accent-glow)' }}>{icon}</span>
      <span className="text-label text-tertiary">{label}</span>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="text-body text-secondary">{label}</span>
      <span className="text-body text-primary" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}
