const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  present: { type: Boolean, default: false },
  markedBy: { type: String, default: 'manual' }, // 'manual' | 'csv_import'
  markedAt: { type: Date, default: Date.now }
});

// Compound index to prevent duplicate attendance for same student in same session
attendanceSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
