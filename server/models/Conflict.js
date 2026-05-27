const mongoose = require('mongoose');

const conflictSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  conflictType: {
    type: String,
    enum: ["OVERLAP", "BUFFER_VIOLATION", "WORKING_HOURS_VIOLATION"],
    required: true
  },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Conflict', conflictSchema);
