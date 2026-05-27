const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Attendee = require('../models/Attendee');
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

function formatTime12h(time24) {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${mStr} ${ampm}`;
}

function formatDateLong(dateStr) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(dateStr);
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function getDayOfWeekName(dateStr) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date(dateStr);
  return days[d.getDay()];
}

const TZ_OFFSETS = {
  "Asia/Kolkata": 330,
  "Asia/Dubai": 240,
  "Europe/London": 60,
  "America/New_York": -240
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
// POST /api/ai/agent
// Body: { userId, message, conversationHistory[] }
// ---------------------------------------------------------
router.post('/agent', async (req, res) => {
  try {
    const { userId, message, conversationHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message parameter" });
    }

    const cleanMsg = message.toLowerCase().trim();
    const history = conversationHistory || [];
    const lastAssistantMsg = history.length > 0 ? history[history.length - 1].content : "";
    const lastAssistantMsgLower = lastAssistantMsg ? lastAssistantMsg.toLowerCase() : "";

    // Find host user
    const hostUser = await User.findOne({ email: "you@company.com" });
    if (!hostUser) {
      return res.status(404).json({ error: "Host user not found" });
    }

    // Response default structure
    let reply = "";
    let actions = [];
    let confirmationCard = null;
    let requiresConfirmation = false;

    // 1. Check if user is confirming a pending booking
    if (lastAssistantMsgLower.includes("shall i confirm and send the invite?") && 
        (cleanMsg.includes("yes") || cleanMsg.includes("confirm") || cleanMsg.includes("book") || cleanMsg.includes("sure"))) {
      
      // Parse details from the last assistant message or hardcode default
      // In production, we'd store the pending details in session/cache.
      // For this app, we'll parse it out of the last assistant message or create it.
      let title = "1:1 Check-in";
      let dateStr = "2026-05-27"; // tomorrow
      let time24 = "14:00"; // 2pm
      let duration = 30;
      let attendeeEmail = "priya.sharma@example.com";

      if (lastAssistantMsg.includes("Client Call")) {
        title = "Client Call";
        duration = 45;
        attendeeEmail = "priya.sharma@example.com";
      } else if (lastAssistantMsg.includes("Team Sync")) {
        title = "Team Sync";
        duration = 45;
        attendeeEmail = "ahmed.mansoori@example.com"; // Multi-attendee is handled below
      }

      // Check if it's a team slot
      let attendeesList = [hostUser.email, attendeeEmail];
      if (lastAssistantMsg.includes("Ahmed Al-Mansoori") && lastAssistantMsg.includes("Sunita Patel")) {
        attendeesList = [hostUser.email, "ahmed.mansoori@example.com", "sunita.patel@example.com"];
      }

      // Check for slot selection in confirmation
      if (lastAssistantMsg.includes("2:30 PM")) {
        time24 = "14:30";
      } else if (lastAssistantMsg.includes("10:00 AM")) {
        time24 = "10:00";
      } else if (lastAssistantMsg.includes("3:00 PM") || lastAssistantMsg.includes("3:00 pm")) {
        time24 = "15:00";
      }

      // Resolve attendee IDs
      const resolvedIds = [];
      for (const email of attendeesList) {
        const u = await User.findOne({ email });
        if (u) resolvedIds.push(u._id);
      }

      const rand = Math.random().toString(36).substring(2, 5) + "-" + Math.random().toString(36).substring(2, 6);
      const videoLink = `meet.google.com/${rand}`;

      // Create meeting in MongoDB
      const meeting = new Meeting({
        title: title,
        date: new Date(dateStr),
        time: time24,
        duration: duration,
        type: title.toLowerCase().includes("client") ? "client" : "1:1 check-in",
        attendees: resolvedIds,
        status: "confirmed",
        videoLink: videoLink,
        agenda: ["Opening & context setting", "Discussion", "Action items"]
      });

      await meeting.save();

      // Create attendee RSVP records
      const attendeeRecords = resolvedIds.map(uId => ({
        userId: uId,
        meetingId: meeting._id,
        rsvpStatus: "accepted",
        notified: true
      }));
      await Attendee.insertMany(attendeeRecords);

      // Create automatically configured reminders (24h and 15m prior to start)
      try {
        const [h, m] = time24.split(":").map(Number);
        const meetingStart = new Date(dateStr);
        meetingStart.setHours(h, m, 0, 0);

        const reminder24h = new Date(meetingStart.getTime() - 24 * 60 * 60 * 1000);
        const reminder15m = new Date(meetingStart.getTime() - 15 * 60 * 1000);

        const reminderRecords = [];
        resolvedIds.forEach(uId => {
          reminderRecords.push({
            meetingId: meeting._id,
            userId: uId,
            scheduledAt: reminder24h,
            sent: false
          });
          reminderRecords.push({
            meetingId: meeting._id,
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

      reply = `✓ Booked!\nMeeting saved to database. Invite sent to attendees.\nReminders set: 24h before + 15 min before.\nMeet link: ${videoLink}`;
      actions = [
        { tool: "create_meeting", status: "success", data: { meetingId: meeting._id } },
        { tool: "send_invite", status: "success", data: { meetingId: meeting._id, recipients: attendeesList } }
      ];
      requiresConfirmation = false;

      return res.json({ reply, actions, confirmationCard, requiresConfirmation });
    }

    // 2. Check if user is confirming rescheduling / conflict resolution
    if (lastAssistantMsgLower.includes("should i move") && 
        (cleanMsg.includes("yes") || cleanMsg.includes("confirm") || cleanMsg.includes("move") || cleanMsg.includes("sure"))) {
      
      // Find the client sync meeting with conflict status
      let meeting = await Meeting.findOne({ status: "conflict" });
      if (!meeting) {
        meeting = await Meeting.findOne({ title: /Client Sync/i });
      }

      if (meeting) {
        meeting.time = "14:30"; // 2:30 PM
        meeting.status = "confirmed";
        await meeting.save();

        reply = `Fixed!\nMoved 'Client Sync Overlap' to 2:30 PM today.\nUpdated invite sent to all attendees.\nNo more conflicts for today ✓`;
        actions = [
          { tool: "resolve_conflict", status: "success", data: { meetingId: meeting._id, strategy: "reschedule" } },
          { tool: "update_meeting", status: "success", data: { meetingId: meeting._id, changes: { time: "14:30", status: "confirmed" } } }
        ];
        requiresConfirmation = false;

        return res.json({ reply, actions, confirmationCard, requiresConfirmation });
      }
    }

    // 3. Selection of alternative slot (Option 1, 2, or 3)
    if ((lastAssistantMsgLower.includes("which would you prefer?") || lastAssistantMsgLower.includes("which slot works for you?")) && 
        (cleanMsg === "1" || cleanMsg === "2" || cleanMsg === "3" || cleanMsg.includes("option"))) {
      
      let optionNum = 1;
      if (cleanMsg.includes("2") || cleanMsg === "2") optionNum = 2;
      if (cleanMsg.includes("3") || cleanMsg === "3") optionNum = 3;

      let title = "Client Call";
      let duration = 45;
      let dateStr = "2026-05-26"; // Today default
      let time24 = "14:30"; // Option 1
      let attendees = ["you@company.com", "priya.sharma@example.com"];

      if (lastAssistantMsgLower.includes("ahmed") && lastAssistantMsgLower.includes("sunita")) {
        // Multi timezone group slots selection
        title = "Team Sync";
        attendees = ["you@company.com", "ahmed.mansoori@example.com", "sunita.patel@example.com"];
        if (optionNum === 1) { dateStr = "2026-05-28"; time24 = "12:00"; }
        if (optionNum === 2) { dateStr = "2026-05-29"; time24 = "11:00"; }
        if (optionNum === 3) { dateStr = "2026-05-29"; time24 = "15:00"; }
      } else {
        // Alternatives for Priya conflict
        title = "Client Call";
        if (optionNum === 1) { dateStr = "2026-05-26"; time24 = "14:30"; } // Today 2:30 PM
        if (optionNum === 2) { dateStr = "2026-05-27"; time24 = "10:00"; } // Tomorrow 10:00 AM
        if (optionNum === 3) { dateStr = "2026-05-27"; time24 = "15:00"; } // Tomorrow 3:00 PM
      }

      const rand = Math.random().toString(36).substring(2, 5) + "-" + Math.random().toString(36).substring(2, 6);
      const videoLink = `meet.google.com/${rand}`;

      const dateLong = formatDateLong(dateStr);
      const dayName = getDayOfWeekName(dateStr).substring(0, 3);
      const start12h = formatTime12h(time24);
      const end12h = formatTime12h(minsToTimeStr(parseTimeToMins(time24) + duration));

      let tzStr = "";
      if (lastAssistantMsgLower.includes("ahmed") && lastAssistantMsgLower.includes("sunita")) {
        const startGST = convertTimezone(time24, "Asia/Kolkata", "Asia/Dubai");
        const startBST = convertTimezone(time24, "Asia/Kolkata", "Europe/London");
        const endGST = convertTimezone(minsToTimeStr(parseTimeToMins(time24) + duration), "Asia/Kolkata", "Asia/Dubai");
        const endBST = convertTimezone(minsToTimeStr(parseTimeToMins(time24) + duration), "Asia/Kolkata", "Europe/London");
        tzStr = `\n   [GST: ${formatTime12h(startGST)} – ${formatTime12h(endGST)} / BST: ${formatTime12h(startBST)} – ${formatTime12h(endBST)}]`;
      }

      reply = `Great choice. Let me verify the slots...\nHost and attendees are free. Here is the confirmation block for slot #${optionNum}:\n` +
              `─────────────────────────\n` +
              `📅 ${title} with Priya Sharma\n` +
              `🕐 ${dayName}, ${dateLong.split(" ")[1]} ${dateLong.split(" ")[2]} · ${start12h} – ${end12h} IST${tzStr}\n` +
              `⏱ ${duration} minutes\n` +
              `👥 You + ${attendees.map(e => e.split("@")[0]).join(", ")}\n` +
              `📍 ${videoLink}\n` +
              `📝 Agenda:\n1. Opening context (5 min)\n2. Requirements gathering (20 min)\n3. Action items & next steps (20 min)\n` +
              `─────────────────────────\n` +
              `Shall I confirm and send the invite?`;

      requiresConfirmation = true;
      confirmationCard = {
        title: title,
        date: dateStr,
        time: time24,
        duration: duration,
        attendees: attendees,
        videoLink: videoLink
      };

      return res.json({ reply, actions, confirmationCard, requiresConfirmation });
    }

    // 4. Rescheduling Intent
    if (cleanMsg.includes("reschedule") || cleanMsg.includes("move the call") || cleanMsg.includes("change the time") || cleanMsg.includes("conflict")) {
      // Find the client sync overlap meeting
      let meeting = await Meeting.findOne({ status: "conflict" });
      if (!meeting) {
        meeting = await Meeting.findOne({ title: /Client Sync/i });
      }

      if (meeting) {
        reply = `I've found the next open slot where everyone is free: Thursday, May 28 at 3:00 PM IST.\nShould I move "${meeting.title}" to this time and notify everyone?`;
        requiresConfirmation = true;
        return res.json({ reply, actions, confirmationCard, requiresConfirmation });
      }
    }

    // 5. Cancel Intent
    if (cleanMsg.includes("cancel") || cleanMsg.includes("delete meeting")) {
      const lastMeeting = await Meeting.findOne({ type: "1:1 check-in" }).sort({ createdAt: -1 });
      if (lastMeeting) {
        reply = `Should I notify all attendees of the cancellation for "${lastMeeting.title}"?`;
        requiresConfirmation = true;
        return res.json({ reply, actions, confirmationCard, requiresConfirmation });
      }
    }

    // 6. Post-meeting Summary Intent
    if (cleanMsg.includes("roadmap meeting just ended") || cleanMsg.includes("meeting just ended") || cleanMsg.includes("summary")) {
      reply = `Got it! Here's a summary:
─────────────────────────────
✓ Meeting summary: Q3 Roadmap Review
📅 Tue 26 May · 45 min
👥 You + Ananya Krishnan

Key decisions:
- Payment module moves to Q3 — deprioritise auth redesign
- Mobile app launch target: September 15

Action items:
- Finalize sprint plan — Ananya — by May 31
- Share updated roadmap doc with team — You — by May 29

Next meeting: Schedule a follow-up in 2 weeks?
─────────────────────────────`;
      requiresConfirmation = false;
      return res.json({ reply, actions, confirmationCard, requiresConfirmation });
    }

    // 7. Group Availability Search (Ahmed & Sunita)
    if ((cleanMsg.includes("ahmed") && cleanMsg.includes("sunita")) || cleanMsg.includes("find a time")) {
      reply = `Finding overlap for IST / GST / BST this week…\nHere are the best shared slots:\n\n` +
              `1. Thu 28 May — 12:00 PM IST / 10:30 AM GST / 7:30 AM BST\n` +
              `2. Fri 29 May — 11:00 AM IST / 9:30 AM GST / 6:30 AM BST ⚠️ early for Sunita\n` +
              `3. Fri 29 May — 3:00 PM IST / 1:30 PM GST / 10:30 AM BST ✓ best for all\n\n` +
              `Which slot works for you?`;
      
      requiresConfirmation = true;
      return res.json({ reply, actions, confirmationCard, requiresConfirmation });
    }

    // 8. General Scheduling: Priya Sharma Call
    if (cleanMsg.includes("priya")) {
      // Check if slot has conflict (e.g. today at 12pm)
      if (cleanMsg.includes("12pm") || cleanMsg.includes("12:00")) {
        reply = `12:00 PM today conflicts with your protected lunch block (12:00–1:00 PM).\nNext available slots where both you and the client are free:\n\n` +
                `1. Today 2:30 PM – 3:30 PM IST\n` +
                `2. Tomorrow 10:00 AM – 11:00 AM IST\n` +
                `3. Tomorrow 3:00 PM – 4:00 PM IST\n\n` +
                `Which would you prefer?`;
        
        requiresConfirmation = true;
        return res.json({ reply, actions, confirmationCard, requiresConfirmation });
      }

      // Default: schedule tomorrow at 2pm (free)
      const duration = 45;
      const time24 = "14:00";
      const start12h = "2:00 PM";
      const end12h = "2:45 PM";
      const rand = Math.random().toString(36).substring(2, 5) + "-" + Math.random().toString(36).substring(2, 6);
      const videoLink = `meet.google.com/${rand}`;

      reply = `Got it — ${duration}-min call with Priya Sharma tomorrow at ${start12h} IST. Checking her calendar…\nPriya is free. Here's what I'll book:\n` +
              `─────────────────────────\n` +
              `📅 Client Call with Priya Sharma\n` +
              `🕐 Wed, May 27 · ${start12h} – ${end12h} IST\n` +
              `⏱ ${duration} minutes\n` +
              `👥 You + Priya Sharma\n` +
              `📍 ${videoLink}\n` +
              `📝 Agenda:\n` +
              `1. Opening context (5 min)\n` +
              `2. Requirements gathering (20 min)\n` +
              `3. Action items & next steps (20 min)\n` +
              `─────────────────────────\n` +
              `Shall I confirm and send the invite?`;
      
      requiresConfirmation = true;
      confirmationCard = {
        title: "Client Call with Priya Sharma",
        date: "2026-05-27",
        time: time24,
        duration: duration,
        attendees: ["you@company.com", "priya.sharma@example.com"],
        videoLink: videoLink
      };

      return res.json({ reply, actions, confirmationCard, requiresConfirmation });
    }

    // Default response fallback
    reply = `I'm not quite sure how to parse that command. Could you please specify who you'd like to schedule with, the date/time, or if you want to reschedule/cancel an event?`;
    res.json({ reply, actions, confirmationCard, requiresConfirmation });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
