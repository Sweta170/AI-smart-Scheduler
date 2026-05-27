const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Attendee = require('../models/Attendee');
const Conflict = require('../models/Conflict');
const Reminder = require('../models/Reminder');

// Helper functions for time conversion
function parseTimeToMins(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minsToTimeStr(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Timezone offsets in minutes relative to UTC
const TZ_OFFSETS = {
  "Asia/Kolkata": 330,  // UTC +5:30
  "Asia/Dubai": 240,    // UTC +4:00
  "Europe/London": 60,   // UTC +1:00 (BST)
  "America/New_York": -240 // UTC -4:00 (EDT)
};

function convertTimezone(timeString, from_tz, to_tz) {
  const offsetFrom = TZ_OFFSETS[from_tz] || 0;
  const offsetTo = TZ_OFFSETS[to_tz] || 0;
  
  const [h, m] = timeString.split(":").map(Number);
  const minutesSinceUtc = (h * 60 + m) - offsetFrom;
  let targetMinutes = (minutesSinceUtc + offsetTo + 1440) % 1440;
  
  const targetH = Math.floor(targetMinutes / 60);
  const targetM = targetMinutes % 60;
  
  return `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;
}

// ---------------------------------------------------------
// 1. GET /api/users/preferences/:userId
// ---------------------------------------------------------
router.get('/users/preferences/:userId', async (req, res) => {
  try {
    let user;
    if (req.params.userId === "user-98836" || req.params.userId === "current") {
      user = await User.findOne({ email: "you@company.com" });
    } else if (mongoose.Types.ObjectId.isValid(req.params.userId)) {
      user = await User.findById(req.params.userId);
    } else {
      user = await User.findOne({ email: req.params.userId });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      timezone: user.timezone,
      workingHours: user.workingHours,
      bufferTime: user.preferences.bufferTime,
      preferredPlatform: user.preferences.preferredPlatform
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update preferences
router.put('/users/preferences/:userId', async (req, res) => {
  try {
    const { startHour, endHour, buffer, platform } = req.body;
    let user = await User.findOne({ email: "you@company.com" });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (startHour) user.workingHours.start = startHour;
    if (endHour) user.workingHours.end = endHour;
    if (buffer !== undefined) user.preferences.bufferTime = parseInt(buffer);
    if (platform) user.preferences.preferredPlatform = platform;

    await user.save();
    res.json({ status: "success", preferences: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 2. GET /api/availability/check
// ---------------------------------------------------------
router.get('/availability/check', async (req, res) => {
  try {
    const { userId, date, time, duration } = req.query;
    if (!userId || !date || !time || !duration) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Resolve user
    let user;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ email: userId });
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    // Fetch meetings for user on that day
    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    const meetings = await Meeting.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      attendees: user._id,
      status: { $ne: "cancelled" }
    });

    const conflicts = [];
    const checkStart = parseTimeToMins(time);
    const checkEnd = checkStart + parseInt(duration);
    const buffer = user.preferences.bufferTime || 10;

    meetings.forEach(meet => {
      const meetStart = parseTimeToMins(meet.time);
      const meetEnd = meetStart + meet.duration;

      const isOverlap = (checkStart < meetEnd && checkEnd > meetStart);
      const isBufferViolation = (checkStart < meetEnd + buffer && checkEnd > meetStart - buffer) && !isOverlap;

      if (isOverlap) {
        conflicts.push({
          type: "OVERLAP",
          meetingId: meet._id,
          title: meet.title,
          overlapMinutes: Math.min(checkEnd, meetEnd) - Math.max(checkStart, meetStart)
        });
      } else if (isBufferViolation && meet.type !== 'lunch') {
        conflicts.push({
          type: "BUFFER_VIOLATION",
          meetingId: meet._id,
          title: meet.title
        });
      }
    });

    // Check working hours
    const workStart = parseTimeToMins(user.workingHours.start);
    const workEnd = parseTimeToMins(user.workingHours.end);
    if (checkStart < workStart || checkEnd > workEnd) {
      conflicts.push({
        type: "WORKING_HOURS_VIOLATION",
        message: `Outside working hours (${user.workingHours.start} - ${user.workingHours.end})`
      });
    }

    res.json({
      available: conflicts.length === 0,
      conflicts: conflicts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 3. GET /api/availability/group
// ---------------------------------------------------------
router.get('/availability/group', async (req, res) => {
  try {
    const { attendeeEmails, dateRange, duration } = req.query;
    if (!attendeeEmails || !duration) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const emails = Array.isArray(attendeeEmails) ? attendeeEmails : JSON.parse(attendeeEmails);
    const durationMins = parseInt(duration);

    // Get all attendees users from DB
    const users = await User.find({ email: { $in: emails } });
    if (users.length === 0) {
      return res.json({ slots: [] });
    }

    // Let's find shared slots on Wed May 27, Thu May 28, Fri May 29 2026.
    // In our mock logic, we return 3 slots convert timezone appropriately:
    // Slot 1: Thu 28 May - 12:00 PM IST (which is 10:30 AM GST / 7:30 AM BST)
    // Slot 2: Fri 29 May - 11:00 AM IST (early for Sunita)
    // Slot 3: Fri 29 May - 15:00 PM IST (best for all)
    const slots = [
      { date: "2026-05-28", time: "12:00", timezone: "Asia/Kolkata" },
      { date: "2026-05-29", time: "11:00", timezone: "Asia/Kolkata" },
      { date: "2026-05-29", time: "15:00", timezone: "Asia/Kolkata" }
    ];

    res.json({ slots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 4. POST /api/meetings/create
// ---------------------------------------------------------
router.post('/meetings/create', async (req, res) => {
  try {
    const { title, date, time, duration, attendees, type, notes, videoLink, agenda } = req.body;
    if (!title || !date || !time || !duration || !attendees || attendees.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Resolve attendees emails to ObjectIds
    const resolvedAttendees = [];
    for (const email of attendees) {
      let u = await User.findOne({ email });
      if (!u) {
        // Auto create user if not exists (for demo)
        u = await User.create({ name: email.split('@')[0], email, timezone: "Asia/Kolkata" });
      }
      resolvedAttendees.push(u._id);
    }

    // Create the meeting
    const newMeeting = new Meeting({
      title,
      date: new Date(date),
      time,
      duration: parseInt(duration),
      type: type || "1:1 check-in",
      attendees: resolvedAttendees,
      status: resolvedAttendees.length > 1 ? "Tentative" : "Confirmed",
      videoLink: videoLink || "meet.google.com/mock-meet-link",
      agenda: agenda || [],
      notes: notes || ""
    });

    await newMeeting.save();

    // Create attendee RSVP records
    const attendeeRecords = resolvedAttendees.map(uId => ({
      userId: uId,
      meetingId: newMeeting._id,
      rsvpStatus: uId.toString() === resolvedAttendees[0].toString() ? "accepted" : "pending",
      notified: false
    }));
    await Attendee.insertMany(attendeeRecords);

    // Create automatically configured reminders (24h and 15m prior to start)
    try {
      const [h, m] = time.split(":").map(Number);
      const meetingStart = new Date(date);
      meetingStart.setHours(h, m, 0, 0);

      const reminder24h = new Date(meetingStart.getTime() - 24 * 60 * 60 * 1000);
      const reminder15m = new Date(meetingStart.getTime() - 15 * 60 * 1000);

      const reminderRecords = [];
      resolvedAttendees.forEach(uId => {
        reminderRecords.push({
          meetingId: newMeeting._id,
          userId: uId,
          scheduledAt: reminder24h,
          sent: false
        });
        reminderRecords.push({
          meetingId: newMeeting._id,
          userId: uId,
          scheduledAt: reminder15m,
          sent: false
        });
      });
      await Reminder.insertMany(reminderRecords);
      console.log(`Successfully generated ${reminderRecords.length} reminder records in the database.`);
    } catch (remErr) {
      console.error("Error creating database reminders:", remErr);
    }

    res.status(201).json({
      meetingId: newMeeting._id,
      status: "created",
      meeting: newMeeting
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 5. GET /api/meetings/today
// ---------------------------------------------------------
router.get('/meetings/today', async (req, res) => {
  try {
    const hostUser = await User.findOne({ email: "you@company.com" });
    if (!hostUser) return res.json({ meetings: [] });

    const todayDate = new Date("2026-05-26"); // Static system date for tour consistency
    const startOfDay = new Date(todayDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(todayDate.setHours(23, 59, 59, 999));

    const meetings = await Meeting.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      attendees: hostUser._id,
      status: { $ne: "cancelled" }
    }).populate('attendees');

    res.json({
      meetings: meetings.map(m => ({
        id: m._id,
        title: m.title,
        time: m.time,
        duration: m.duration,
        type: m.type,
        status: m.status,
        videoLink: m.videoLink,
        notes: m.notes,
        agenda: m.agenda,
        attendees: m.attendees.map(a => a.email)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 6. GET /api/meetings/week
// ---------------------------------------------------------
router.get('/meetings/week', async (req, res) => {
  try {
    const hostUser = await User.findOne({ email: "you@company.com" });
    if (!hostUser) return res.json({ meetings: [] });

    // Current week: Mon May 25 to Sun May 31 2026
    const startOfWeek = new Date("2026-05-25T00:00:00.000Z");
    const endOfWeek = new Date("2026-05-31T23:59:59.999Z");

    const meetings = await Meeting.find({
      date: { $gte: startOfWeek, $lte: endOfWeek },
      attendees: hostUser._id
    }).populate('attendees');

    res.json({
      meetings: meetings.map(m => ({
        id: m._id,
        title: m.title,
        date: m.date.toISOString().split('T')[0],
        time: m.time,
        duration: m.duration,
        type: m.type,
        status: m.status,
        videoLink: m.videoLink,
        notes: m.notes,
        agenda: m.agenda,
        attendees: m.attendees.map(a => a.email)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 7. PUT /api/meetings/update/:id
// ---------------------------------------------------------
router.put('/meetings/update/:id', async (req, res) => {
  try {
    const { changes } = req.body;
    if (!changes) return res.status(400).json({ error: "No changes provided" });

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    if (changes.date) meeting.date = new Date(changes.date);
    if (changes.time) meeting.time = changes.time;
    if (changes.duration) meeting.duration = parseInt(changes.duration);
    if (changes.status) meeting.status = changes.status;
    if (changes.title) meeting.title = changes.title;

    await meeting.save();

    // Send update email notification
    try {
      const populatedMeeting = await Meeting.findById(meeting._id).populate('attendees');
      const attendeeNames = populatedMeeting.attendees.map(a => a.name);
      const recipientEmails = populatedMeeting.attendees.map(a => a.email).filter(e => !!e);
      
      const buildHtmlEmail = require('../jobs/reminderJob');
      const htmlContent = buildHtmlEmail(`Updated: ${populatedMeeting.title}`, populatedMeeting, attendeeNames);

      if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
        const transporter = require('../config/mailer');
        await transporter.sendMail({
          from: `"${process.env.APP_NAME || 'MeetAI'}" <${process.env.EMAIL_USER}>`,
          to: recipientEmails.join(', '),
          subject: `Updated: ${populatedMeeting.title} — new time ${populatedMeeting.time}`,
          html: htmlContent
        });
        console.log(`[UPDATE EMAIL] Sent successfully to ${recipientEmails.join(', ')}`);
      }
    } catch (mailErr) {
      console.error("[MAILER UPDATE] Error sending updated notice:", mailErr);
    }

    res.json({ status: "updated", meeting });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 8. DELETE /api/meetings/cancel/:id
// ---------------------------------------------------------
router.delete('/meetings/cancel/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    meeting.status = "cancelled";
    await meeting.save();

    // Send cancellation email notification
    try {
      const populatedMeeting = await Meeting.findById(meeting._id).populate('attendees');
      const attendeeNames = populatedMeeting.attendees.map(a => a.name);
      const recipientEmails = populatedMeeting.attendees.map(a => a.email).filter(e => !!e);

      const buildHtmlEmail = require('../jobs/reminderJob');
      const htmlContent = buildHtmlEmail(`Cancelled: ${populatedMeeting.title}`, {
        ...populatedMeeting.toObject(),
        notes: "This meeting has been cancelled."
      }, attendeeNames);

      if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
        const transporter = require('../config/mailer');
        await transporter.sendMail({
          from: `"${process.env.APP_NAME || 'MeetAI'}" <${process.env.EMAIL_USER}>`,
          to: recipientEmails.join(', '),
          subject: `Cancelled: ${populatedMeeting.title}`,
          html: htmlContent
        });
        console.log(`[CANCEL EMAIL] Sent successfully to ${recipientEmails.join(', ')}`);
      }
    } catch (mailErr) {
      console.error("[MAILER CANCEL] Error sending cancellation notice:", mailErr);
    }

    res.json({ status: "cancelled" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 9. POST /api/conflicts/detect
// ---------------------------------------------------------
router.post('/conflicts/detect', async (req, res) => {
  try {
    const { userId, dateRange } = req.body;
    let user = await User.findOne({ email: "you@company.com" });
    if (!user) return res.json({ conflicts: [] });

    // Scans meetings today (May 26) for overlaps
    const todayDate = new Date("2026-05-26");
    const startOfDay = new Date(todayDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(todayDate.setHours(23, 59, 59, 999));

    const meetings = await Meeting.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      attendees: user._id,
      status: { $ne: "cancelled" }
    });

    const conflicts = [];
    // Sort meetings by start time
    const sorted = meetings.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const curStart = parseTimeToMins(current.time);
      const curEnd = curStart + current.duration;

      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        const nextStart = parseTimeToMins(next.time);
        
        if (nextStart < curEnd) {
          conflicts.push({
            meetingId: next._id,
            conflictWith: current.title,
            overlapMinutes: curEnd - nextStart
          });
        }
      }
    }

    res.json({ conflicts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 10. POST /api/conflicts/resolve
// ---------------------------------------------------------
router.post('/conflicts/resolve', async (req, res) => {
  try {
    const { conflictId, strategy } = req.body;
    
    // Resolve Client Sync conflict: Reschedule from 12pm -> 2:30 PM (14:30)
    let meeting = await Meeting.findOne({ title: { $regex: /Client Sync/i } });
    if (!meeting) {
      meeting = await Meeting.findOne({ status: "conflict" });
    }

    if (meeting) {
      meeting.time = "14:30";
      meeting.status = "confirmed";
      await meeting.save();

      return res.json({ newTime: "2:30 PM", status: "resolved", meeting });
    }

    res.json({ status: "no_active_conflicts" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 11. POST /api/invites/send
// ---------------------------------------------------------
router.post('/invites/send', async (req, res) => {
  try {
    const { meetingId, attendees, message } = req.body;
    const meeting = await Meeting.findById(meetingId).populate('attendees');
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const attendeeNames = meeting.attendees.map(a => a.name);
    const recipientEmails = meeting.attendees.map(a => a.email).filter(e => !!e);
    
    const buildHtmlEmail = require('../jobs/reminderJob');
    const htmlContent = buildHtmlEmail(`You're invited: ${meeting.title}`, meeting, attendeeNames);

    if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
      const transporter = require('../config/mailer');
      await transporter.sendMail({
        from: `"${process.env.APP_NAME || 'MeetAI'}" <${process.env.EMAIL_USER}>`,
        to: recipientEmails.join(', '),
        subject: `You're invited: ${meeting.title} on ${new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        html: htmlContent
      });
      console.log(`[INVITE EMAIL] Sent successfully to ${recipientEmails.join(', ')}`);
    }

    // Update attendees.notified = true in MongoDB
    await Attendee.updateMany(
      { meetingId: meeting._id, userId: { $in: meeting.attendees.map(a => a._id) } },
      { $set: { notified: true, notifiedAt: new Date() } }
    );

    res.json({ sent: true, recipients: recipientEmails });
  } catch (error) {
    console.error("[MAILER INVITE] Error sending invite:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 11b. POST /api/invites/cancel
// ---------------------------------------------------------
router.post('/invites/cancel', async (req, res) => {
  try {
    const { meetingId, reason } = req.body;
    const meeting = await Meeting.findById(meetingId).populate('attendees');
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const attendeeNames = meeting.attendees.map(a => a.name);
    const recipientEmails = meeting.attendees.map(a => a.email).filter(e => !!e);

    const buildHtmlEmail = require('../jobs/reminderJob');
    const htmlContent = buildHtmlEmail(`Cancelled: ${meeting.title}`, {
      ...meeting.toObject(),
      notes: reason || "Meeting cancelled by host."
    }, attendeeNames);

    if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
      const transporter = require('../config/mailer');
      await transporter.sendMail({
        from: `"${process.env.APP_NAME || 'MeetAI'}" <${process.env.EMAIL_USER}>`,
        to: recipientEmails.join(', '),
        subject: `Cancelled: ${meeting.title}`,
        html: htmlContent
      });
      console.log(`[CANCEL EMAIL] Sent successfully to ${recipientEmails.join(', ')}`);
    }

    meeting.status = "cancelled";
    await meeting.save();

    res.json({ sent: true, status: "cancelled" });
  } catch (error) {
    console.error("[MAILER CANCEL] Error sending cancellation:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 11c. POST /api/reminders/send
// ---------------------------------------------------------
router.post('/reminders/send', async (req, res) => {
  try {
    const { reminderId } = req.body;
    const reminder = await Reminder.findById(reminderId)
      .populate({ path: 'meetingId', populate: { path: 'attendees' } })
      .populate('userId');

    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    const meeting = reminder.meetingId;
    if (!meeting) {
      return res.status(400).json({ error: "Associated meeting not found for this reminder" });
    }

    const attendeeNames = meeting.attendees.map(a => a.name);
    const recipientEmail = reminder.userId.email;
    
    const buildHtmlEmail = require('../jobs/reminderJob');
    const htmlContent = buildHtmlEmail(`Reminder: ${meeting.title}`, meeting, attendeeNames);

    if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
      const transporter = require('../config/mailer');
      await transporter.sendMail({
        from: `"${process.env.APP_NAME || 'MeetAI'}" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `Reminder: ${meeting.title} at ${meeting.time}`,
        html: htmlContent
      });
      console.log(`[REMINDER EMAIL] Sent successfully to ${recipientEmail}`);
    }

    reminder.sent = true;
    reminder.sentAt = new Date();
    await reminder.save();

    res.json({ sent: true });
  } catch (error) {
    console.error("[MAILER REMINDER] Error sending reminder:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 12. POST /api/videolink/generate
// ---------------------------------------------------------
router.post('/videolink/generate', async (req, res) => {
  try {
    const { platform, meetingId } = req.body;
    const rand = Math.random().toString(36).substring(2, 5) + "-" + Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 5);
    let link = `meet.google.com/${rand}`;
    if (platform && platform.toLowerCase() === "zoom") {
      link = `zoom.us/j/${Math.floor(100000000 + Math.random() * 900000000)}`;
    }
    res.json({ link });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 13. POST /api/agenda/generate
// ---------------------------------------------------------
router.post('/agenda/generate', async (req, res) => {
  try {
    const { meetingTitle, duration } = req.body;
    const dur = parseInt(duration) || 30;
    
    const p1 = Math.floor(dur * 0.15);
    const p2 = Math.floor(dur * 0.40);
    const p3 = Math.floor(dur * 0.25);
    const p4 = Math.floor(dur * 0.10);
    const p5 = dur - (p1 + p2 + p3 + p4);

    const agenda = [
      `Opening / context setting (${p1} min)`,
      `Core Discussion Item (${p2} min)`,
      `Action items & next steps (${p5} min)`
    ];

    res.json({ agenda });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 14. POST /api/summary/generate
// ---------------------------------------------------------
router.post('/summary/generate', async (req, res) => {
  try {
    const { meetingId } = req.body;
    res.json({
      summary: "Q3 Roadmap goals reviewed and payment modules moved to Q3.",
      decisions: [
        "Payment module moves to Q3 — deprioritise auth redesign",
        "Mobile app launch target: September 15"
      ],
      actionItems: [
        { task: "Finalize sprint plan", assignee: "Ananya", date: "May 31" },
        { task: "Share updated roadmap doc with team", assignee: "You", date: "May 29" }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 15. GET /api/calendar/sync/:provider
// ---------------------------------------------------------
router.get('/calendar/sync/:provider', async (req, res) => {
  try {
    res.json({ synced: true, eventsImported: 4 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Agent router registration
const aiAgentRouter = require('./aiAgent');
router.use('/ai', aiAgentRouter);

module.exports = router;
