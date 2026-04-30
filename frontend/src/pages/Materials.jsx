import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BookOpen, Search, Plus, Filter, Video, FileText, Link as LinkIcon, ExternalLink, X, Loader, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

export default function Materials() {
  const { role } = useOutletContext();
  const [materials, setMaterials] = useState([]);
  const [sessions, setSessions] = useState([]); // for the add modal
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteConfirm() {
    if (!materialToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteMaterial(materialToDelete._id);
      setMaterialToDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  }
  
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch materials joined with sessions
      const mats = await api.getMaterials();
      setMaterials(mats || []);

      if (role === 'mentor') {
        const ses = await api.getSessions();
        setSessions(ses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Filtered list
  const filtered = materials.filter(m => {
    if (monthFilter && m.sessionId?.monthNumber?.toString() !== monthFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.title.toLowerCase().includes(q) || 
             m.sessionId?.topic.toLowerCase().includes(q) ||
             (m.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  function getIconForType(type) {
    switch (type) {
      case 'recording': return <Video size={20} />;
      case 'slides': return <FileText size={20} />;
      case 'document': return <FileText size={20} />;
      default: return <LinkIcon size={20} />;
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
      <div>
        <p className="text-label text-tertiary" style={{ marginBottom: 'var(--space-2)' }}>ACTIVITY</p>
        <h1 className="text-display-sm text-primary">Materials Library</h1>
        <p className="text-body text-secondary" style={{ marginTop: '8px' }}>
          Access session recordings, slide decks, and external resources.
        </p>
      </div>
        {role === 'mentor' && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Material
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} className="text-tertiary" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            className="input" 
            placeholder="Search materials, topics..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} className="text-tertiary" />
          <select className="input" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option value="">All Months</option>
            <option value="4">Month 4 (Mar)</option>
            <option value="5">Month 5 (Apr)</option>
            <option value="6">Month 6 (May)</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center' }}>
          <Loader className="text-tertiary" size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '64px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border-default)' }}>
          <BookOpen size={48} className="text-tertiary" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3 className="text-h3 text-secondary">No materials found</h3>
          <p className="text-body text-tertiary" style={{ marginTop: '8px' }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filtered.map(m => (
            <a 
              key={m._id} 
              href={m.url} 
              target="_blank" 
              rel="noreferrer"
              className="card" 
              style={{ 
                display: 'flex', flexDirection: 'column', textDecoration: 'none', 
                transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' 
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-raised)';
                e.currentTarget.style.border = '1px solid var(--border-strong)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.border = '1px solid var(--border-subtle)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ 
                  width: '40px', height: '40px', background: 'var(--bg-surface-raised)', 
                  border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-glow)'
                }}>
                  {getIconForType(m.type)}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {role === 'mentor' && (
                    <button 
                      onClick={(e) => { e.preventDefault(); setMaterialToDelete(m); }}
                      style={{ background: 'none', border: 'none', color: 'var(--danger-fg)', cursor: 'pointer', padding: '4px' }}
                      title="Delete Material"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div style={{ padding: '4px' }}><ExternalLink size={16} className="text-tertiary" /></div>
                </div>
              </div>
              
              <div style={{ flex: 1 }}>
                <span className="pill" style={{ background: 'var(--bg-surface-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', marginBottom: '8px', display: 'inline-flex', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {m.type.toUpperCase()}
                </span>
                <h3 className="text-h3 text-primary" style={{ marginBottom: '8px', lineHeight: 1.3 }}>{m.title}</h3>
                <p className="text-body-sm text-secondary line-clamp-2" style={{ marginBottom: '16px' }}>
                  {m.description || 'No description provided.'}
                </p>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <p className="text-caption text-tertiary">
                  Session: <span className="text-secondary">{m.sessionId?.topic}</span>
                </p>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <AddMaterialModal 
          sessions={sessions} 
          onClose={() => setShowModal(false)} 
          onAdded={() => { setShowModal(false); loadData(); }} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {materialToDelete && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 100 }}>
          <div className="modal" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} className="text-danger" />
              </div>
              <h2 className="text-h2 text-primary">Delete Material</h2>
            </div>
            <p className="text-body-lg text-secondary" style={{ marginBottom: '32px' }}>
              Are you sure you want to delete <strong className="text-primary">"{materialToDelete.title}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setMaterialToDelete(null)} disabled={isDeleting}>Cancel</button>
              <button className="btn-primary" style={{ background: 'var(--danger-fg)', borderColor: 'var(--danger-fg)' }} onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? <Loader size={16} className="spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(7, 7, 11, 0.7);
          backdrop-filter: blur(8px);
        }
        .modal {
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-raised);
        }
      `}</style>
    </div>
  );
}

/* ── Add Material Modal ── */
function AddMaterialModal({ sessions, onClose, onAdded }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    sessionId: sessions[0]?._id || '',
    title: '',
    type: 'slides',
    url: '',
    description: ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.sessionId || !form.title || !form.url) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setSaving(true);
    setError('');

    try {
      await api.addMaterial(form);
      onAdded();
    } catch (err) {
      console.error(err);
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 100 }}>
      <div className="modal" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="text-h2 text-primary">Add Material</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && <p className="text-caption text-danger" style={{ marginBottom: '16px' }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label">Session <span className="text-danger">*</span></label>
            <select className="input" value={form.sessionId} onChange={e => setForm({...form, sessionId: e.target.value})}>
              <option value="">-- Select Session --</option>
              {sessions.map(s => (
                <option key={s._id} value={s._id}>{s.topic} ({new Date(s.date).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="label">Title <span className="text-danger">*</span></label>
            <input className="input" placeholder="e.g. Intro Slides" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="slides">Slides</option>
                <option value="recording">Recording</option>
                <option value="document">Document</option>
                <option value="link">External Link</option>
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label className="label">URL <span className="text-danger">*</span></label>
              <input className="input" type="url" placeholder="https://..." value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input" rows="3" placeholder="Optional notes..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
