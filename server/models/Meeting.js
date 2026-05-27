const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true }, // Format YYYY-MM-DD
  time: { type: String, required: true }, // "HH:MM" format (24-hour)
  duration: { type: Number, required: true, default: 30 }, // in minutes
  type: {
    type: String,
    enum: ["1on1", "standup", "interview", "client", "brainstorm", "workshop", "performance review", "lunch", "focus", "1:1 check-in"],
    default: "1:1 check-in"
  },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ["confirmed", "pending", "cancelled", "conflict", "Tentative", "Confirmed"],
    required: true,
    default: "pending"
  },
  videoLink: { type: String },
  agenda: [{ type: String }],
  notes: { type: String, default: "" },
  googleEventId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
