const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  date: { type: Date, required: true },
  monthNumber: { type: Number },
  sessionType: { type: String, default: 'offline' },
  duration: { type: Number, default: 2.0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
