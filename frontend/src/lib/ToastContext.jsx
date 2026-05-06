import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div style={{
      position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '12px',
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle size={18} className="text-success" />;
      case 'error':   return <XCircle size={18} className="text-danger" />;
      case 'warning': return <AlertCircle size={18} className="text-warning" />;
      default:        return <Info size={18} className="text-accent" />;
    }
  };

  return (
    <div style={{
      minWidth: '320px', maxWidth: '420px', padding: '16px',
      background: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-raised)',
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      pointerEvents: 'auto', animation: 'slideIn 0.3s ease-out forwards'
    }}>
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{getIcon()}</div>
      <div style={{ flex: 1 }}>
        <p className="text-body" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
          {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
        </p>
        <p className="text-body-sm text-secondary">{toast.message}</p>
      </div>
      <button onClick={onRemove} style={{ 
        background: 'none', border: 'none', color: 'var(--text-tertiary)', 
        cursor: 'pointer', padding: '4px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <X size={16} />
      </button>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
