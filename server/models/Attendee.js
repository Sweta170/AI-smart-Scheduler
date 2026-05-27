const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  rsvpStatus: {
    type: String,
    enum: ["pending", "accepted", "declined", "tentative"],
    default: "pending"
  },
  notified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Attendee', attendeeSchema);
