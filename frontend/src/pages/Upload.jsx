import { useState } from 'react';
import { Upload as UploadIcon, CheckCircle2, Sparkles, Loader } from 'lucide-react';
import Papa from 'papaparse';
import { api } from '../lib/api';

export default function Upload() {
  const [step, setStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [mappingInfo, setMappingInfo] = useState(null);
  const [validatedData, setValidatedData] = useState([]);
  
  // Loading states
  const [processingAi, setProcessingAi] = useState(false);
  const [importing, setImporting] = useState(false);
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
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvHeaders(results.meta.fields || []);
        setCsvData(results.data);
        setStep(2);
      }
    });
  };

  const askAiAgent = async () => {
    setProcessingAi(true);
    setError('');
    try {
      // Send headers and first 5 rows to Gemini API
      const sample = csvData.slice(0, 5);
      const result = await api.mapCsv(csvHeaders, sample);
      setMappingInfo(result);
      processMappedData(result);
      setStep(3);
    } catch (err) {
      console.error(err);
      setError('AI Mapping failed. ' + err.message);
    } finally {
      setProcessingAi(false);
    }
  };

  /**
   * Parses messy date strings from Forge CSV exports into YYYY-MM-DD.
   * Handles: DD/M/YY  DD/MM/YY  DD/MM/YYYY  DD-MMM  YYYY-MM-DD
   */
  function parseDateString(raw) {
    if (!raw) return null;
    const s = String(raw).trim();

    // Already ISO: 2026-04-15
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // DD/M/YY or DD/MM/YY or DD/MM/YYYY or DD-MM-YYYY
    const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (slash) {
      let [, d, m, y] = slash;
      if (y.length === 2) y = '20' + y;       // 26 → 2026
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }

    // DD-MMM (e.g. 15-Apr)  — assumes current year
    const dashMon = s.match(/^(\d{1,2})-([A-Za-z]{3})$/);
    if (dashMon) {
      const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
      const m = months[dashMon[2].toLowerCase()];
      if (m) {
        const y = new Date().getFullYear();
        return `${y}-${String(m).padStart(2,'0')}-${dashMon[1].padStart(2,'0')}`;
      }
    }

    // Last resort — let JS try and reformat
    const d = new Date(s);
    if (!isNaN(d)) return d.toISOString().split('T')[0];

    return null; // unparseable
  }

  const processMappedData = (info) => {
    const records = [];
    const mapping = info.mapping || {};
    console.log('[Upload] AI Mapping received:', mapping);
    console.log('[Upload] is_pivoted:', info.is_pivoted);
    
    // Convert to standard format
    csvData.forEach((row, index) => {
      // Build a safe row object with lowercase keys to match against AI mapping keys safely
      const lowerRow = {};
      Object.keys(row).forEach(k => {
        lowerRow[k.trim().toLowerCase()] = row[k];
      });

      // Build a safe mapping object with lowercase keys
      const safeMapping = {};
      Object.keys(mapping).forEach(k => {
        safeMapping[k.trim().toLowerCase()] = String(mapping[k]).toLowerCase();
      });

      // Find USN
      let usn = '';
      Object.keys(safeMapping).forEach(k => {
        if (safeMapping[k] === 'usn') usn = lowerRow[k];
      });

      if (!usn) {
        console.warn(`[Upload] Row ${index} skipped: Missing USN. Row data:`, lowerRow);
        return; // Skip if no USN
      }
      usn = usn.toString().toUpperCase().trim();

      if (info.is_pivoted) {
        // Unpivot dates
        Object.keys(safeMapping).forEach(colName => {
          if (safeMapping[colName] === 'date') {
            const val = lowerRow[colName];
            if (val === undefined || val === null || val === '') return;

            // In pivoted, the column name IS the date. Find the original case header for parsing
            const originalHeader = Object.keys(row).find(orig => orig.trim().toLowerCase() === colName);
            const isoDate = parseDateString(originalHeader || colName);
            
            if (!isoDate) {
              console.warn('Could not parse date header:', originalHeader);
              return;
            }

            const vStr = String(val).toUpperCase().trim();
            const present = ['TRUE', 'P', 'PRESENT', '1', 'Y', 'YES'].includes(vStr);
            records.push({ usn, date: isoDate, present, status: 'valid' });
          }
        });
      } else {
        // Standard format
        let dateVal = '';
        let presentVal = false;
        
        Object.keys(safeMapping).forEach(k => {
          if (safeMapping[k] === 'date') dateVal = lowerRow[k];
          if (safeMapping[k] === 'attendance_status') {
            const vStr = String(lowerRow[k]).toUpperCase().trim();
            presentVal = ['TRUE', 'P', 'PRESENT', '1', 'Y', 'YES'].includes(vStr);
          }
        });

        if (!dateVal) {
          console.warn(`[Upload] Row ${index}: Mapping did not assign 'date'. Falling back to today's date.`);
          dateVal = new Date().toISOString().split('T')[0];
        }

        const isoDate = parseDateString(dateVal);
        if (isoDate) {
          records.push({ usn, date: isoDate, present: presentVal, status: 'valid' });
        } else {
          console.warn(`[Upload] Row ${index} skipped: parseDateString failed for dateVal:`, dateVal);
        }
      }
    });

    console.log(`[Upload] Processed ${records.length} attendance records from ${csvData.length} CSV rows`);
    setValidatedData(records);
  };

  const startImport = async () => {
    setStep(4);
    setImporting(true);
    
    try {
      const result = await api.bulkAddAttendance(validatedData);
      setImportResult({ 
        success: result.success, 
        failed: result.failed, 
        total: result.total 
      });
    } catch (err) {
      console.error('Import failed:', err);
      setImportResult({ success: 0, failed: validatedData.length, total: validatedData.length });
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

      {/* Step Indicator */}
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

      <div className="card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        {/* Step 1: Upload */}
        {step === 1 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }}
              style={{ 
                border: `1px dashed ${isDragging ? 'var(--accent-glow)' : 'var(--border-default)'}`,
                background: isDragging ? 'var(--accent-glow-soft)' : 'transparent',
                borderRadius: 'var(--radius-2xl)', padding: 'var(--space-16)', cursor: 'pointer'
              }}
              onClick={() => document.getElementById('csv-input').click()}
            >
              <input type="file" id="csv-input" accept=".csv" hidden onChange={handleFileUpload} />
              <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
                <UploadIcon size={32} className="text-accent" />
              </div>
              <h2 className="text-h2 text-primary" style={{ marginBottom: 'var(--space-2)' }}>Drop your CSV here</h2>
              <p className="text-body text-secondary">Historical Attendance Export from Google Sheets</p>
            </div>
          </div>
        )}

        {/* Step 2: AI Mapping */}
        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-glow-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
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

        {/* Step 3: Review */}
        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 className="text-h3 text-primary">Data Preview</h3>
              <p className="text-caption text-secondary mt-1">
                AI detected format: {mappingInfo?.is_pivoted ? 'Pivoted Dates' : 'Standard'} 
                | Date Format: {mappingInfo?.date_format}
              </p>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-void)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface-raised)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>USN</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>Date</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>Present</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedData.slice(0, 50).map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{row.usn}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{row.date}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {row.present ? <span className="text-success text-caption" style={{ padding: '4px 8px', background: 'var(--success-bg)', borderRadius: '4px' }}>Present</span> : <span className="text-danger text-caption" style={{ padding: '4px 8px', background: 'var(--danger-bg)', borderRadius: '4px' }}>Absent</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>Cancel</button>
              <button className="btn-primary" onClick={startImport}>Confirm & Import {validatedData.length} Records</button>
            </div>
          </div>
        )}

        {/* Step 4: Import */}
        {step === 4 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            {importing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ marginBottom: 'var(--space-8)' }}>
                  <Loader size={40} className="text-accent" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <h2 className="text-h2 text-primary" style={{ marginBottom: 'var(--space-2)' }}>Importing Data...</h2>
                <p className="text-body text-secondary" style={{ marginBottom: 'var(--space-8)' }}>Please do not close this window.</p>
              </div>
            ) : importResult && (
              <div>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  background: 'var(--success-bg)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto var(--space-8)',
                  border: '1px solid var(--success-border)'
                }}>
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
      `}</style>
    </div>
  );
}
