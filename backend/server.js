const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dns = require('dns');
require('dotenv').config();

// Fix for querySrv ECONNREFUSED in certain environments
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('./models/User');
const Student = require('./models/Student');
const Session = require('./models/Session');
const Attendance = require('./models/Attendance');
const Material = require('./models/Material');
const ActivityLog = require('./models/ActivityLog');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In production, serve the frontend dist folder
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}


const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fake_key');


// Helper for activity logging
async function logActivity(userId, action, details) {
  try {
    const log = new ActivityLog({ userId, action, details });
    await log.save();
  } catch (err) {
    console.error('Activity logging failed', err);
  }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/forgetrack')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('Connection Error:', err));

/* ── AUTH ROUTES ───────────────────────────────────────────── */

// Login
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  const loginId = String(identifier || '').toUpperCase().trim();

  try {
    // 1. Search by User record first (Mentors and registered Students)
    let user = await User.findOne({
      $or: [
        { email: identifier },
        { usn: loginId }
      ]
    }).populate('studentId');

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        return sendToken(user, res);
      }
    }

    // 2. Fallback: Search Student record (Auto-auth via USN)
    // Every student can login with USN as both username and password
    const student = await Student.findOne({ usn: loginId });
    if (student && password.toUpperCase().trim() === loginId) {
      // Mock a user object for the token
      const mockUser = {
        id: `temp_${student._id}`, // Pre-fixed to distinguish from real User records
        _id: student._id,
        role: 'student',
        studentId: student._id,
        usn: student.usn,
        displayName: student.name
      };
      return sendToken(mockUser, res);
    }

    return res.status(400).json({ msg: 'Invalid Credentials' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Helper to sign and send JWT
function sendToken(user, res) {
  const payload = {
    user: { 
      id: user.id || user._id, 
      role: user.role, 
      studentId: user.studentId?._id || user.studentId 
    }
  };

  jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
    if (err) throw err;
    res.json({ token, user: { 
      id: user.id || user._id, 
      email: user.email || '', 
      usn: user.usn,
      role: user.role, 
      displayName: user.displayName || user.name || user.usn,
      studentId: user.studentId?._id || user.studentId 
    }});
  });
}

// Get User Profile (Me)
const auth = require('./middleware/auth');
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('studentId');
    res.json(user);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update User Profile (Me)
