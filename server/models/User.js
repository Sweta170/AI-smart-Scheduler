const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { 
    type: String, 
    required: true, 
    minlength: 6,
    select: false // never returned in query results
  },
  timezone: { type: String, required: true, default: "Asia/Kolkata" },
  workingHours: {
    start: { type: String, default: "09:00" }, // "HH:MM" format
    end: { type: String, default: "18:00" } // "HH:MM" format
  },
  preferences: {
    bufferTime: { type: Number, default: 10 }, // in minutes
    preferredPlatform: { type: String, default: "Google Meet" } // "Google Meet" | "Zoom" | "Microsoft Teams"
  },
  googleCalendar: {
    connected:     { type: Boolean, default: false },
    accessToken:   { type: String, select: false },
    refreshToken:  { type: String, select: false },
    tokenExpiry:   { type: Date },
    calendarId:    { type: String, default: 'primary' }
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(
    this.password, 
    parseInt(process.env.BCRYPT_ROUNDS) || 12
  );
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
