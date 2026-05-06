import { useState, useEffect } from 'react';
import { Upload as UploadIcon, CheckCircle2, Sparkles, Loader, FileText, Brain, Database, Check } from 'lucide-react';
import Papa from 'papaparse';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

export default function Upload() {
  const [step, setStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [mappingInfo, setMappingInfo] = useState(null);
  const [validatedData, setValidatedData] = useState([]);
  const { showToast } = useToast();
  
  // Loading & Progress states
  const [processingAi, setProcessingAi] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0); // 0 to 100
  const [importStatus, setImportStatus] = useState(''); // text description
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  const steps = [
    { id: 1, name: 'Upload CSV' },
    { id: 2, name: 'AI Mapping' },
    { id: 3, name: 'Review' },
    { id: 4, name: 'Import' }
  ];

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setImportStatus('Reading file...');
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvHeaders(results.meta.fields || []);
        setCsvData(results.data);
        showToast('File read successfully', 'success');
        setStep(2);
      },
      error: (err) => {
        showToast('Failed to parse CSV: ' + err.message, 'error');
      }
    });
  };

  const askAiAgent = async () => {
    setProcessingAi(true);
    setError('');
    setImportStatus('AI Agent is analyzing headers...');
    try {
      const sample = csvData.slice(0, 5);
      const result = await api.mapCsv(csvHeaders, sample);
      setMappingInfo(result);
      processMappedData(result);
      showToast('AI Mapping complete', 'success');
      setStep(3);
    } catch (err) {
      console.error(err);
      setError('AI Mapping failed. ' + err.message);
      showToast('AI Agent failed to map columns', 'error');
    } finally {
      setProcessingAi(false);
    }
  };

  function parseDateString(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (slash) {
      let [, d, m, y] = slash;
      if (y.length === 2) y = '20' + y;
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    const dashMon = s.match(/^(\d{1,2})-([A-Za-z]{3})$/);
    if (dashMon) {
      const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
      const m = months[dashMon[2].toLowerCase()];
      if (m) {
        const y = new Date().getFullYear();
        return `${y}-${String(m).padStart(2,'0')}-${dashMon[1].padStart(2,'0')}`;
      }
    }
    const d = new Date(s);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    return null;
  }

  const processMappedData = (info) => {
    const records = [];
    const mapping = info.mapping || {};
    csvData.forEach((row, index) => {
      const lowerRow = {};
      Object.keys(row).forEach(k => { lowerRow[k.trim().toLowerCase()] = row[k]; });
      const safeMapping = {};
      Object.keys(mapping).forEach(k => { safeMapping[k.trim().toLowerCase()] = String(mapping[k]).toLowerCase(); });
      let usn = '';
      Object.keys(safeMapping).forEach(k => { if (safeMapping[k] === 'usn') usn = lowerRow[k]; });
      if (!usn) return;
      usn = usn.toString().toUpperCase().trim();
      if (info.is_pivoted) {
        Object.keys(safeMapping).forEach(colName => {
          if (safeMapping[colName] === 'date') {
            const val = lowerRow[colName];
            if (val === undefined || val === null || val === '') return;
            const originalHeader = Object.keys(row).find(orig => orig.trim().toLowerCase() === colName);
            const isoDate = parseDateString(originalHeader || colName);
            if (!isoDate) return;
            const vStr = String(val).toUpperCase().trim();
            const present = ['TRUE', 'P', 'PRESENT', '1', 'Y', 'YES'].includes(vStr);
            records.push({ usn, date: isoDate, present, status: 'valid' });
          }
        });
      } else {
        let dateVal = '';
        let presentVal = false;
        Object.keys(safeMapping).forEach(k => {
          if (safeMapping[k] === 'date') dateVal = lowerRow[k];
          if (safeMapping[k] === 'attendance_status') {
            const vStr = String(lowerRow[k]).toUpperCase().trim();
            presentVal = ['TRUE', 'P', 'PRESENT', '1', 'Y', 'YES'].includes(vStr);
          }
        });
        if (!dateVal) dateVal = new Date().toISOString().split('T')[0];
        const isoDate = parseDateString(dateVal);
        if (isoDate) records.push({ usn, date: isoDate, present: presentVal, status: 'valid' });
      }
    });
    setValidatedData(records);
  };

  const startImport = async () => {
    setStep(4);
    setImporting(true);
    setImportProgress(10);
    setImportStatus('Analyzing records...');
    
    try {
      // Simulate steps for better UX
      await new Promise(r => setTimeout(r, 800));
      setImportProgress(40);
      setImportStatus(`Preparing to import ${validatedData.length} records...`);
      await new Promise(r => setTimeout(r, 800));
      setImportProgress(70);
      setImportStatus('Writing to database...');
      
      const result = await api.bulkAddAttendance(validatedData);
      
      setImportProgress(100);
      setImportStatus('Done!');
      setImportResult({ success: result.success, failed: result.failed, total: result.total });
      showToast(`Imported ${result.success} records successfully`, 'success');
    } catch (err) {
      console.error('Import failed:', err);
      setImportResult({ success: 0, failed: validatedData.length, total: validatedData.length });
      showToast('Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-12)' }}>
        <p className="text-label text-tertiary" style={{ marginBottom: 'var(--space-2)' }}>DATA MANAGEMENT</p>
        <h1 className="text-h1 text-primary">Import Attendance</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-16)', padding: '0 var(--space-4)' }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i === steps.length - 1 ? 'none' : 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', position: 'relative' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step === s.id ? 'var(--accent-glow)' : step > s.id ? 'var(--success-bg)' : 'var(--bg-surface-raised)',
                border: step > s.id ? '1px solid var(--success-border)' : 'none',
                color: step >= s.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: '600', fontSize: '14px', zIndex: 2
              }}>
                {step > s.id ? <CheckCircle2 size={16} className="text-success" /> : s.id}
              </div>
              <span className={`text-caption ${step === s.id ? 'text-primary' : 'text-tertiary'}`}>
                {s.name}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height: '1px', flex: 1, background: step > s.id ? 'var(--success-fg)' : 'var(--border-default)', margin: '0 var(--space-4)', marginTop: '-20px' }} />
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
        {step === 1 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }} style={{ border: `1px dashed ${isDragging ? 'var(--accent-glow)' : 'var(--border-default)'}`, background: isDragging ? 'var(--accent-glow-soft)' : 'transparent', borderRadius: 'var(--radius-2xl)', padding: 'var(--space-16)', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => document.getElementById('csv-input').click()}>
              <input type="file" id="csv-input" accept=".csv" hidden onChange={handleFileUpload} />
              <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
                <UploadIcon size={32} className="text-accent" />
              </div>
              <h2 className="text-h2 text-primary" style={{ marginBottom: 'var(--space-2)' }}>Drop your CSV here</h2>
              <p className="text-body text-secondary">Historical Attendance Export from Google Sheets</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-glow-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-6)' }} className="pulse">
              <Sparkles size={32} className="text-accent" />
            </div>
            <h2 className="text-h2 text-primary" style={{ marginBottom: 'var(--space-2)' }}>File Uploaded Successfully</h2>
            <p className="text-body text-secondary" style={{ marginBottom: 'var(--space-8)' }}>
              Found {csvData.length} rows and {csvHeaders.length} columns.
              <br />Our AI Agent will now analyze the headers to map messy attendance formats.
            </p>
            {error && <p className="text-danger" style={{ marginBottom: '16px' }}>{error}</p>}
            <button className="btn-primary" onClick={askAiAgent} disabled={processingAi} style={{ minWidth: '200px', justifyContent: 'center' }}>
              {processingAi ? <><Loader size={18} className="spin" /> Analyzing...</> : 'Start AI Analysis'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h3 className="text-h3 text-primary">Data Preview</h3>
                <p className="text-caption text-secondary mt-1">
                  AI detected format: {mappingInfo?.is_pivoted ? 'Pivoted Dates' : 'Standard'} 
                  | Date Format: {mappingInfo?.date_format}
                </p>
              </div>
              <p className="text-body-sm text-secondary">{validatedData.length} records ready</p>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-void)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface-raised)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>USN</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedData.slice(0, 50).map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{row.usn}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{row.date}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {row.present ? <span className="pill" style={{ background: 'var(--success-bg)', color: 'var(--success-fg)', border: '1px solid var(--success-border)' }}>Present</span> : <span className="pill" style={{ background: 'var(--danger-bg)', color: 'var(--danger-fg)', border: '1px solid var(--danger-border)' }}>Absent</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>Cancel</button>
              <button className="btn-primary" onClick={startImport}>Confirm & Import</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {importing ? (
              <div style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p className="text-body font-medium text-primary">{importStatus}</p>
                  <p className="text-body-sm text-secondary">{importProgress}%</p>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-surface-inset)', borderRadius: '999px', overflow: 'hidden', marginBottom: '40px' }}>
                  <div style={{ height: '100%', width: `${importProgress}%`, background: 'var(--accent-glow)', transition: 'width 0.4s ease' }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  {[
                    { icon: FileText, label: 'Analyze' },
                    { icon: Brain, label: 'Process' },
                    { icon: Database, label: 'Store' }
                  ].map((item, i) => {
                    const isActive = (i === 0 && importProgress >= 10) || (i === 1 && importProgress >= 40) || (i === 2 && importProgress >= 70);
                    const isDone = (i === 0 && importProgress > 40) || (i === 1 && importProgress > 70) || (i === 2 && importProgress >= 100);
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '50%', background: isDone ? 'var(--success-bg)' : isActive ? 'var(--accent-glow-soft)' : 'var(--bg-surface-raised)',
                          border: isDone ? '1px solid var(--success-border)' : isActive ? '1px solid var(--accent-glow)' : '1px solid var(--border-subtle)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDone ? 'var(--success-fg)' : isActive ? 'var(--accent-glow)' : 'var(--text-tertiary)',
                          transition: 'all 0.3s'
                        }}>
                          {isDone ? <Check size={20} /> : <item.icon size={20} />}
                        </div>
                        <span className="text-caption" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{item.label}</span>
                      </div>
                    );
                  })}
                  <div style={{ position: 'absolute', top: '20px', left: '40px', right: '40px', height: '1px', background: 'var(--border-subtle)', zIndex: 1 }} />
                </div>
              </div>
            ) : importResult && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-8)', border: '1px solid var(--success-border)' }}>
                  <CheckCircle2 size={40} className="text-success" />
                </div>
                <h2 className="text-h2 text-primary" style={{ marginBottom: 'var(--space-2)' }}>Import Complete</h2>
                <p className="text-body text-secondary" style={{ marginBottom: 'var(--space-12)' }}>
                  Successfully imported {importResult.success} records. {importResult.failed} failed.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
                  <button className="btn-secondary" onClick={() => { setStep(1); setFile(null); }}>Import More</button>
                  <button className="btn-primary" onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
      `}</style>
    </div>
  );
}
