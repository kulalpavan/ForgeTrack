import { useState, useMemo, useEffect } from 'react';
import { Upload as UploadIcon, CheckCircle2, Sparkles, Loader, FileText, Brain, Database, Check, AlertTriangle, FolderOpen, Calendar, CalendarDays } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

const parseDateString = (raw) => {
  if (!raw && raw !== 0) return null;

  // Handle Excel numeric dates (usually > 30000 for recent dates)
  if (typeof raw === 'number') {
    if (raw < 1000) return null; // Too small to be a real Excel date
    const dt = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
  }

  if (raw instanceof Date) return raw.toISOString().split('T')[0];
  const value = String(raw).trim();
  if (!value) return null;

  // Immediately reject obvious non-dates
  if (/^day\s*\d+/i.test(value)) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // DD/MM/YY or DD/MM/YYYY or DD-MM-YYYY
  const slash = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slash) {
    let [, d, m, y] = slash;
    if (y.length === 2) y = '20' + y;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-Mon-YY or DD-Mon
  const dashMon = value.match(/^(\d{1,2})-([A-Za-z]{3})(?:[\/\-](\d{2,4}))?$/);
  if (dashMon) {
    const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const month = months[dashMon[2].toLowerCase()];
    if (month) {
      let year = dashMon[3];
      if (!year) year = new Date().getFullYear();
      else if (year.length === 2) year = '20' + year;
      return `${year}-${String(month).padStart(2, '0')}-${dashMon[1].padStart(2, '0')}`;
    }
  }

  // Fallback to JS Date parsing, but only if it has some date-like characters
  if (/[a-zA-Z]{3,}/.test(value) || /[\/\-]/.test(value)) {
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }

  return null;
};

const normalizePresent = (val) => {
  const value = String(val === undefined || val === null ? '' : val).trim().toUpperCase();
  if (!value) return false;  // blank cells = absent
  // Explicit absent markers
  if (['FALSE', 'A', 'ABSENT', '0', 'N', 'NO', 'NOT ATTENDED', '-'].includes(value)) return false;
  // Explicit present markers
  if (['TRUE', 'P', 'PRESENT', '1', 'Y', 'YES', 'ATTENDED', 'X'].includes(value)) return true;
  // Fallback: any non-empty non-zero value counts as present
  return value !== '0' && value.length > 0;
};

const cleanHeader = (value, index) => {
  const header = String(value || '').trim();
  return header || `Column ${index + 1}`;
};

