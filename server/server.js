require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const User = require('./models/User');
const Meeting = require('./models/Meeting');
const Attendee = require('./models/Attendee');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/meetai';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection & Seeding (Auto-creates and seeds specified database)
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully.');
    await seedDatabase();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Seed Database helper
async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already has users. Skipping seed.');
      return;
    }

    console.log('Seeding initial data...');

    // 1. Seed Users
    const usersData = [
      { name: "You", email: "you@company.com", timezone: "Asia/Kolkata", workingHours: { start: "09:00", end: "18:00" }, preferences: { bufferTime: 10, preferredPlatform: "Google Meet" } },
      { name: "Priya Sharma", email: "priya.sharma@example.com", timezone: "Asia/Kolkata", workingHours: { start: "09:00", end: "18:00" }, preferences: { bufferTime: 10, preferredPlatform: "Google Meet" } },
      { name: "Ahmed Al-Mansoori", email: "ahmed.mansoori@example.com", timezone: "Asia/Dubai", workingHours: { start: "09:00", end: "18:00" }, preferences: { bufferTime: 10, preferredPlatform: "Google Meet" } },
      { name: "Sunita Patel", email: "sunita.patel@example.com", timezone: "Europe/London", workingHours: { start: "09:00", end: "18:00" }, preferences: { bufferTime: 10, preferredPlatform: "Google Meet" } },
      { name: "Ananya Krishnan", email: "ananya.krishnan@example.com", timezone: "Asia/Kolkata", workingHours: { start: "09:00", end: "18:00" }, preferences: { bufferTime: 10, preferredPlatform: "Google Meet" } }
    ];

    const seededUsers = await User.insertMany(usersData);
    console.log(`Seeded ${seededUsers.length} users.`);

    const userMap = {};
    seededUsers.forEach(u => {
      userMap[u.email] = u._id;
    });

    // Helper to get attendee IDs
    const getIds = (emails) => emails.map(e => userMap[e]).filter(id => !!id);

    // 2. Seed Meetings
    const meetingsData = [
      // Lunch Blocks (Mon-Fri 25 May to 29 May 2026)
      { title: "Protected Lunch Block", date: new Date("2026-05-25"), time: "12:00", duration: 60, type: "lunch", attendees: getIds(["you@company.com"]), status: "confirmed", videoLink: "" },
      { title: "Protected Lunch Block", date: new Date("2026-05-26"), time: "12:00", duration: 60, type: "lunch", attendees: getIds(["you@company.com"]), status: "confirmed", videoLink: "" },
      { title: "Protected Lunch Block", date: new Date("2026-05-27"), time: "12:00", duration: 60, type: "lunch", attendees: getIds(["you@company.com"]), status: "confirmed", videoLink: "" },
      { title: "Protected Lunch Block", date: new Date("2026-05-28"), time: "12:00", duration: 60, type: "lunch", attendees: getIds(["you@company.com"]), status: "confirmed", videoLink: "" },
      { title: "Protected Lunch Block", date: new Date("2026-05-29"), time: "12:00", duration: 60, type: "lunch", attendees: getIds(["you@company.com"]), status: "confirmed", videoLink: "" },

      // Focus Block
      { title: "Deep Work Session", date: new Date("2026-05-28"), time: "10:00", duration: 120, type: "focus", attendees: getIds(["you@company.com"]), status: "confirmed", videoLink: "" },

      // Pre-booked meetings for Tue May 26th
      {
        title: "Daily Standup",
        date: new Date("2026-05-26"),
        time: "09:00",
        duration: 15,
        type: "standup",
        attendees: getIds(["you@company.com", "priya.sharma@example.com"]),
        status: "confirmed",
        videoLink: "meet.google.com/hsg-standup-daily",
        agenda: ["Daily status checks", "Blocker resolutions"]
      },
      {
        title: "Sprint Planning",
        date: new Date("2026-05-26"),
        time: "10:00",
        duration: 45,
        type: "1:1 check-in",
        attendees: getIds(["you@company.com", "priya.sharma@example.com"]),
        status: "confirmed",
        videoLink: "meet.google.com/abc-sprint-plan",
        notes: "Bi-weekly sprint kick-off.",
        agenda: ["Review past sprint progress", "Estimate next stories"]
      },
      {
        title: "Client Sync Overlap",
        date: new Date("2026-05-26"),
        time: "12:00",
        duration: 60,
        type: "client",
        attendees: getIds(["you@company.com", "ananya.krishnan@example.com"]),
        status: "conflict", // Conflict state
        videoLink: "meet.google.com/ovr-client-sync",
        notes: "⚠️ Overlaps with your protected lunch block.",
        agenda: ["Status sync", "Q3 roadmap presentation"]
      }
    ];

    const seededMeetings = await Meeting.insertMany(meetingsData);
    console.log(`Seeded ${seededMeetings.length} meetings.`);

    // 3. Seed Attendees link records
    const attendeesData = [];
    seededMeetings.forEach(m => {
      m.attendees.forEach(uId => {
        attendeesData.push({
          userId: uId,
          meetingId: m._id,
          rsvpStatus: m.status === "confirmed" ? "accepted" : "pending",
          notified: true
        });
      });
    });

    await Attendee.insertMany(attendeesData);
    console.log(`Seeded attendees relation records.`);
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// REST API routes registration will go here
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`MeetAI Express server running on port ${PORT}`);
});
