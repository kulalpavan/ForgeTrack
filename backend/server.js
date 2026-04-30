const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/forgetrack')
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

    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const payload = {
      user: { id: user.id, role: user.role, studentId: user.studentId?._id }
    };

    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
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
You will receive CSV column headers and sample data. 
Map each source column to one of these target fields: student_name, usn, date, attendance_status, IGNORE.
Also, check if the data is "pivoted" (where dates are column headers instead of having a single 'date' column).
If the dates are headers, map those specific headers to the string "date" and set is_pivoted to true.
If the data is NOT pivoted (i.e. there is a single 'date' column), ensure the column denoting presence/absence is mapped to "attendance_status".
Detect the date_format (e.g., DD/MM/YY, MM/DD/YYYY, YYYY-MM-DD) and attendance_convention (e.g., TRUE/FALSE, P/A, 1/0).

Return ONLY valid JSON in this exact format, with no markdown formatting or backticks:
{
  "mapping": {
    "Original Column Name 1": "IGNORE",
    "Original Name": "student_name",
    "Original USN": "usn",
    "15/4/26": "date",
    "Status": "attendance_status"
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
    
    // Clean up potential markdown from the response
    const jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    res.json(parsed);
  } catch (err) {
    console.error('AI Mapping Error:', err);
    res.status(500).json({ msg: 'Failed to process AI mapping' });
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
// Handles ISO (YYYY-MM-DD), DD/M/YY, DD/MM/YY, DD/MM/YYYY
function parseDateSafe(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // ISO: 2026-04-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);

  // DD/M/YY  DD/MM/YY  DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const iso = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
    const dt = new Date(iso);
    return isNaN(dt) ? null : dt;
  }

  // fallback
  const dt = new Date(s);
  return isNaN(dt) ? null : dt;
}

// Bulk Import Attendance from AI Agent
app.post('/api/attendance/bulk-import', auth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.status(403).json({ msg: 'Denied' });
  try {
    const { records } = req.body;
    let imported = 0;
    let failed = 0;

    for (const row of records) {
      try {
        // 1. Find student by USN (case-insensitive)
        let student = await Student.findOne({ usn: row.usn.toUpperCase().trim() });
        if (!student) {
          console.warn(`[import] Student not found, creating new: USN=${row.usn}`);
          student = await Student.create({
            usn: row.usn.toUpperCase().trim(),
            name: row.usn.toUpperCase().trim(),
            isActive: true
          });
        }

        // 2. Parse date safely
        const sessionDate = parseDateSafe(row.date);
        if (!sessionDate) {
          console.warn(`[import] Invalid date: "${row.date}" for USN=${row.usn}`);
          failed++;
          continue;
        }

        // 3. Find or create Session for that date (match by day only)
        const dayStart = new Date(sessionDate); dayStart.setHours(0,0,0,0);
        const dayEnd   = new Date(sessionDate); dayEnd.setHours(23,59,59,999);
        let session = await Session.findOne({ date: { $gte: dayStart, $lte: dayEnd } });
        if (!session) {
          session = await Session.create({
            date: sessionDate,
            topic: 'Imported Session',
            monthNumber: sessionDate.getMonth() + 1,
            sessionType: 'offline'
          });
        }

        // 4. Upsert attendance record
        await Attendance.findOneAndUpdate(
          { studentId: student._id, sessionId: session._id },
          { present: row.present, markedBy: 'csv_import' },
          { upsert: true, new: true }
        );
        imported++;
      } catch (e) {
        console.error('[import] Row failed:', row, e.message);
        failed++;
      }
    }

    await logActivity(req.user.id, 'CSV Attendance Import', `Imported ${imported} records`);
    res.json({ success: imported, failed, total: records.length });
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
