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
  const { email, identifier, password } = req.body;
  const loginId = identifier || email; // Support both for backward compatibility

  try {
    // Search by email OR usn
    let user = await User.findOne({
      $or: [
        { email: loginId },
        { usn: loginId }
      ]
    }).populate('studentId');

    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      user: { id: user.id, role: user.role, studentId: user.studentId?._id }
    };

    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) {
        console.error('JWT Signing Error:', err);
        return res.status(500).json({ msg: 'Server Error' });
      }
      res.json({ token, user: { 
        id: user.id, 
        email: user.email, 
        usn: user.usn,
        role: user.role, 
        displayName: user.displayName || user.name || user.email || user.usn,
        studentId: user.studentId?._id 
      }});
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

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
You are a data mapping AI assistant for a student attendance system.
You will receive CSV or spreadsheet column headers and sample rows.
Map each source column to one of these target fields: student_name, usn, date, attendance_status. 
For any other data columns that contain useful information (like Knowledge scores, Skill scores, Pre/Post assessments, etc.), map them to a cleaned, lowercased version of the header name (e.g., "knowledge_score", "skill_score").
If the column is completely irrelevant, map it to "IGNORE".

CRITICAL: Use the EXACT column names provided in the 'Headers' list as keys in the 'mapping' object.

If the data is a pivoted attendance sheet (where date values appear as column headers), mark each date-like header (e.g. "Day 1 Attendance", "15/4/26") as "date" and set is_pivoted to true.
If the sheet is standard, map the column denoting presence/absence to "attendance_status".
If a column contains date-like header values but no explicit date column, still map those fields as "date".
If there are corresponding score columns for each day (e.g. "Day 1 Knowledge"), map them using a pattern like "date_knowledge" or "date_skill" if possible, otherwise just use a cleaned name.
Detect the date_format (e.g. DD/MM/YY, MM/DD/YYYY, YYYY-MM-DD) and attendance_convention (e.g. TRUE/FALSE, P/A, 1/0, Present/Absent).

Return ONLY valid JSON in this exact format, with no markdown formatting, no surrounding backticks, and no extra commentary:
{
  "mapping": {
    "Exact Header Name 1": "IGNORE",
    "Exact Header Name 2": "student_name",
    "Exact Header Name 3": "usn",
    "Day 1 Attendance": "date",
    "Day 1 Knowledge(25)": "day_1_knowledge",
    "Day 1 Skill(25)": "day_1_skill",
    "Pre Assessment Score(20)": "pre_assessment"
  },
  "is_pivoted": true,
  "date_format": "DD/M/YY",
  "attendance_convention": "TRUE/FALSE"
}

Headers: ${JSON.stringify(headers)}
Sample Data (first 3 rows): ${JSON.stringify(sampleData)}
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

// Upsert Attendance
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
    const iso = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
    const dt = new Date(iso);
    return isNaN(dt) ? null : dt;
  }

  const dt = new Date(s);
  return isNaN(dt) || dt.getFullYear() > 2100 ? null : dt;
}

// Bulk Import Attendance from AI Agent
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

    // Cache sessions by topic label to avoid duplicate creation
    const sessionCache = {};

    for (const row of records) {
      try {
        // 1. Find or create student by USN
        const usnValue = String(row.usn || '').toUpperCase().trim();
        if (!usnValue) { failed++; continue; }

        // Update student name if available
        let student = await Student.findOne({ usn: usnValue });
        if (!student) {
          student = await Student.create({
            usn: usnValue,
            name: row.student_name || usnValue,
            email: row.email || '',
            branchCode: row.branch_code || 'GEN',
            isActive: true
          });
        } else if (row.student_name && student.name === usnValue) {
          // Update name if it was previously just USN
          await Student.findByIdAndUpdate(student._id, { name: row.student_name, email: row.email || student.email });
        }

        // 2. Resolve session — either by real date or by topic label
        const sessionLabel = String(row.date || '').trim();
        if (!sessionLabel) { failed++; continue; }

        if (skipSet.has(sessionLabel)) { skipped++; continue; }

        let session = sessionCache[sessionLabel];
        if (!session) {
          const realDate = parseDateSafe(sessionLabel);
          if (realDate) {
            // Real date — find or create session by date
            const dayStart = new Date(realDate); dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(realDate); dayEnd.setHours(23, 59, 59, 999);
            session = await Session.findOne({ date: { $gte: dayStart, $lte: dayEnd } });
            if (!session) {
              session = await Session.create({
                date: realDate,
                topic: row.session_topic || `Session ${new Date(realDate).toLocaleDateString('en-IN')}`,
                monthNumber: realDate.getMonth() + 1,
                sessionType: 'offline'
              });
            }
          } else {
            // Label-based (e.g. "Day 1 Attendance") — find or create by topic
            session = await Session.findOne({ topic: sessionLabel });
            if (!session) {
              // Extract day number for ordering
              const dayMatch = sessionLabel.match(/(\d+)/);
              const dayNum = dayMatch ? parseInt(dayMatch[1]) : 0;
              // Use a base date offset so sessions are sortable
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
        }

        // 3. Upsert attendance
        await Attendance.findOneAndUpdate(
          { studentId: student._id, sessionId: session._id },
          { present: Boolean(row.present), markedBy: 'csv_import', markedAt: Date.now() },
          { upsert: true, new: true }
        );
        imported++;
      } catch (e) {
        console.error('[import] Row failed:', e.message, row);
        failed++;
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

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
