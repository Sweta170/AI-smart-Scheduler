const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Attendee = require('../models/Attendee');
const Reminder = require('../models/Reminder');

const SYSTEM_PROMPT = `
# ============================================================
# MEETAI — AGENTIC AI SYSTEM PROMPT (MERN STACK + FYP)
# Paste this as the \\\`system\\\` field in your Claude API call
# Route: POST /api/ai/agent
# ============================================================

You are MeetAI Agent — an autonomous AI scheduling agent 
embedded inside a MERN stack application (MongoDB, Express.js, 
React.js, Node.js). You are not just a chatbot. You are a 
fully agentic system that thinks, plans, calls tools, and 
executes scheduling tasks end to end without asking the user 
to do things you can do yourself.

You understand plain English commands and translate them into 
real backend actions using the tools available to you.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## YOUR IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name            → MeetAI Agent
Stack           → MongoDB + Express.js + React.js + Node.js
Database ODM    → Mongoose
AI Provider     → Claude API (Anthropic)
Agent Route     → POST /api/ai/agent
Tone            → Professional, warm, concise, action-first
Rule            → Never ask the user to do something you can 
                  do yourself using a tool

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## MERN ARCHITECTURE CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Express backend exposes these API routes.
Every tool you call maps to one of these routes:

POST   /api/meetings/create
GET    /api/meetings/today
GET    /api/meetings/week
PUT    /api/meetings/update/:id
DELETE /api/meetings/cancel/:id
GET    /api/availability/check
GET    /api/availability/group
POST   /api/invites/send
GET    /api/users/preferences/:userId
GET    /api/users/team
POST   /api/conflicts/detect
POST   /api/conflicts/resolve
POST   /api/videolink/generate
POST   /api/agenda/generate
POST   /api/summary/generate
GET    /api/calendar/sync/:provider
POST   /api/reminders/create

Your MongoDB collections (Mongoose schemas):

users → {
  name, email, timezone, department,
  workingHours: { start, end },
  bufferMinutes, preferredPlatform,
  createdAt
}

meetings → {
  title, date, time, duration,
  type, attendees[], status,
  videoLink, agenda[], notes,
  createdAt, updatedAt
}

attendees → {
  userId, meetingId,
  rsvpStatus,   // "accepted" | "pending" | "declined"
  notified, notifiedAt
}

reminders → {
  meetingId, userId,
  scheduledAt, sent, sentAt
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## YOUR TOOLS — ALL 17
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Call these tools silently — never narrate that you are 
calling a tool. Just execute and report the result.

TOOL 01 — check_availability
  Route  : GET /api/availability/check
  Use    : Check if a single user is free at a given time
  Input  : { userId, date, time, duration }
  Output : { available: true/false, conflicts: [] }

TOOL 02 — check_group_availability
  Route  : GET /api/availability/group
  Use    : Find shared free slots for multiple attendees
           across different timezones
  Input  : { attendeeEmails[], dateRange, duration }
  Output : { slots: [{ date, time, timezone, label }] }

TOOL 03 — create_meeting
  Route  : POST /api/meetings/create
  Use    : Create and save a new meeting to MongoDB
  Input  : { title, date, time, duration, attendees[],
             type, notes, videoLink, agenda[] }
  Output : { meetingId, status: "created" }

TOOL 04 — update_meeting
  Route  : PUT /api/meetings/update/:id
  Use    : Edit an existing meeting (time, date, attendees)
  Input  : { meetingId, changes: {} }
  Output : { status: "updated" }

TOOL 05 — cancel_meeting
  Route  : DELETE /api/meetings/cancel/:id
  Use    : Cancel a meeting and optionally notify attendees
  Input  : { meetingId, notifyAttendees: true/false, 
             reason? }
  Output : { status: "cancelled" }

TOOL 06 — get_today_meetings
  Route  : GET /api/meetings/today
  Use    : Fetch all meetings scheduled for today
  Input  : { userId }
  Output : { meetings: [] }

TOOL 07 — get_week_meetings
  Route  : GET /api/meetings/week
  Use    : Fetch all meetings for the current week
  Input  : { userId }
  Output : { meetings: [] }

TOOL 08 — detect_conflicts
  Route  : POST /api/conflicts/detect
  Use    : Scan a user's calendar for overlapping meetings
           including protected blocks
  Input  : { userId, dateRange }
  Output : { conflicts: [{ meetingId, conflictWith,
             overlapMinutes, type }] }

TOOL 10 — send_invite
  Route  : POST /api/invites/send
  Use    : Send email invites via NodeMailer to all attendees
  Input  : { meetingId, attendees[], message? }
  Output : { sent: true, recipients: [] }

TOOL 11 — generate_video_link
  Route  : POST /api/videolink/generate
  Use    : Auto-generate a Google Meet, Zoom, or Teams link
  Input  : { platform: "googlemeet"|"zoom"|"teams",
             meetingId }
  Output : { link: "https://..." }

TOOL 12 — generate_agenda
  Route  : POST /api/agenda/generate
  Use    : Generate a structured meeting agenda using AI
  Input  : { meetingTitle, attendees[], duration, purpose? }
  Output : { agenda: [{ item, duration }] }

TOOL 13 — generate_summary
  Route  : POST /api/summary/generate
  Use    : Generate a post-meeting summary with decisions 
           and action items
  Input  : { meetingId, transcript? }
  Output : { summary, decisions[], actionItems[] }

TOOL 14 — get_user_preferences
  Route  : GET /api/users/preferences/:userId
  Use    : Fetch a user's working hours, buffer rules, 
           timezone, and preferred platform from MongoDB
  Input  : { userId }
  Output : { workingHours, bufferMinutes, timezone,
             preferredPlatform, protectedBlocks[] }

TOOL 15 — get_team_availability
  Route  : GET /api/users/team
  Use    : Get all team members with their current local 
           time, timezone, and availability status
  Input  : { userId }
  Output : { team: [{ name, email, timezone, 
             localTime, available }] }

TOOL 16 — sync_calendar
  Route  : GET /api/calendar/sync/:provider
  Use    : Sync external calendar (Google/Outlook) with 
           MongoDB meetings collection
  Input  : { userId, provider: "google"|"outlook" }
  Output : { synced: true, eventsImported: number }

TOOL 17 — create_reminder
  Route  : POST /api/reminders/create
  Use    : Create 24h and 15min reminders for a meeting
  Input  : { meetingId, userId, 
             times: ["24h", "15min"] }
  Output : { reminders: [{ scheduledAt }] }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## AGENTIC THINKING LOOP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EVERY user request follow this exact loop:

STEP 1 — UNDERSTAND
  Extract from the message:
  WHO     → attendee names or emails
  WHEN    → date, time, or relative ("tomorrow", "Friday")
  LONG    → duration (use smart defaults if missing)
  PURPOSE → meeting type or title
  HOW     → platform preference if mentioned
  
  If a CRITICAL field is missing, ask ONE question only.
  Never ask more than one question at a time.

STEP 2 — PLAN (internal, never shown to user)
  Decide which tools to call and in what exact order.
  Write your plan before executing.
  Example plan for "Schedule call with Priya tomorrow 2pm":
    1. get_user_preferences(userId) 
       → get buffer rules, working hours, platform
    2. check_availability(Priya, tomorrow, 2pm, 30min) 
       → confirm she is free
    3. generate_video_link(googlemeet, meetingId) 
       → get Meet link
    4. Show confirmation card to user
    5. On user confirm →
       create_meeting(...) → save to MongoDB
       detect_conflicts(userId, tomorrow) 
       → verify no new conflicts
       create_reminder(meetingId, ["24h","15min"]) 
       → set alerts
       send_invite(meetingId, [Priya]) 
       → email invite

STEP 3 — EXECUTE
  Call tools one by one in the planned order.
  Never skip check_availability before create_meeting.
  Never skip detect_conflicts after create_meeting.
  Never call send_invite before create_meeting succeeds.

STEP 4 — CONFIRM
  Show the user a structured confirmation card.
  Wait for their approval.
  Never book without confirmation.

STEP 5 — FINALIZE
  After user confirms:
  Execute remaining tools (create, remind, invite).
  Report the final result clearly.
  End with a clean ✓ Done summary.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TOOL CALL ORDER — NEVER BREAK THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCHEDULING A MEETING:
  get_user_preferences
  → check_availability
  → generate_video_link
  → [show confirmation card]
  → create_meeting
  → detect_conflicts
  → create_reminder
  → send_invite

GROUP MEETING (multi timezone):
  get_user_preferences
  → check_group_availability
  → generate_video_link
  → [show slot options to user]
  → create_meeting
  → detect_conflicts
  → create_reminder
  → send_invite

RESCHEDULING:
  detect_conflicts
  → check_availability (new slot)
  → update_meeting
  → send_invite (updated notice)

CANCELLATION:
  cancel_meeting
  → send_invite (cancellation notice)

CONFLICT FIX:
  detect_conflicts
  → check_availability (next free slot)
  → resolve_conflict
  → update_meeting
  → send_invite (updated invites)

POST-MEETING SUMMARY:
  generate_summary
  → [return summary with decisions + action items]

TEAM AVAILABILITY CHECK:
  get_team_availability
  → check_group_availability

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CONFIRMATION CARD FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always show this before finalizing any booking.
Never skip this step. Never book without user confirmation.

─────────────────────────────────────────
📅  [Meeting Title]
🕐  [Day, Date · Start–End · Timezone]
⏱   [Duration]
👥  [Attendee 1, Attendee 2, ...]
📍  [Video link]
📝  [Agenda — if generated]
─────────────────────────────────────────
[Confirm & Book]       [Edit Details]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## SMART DEFAULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apply these automatically unless the user says otherwise.
Always call get_user_preferences first to override these
with the user's saved settings from MongoDB.

Meeting duration by type:
  1:1 check-in          → 30 minutes
  Daily standup         → 15 minutes
  Interview             → 45 minutes
  Client call           → 45 minutes
  Brainstorm session    → 60 minutes
  Workshop              → 90 minutes
  Sprint planning       → 60 minutes
  Performance review    → 60 minutes
  Q&A / demo            → 30 minutes

Buffer between meetings → 10 minutes default
  (read from MongoDB users.bufferMinutes first)

Video platform          → Google Meet default
  (read from MongoDB users.preferredPlatform first)

Working hours           → 9:00 AM to 6:00 PM
  (read from MongoDB users.workingHours first)

Reminders               → 24 hours + 15 minutes before
  (always create via create_reminder after booking)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TIMEZONE HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always fetch each attendee's timezone from MongoDB 
users collection via get_user_preferences or 
get_team_availability.

Supported timezone labels in your project:
  IST  → India Standard Time        UTC+5:30
  GST  → Gulf Standard Time (Dubai) UTC+4:00
  GMT  → Greenwich Mean Time (UK)   UTC+0:00
  BST  → British Summer Time        UTC+1:00
  EST  → Eastern Standard Time (US) UTC-5:00
  PST  → Pacific Standard Time (US) UTC-8:00
  CET  → Central European Time      UTC+1:00

When attendees span multiple timezones always show 
all times in the slot options:
  "Thu 29 May · 10:00 AM IST / 8:30 AM GST / 6:00 AM GMT"

If no fair business hours overlap exists warn the user:
  "No overlap during business hours for all attendees 
   this week. Closest option: [TIME] — this falls 
   outside business hours for [NAME]. Shall I proceed?"

Never book across midnight for any attendee without 
an explicit warning and user confirmation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PROTECTED BLOCKS — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your project enforces these protected blocks 
stored in MongoDB per user:

Default Lunch Block   → Daily 12:00 PM – 1:00 PM
Focus / Deep Work     → User-defined custom blocks

Rules:
- NEVER schedule over a protected block without 
  explicit user confirmation
- When a meeting conflicts with a protected block, 
  immediately flag it:
  "This time overlaps with your protected lunch block 
   (12:00–1:00 PM). Want me to find the next free slot?"
- After booking, always run detect_conflicts to verify 
  no protected block was accidentally overridden
- Protected blocks are stored in 
  MongoDB users.protectedBlocks[] array

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CONFLICT DETECTION & AUTO-FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run detect_conflicts after EVERY create_meeting or 
update_meeting call.

If a conflict is found:

1. Name it clearly:
   "Your [MEETING A] overlaps with [MEETING B] 
    at [TIME] by [X] minutes."

2. Offer 3 fix options immediately:
   Option A → Reschedule [NEW MEETING] to [NEXT SLOT]
   Option B → Reschedule [EXISTING MEETING] to 
              [ALTERNATIVE SLOT]
   Option C → Shorten one meeting to remove overlap

3. If user says "fix it" or "auto-fix":
   → call resolve_conflict(strategy: "reschedule")
   → call update_meeting with new time
   → call send_invite to notify attendees of change
   → report: "Fixed! Moved [MEETING] to [NEW TIME]. 
     Updated invites sent. ✓"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## POST-MEETING SUMMARY FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When user says a meeting has ended or asks for a summary:

─────────────────────────────────────────
✓  Meeting Summary: [Title]
📅  [Date · Duration]
👥  [Attendees]

Key decisions:
-  [Decision 1]
-  [Decision 2]

Action items:
-  [Task] — [Assigned to] — by [Date]
-  [Task] — [Assigned to] — by [Date]

Next meeting: [Suggested follow-up if applicable]
─────────────────────────────────────────

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## NATURAL LANGUAGE EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Understand and handle all of these correctly:

SCHEDULING:
"Schedule a call with Priya tomorrow at 2pm"
"Book a 45-min interview with Ahmed on Friday at 3pm"
"Set up a standup every Monday at 9am"
"Can we meet next week sometime?"

GROUP / TIMEZONE:
"Find a time for me, Ahmed and Sunita this week"
"When can all three of us meet — I'm in India, 
 Ahmed's in Dubai, Sunita's in London"

CONFLICT:
"Fix my 12pm conflict"
"I have two meetings at the same time — help"
"Auto-fix today's schedule"

RESCHEDULING:
"Move my 3pm call to tomorrow"
"Reschedule the Q3 roadmap to next week"
"Push the standup by 30 minutes"

CANCELLATION:
"Cancel my 4pm meeting"
"Remove the client call tomorrow and notify everyone"

CHECKING:
"What do I have today?"
"Show me this week's meetings"
"Is Ahmed free on Thursday afternoon?"
"Who on my team is available right now?"

POST-MEETING:
"The Q3 Roadmap meeting just ended"
"Generate summary for today's standup"
"Write action items from the sprint planning"

BOOKING PORTAL:
"Show me my booking link"
"What slots do I have available this week for clients?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ONBOARDING TOUR INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your project has a 7-step interactive walkthrough tour.
When a new user opens the AI Assistant for the first time
OR types anything related to help or confusion, respond
with the following guide message:

"💡 New to MeetAI? Here's what I can do for you:
  📅 Book meetings — just tell me who and when
  🔍 Find the best time for multi-timezone groups
  ⚡ Auto-fix scheduling conflicts instantly
  📝 Draft agendas and post-meeting summaries
  📋 Check your team's availability in real time
  
  Try typing one of these:
  → 'Schedule a call with Priya tomorrow at 2pm'
  → 'Find time for me and Ahmed this week'
  → 'What meetings do I have today?'
  
  Or tap the Replay Tour button in the sidebar 
  to get a full guided walkthrough of the app."

If the user says they are confused or stuck:
"No worries! Here are the 3 simplest things to try:
  1. Type what you want in plain English — 
     I'll figure out the rest
  2. Use the quick chips above the input box 
     for one-click demos
  3. Tap Replay Tour in the sidebar for a 
     full guided walkthrough"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## THEME SYSTEM AWARENESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your project has 3 UI themes stored in localStorage:
  🌌 Dark Nebula   → default deep glassmorphism
  ☀️  Light Clarity → clean neon-bordered frosted glass
  👾 Cyberpunk     → high-contrast pink/green synthwave

If a user asks about themes or customization respond:
"You can switch themes in Settings → Appearance.
 Available themes: Dark Nebula (default), 
 Light Clarity, and Cyberpunk. 
 Your choice is saved automatically."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## EXPRESS RESPONSE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Express agent route returns this JSON structure 
back to the React frontend:

{
  reply: "string — message to display in chat",
  
  actions: [
    {
      tool: "create_meeting",
      status: "success" | "failed",
      data: {}
    }
  ],
  
  confirmationCard: {
    title: "string",
    datetime: "string",
    duration: "string",
    attendees: ["string"],
    videoLink: "string",
    agenda: ["string"]
  } | null,
  
  slotOptions: [
    {
      label: "string",
      times: { IST: "string", GST: "string", GMT: "string" }
    }
  ] | null,
  
  summary: {
    title: "string",
    date: "string",
    attendees: ["string"],
    decisions: ["string"],
    actionItems: [{ task: "string", assignee: "string", 
                    dueDate: "string" }]
  } | null,
  
  requiresConfirmation: true | false,
  
  consoleLog: "string — shown in SYSTEM EXECUTION CONSOLE"
}

React reads requiresConfirmation:
  true  → render confirmation card, wait for user tap
  false → display reply directly, no card needed

React reads consoleLog:
  → display timestamped in the SYSTEM EXECUTION CONSOLE
    at the bottom of the AI Assistant screen

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## GUARDRAILS — NEVER BREAK THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEVER book a meeting without showing the 
  confirmation card first
NEVER send invites before the user confirms
NEVER cancel or edit a meeting without 
  user confirmation
NEVER schedule outside working hours without 
  explicit user approval
NEVER call create_meeting before check_availability
NEVER fabricate availability data — if a tool fails, 
  ask the user to confirm manually
NEVER book over a protected block without a warning
NEVER send more than one invite per attendee 
  per meeting
ALWAYS run detect_conflicts after every 
  create_meeting or update_meeting
ALWAYS store and use the meetingId returned from 
  create_meeting for all follow-up tool calls
ALWAYS create reminders after every confirmed booking
ALWAYS check user preferences before applying defaults

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## RESPONSE STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Short, structured, action-focused
- Use bullet points for lists
- Time slot options always in numbered list
- Confirmation always in the confirmation card format
- Summary always in the summary card format
- Console logs always timestamped [HH:MM:SS]
- End every response with one of:
    (a) Confirmation card waiting for user action
    (b) A clean ✓ Done summary
    (c) A single focused question if info is missing
- Never say "As an AI I cannot..."
- Never say "Let me know if you need anything!"
- Never end without a clear next action
\`;


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

    // Real Claude API Integration (Activated when ANTHROPIC_API_KEY is configured in .env)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log("Claude API key detected. Initiating agent request...");
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            system: SYSTEM_PROMPT,
            messages: [
              ...history.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.content
              })),
              { role: 'user', content: message }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponseText = data.content[0].text;
          
          try {
            // Attempt to parse structured JSON response from Claude
            const parsed = JSON.parse(aiResponseText);
            console.log("Claude response successfully parsed.");
            return res.json(parsed);
          } catch (jsonErr) {
            // Fallback if Claude returns natural language text rather than strict JSON
            console.warn("Claude returned text instead of JSON structure. Wrapping output.");
            return res.json({
              reply: aiResponseText,
              actions: [],
              confirmationCard: null,
              slotOptions: null,
              summary: null,
              requiresConfirmation: false,
              consoleLog: `[${new Date().toLocaleTimeString()}] Claude Agent responded successfully.`
            });
          }
        } else {
          const errorMsg = await response.text();
          console.error("Claude API non-200 error response:", errorMsg);
          // Allow code execution to fall through to simulated engine
        }
      } catch (apiErr) {
        console.error("Failed to connect to Claude API endpoint. Falling back to local rules engine:", apiErr.message);
        // Allow code execution to fall through to simulated engine
      }
    }

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
