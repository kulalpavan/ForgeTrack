import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ────────────────────────────────────────────────────────────
   403 Forbidden — Design System: clean, friendly error page
   Shown when a student tries to access a mentor-only route
   ──────────────────────────────────────────────────────────── */
export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-void)',
      backgroundImage: 'var(--glow-cosmic)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '440px' }}>
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-2xl)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <ShieldOff size={32} style={{ color: 'var(--danger-fg)' }} strokeWidth={1.75} />
        </div>

        {/* Code */}
        <p className="text-label" style={{ color: 'var(--danger-fg)', marginBottom: '12px' }}>
          ERROR 403 — FORBIDDEN
        </p>

        {/* Heading */}
        <h1 className="text-display-sm text-primary" style={{ marginBottom: '16px' }}>
          Access Denied
        </h1>

        {/* Body */}
        <p className="text-body-lg text-secondary" style={{ marginBottom: '32px', lineHeight: 1.6 }}>
          You don't have permission to view this page. This area is restricted to mentors only.
        </p>

        {/* Back button */}
        <button
          id="btn-403-back"
          className="btn-secondary"
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Go Back
        </button>
      </div>
    </div>
  );
}
