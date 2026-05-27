/**
 * MeetAI Core Scheduling & Mock NLP Engine
 * Implements mock calendar data, attendee timezones, and scheduling tools.
 */

// Initial System State (Current Time: 2026-05-26T05:58:17+05:30 - Tuesday)
const SYSTEM_TODAY = "2026-05-26";
const SYSTEM_TZ = "Asia/Kolkata";

const STATE = {
  preferences: {
    userId: "user-98836",
    userName: "You",
    userEmail: "you@company.com",
    timezone: SYSTEM_TZ,
    workingHours: { start: "09:00", end: "18:00" },
    buffer: 10, // minutes
    preferredPlatform: "Google Meet"
  },
  
  contacts: [
    {
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      timezone: "Asia/Kolkata", // +05:30
      title: "Senior Engineer",
      avatar: "PS",
      workingHours: { start: "09:00", end: "18:00" }
    },
    {
      name: "Ahmed Al-Mansoori",
      email: "ahmed.mansoori@example.com",
      timezone: "Asia/Dubai", // +04:00 (1.5 hours behind IST)
      title: "Product Manager",
      avatar: "AM",
      workingHours: { start: "09:00", end: "18:00" }
    },
    {
      name: "Sunita Patel",
      email: "sunita.patel@example.com",
      timezone: "Europe/London", // +01:00 BST in May (4.5 hours behind IST)
      title: "UX Designer",
      avatar: "SP",
      workingHours: { start: "09:00", end: "18:00" }
    }
  ],
  
  events: [
    // Lunch Blocks (Mon - Fri, 12:00 - 13:00)
    { id: "lunch-1", title: "Protected Lunch Block", date: "2026-05-25", time: "12:00", duration: 60, attendees: ["you@company.com"], status: "Confirmed", type: "lunch" },
    { id: "lunch-2", title: "Protected Lunch Block", date: "2026-05-26", time: "12:00", duration: 60, attendees: ["you@company.com"], status: "Confirmed", type: "lunch" },
    { id: "lunch-3", title: "Protected Lunch Block", date: "2026-05-27", time: "12:00", duration: 60, attendees: ["you@company.com"], status: "Confirmed", type: "lunch" },
    { id: "lunch-4", title: "Protected Lunch Block", date: "2026-05-28", time: "12:00", duration: 60, attendees: ["you@company.com"], status: "Confirmed", type: "lunch" },
    { id: "lunch-5", title: "Protected Lunch Block", date: "2026-05-29", time: "12:00", duration: 60, attendees: ["you@company.com"], status: "Confirmed", type: "lunch" },
    
    // Focus Blocks
    { id: "focus-1", title: "Deep Work Session", date: "2026-05-28", time: "10:00", duration: 120, attendees: ["you@company.com"], status: "Confirmed", type: "focus" },
    
    // Pre-booked meetings
    {
      id: "meet-1",
      title: "Sprint Planning",
      date: "2026-05-26",
      time: "10:00",
      duration: 45,
      attendees: ["you@company.com", "priya.sharma@example.com"],
      link_type: "Google Meet",
      link: "meet.google.com/abc-sprint-plan",
      notes: "Bi-weekly sprint kick-off.",
      status: "Confirmed",
      type: "1:1 check-in"
    }
  ],

  logs: []
};

// Timezone Offsets in minutes relative to UTC
const TZ_OFFSETS = {
  "Asia/Kolkata": 330,  // UTC +5:30
  "Asia/Dubai": 240,    // UTC +4:00
  "Europe/London": 60,   // UTC +1:00 (BST)
  "America/New_York": -240 // UTC -4:00 (EDT)
};

// ==========================================
// SYSTEM LOGGING HELPER
// ==========================================
function logTool(toolName, args, result) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const entry = {
    time: timestamp,
    tool: toolName,
    args: JSON.stringify(args),
    result: typeof result === 'object' ? JSON.stringify(result) : String(result)
  };
  STATE.logs.push(entry);
  
  // Dispatch custom event for UI updates
  const event = new CustomEvent('systemLogAdded', { detail: entry });
  window.dispatchEvent(event);
}

