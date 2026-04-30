const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true }, // Sparse because students might only have USN
  usn: { type: String, unique: true, sparse: true },  // For students
  password: { type: String, required: true },
  role: { type: String, enum: ['mentor', 'student'], default: 'student' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // Null for mentors
  displayName: { type: String },
  bio: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