// ─── Date-wise grouped preview accordion ────────────────────────────────────
function DateWisePreview({ validatedData }) {
  const [openDates, setOpenDates] = useState({});

  const grouped = useMemo(() => {
    const map = {};
    validatedData.forEach((row) => {
      const key = row.date || 'Unknown';
      if (!map[key]) map[key] = [];
      map[key].push(row);
    });
    // Sort keys chronologically
    return Object.entries(map).sort(([a], [b]) => {
      const da = new Date(a), db = new Date(b);
      if (!isNaN(da) && !isNaN(db)) return da - db;
      return a.localeCompare(b);
    });
  }, [validatedData]);

  useEffect(() => {
    if (grouped.length > 0) {
      setOpenDates({ [grouped[0][0]]: true });
    }
  }, [grouped]);

  const toggle = (date) =>
    setOpenDates((prev) => ({ ...prev, [date]: !prev[date] }));

  const formatDate = (raw) => {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: '460px', paddingRight: '2px' }}>
      {grouped.map(([date, rows]) => {
        const presentCount = rows.filter((r) => r.present).length;
        const absentCount = rows.length - presentCount;
        const total = rows.length;
        const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;
        const isOpen = !!openDates[date];
        
        return (
          <div key={date} style={{ flexShrink: 0, borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            {/* Header row — always visible */}
            <button
              onClick={() => toggle(date)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', background: 'var(--bg-surface)', border: 'none', cursor: 'pointer',
                borderBottom: isOpen ? '1px solid var(--border-subtle)' : 'none',
                color: 'var(--text-primary)', font: 'inherit', outline: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                  background: 'var(--accent-glow-soft)', color: 'var(--accent-fg)', whiteSpace: 'nowrap'
                }}>
                  {formatDate(date)}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{total} students</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success-fg)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', padding: '2px 10px', borderRadius: '999px' }}>
                  ✓ {presentCount} Present
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--danger-fg)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', padding: '2px 10px', borderRadius: '999px' }}>
                  ✗ {absentCount} Absent
                </span>
                <span style={{ 
                  fontSize: '12px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px',
                  color: percentage >= 75 ? 'var(--success-fg)' : percentage >= 50 ? 'var(--warning-fg)' : 'var(--danger-fg)',
                  background: percentage >= 75 ? 'var(--success-bg)' : percentage >= 50 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                  border: `1px solid ${percentage >= 75 ? 'var(--success-border)' : percentage >= 50 ? 'var(--warning-border)' : 'var(--danger-border)'}`
                }}>
                  {percentage}% Attendance
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '16px', marginLeft: 4, transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              </div>
            </button>

            {/* Expandable student list */}
            {isOpen && (
              <div style={{ background: 'var(--bg-void)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface-raised)' }}>
                      <th style={{ padding: '8px 18px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>USN</th>
                      <th style={{ padding: '8px 18px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Student Name</th>
                      <th style={{ padding: '8px 18px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '8px 18px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Branch Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 18px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{row.usn}</td>
                        <td style={{ padding: '10px 18px', color: 'var(--text-secondary)', fontSize: '13px' }}>{row.student_name || '—'}</td>
                        <td style={{ padding: '10px 18px' }}>
                          {row.present
                            ? <span className="pill" style={{ background: 'var(--success-bg)', color: 'var(--success-fg)', border: '1px solid var(--success-border)' }}>Present</span>
                            : <span className="pill" style={{ background: 'var(--danger-bg)', color: 'var(--danger-fg)', border: '1px solid var(--danger-border)' }}>Absent</span>}
                        </td>
                        <td style={{ padding: '10px 18px', color: 'var(--text-secondary)', fontSize: '13px' }}>{row.branch_code || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Upload() {
  const [step, setStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [workbookSheets, setWorkbookSheets] = useState([]);
  const [selectedSheetNames, setSelectedSheetNames] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [mappingInfo, setMappingInfo] = useState(null);
  const [validatedData, setValidatedData] = useState([]);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [duplicateAction, setDuplicateAction] = useState('merge');
  const [duplicateChecked, setDuplicateChecked] = useState(false);
  const { showToast } = useToast();

  const [processingAi, setProcessingAi] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  const steps = [
    { id: 1, name: 'Upload File' },
    { id: 2, name: 'AI Mapping' },
    { id: 2.5, name: 'Schedule' },
    { id: 3, name: 'Review' },
    { id: 4, name: 'Import' }
  ];

  // Schedule config state
  const [scheduleNeeded, setScheduleNeeded] = useState(false);
  const [scheduleStart, setScheduleStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionDays, setSessionDays] = useState({ 0: false, 1: false, 2: true, 3: true, 4: false, 5: true, 6: false }); // Wed, Thu, Sat default
  const [skipFirstSat, setSkipFirstSat] = useState(true);
  const [skipThirdSat, setSkipThirdSat] = useState(true);
  const [pendingMappingInfo, setPendingMappingInfo] = useState(null);
  const [dayLabels, setDayLabels] = useState([]); // e.g. ["Day 1 Attendance", "Day 2 Attendance"]

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Returns true if a given Date is a 1st or 3rd Saturday
  const isHolidaySaturday = (date) => {
    if (date.getDay() !== 6) return false;
    const day = date.getDate();
    const weekNum = Math.ceil(day / 7);
    return (skipFirstSat && weekNum === 1) || (skipThirdSat && weekNum === 3);
  };

  // Generates session dates from startDate matching sessionDays, skipping holiday Saturdays
  const generateSessionDates = (startDateStr, count) => {
    const dates = [];
    const cursor = new Date(startDateStr);
    cursor.setHours(12, 0, 0, 0);
    let safetyLimit = 500;
    while (dates.length < count && safetyLimit-- > 0) {
      const dow = cursor.getDay();
      if (sessionDays[dow] && !isHolidaySaturday(cursor)) {
        dates.push(cursor.toISOString().split('T')[0]);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  };

  // Preview of generated dates for display
  const previewDates = useMemo(() => {
    if (!dayLabels.length) return [];
    return generateSessionDates(scheduleStart, dayLabels.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleStart, sessionDays, skipFirstSat, skipThirdSat, dayLabels.length]);

  const handleXlsxFile = async (selectedFile) => {
    const buffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const parsed = workbook.SheetNames.map((name) => {
      const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });

      // Smart header detection: find the row with the most text columns in the first 20 rows
      let headerRowIndex = 0;
      let maxCols = 0;
      for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
        const row = rawRows[i];
        const colCount = row ? row.filter(c => String(c || '').trim()).length : 0;
        if (colCount > maxCols) {
          maxCols = colCount;
          headerRowIndex = i;
        }
      }

      const headerRow = rawRows[headerRowIndex] || [];
      // To get the parent row, we need a row that has the "Day X" labels.
      // Usually it's the row right above the header row.
      const parentRow = headerRowIndex > 0 ? rawRows[headerRowIndex - 1] : null;

      // We need to carry forward the "Day X" label across empty columns if they represent merged cells.
      let currentParentH = '';

      const headers = headerRow.map((h, i) => {
        let cleanH = String(h || '').trim();

        // Update currentParentH if there's a new value in the parent row
        if (parentRow && parentRow[i]) {
          const p = String(parentRow[i]).trim();
          if (p) currentParentH = p;
        }

        // Combine multi-row headers
        if (currentParentH && cleanH) {
          // Avoid prefixing generic things like 'usn' or 'name' with 'Day 1' if they appear before the first day
          // Usually 'Day X' starts later. We can check if cleanH is 'attendance' or similar.
          // In this file, Attendance, Knowledge, Skill repeat.
          if (['attendance', 'knowledge', 'skill'].some(k => cleanH.toLowerCase().includes(k))) {
            cleanH = `${currentParentH} ${cleanH}`;
          }
        }

        return cleanH || `Column ${i + 1}`;
      });

      // Ensure unique headers
      const usedHeaders = new Map();
      const finalHeaders = headers.map((h) => {
        let uniqueH = h;
        const count = usedHeaders.get(h) || 0;
        if (count > 0) uniqueH = `${h} (${count})`;
        usedHeaders.set(h, count + 1);
        return uniqueH;
      });

      const rows = rawRows.slice(headerRowIndex + 1)
        .filter((row) => row.some((cell) => cell !== '' && cell !== null && cell !== undefined))
        // Skip rows that look like a repeat of the header
        .filter((row) => !row.includes('usn') && !row.includes('USN'))
        .map((row) => {
          const obj = {};
          finalHeaders.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

      return {
        name,
        headers: finalHeaders,
        rows,
        sampleData: rows.slice(0, 5)
      };
    });

    setWorkbookSheets(parsed);
    setSelectedSheetNames(parsed.map((sheet) => sheet.name));
    setTimeout(() => setStep(1), 50);
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setImportStatus('Reading file...');
    setDuplicateInfo(null);
    setDuplicateChecked(false);
    setDuplicateAction('merge');
    setImportResult(null);
    setValidatedData([]);
    setMappingInfo(null);

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvHeaders(results.meta.fields || []);
          setCsvData(results.data);
          setWorkbookSheets([]);
          setSelectedSheetNames([]);
          showToast('CSV file read successfully', 'success');
          setStep(2);
        },
        error: (err) => {
          showToast('Failed to parse CSV: ' + err.message, 'error');
        }
      });
      return;
    }

    if (['xlsx', 'xls', 'xlsm'].includes(ext)) {
      handleXlsxFile(selectedFile).catch((err) => {
        console.error('XLSX parse error', err);
        showToast('Failed to parse spreadsheet file', 'error');
      });
      return;
    }

    showToast('Unsupported file type. Please upload CSV or XLSX.', 'error');
  };

  const toggleSheetSelection = (name) => {
    setSelectedSheetNames((current) => {
      if (current.includes(name)) {
        return current.filter((sheet) => sheet !== name);
      }
      return [...current, name];
    });
  };

  const confirmSheetSelection = () => {
    const selected = workbookSheets.filter((sheet) => selectedSheetNames.includes(sheet.name));
    if (!selected.length) {
      showToast('Please select at least one sheet to import.', 'error');
      return;
    }

    const combinedHeaders = Array.from(new Set(selected.flatMap((sheet) => sheet.headers)));
    const combinedRows = selected.flatMap((sheet) => sheet.rows.map((row) => ({ ...row, _sheetName: sheet.name })));

    setCsvHeaders(combinedHeaders);
    setCsvData(combinedRows);
    setWorkbookSheets([]);
    setStep(2);
    showToast(`Selected ${selected.length} worksheet(s)`, 'success');
  };

  const askAiAgent = async () => {
    setProcessingAi(true);
    setError('');
    setImportStatus('AI Agent is analyzing the file...');
    try {
      const sample = csvData.slice(0, 15);  // send more rows for better accuracy
      const result = await api.mapCsv(csvHeaders, sample);
      setMappingInfo(result);
      showToast('AI Mapping complete', 'success');

      // Check if any mapped columns are "Day N" style labels or real date headers (no parseable date as column name means schedule needed)
      const mapping = result.mapping || {};
      const dateCols = Object.keys(mapping).filter(k => String(mapping[k]).toLowerCase() === 'date');

      // A date column "needs schedule" if its header cannot be parsed as a real calendar date
      // This covers: "Day 1 Attendance", "Day 2", and any other non-date labels
      const isRealDate = (key) => {
        // Check for common date patterns: DD/MM/YY, YYYY-MM-DD, MM-DD-YY, etc.
        const s = key.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return true;
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s)) return true;
        if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(s)) return true;
        const dt = new Date(s);
        return !isNaN(dt.getTime()) && dt.getFullYear() > 2000;
      };
      const hasDayLabels = dateCols.some(k => !isRealDate(k));

      if (hasDayLabels) {
        // Need schedule config — use ALL label-based date cols (not just "Day N" pattern)
        setDayLabels(dateCols.filter(k => !isRealDate(k)));
        setPendingMappingInfo(result);
        setScheduleNeeded(true);
        setStep(2.5);
      } else {
        // Real dates — skip schedule step
        processMappedData(result, null);
        setStep(3);
      }
    } catch (err) {
      console.error('AI Mapping Error:', err);
      const errorMsg = err.message || 'AI Agent failed to map columns';
      setError(errorMsg);
      showToast(errorMsg, errorMsg.includes('overloaded') ? 'warning' : 'error');
    } finally {
      setProcessingAi(false);
    }
  };

  const applySchedule = () => {
    if (!Object.values(sessionDays).some(Boolean)) {
      showToast('Please select at least one session day.', 'error');
      return;
    }
    if (previewDates.length < dayLabels.length) {
      showToast('Not enough dates generated. Extend the date range or add more session days.', 'error');
      return;
    }
    // Build a map: dayLabel -> real date
    const dateMap = {};
    dayLabels.forEach((label, i) => { dateMap[label.toLowerCase()] = previewDates[i]; });
    processMappedData(pendingMappingInfo, dateMap);
    setStep(3);
  };

  const processMappedData = (info, dateMap = null) => {
    const records = [];
    const mapping = info.mapping || {};

    // Build a normalized map: lowercase_header -> target_field
    const normalizedMap = {};
    Object.keys(mapping).forEach((key) => {
      normalizedMap[key.trim().toLowerCase()] = String(mapping[key]).trim().toLowerCase();
    });

    // Find the USN key once
    const usnKey = Object.keys(normalizedMap).find((k) => normalizedMap[k] === 'usn')
      || Object.keys(normalizedMap).find((k) => k === 'usn' || k.includes('usn'));

    if (!usnKey) {
      showToast('AI could not find a USN column. Please check your file has a USN/Student ID column.', 'error');
      setError('No USN column found in mapping.');
      return;
    }

    // Find student info keys (once per row, not per date)
    const nameKey = Object.keys(normalizedMap).find((k) => normalizedMap[k] === 'student_name');
    const emailKey = Object.keys(normalizedMap).find((k) => normalizedMap[k] === 'email'
      || k === 'email');
    const branchKey = Object.keys(normalizedMap).find((k) => k.includes('branch'));

    // Collect all date column keys
    const dateKeys = Object.keys(normalizedMap).filter((k) => normalizedMap[k] === 'date');

    csvData.forEach((row) => {
      // Normalize row keys to lowercase
      const lowerRow = {};
      Object.keys(row).forEach((key) => {
        lowerRow[key.trim().toLowerCase()] = row[key];
      });

      // Get USN value
      let usnValue = String(lowerRow[usnKey] || '').toUpperCase().trim();
      // Strip any non-alphanumeric prefix/suffix noise
      usnValue = usnValue.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');
      if (!usnValue) return;

      // Per-student info
      const studentName = nameKey ? String(lowerRow[nameKey] || '').trim() : '';
      const email = emailKey ? String(lowerRow[emailKey] || '').trim() : '';
      const branchCode = branchKey ? String(lowerRow[branchKey] || '').trim() : '';

      if (info.is_pivoted) {
        // Each date column = one attendance record per student
        dateKeys.forEach((key) => {
          const rawValue = lowerRow[key];
          // Note: we INCLUDE blank cells as Absent (do not skip them)
          // Only skip if the entire row has no value for this key AND it's truly undefined (not just empty string)
          
          // Use dateMap if provided (from schedule), else try to parse header as real date
          let dateLabel;
          if (dateMap && dateMap[key]) {
            dateLabel = dateMap[key];
          } else {
            dateLabel = parseDateString(key) || key;
          }

          // blank/null/undefined = absent; any truthy marker = present
          const present = (rawValue !== undefined && rawValue !== null)
            ? normalizePresent(rawValue)
            : false;

          records.push({
            usn: usnValue,
            date: dateLabel,
            present,
            status: 'valid',
            student_name: studentName,
            email,
            branch_code: branchCode,
            sheetName: row._sheetName
          });
        });
      } else {
        // Standard format: one date per row
        const dateKey = Object.keys(normalizedMap).find((k) => normalizedMap[k] === 'date');
        const statusKey = Object.keys(normalizedMap).find((k) => normalizedMap[k] === 'attendance_status');

        let dateValue = dateKey ? lowerRow[dateKey] : null;
        const presentValue = statusKey ? normalizePresent(lowerRow[statusKey]) : false;

        if (!dateValue) {
          // Try to find a date in any column value
          Object.values(lowerRow).some((v) => {
            const c = parseDateString(v);
            if (c) { dateValue = c; return true; }
            return false;
          });
        }

        const dateLabel = parseDateString(dateValue) || String(dateValue || '').trim();
        if (!dateLabel) return;

        records.push({
          usn: usnValue,
          date: dateLabel,
          present: presentValue,
          status: 'valid',
          student_name: studentName,
          email,
          branch_code: branchCode,
          sheetName: row._sheetName
        });
      }
    });

    setValidatedData(records);
    if (records.length > 0) {
      runDuplicatePreview(records);
    } else {
      setError('No records could be extracted. Check that your file has USN and attendance columns.');
      showToast('No records extracted — check file format', 'error');
    }
  };

  const runDuplicatePreview = async (records = validatedData) => {
    const uniqueDates = Array.from(new Set(records.map((row) => row.date).filter(Boolean)));
    if (!uniqueDates.length) return;

    try {
      const preview = await api.previewImport({ dates: uniqueDates });
      setDuplicateInfo(preview);
      setDuplicateChecked(true);
      if (preview.duplicates?.length) {
        showToast('Duplicate session dates detected. Please confirm import behavior.', 'warning');
      }
    } catch (err) {
      console.error('Duplicate preview failed', err);
    }
  };

  const startImport = async (skipDuplicates = false) => {
    setStep(4);
    setImporting(true);
    setImportProgress(10);
    setImportStatus('Analyzing records...');

    try {
      await new Promise((r) => setTimeout(r, 800));
      setImportProgress(40);
      setImportStatus(`Preparing to import ${validatedData.length} records...`);
      await new Promise((r) => setTimeout(r, 800));
      setImportProgress(70);
      setImportStatus('Writing to database...');

      const options = {};
      if (skipDuplicates && duplicateInfo?.duplicates?.length) {
        options.skipDates = duplicateInfo.duplicates.map((dup) => dup.date);
      }

      const result = await api.bulkAddAttendance(validatedData, options);

      setImportProgress(100);
      setImportStatus('Done!');
      setImportResult(result);
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
                {step > s.id ? <CheckCircle2 size={16} className="text-success" /> : s.id === 2.5 ? <CalendarDays size={14} /> : s.id}
              </div>
              <span className={`text-caption ${step === s.id ? 'text-primary' : 'text-tertiary'}`} style={{ whiteSpace: 'nowrap' }}>
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
              <input type="file" id="csv-input" accept=".csv,.xlsx,.xls,.xlsm" hidden onChange={handleFileUpload} />
              <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
                <UploadIcon size={32} className="text-accent" />
              </div>
              <h2 className="text-h2 text-primary" style={{ marginBottom: 'var(--space-2)' }}>Drop CSV or Spreadsheet here</h2>
              <p className="text-body text-secondary">Supports CSV and Excel workbooks. Select one or more sheets after upload.</p>
            </div>

            {workbookSheets.length > 0 && (
              <div style={{ marginTop: 'var(--space-10)', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <FolderOpen size={20} className="text-primary" />
                  <span className="text-body text-primary">Select sheets to import</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                  {workbookSheets.map((sheet) => (
                    <label key={sheet.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: selectedSheetNames.includes(sheet.name) ? '1px solid var(--accent-fg)' : '1px solid var(--border-subtle)', background: selectedSheetNames.includes(sheet.name) ? 'var(--accent-glow-soft)' : 'transparent', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedSheetNames.includes(sheet.name)} onChange={() => toggleSheetSelection(sheet.name)} />
                      <div>
                        <div className="text-body-medium text-primary">{sheet.name}</div>
                        <div className="text-caption text-secondary">{sheet.rows.length} rows</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)' }}>
                  <button className="btn-secondary" onClick={() => { setFile(null); setWorkbookSheets([]); setSelectedSheetNames([]); setError(''); }}>Clear</button>
                  <button className="btn-primary" onClick={confirmSheetSelection}>Continue</button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-glow-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-6)' }} className="pulse">
              <Sparkles size={32} className="text-accent" />
            </div>
            <h2 className="text-h2 text-primary" style={{ marginBottom: 'var(--space-2)' }}>File Loaded</h2>
            <p className="text-body text-secondary" style={{ marginBottom: 'var(--space-8)' }}>
              Found {csvData.length} rows and {csvHeaders.length} columns across the selected sheet(s).
              <br />Our AI Agent will now reason about the format, names, and date conventions.
            </p>
            {error && <p className="text-danger" style={{ marginBottom: '16px' }}>{error}</p>}
            <button className="btn-primary" onClick={askAiAgent} disabled={processingAi} style={{ minWidth: '200px', justifyContent: 'center' }}>
              {processingAi ? <><Loader size={18} className="spin" /> Analyzing...</> : 'Start AI Analysis'}
            </button>
          </div>
        )}

        {step === 2.5 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <CalendarDays size={24} className="text-accent" />
              <div>
                <h3 className="text-h3 text-primary">Session Schedule</h3>
                <p className="text-caption text-secondary">Your file uses Day labels (Day 1, Day 2…). Map them to actual dates using your session schedule.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
              {/* Left: Config */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {/* Start Date */}
                <div style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }}>
                  <label className="text-body-medium text-primary" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                    <Calendar size={14} style={{ display: 'inline', marginRight: 6 }} />
                    Programme Start Date
                  </label>
                  <input
                    type="date"
                    value={scheduleStart}
                    onChange={e => setScheduleStart(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', background: 'var(--bg-void)', color: 'var(--text-primary)', fontSize: '14px' }}
                  />
                </div>

                {/* Session Days */}
                <div style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-body-medium text-primary" style={{ marginBottom: 'var(--space-3)' }}>Session Days</p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {DAY_NAMES.map((name, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSessionDays(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        style={{
                          padding: '8px 14px', borderRadius: 'var(--radius-lg)', fontSize: '13px', fontWeight: '600',
                          cursor: 'pointer', border: '1px solid',
                          background: sessionDays[idx] ? 'var(--accent-glow)' : 'var(--bg-void)',
                          borderColor: sessionDays[idx] ? 'var(--accent-fg)' : 'var(--border-subtle)',
                          color: sessionDays[idx] ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          transition: 'all 0.15s'
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Saturday Holidays */}
                {sessionDays[6] && (
                  <div style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }}>
                    <p className="text-body-medium text-primary" style={{ marginBottom: 'var(--space-3)' }}>Saturday Holidays</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={skipFirstSat} onChange={e => setSkipFirstSat(e.target.checked)} style={{ width: 16, height: 16 }} />
                        <span className="text-body text-secondary">1st Saturday is a holiday</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={skipThirdSat} onChange={e => setSkipThirdSat(e.target.checked)} style={{ width: 16, height: 16 }} />
                        <span className="text-body text-secondary">3rd Saturday is a holiday</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Preview */}
              <div style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)', overflow: 'auto', maxHeight: '360px' }}>
                <p className="text-body-medium text-primary" style={{ marginBottom: 'var(--space-3)' }}>
                  Session Date Preview
                  <span className="text-caption text-secondary" style={{ marginLeft: 8 }}>({previewDates.length} of {dayLabels.length} days)</span>
                </p>
                {previewDates.length === 0 ? (
                  <p className="text-caption text-secondary">Select at least one session day to see dates.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {dayLabels.map((label, i) => {
                      const date = previewDates[i];
                      const dow = date ? new Date(date).getDay() : null;
                      return (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-void)', border: '1px solid var(--border-subtle)' }}>
                          <span className="text-caption text-secondary">{label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            {date ? (
                              <>
                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'var(--accent-glow-soft)', color: 'var(--accent-fg)', fontWeight: 600 }}>
                                  {DAY_FULL[dow]}
                                </span>
                                <span className="text-body-medium text-primary" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                                  {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </>
                            ) : (
                              <span className="text-caption" style={{ color: 'var(--danger-fg)' }}>No date — add more session days</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn-primary" onClick={applySchedule} disabled={previewDates.length < dayLabels.length}>
                Apply Schedule & Preview →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h3 className="text-h3 text-primary">Data Preview</h3>
                <p className="text-caption text-secondary mt-1">
                  AI detected format: {mappingInfo?.is_pivoted ? 'Pivoted Dates' : 'Standard'}
                  {mappingInfo?.date_format ? ` | Date format: ${mappingInfo.date_format}` : ''}
                </p>
              </div>
              <p className="text-body-sm text-secondary">{validatedData.length} records ready</p>
            </div>

            {duplicateInfo?.duplicates?.length > 0 && (
              <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-3)' }}>
                  <AlertTriangle size={20} className="text-danger" />
                  <div>
                    <p className="text-body-medium text-danger">Duplicate session dates detected.</p>
                    <p className="text-caption text-danger">One or more imported dates already exist in the database. Choose whether to merge attendance or skip duplicates.</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: 'var(--space-4)' }}>
                  {duplicateInfo.duplicates.map((dup) => (
                    <div key={dup.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)' }}>
                      <div>
                        <div className="text-body text-primary">{dup.date}</div>
                        <div className="text-caption text-secondary">{dup.topic || 'Imported Session'} • {dup.existingCount} existing attendance rows</div>
                      </div>
                      <div className="text-caption text-secondary">Session ID: {dup.sessionId.toString().slice(-6)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <button className={duplicateAction === 'merge' ? 'btn-primary' : 'btn-secondary'} onClick={() => setDuplicateAction('merge')}>
                    Merge / Update existing sessions
                  </button>
                  <button className={duplicateAction === 'skip' ? 'btn-primary' : 'btn-secondary'} onClick={() => setDuplicateAction('skip')}>
                    Skip duplicate dates
                  </button>
                </div>
              </div>
            )}
            {/* Date-wise grouped accordion */}
            <DateWisePreview validatedData={validatedData} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary" onClick={() => startImport(duplicateAction === 'skip')} disabled={importing}>
                Confirm & Import
              </button>
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
                  Successfully imported {importResult.success} records. {importResult.failed} failed. {importResult.skipped ? `${importResult.skipped} skipped.` : ''}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
                  <button className="btn-secondary" onClick={() => { setStep(1); setFile(null); setValidatedData([]); setCsvData([]); setCsvHeaders([]); setMappingInfo(null); setDuplicateInfo(null); }}>Import More</button>
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