app.put('/api/auth/me', auth, async (req, res) => {
  try {
    const { displayName, bio } = req.body;
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, select: '-password' }
    );
    res.json({ msg: 'Profile updated', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* ── API ROUTES ────────────────────────────────────────────── */

// Update Session (Mentor only)
app.put('/api/sessions/:id', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const { _id, ...updateData } = req.body;
    console.log(`[SessionUpdate] Updating ${req.params.id} with:`, updateData);
    
    const session = await Session.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!session) {
      console.warn(`[SessionUpdate] Session not found: ${req.params.id}`);
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    await logActivity(req.user.id, 'Session Updated', `Updated session: ${session.topic}`);
    res.json(session);
  } catch (err) {
    console.error('[SessionUpdate] Error:', err);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

// Stats Overview (Mentor only)
app.get('/api/stats/overview', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalSessions = await Session.countDocuments();
    const attendanceRecords = await Attendance.find();
    
    const presentCount = attendanceRecords.filter(a => a.present).length;
    const totalRecords = attendanceRecords.length;
    const avgAttendance = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    res.json({
      totalStudents,
      totalSessions,
      avgAttendance,
      activeMentors: 3 // Mocked for now
    });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Activity Log
app.get('/api/activity', auth, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(20);
    res.json(logs);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get All Sessions
app.get('/api/sessions', auth, async (req, res) => {
  try {
    const sessions = await Session.find().sort({ date: -1 });
    res.json(sessions);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create Session (Mentor only)
app.post('/api/sessions', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const newSession = new Session(req.body);
    const session = await newSession.save();
    await logActivity(req.user.id, 'Session Created', `Created session: ${session.topic}`);
    res.json(session);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete Session (Mentor only)
app.delete('/api/sessions/:id', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) return res.status(404).json({ msg: 'Session not found' });
    
    // Delete all attendance records associated with this session
    await Attendance.deleteMany({ sessionId: req.params.id });
    
    await logActivity(req.user.id, 'Session Deleted', `Deleted session: ${session.topic}`);
    res.json({ msg: 'Session deleted' });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get Students (Mentor only)
app.get('/api/students', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const students = await Student.find({ isActive: true }).sort({ name: 1 });
    res.json(students);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Bulk Insert Students (CSV Upload)
app.post('/api/students/bulk', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const students = req.body;
    const results = await Student.insertMany(students, { ordered: false }).catch(e => e.insertedDocs);
    const count = results?.length || students.length;
    await logActivity(req.user.id, 'Bulk Import', `Imported ${count} students`);
    res.json({ msg: 'Imported', count });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// AI Agent CSV Column Mapping
app.post('/api/ai/map-csv', auth, async (req, res) => {
  try {
    const { headers, sampleData } = req.body;
    if (!headers || !sampleData) {
      return res.status(400).json({ msg: 'Missing headers or sample data' });
    }

    const prompt = `
You are an expert data mapping AI for a student attendance system.
You receive CSV/spreadsheet column headers and sample row data. Your job is to classify each column.

TARGET FIELD TYPES:
- "usn"             : Student ID / roll number / USN (often like "4SX21CS001")
- "student_name"    : Student's full name
- "email"           : Email address
- "date"            : A date column — either a real date header (e.g. "15/4/26", "2026-04-15") OR a session label like "Day 1 Attendance", "Day 2 Attendance"
- "attendance_status": A single column indicating presence for that row's date (standard format)
- "IGNORE"          : Irrelevant columns (serial numbers, blank columns, remarks without data)
- Any other meaningful column (scores, assessments) → use a snake_case name like "knowledge_score", "skill_score", "pre_assessment"

FORMAT DETECTION RULES:
1. PIVOTED FORMAT (is_pivoted: true): The spreadsheet has ONE ROW PER STUDENT, and EACH DATE or day-label is a separate column. 
   - Signs: headers like "Day 1 Attendance", "Day 2 Attendance", "15/4/26", "04-15-26" appear as column names
   - All such date/day-label columns should be mapped to "date"
   - Values in these columns are attendance markers (TRUE, P, 1, Yes, X, etc.)
2. STANDARD FORMAT (is_pivoted: false): ONE ROW PER ATTENDANCE RECORD. Has a single date column and a single status column.

CRITICAL RULES:
- Use the EXACT column header string as the key in the mapping object (case-sensitive, spaces included)
- If you see headers like "Day 1 Attendance", "Day 2 Attendance" → set is_pivoted: true and map each to "date"
- Detect the attendance_convention from sample values (e.g. "TRUE/FALSE", "P/A", "1/0", "Present/Absent", "X/blank")
- Detect date_format from sample data or header names (e.g. "DD/MM/YY", "YYYY-MM-DD")
- Do NOT include markdown, backticks, or any text outside the JSON object

Return ONLY this JSON structure:
{
  "mapping": {
    "<Exact Header 1>": "usn",
    "<Exact Header 2>": "student_name",
    "<Exact Header 3>": "email",
    "<Exact Header 4>": "IGNORE",
    "Day 1 Attendance": "date",
    "Day 1 Knowledge(25)": "day_1_knowledge",
    "Pre Assessment Score(20)": "pre_assessment"
  },
  "is_pivoted": true,
  "date_format": "DD/M/YY",
  "attendance_convention": "TRUE/FALSE"
}

Headers: ${JSON.stringify(headers)}
Sample Data (first 15 rows): ${JSON.stringify(sampleData)}
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    res.json(parsed);
  } catch (err) {
    console.error('AI Mapping Error:', err);
    // Handle specific AI service errors
    if (err.status === 503 || (err.message && err.message.includes('503'))) {
      return res.status(503).json({ msg: 'AI service is currently overloaded. Please try again in a few minutes.' });
    }
    if (err.status === 404 || (err.message && err.message.includes('404'))) {
      return res.status(404).json({ msg: 'AI model not found. Please contact support.' });
    }
    if (err.status === 429 || (err.message && err.message.includes('429'))) {
      return res.status(429).json({ msg: 'Rate limit exceeded. Please wait before trying again.' });
    }
    
    res.status(500).json({ msg: `AI Mapping failed: ${err.message || 'Unknown error'}` });
  }
});

// Preview Import: detect existing sessions for target dates
app.post('/api/attendance/preview-import', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ msg: 'Missing dates for preview' });
    }

    const duplicates = [];
    for (const rawDate of dates) {
      const targetDate = parseDateSafe(rawDate);
      if (!targetDate) continue;

      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const session = await Session.findOne({ date: { $gte: dayStart, $lte: dayEnd } });
      if (session) {
        const existingCount = await Attendance.countDocuments({ sessionId: session._id });
        duplicates.push({
          date: targetDate.toISOString().split('T')[0],
          sessionId: session._id,
          topic: session.topic,
          existingCount
        });
      }
    }

    res.json({ duplicates, totalDates: dates.length });
  } catch (err) {
    console.error('Preview Import Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get Attendance for a Session
app.get('/api/attendance/:sessionId', auth, async (req, res) => {
  try {
    const att = await Attendance.find({ sessionId: req.params.sessionId });
    res.json(att);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Upsert Attendance (single)
app.post('/api/attendance', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  const { studentId, sessionId, present } = req.body;
  try {
    const att = await Attendance.findOneAndUpdate(
      { studentId, sessionId },
      { present, markedAt: Date.now() },
      { upsert: true, new: true }
    );
    res.json(att);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Batch Upsert Attendance (fast bulk save for mark-attendance page)
app.post('/api/attendance/batch', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  const { sessionId, records } = req.body; // records: [{studentId, present}]
  if (!sessionId || !Array.isArray(records)) {
    return res.status(400).json({ msg: 'Missing sessionId or records' });
  }
  try {
    const ops = records.map(({ studentId, present }) => ({
      updateOne: {
        filter: { studentId, sessionId },
        update: { $set: { present: Boolean(present), markedAt: new Date() } },
        upsert: true
      }
    }));
    const result = await Attendance.bulkWrite(ops, { ordered: false });
    res.json({ 
      matched: result.matchedCount, 
      upserted: result.upsertedCount, 
      modified: result.modifiedCount 
    });
  } catch (err) {
    console.error('Batch attendance error:', err);
    res.status(500).json({ msg: 'Server error during batch save' });
  }
});

// Helper: parse any date string into a JS Date safely
function parseDateSafe(raw) {
  if (!raw && raw !== 0) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') {
    if (raw < 1000) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
    return isNaN(dt) ? null : dt;
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Reject obvious non-dates like "Day 1"
  if (/^day\s*\d+/i.test(s)) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);

  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const dtMatch = new Date(Date.UTC(parseInt(y), parseInt(mo) - 1, parseInt(d)));
    return isNaN(dtMatch) ? null : dtMatch;
  }

  const dtParsed = new Date(s);
  if (isNaN(dtParsed) || dtParsed.getFullYear() > 2100) return null;
  // Normalize any date to UTC midnight
  return new Date(Date.UTC(dtParsed.getUTCFullYear() || dtParsed.getFullYear(), dtParsed.getUTCMonth() || dtParsed.getMonth(), dtParsed.getUTCDate() || dtParsed.getDate()));
}

// Bulk Import Attendance from AI Agent (optimised with batched DB ops)
app.post('/api/attendance/bulk-import', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const { records, skipDates = [] } = req.body;
    const skipSet = new Set((skipDates || []).map(d => {
      const parsed = parseDateSafe(d);
      return parsed ? parsed.toISOString().split('T')[0] : d;
    }).filter(Boolean));

    let imported = 0;
    let failed = 0;
    let skipped = 0;

    // ── Phase 1: Resolve sessions (cached, sequential to avoid duplicate creates) ──
    const sessionCache = {};  // label -> session document
    const uniqueLabels = [...new Set(records.map(r => String(r.date || '').trim()).filter(Boolean))];

    for (const sessionLabel of uniqueLabels) {
      if (skipSet.has(sessionLabel)) continue;
      if (sessionCache[sessionLabel]) continue;
      try {
        const realDate = parseDateSafe(sessionLabel);
        let session;
        if (realDate) {
          const dayStart = new Date(realDate); dayStart.setHours(0, 0, 0, 0);
          const dayEnd   = new Date(realDate); dayEnd.setHours(23, 59, 59, 999);
          session = await Session.findOne({ date: { $gte: dayStart, $lte: dayEnd } });
          if (!session) {
            session = await Session.create({
              date: realDate,
              topic: `Session ${new Date(realDate).toLocaleDateString('en-IN')}`,
              monthNumber: realDate.getMonth() + 1,
              sessionType: 'offline'
            });
          }
        } else {
          session = await Session.findOne({ topic: sessionLabel });
          if (!session) {
            const dayMatch = sessionLabel.match(/(\d+)/);
            const dayNum   = dayMatch ? parseInt(dayMatch[1]) : 0;
            const baseDate = new Date('2026-01-01');
            baseDate.setDate(baseDate.getDate() + dayNum - 1);
            session = await Session.create({
              date: baseDate,
              topic: sessionLabel,
              monthNumber: baseDate.getMonth() + 1,
              sessionType: 'offline'
            });
          }
        }
        sessionCache[sessionLabel] = session;
      } catch (e) {
        console.error('[import] Session resolve failed:', sessionLabel, e.message);
      }
    }

    // ── Phase 2: Resolve students in parallel batches ──
    const uniqueUSNs = [...new Set(records.map(r => String(r.usn || '').toUpperCase().trim()).filter(Boolean))];
    const studentCache = {}; // usn -> student document

    const BATCH_SIZE = 50;
    for (let i = 0; i < uniqueUSNs.length; i += BATCH_SIZE) {
      const batch = uniqueUSNs.slice(i, i + BATCH_SIZE);
      // Fetch all existing students in one query
      const existing = await Student.find({ usn: { $in: batch } });
      existing.forEach(s => { studentCache[s.usn] = s; });

      // Create missing students in parallel
      const missing = batch.filter(usn => !studentCache[usn]);
      if (missing.length > 0) {
        // Get name/email from first row with this USN
        const rowsByUsn = {};
        records.forEach(r => {
          const u = String(r.usn || '').toUpperCase().trim();
          if (missing.includes(u) && !rowsByUsn[u]) rowsByUsn[u] = r;
        });
        await Promise.all(missing.map(async (usn) => {
          try {
            const r = rowsByUsn[usn] || {};
            const s = await Student.create({
              usn,
              name: r.student_name || usn,
              email: r.email || '',
              branchCode: r.branch_code || 'GEN',
              isActive: true
            });
            studentCache[usn] = s;
          } catch (e) {
            if (e.code === 11000) {
              // Race condition: fetch if already created
              const s = await Student.findOne({ usn });
              if (s) studentCache[usn] = s;
            } else {
              console.error('[import] Student create failed:', usn, e.message);
            }
          }
        }));
      }

      // Update names for students that only had USN before
      await Promise.all(existing.map(async (s) => {
        const r = records.find(rec => String(rec.usn || '').toUpperCase().trim() === s.usn);
        if (r && r.student_name && s.name === s.usn) {
          await Student.findByIdAndUpdate(s._id, { name: r.student_name, email: r.email || s.email });
        }
      }));
    }

    // ── Phase 3: Build bulkWrite ops for attendance ──
    const bulkOps = [];
    for (const row of records) {
      const usnValue    = String(row.usn   || '').toUpperCase().trim();
      const sessionLabel = String(row.date || '').trim();
      if (!usnValue || !sessionLabel) { failed++; continue; }
      if (skipSet.has(sessionLabel))   { skipped++; continue; }

      const student = studentCache[usnValue];
      const session  = sessionCache[sessionLabel];
      if (!student || !session) { failed++; continue; }

      bulkOps.push({
        updateOne: {
          filter: { studentId: student._id, sessionId: session._id },
          update: { $set: { present: Boolean(row.present), markedBy: 'csv_import', markedAt: new Date() } },
          upsert: true
        }
      });
    }

    // Execute attendance bulkWrite in batches
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      try {
        const result = await Attendance.bulkWrite(batch, { ordered: false });
        imported += result.upsertedCount + result.modifiedCount + result.matchedCount;
      } catch (e) {
        console.error('[import] bulkWrite batch failed:', e.message);
        failed += batch.length;
      }
    }

    await logActivity(req.user.id, 'CSV Attendance Import', `Imported ${imported} records`);
    res.json({ success: imported, failed, skipped, total: records.length });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Student Attendance History (For Student)
app.get('/api/me/attendance', auth, async (req, res) => {
  if (!req.user.studentId) return res.status(400).json({ msg: 'Not a student profile' });
  try {
    const att = await Attendance.find({ studentId: req.user.studentId }).populate('sessionId');
    res.json(att);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Student Attendance History (For Mentor)
app.get('/api/students/:id/attendance', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const att = await Attendance.find({ studentId: req.params.id }).populate('sessionId');
    const student = await Student.findById(req.params.id);
    res.json({ student, attendance: att });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Materials
app.get('/api/materials', auth, async (req, res) => {
  try {
    const mats = await Material.find().populate('sessionId').sort({ createdAt: -1 });
    res.json(mats);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

app.post('/api/materials', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const newMat = new Material(req.body);
    const mat = await newMat.save();
    await logActivity(req.user.id, 'Material Added', `Added material: ${mat.title}`);
    res.json(mat);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});
app.delete('/api/materials/:id', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const mat = await Material.findByIdAndDelete(req.params.id);
    if (!mat) return res.status(404).json({ msg: 'Material not found' });
    await logActivity(req.user.id, 'Material Deleted', `Deleted material: ${mat.title}`);
    res.json({ msg: 'Material deleted' });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Catch-all route to serve frontend index.html for any non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
  });
}

// For local development
if (require.main === module) {
  app.listen(PORT, () => console.log(`ForgeTrack Server running on port ${PORT}`));
}

// Export for Vercel
module.exports = app;
