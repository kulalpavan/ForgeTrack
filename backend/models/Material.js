const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['slides', 'recording', 'document', 'link'], default: 'slides' },
  url: { type: String, required: true },
  description: { type: String },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Material', materialSchema);