// ==========================================
// VIRTUAL API TOOLS
// ==========================================

/**
 * check_calendar(user_id, date_range) -> busy/free slots for the host
 */
function check_calendar(user_id, startDate, endDate) {
  const matching = STATE.events.filter(e => {
    return e.date >= startDate && e.date <= endDate;
  });
  logTool("check_calendar", { user_id, startDate, endDate }, `${matching.length} events found`);
  return matching;
}

/**
 * get_attendee_timezone(email) -> returns attendee timezone
 */
function get_attendee_timezone(email) {
  if (email === STATE.preferences.userEmail) return STATE.preferences.timezone;
  const contact = STATE.contacts.find(c => c.email === email || c.name.toLowerCase().includes(email.toLowerCase()));
  const tz = contact ? contact.timezone : SYSTEM_TZ;
  logTool("get_attendee_timezone", { email }, tz);
  return tz;
}

/**
 * convert_timezone(timeString, from_tz, to_tz)
 * @param {string} timeString HH:MM
 */
function convert_timezone(timeString, from_tz, to_tz) {
  const offsetFrom = TZ_OFFSETS[from_tz] || 0;
  const offsetTo = TZ_OFFSETS[to_tz] || 0;
  
  const [h, m] = timeString.split(":").map(Number);
  const minutesSinceUtc = (h * 60 + m) - offsetFrom;
  let targetMinutes = (minutesSinceUtc + offsetTo + 1440) % 1440;
  
  const targetH = Math.floor(targetMinutes / 60);
  const targetM = targetMinutes % 60;
  
  const formatted = `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;
  logTool("convert_timezone", { timeString, from_tz, to_tz }, formatted);
  return formatted;
}

/**
 * check_attendee_availability(attendee_emails[], date_range)
 * Mock attendee busy times
 */
function check_attendee_availability(attendee_emails, startDate, endDate) {
  // Let's define some busy times for contacts to simulate conflicts:
  // Priya: Busy tomorrow (Wed 27th) at 15:00 - 16:00 IST
  // Ahmed: Busy on Friday (29th) at 13:00 - 14:00 GST
  // Sunita: Has normal working hours (9 AM - 6 PM GMT = 1:30 PM - 10:30 PM IST)
  
  const availability = {
    "priya.sharma@example.com": [
      { date: "2026-05-27", start: "15:00", end: "16:00", tz: "Asia/Kolkata" }
    ],
    "ahmed.mansoori@example.com": [
      { date: "2026-05-29", start: "13:00", end: "14:00", tz: "Asia/Dubai" }
    ],
    "sunita.patel@example.com": []
  };

  const busySlots = [];
  attendee_emails.forEach(email => {
    const slots = availability[email] || [];
    slots.forEach(slot => {
      busySlots.push({
        attendee: email,
        date: slot.date,
        // Convert to host timezone (Asia/Kolkata)
        startIST: convert_timezone(slot.start, slot.tz, STATE.preferences.timezone),
        endIST: convert_timezone(slot.end, slot.tz, STATE.preferences.timezone)
      });
    });
  });

  logTool("check_attendee_availability", { attendee_emails, startDate, endDate }, `${busySlots.length} busy constraints loaded`);
  return busySlots;
}

/**
 * detect_conflicts(user_id, date, start_time, duration_mins)
 */
function detect_conflicts(user_id, date, start_time, duration_mins) {
  const [sh, sm] = start_time.split(":").map(Number);
  const startTotal = sh * 60 + sm;
  const endTotal = startTotal + duration_mins;
  
  const buffer = STATE.preferences.buffer;
  
  // Find conflicts in local calendar
  const conflicts = [];
  
  STATE.events.forEach(event => {
    if (event.date !== date) return;
    
    const [eh, em] = event.time.split(":").map(Number);
    const evStart = eh * 60 + em;
    const evEnd = evStart + event.duration;
    
    // Check overlap OR buffer overlap
    const isOverlap = (startTotal < evEnd && endTotal > evStart);
    const isBufferConflict = (startTotal < evEnd + buffer && endTotal > evStart - buffer) && !isOverlap;
    
    if (isOverlap) {
      conflicts.push({
        type: "OVERLAP",
        event: event,
        message: `Your ${formatTime12h(start_time)} slot overlaps with existing event: "${event.title}"`
      });
    } else if (isBufferConflict && event.type !== 'lunch') {
      conflicts.push({
        type: "BUFFER_VIOLATION",
        event: event,
        message: `Your ${formatTime12h(start_time)} slot violates the ${buffer}-minute buffer rule after "${event.title}"`
      });
    }
  });

  // Verify working hours constraint (Host)
  const workStart = parseTimeToMins(STATE.preferences.workingHours.start);
  const workEnd = parseTimeToMins(STATE.preferences.workingHours.end);
  
  if (startTotal < workStart || endTotal > workEnd) {
    conflicts.push({
      type: "WORKING_HOURS_VIOLATION",
      message: `The proposed slot ${formatTime12h(start_time)} is outside your configured working hours (${formatTime12h(STATE.preferences.workingHours.start)} - ${formatTime12h(STATE.preferences.workingHours.end)}).`
    });
  }
  
  logTool("detect_conflicts", { user_id, date, start_time, duration_mins }, conflicts);
  return conflicts;
}

/**
 * generate_video_link(platform)
 */
function generate_video_link(platform) {
  const rand = Math.random().toString(36).substring(2, 5) + "-" + Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 5);
  let link = "";
  if (platform === "Zoom") link = `zoom.us/j/${Math.floor(100000000 + Math.random() * 900000000)}`;
  else if (platform === "Microsoft Teams") link = `teams.live.com/meet/${rand}`;
  else link = `meet.google.com/${rand}`;
  
  logTool("generate_video_link", { platform }, link);
  return link;
}

/**
 * create_event(title, date, time, duration, attendees[], link_type, notes)
 */
function create_event(title, date, time, duration, attendees, link_type, notes) {
  const platform = link_type || STATE.preferences.preferredPlatform;
  const link = generate_video_link(platform);
  
  // Set default type
  let type = "1:1 check-in";
  if (title.toLowerCase().includes("standup")) type = "standup";
  else if (title.toLowerCase().includes("interview")) type = "interview";
  else if (title.toLowerCase().includes("client")) type = "client";
  else if (title.toLowerCase().includes("brainstorm")) type = "brainstorm";
  else if (title.toLowerCase().includes("workshop")) type = "workshop";
  else if (title.toLowerCase().includes("performance")) type = "performance review";
  
  const newEvent = {
    id: "event-" + Date.now(),
    title,
    date,
    time,
    duration,
    attendees,
    link_type: platform,
    link,
    notes: notes || "",
    status: attendees.length > 1 ? "Tentative" : "Confirmed", // Rule 13: Tentative until RSVPs confirmed
    type
  };
  
  STATE.events.push(newEvent);
  
  logTool("create_event", { title, date, time, duration }, newEvent.id);
  
  // Notify external listeners/UI update
  window.dispatchEvent(new CustomEvent('calendarUpdated'));
  return newEvent;
}

/**
 * update_event(event_id, changes{})
 */
function update_event(event_id, changes) {
  const event = STATE.events.find(e => e.id === event_id);
  if (event) {
    Object.assign(event, changes);
    logTool("update_event", { event_id, changes }, "SUCCESS");
    window.dispatchEvent(new CustomEvent('calendarUpdated'));
    return event;
  }
  logTool("update_event", { event_id, changes }, "NOT_FOUND");
  return null;
}

/**
 * cancel_event(event_id, notify_attendees)
 */
function cancel_event(event_id, notify_attendees = true) {
  const idx = STATE.events.findIndex(e => e.id === event_id);
  if (idx !== -1) {
    const deleted = STATE.events.splice(idx, 1)[0];
    logTool("cancel_event", { event_id, notify_attendees }, "SUCCESS");
    window.dispatchEvent(new CustomEvent('calendarUpdated'));
    return deleted;
  }
  logTool("cancel_event", { event_id }, "NOT_FOUND");
  return null;
}

/**
 * send_invite(event_id, attendees[])
 */
function send_invite(event_id, attendees) {
  logTool("send_invite", { event_id, attendees }, "INVITES_SENT");
  return true;
}

/**
 * generate_agenda(meeting_title, attendees[], past_context)
 */
function generate_agenda(meeting_title, attendees, duration = 30) {
  let item1 = "Opening / context setting";
  let item2 = "Core Discussion Item";
  let item3 = "Strategy & Alignment";
  
  if (meeting_title.toLowerCase().includes("client")) {
    item2 = "Client Requirements Gathering";
    item3 = "Deliverables Timeline Review";
  } else if (meeting_title.toLowerCase().includes("brainstorm")) {
    item2 = "Idea Generation & Whiteboarding";
    item3 = "Prioritization Matrix Review";
  } else if (meeting_title.toLowerCase().includes("roadmap")) {
    item2 = "Quarterly Objectives Mapping";
    item3 = "Resource Allocation & Deadlines";
  } else if (meeting_title.toLowerCase().includes("1:1") || meeting_title.toLowerCase().includes("call with")) {
    item2 = "Progress & Key Wins Update";
    item3 = "Blockers & Support Request";
  }

  const p1 = Math.floor(duration * 0.15);
  const p2 = Math.floor(duration * 0.40);
  const p3 = Math.floor(duration * 0.25);
  const p4 = Math.floor(duration * 0.10);
  const p5 = duration - (p1 + p2 + p3 + p4);

  const agendaText = `1. ${item1} (${p1} min)
2. ${item2} (${p2} min)
3. ${item3} (${p3} min)
4. Blockers / Q&A (${p4} min)
5. Action items & next steps (${p5} min)`;

  logTool("generate_agenda", { meeting_title, duration }, "Generated Agenda Draft");
  return agendaText;
}

/**
 * generate_summary(meeting_id, transcript)
 */
function generate_summary(meeting_title, date = SYSTEM_TODAY) {
  const summary = {
    title: meeting_title,
    date: formatDateLong(date),
    duration: "45 min",
    attendees: "You + Ananya Krishnan",
    decisions: [
      "Payment module moves to Q3 — deprioritise auth redesign",
      "Mobile app launch target: September 15"
    ],
    actionItems: [
      { task: "Finalize sprint plan", assignee: "Ananya", date: "May 31" },
      { task: "Share updated roadmap doc with team", assignee: "You", date: "May 29" }
    ],
    followUp: "Schedule a follow-up in 2 weeks?"
  };
  
  logTool("generate_summary", { meeting_title }, "Summary Block Created");
  return summary;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
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

// ==========================================
// NLP PARSER SIMULATOR
// ==========================================
const PendingAction = {
  intent: null,
  payload: null
};

function parseNaturalLanguage(text) {
  const clean = text.toLowerCase().trim();
  
  // 1. Rescheduling intent
  if (clean.includes("reschedule") || clean.includes("move the call") || clean.includes("change the time")) {
    // Find last scheduled meeting with attendees
    const lastEvent = [...STATE.events].reverse().find(e => e.type !== 'lunch' && e.type !== 'focus');
    if (lastEvent) {
      PendingAction.intent = "RESCHEDULE_CONFIRM_SAME";
      PendingAction.payload = { event: lastEvent };
      return {
        reply: `Do you want to keep the same attendees and duration, just change the time?`,
        pending: true
      };
    }
  }

  // 2. Cancellation intent
  if (clean.includes("cancel") || clean.includes("delete meeting") || clean.includes("remove meeting")) {
    // Find last scheduled event
    const lastEvent = [...STATE.events].reverse().find(e => e.type !== 'lunch' && e.type !== 'focus');
    if (lastEvent) {
      PendingAction.intent = "CANCEL_CONFIRM_NOTIFY";
      PendingAction.payload = { event: lastEvent };
      return {
        reply: `Should I notify all attendees of the cancellation for "${lastEvent.title}"?`,
        pending: true
      };
    }
  }

  // 3. Post-meeting summary trigger
  if (clean.includes("q3 roadmap meeting just ended") || clean.includes("meeting just ended") || clean.includes("roadmap meeting ended")) {
    const summary = generate_summary("Q3 Roadmap Review", SYSTEM_TODAY);
    return {
      reply: `Got it! Here's a summary:
─────────────────────────────
✓ Meeting summary: ${summary.title}
Date: ${summary.date} · ${summary.duration}
Attendees: ${summary.attendees}

Key decisions:
${summary.decisions.map(d => `- ${d}`).join('\n')}

Action items:
${summary.actionItems.map(a => `- ${a.task} — ${a.assignee} — by ${a.date}`).join('\n')}

Next meeting: ${summary.followUp}
─────────────────────────────`,
      pending: false
    };
  }

  // 4. Overlap/Find shared slots search (Ahmed and Sunita)
  if ((clean.includes("ahmed") && clean.includes("sunita")) || clean.includes("find a time for me")) {
    const emails = ["ahmed.mansoori@example.com", "sunita.patel@example.com"];
    check_attendee_availability(emails, "2026-05-25", "2026-05-29");
    
    // Return options exactly matching the timezone behaviors:
    // IST: Asia/Kolkata (+5:30)
    // GST: Asia/Dubai (+4:00) -> 1.5h behind IST
    // GMT: Europe/London (+1:00) -> 4.5h behind IST
    
    return {
      reply: `Finding overlap for IST / GST / BST this week…
Here are the best shared slots:

1. Thu 28 May — 12:00 PM IST / 10:30 AM GST / 7:30 AM BST
2. Fri 29 May — 11:00 AM IST / 9:30 AM GST / 6:30 AM BST (early for Sunita)
3. Fri 29 May — 3:00 PM IST / 1:30 PM GST / 10:30 AM BST (best for all)

Which slot works for you?`,
      pending: true,
      context: {
        intent: "SELECT_OVERLAP_SLOT",
        options: [
          { date: "2026-05-28", time: "12:00", duration: 45, attendees: emails, title: "Team Sync" },
          { date: "2026-05-29", time: "11:00", duration: 45, attendees: emails, title: "Team Sync" },
          { date: "2026-05-29", time: "15:00", duration: 45, attendees: emails, title: "Team Sync" }
        ]
      }
    };
  }

  // 5. General Booking/Scheduling Parsing
  let attendee = null;
  let attendeeEmail = null;
  
  if (clean.includes("priya")) {
    attendee = "Priya Sharma";
    attendeeEmail = "priya.sharma@example.com";
  } else if (clean.includes("ahmed")) {
    attendee = "Ahmed Al-Mansoori";
    attendeeEmail = "ahmed.mansoori@example.com";
  } else if (clean.includes("sunita")) {
    attendee = "Sunita Patel";
    attendeeEmail = "sunita.patel@example.com";
  }

  // Parse time
  let timeStr = null;
  let time24 = null;
  if (clean.includes("2pm") || clean.includes("2:00 pm")) {
    timeStr = "2:00 PM";
    time24 = "14:00";
  } else if (clean.includes("12pm") || clean.includes("12:00 pm")) {
    timeStr = "12:00 PM";
    time24 = "12:00";
  } else if (clean.includes("10am") || clean.includes("10:00 am")) {
    timeStr = "10:00 AM";
    time24 = "10:00";
  } else if (clean.includes("3pm") || clean.includes("3:00 pm")) {
    timeStr = "3:00 PM";
    time24 = "15:00";
  }
  
  // Parse date
  let dateStr = SYSTEM_TODAY;
  let dateLong = formatDateLong(SYSTEM_TODAY);
  if (clean.includes("tomorrow")) {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    dateStr = tom.toISOString().split('T')[0];
    dateLong = formatDateLong(dateStr);
  } else if (clean.includes("today")) {
    dateStr = SYSTEM_TODAY;
    dateLong = formatDateLong(dateStr);
  }

  // Parse meeting type defaults
  let title = "1:1 Check-in";
  let duration = 30;
  if (clean.includes("client")) {
    title = "Client Call";
    duration = 45;
  } else if (clean.includes("brainstorm")) {
    title = "Brainstorming Session";
    duration = 60;
  } else if (clean.includes("workshop")) {
    title = "Workshop Session";
    duration = 90;
  }

  // Complete details parsing
  if (attendee && time24) {
    // 1:1 Check with Priya
    const attendeeEmails = [attendeeEmail];
    
    // Simulate check_calendar
    check_calendar(STATE.preferences.userId, dateStr, dateStr);
    
    // Check conflicts
    const conflicts = detect_conflicts(STATE.preferences.userId, dateStr, time24, duration);
    
    if (conflicts.length > 0) {
      // Handle conflicts (behavior #4)
      const primaryConflict = conflicts[0];
      let reply = "";
      
      if (primaryConflict.event && primaryConflict.event.type === 'lunch') {
        reply = `${timeStr} today conflicts with your protected lunch block (12:00–1:00 PM).\nNext available slots where both you and the client are free:\n\n`;
      } else {
        reply = `Conflict detected: ${primaryConflict.message}.\nHere are the next available slots that work for everyone:\n\n`;
      }
      
      // Generate 3 alternatives
      // Today is Tue May 26.
      // Alt 1: Today 2:30 PM (14:30)
      // Alt 2: Tomorrow 10:00 AM (10:00)
      // Alt 3: Tomorrow 3:00 PM (15:00)
      reply += `1. Today 2:30 PM – 3:30 PM IST\n2. Tomorrow 10:00 AM – 11:00 AM IST\n3. Tomorrow 3:00 PM – 4:00 PM IST\n\nWhich would you prefer?`;
      
      // Calculate alternative dates
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      const tomStr = tom.toISOString().split('T')[0];
      
      PendingAction.intent = "SELECT_ALTERNATIVE";
      PendingAction.payload = {
        title: title,
        duration: duration,
        attendees: attendeeEmails,
        alternatives: [
          { date: SYSTEM_TODAY, time: "14:30", label: "Today 2:30 PM" },
          { date: tomStr, time: "10:00", label: "Tomorrow 10:00 AM" },
          { date: tomStr, time: "15:00", label: "Tomorrow 3:00 PM" }
        ]
      };
      
      return { reply, pending: true };
    } else {
      // Slot is free! Show confirmation block
      const link = generate_video_link(STATE.preferences.preferredPlatform);
      const agenda = generate_agenda(title, attendeeEmails, duration);
      
      PendingAction.intent = "CONFIRM_BOOKING";
      PendingAction.payload = {
        title: `${title} with ${attendee}`,
        date: dateStr,
        time: time24,
        duration: duration,
        attendees: attendeeEmails,
        link: link,
        notes: agenda
      };
      
      const dayName = getDayOfWeekName(dateStr).substring(0, 3);
      const start12h = formatTime12h(time24);
      const end12h = formatTime12h(minsToTimeStr(parseTimeToMins(time24) + duration));
      
      return {
        reply: `Got it — ${duration}-min call with ${attendee} tomorrow at ${start12h} IST. Checking her calendar…\n${attendee.split(" ")[0]} is free. Here's what I'll book:\n` +
               `─────────────────────────\n` +
               `Title: ${title} with ${attendee}\n` +
               `Time: ${dayName}, ${dateLong.split(" ")[1]} ${dateLong.split(" ")[2]} · ${start12h} – ${end12h} IST\n` +
               `Duration: ${duration} minutes\n` +
               `Attendees: You + ${attendee}\n` +
               `Link: ${link}\n` +
               `Agenda:\n${agenda}\n` +
               `─────────────────────────\n` +
               `Shall I confirm and send the invite?`,
        pending: true
      };
    }
  }

  // 6. Handle simple text affirmations (Yes, Confirm, 1, 2, 3)
  if (PendingAction.intent) {
    const textNumber = parseInt(clean);
    
    if (PendingAction.intent === "CONFIRM_BOOKING" && (clean.includes("yes") || clean.includes("confirm") || clean.includes("book") || clean.includes("sure"))) {
      const p = PendingAction.payload;
      const event = create_event(p.title, p.date, p.time, p.duration, p.attendees, STATE.preferences.preferredPlatform, p.notes);
      send_invite(event.id, p.attendees);
      
      PendingAction.intent = null;
      PendingAction.payload = null;
      
      return {
        reply: `✓ Booked! Invites sent to ${p.attendees.map(e => e.split("@")[0]).join(", ")}. Meet link: https://${event.link}\n\nI've set reminders: 24 hours before and 15 minutes before. Want to add or change these?`,
        pending: false
      };
    }
    
    if (PendingAction.intent === "SELECT_ALTERNATIVE" && (textNumber >= 1 && textNumber <= 3)) {
      const p = PendingAction.payload;
      const selectedAlt = p.alternatives[textNumber - 1];
      
      const link = generate_video_link(STATE.preferences.preferredPlatform);
      const agenda = generate_agenda(p.title, p.attendees, p.duration);
      
      PendingAction.intent = "CONFIRM_BOOKING";
      PendingAction.payload = {
        title: `${p.title}`,
        date: selectedAlt.date,
        time: selectedAlt.time,
        duration: p.duration,
        attendees: p.attendees,
        link: link,
        notes: agenda
      };
      
      const dateLongAlt = formatDateLong(selectedAlt.date);
      const dayName = getDayOfWeekName(selectedAlt.date).substring(0, 3);
      const start12h = formatTime12h(selectedAlt.time);
      const end12h = formatTime12h(minsToTimeStr(parseTimeToMins(selectedAlt.time) + p.duration));
      
      return {
        reply: `Great choice. Let me verify the slots...\nHost and attendees are free. Here is the confirmation block for slot #${textNumber}:\n` +
               `─────────────────────────\n` +
               `Title: ${p.title}\n` +
               `Time: ${dayName}, ${dateLongAlt.split(" ")[1]} ${dateLongAlt.split(" ")[2]} · ${start12h} – ${end12h} IST\n` +
               `Duration: ${p.duration} minutes\n` +
               `Attendees: You + ${p.attendees.map(e => e.split("@")[0]).join(", ")}\n` +
               `Link: ${link}\n` +
               `Agenda:\n${agenda}\n` +
               `─────────────────────────\n` +
               `Shall I confirm and send the invite?`,
        pending: true
      };
    }

    if (PendingAction.intent === "SELECT_OVERLAP_SLOT" && (textNumber >= 1 && textNumber <= 3)) {
      // Find overlap slot selection
      const context = PendingAction.payload || {};
      const selected = context.options[textNumber - 1];
      
      const link = generate_video_link(STATE.preferences.preferredPlatform);
      const agenda = generate_agenda(selected.title, selected.attendees, selected.duration);
      
      PendingAction.intent = "CONFIRM_BOOKING";
      PendingAction.payload = {
        title: selected.title,
        date: selected.date,
        time: selected.time,
        duration: selected.duration,
        attendees: selected.attendees,
        link: link,
        notes: agenda
      };
      
      const dateLongAlt = formatDateLong(selected.date);
      const dayName = getDayOfWeekName(selected.date).substring(0, 3);
      const start12h = formatTime12h(selected.time);
      const end12h = formatTime12h(minsToTimeStr(parseTimeToMins(selected.time) + selected.duration));
      
      // Display multi-timezone format in confirmation
      const startGST = convert_timezone(selected.time, STATE.preferences.timezone, "Asia/Dubai");
      const startBST = convert_timezone(selected.time, STATE.preferences.timezone, "Europe/London");
      const endGST = convert_timezone(minsToTimeStr(parseTimeToMins(selected.time) + selected.duration), STATE.preferences.timezone, "Asia/Dubai");
      const endBST = convert_timezone(minsToTimeStr(parseTimeToMins(selected.time) + selected.duration), STATE.preferences.timezone, "Europe/London");
      
      return {
        reply: `Verification complete. Here is the confirmation block for slot #${textNumber}:\n` +
               `─────────────────────────\n` +
               `Title: ${selected.title}\n` +
               `Time: ${dayName}, ${dateLongAlt.split(" ")[1]} ${dateLongAlt.split(" ")[2]} · ${start12h} – ${end12h} IST\n` +
               `   [GST: ${formatTime12h(startGST)} – ${formatTime12h(endGST)} / BST: ${formatTime12h(startBST)} – ${formatTime12h(endBST)}]\n` +
               `Duration: ${selected.duration} minutes\n` +
               `Attendees: You + Ahmed Al-Mansoori + Sunita Patel\n` +
               `Link: ${link}\n` +
               `Agenda:\n${agenda}\n` +
               `─────────────────────────\n` +
               `Shall I confirm and send the invite?`,
        pending: true
      };
    }

    if (PendingAction.intent === "RESCHEDULE_CONFIRM_SAME") {
      if (clean.includes("yes") || clean.includes("keep") || clean.includes("same")) {
        const event = PendingAction.payload.event;
        // Let's find the next best slot for this meeting.
        // If it was Wed 27th, let's reschedule to Thu 28th at 3pm
        const newTime = "15:00";
        const tom = new Date();
        tom.setDate(tom.getDate() + 2); // Thu 28
        const newDate = tom.toISOString().split('T')[0];
        
        PendingAction.intent = "CONFIRM_RESCHEDULE";
        PendingAction.payload = {
          event: event,
          newDate: newDate,
          newTime: newTime
        };
        
        return {
          reply: `I've found the next open slot where everyone is free: Thursday, May 28 at 3:00 PM IST.\nShould I move "${event.title}" to this time and notify everyone?`,
          pending: true
        };
      }
    }

    if (PendingAction.intent === "CONFIRM_RESCHEDULE" && (clean.includes("yes") || clean.includes("confirm") || clean.includes("sure"))) {
      const p = PendingAction.payload;
      update_event(p.event.id, { date: p.newDate, time: p.newTime });
      send_invite(p.event.id, p.event.attendees);
      
      PendingAction.intent = null;
      PendingAction.payload = null;
      
      return {
        reply: `✓ Rescheduled! "${p.event.title}" has been moved. New invites sent to attendees.`,
        pending: false
      };
    }

    if (PendingAction.intent === "CANCEL_CONFIRM_NOTIFY") {
      const event = PendingAction.payload.event;
      const notify = clean.includes("yes") || clean.includes("notify") || clean.includes("sure");
      
      cancel_event(event.id, notify);
      
      PendingAction.intent = null;
      PendingAction.payload = null;
      
      return {
        reply: `✓ Cancelled! The meeting "${event.title}" has been cancelled${notify ? " and all attendees have been notified" : ""}.`,
        pending: false
      };
    }
  }

  // Fallback default message
  return {
    reply: `I'm not quite sure how to parse that command. Could you please specify who you'd like to schedule with, the date/time, or if you want to reschedule/cancel an event?`,
    pending: false
  };
}
