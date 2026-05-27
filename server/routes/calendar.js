const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Attendee = require('../models/Attendee');
const { oauth2Client, getAuthUrl, getTokens } = require('../config/googleOAuth');
const refreshIfExpired = require('../utils/refreshGoogleToken');
const { protect } = require('../middleware/auth');

// Helper to convert date & time to ISO dateTime in a given timezone
function getIsoDateTime(dateString, timeString) {
  // dateString is typically YYYY-MM-DD
  // timeString is typically HH:MM
  const dateOnly = new Date(dateString).toISOString().split('T')[0];
  return `${dateOnly}T${timeString}:00`;
}

// Helper to parse HH:MM from ISO string or Date object in user's timezone
function formatHHMM(dateInput, timeZone) {
  try {
    const date = new Date(dateInput);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timeZone || 'Asia/Kolkata'
    }).substring(0, 5);
  } catch (err) {
    return '09:00';
  }
}

// Helper to calculate difference in minutes
function calculateMinutesDuration(startStr, endStr) {
  try {
    const diff = new Date(endStr) - new Date(startStr);
    return Math.round(diff / (1000 * 60));
  } catch (err) {
    return 30;
  }
}

// ---------------------------------------------------------
// 1. GET /api/calendar/connect
// ---------------------------------------------------------
router.get('/connect', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(401).send('Authentication token query parameter required');
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_default_jwt_secret_key_meetai_fyp'
    );

    const userId = decoded.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const authUrl = getAuthUrl(userId.toString());
    res.redirect(authUrl);
  } catch (err) {
    console.error('[CALENDAR CONNECT] Error:', err.message);
    res.status(401).send('Invalid or expired session token');
  }
});

// ---------------------------------------------------------
// 2. GET /api/calendar/callback
// ---------------------------------------------------------
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send('OAuth code and state parameters required');
    }

    // state contains the userId
    const userId = state;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('Associated user not found');
    }

    const tokens = await getTokens(code);

    await User.findByIdAndUpdate(userId, {
      'googleCalendar.connected': true,
      'googleCalendar.accessToken': tokens.access_token,
      'googleCalendar.refreshToken': tokens.refresh_token || user.googleCalendar.refreshToken, // refresh_token is only sent on first consent
      'googleCalendar.tokenExpiry': new Date(tokens.expiry_date)
    });

    const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/index.html?connected=true`);
  } catch (err) {
    console.error('[CALENDAR CALLBACK] Error:', err.message);
    res.status(500).send('Google Authentication Callback processing failed');
  }
});

// ---------------------------------------------------------
// 3. GET /api/calendar/sync/google
// ---------------------------------------------------------
router.get('/sync/google', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const accessToken = await refreshIfExpired(userId);
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch Google Calendar events starting from today
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    let importedCount = 0;

    for (const event of events) {
      if (!event.start || !event.end) continue;
      
      const startDateTime = event.start.dateTime || event.start.date;
      const endDateTime = event.end.dateTime || event.end.date;
      const eventId = event.id;

      // Check if it already exists in MongoDB
      let meeting = await Meeting.findOne({ googleEventId: eventId });
      
      const meetingTitle = event.summary || 'Google Calendar Event';
      const meetingDate = new Date(startDateTime.split('T')[0]);
      const meetingTime = formatHHMM(startDateTime, req.user.timezone);
      const meetingDuration = calculateMinutesDuration(startDateTime, endDateTime);
      const videoLink = event.hangoutLink || event.htmlLink || '';
      const notes = event.description || '';

      if (!meeting) {
        // Create new meeting
        meeting = new Meeting({
          title: meetingTitle,
          date: meetingDate,
          time: meetingTime,
          duration: meetingDuration,
          type: '1:1 check-in',
          attendees: [userId],
          status: 'confirmed',
          videoLink,
          notes,
          googleEventId: eventId
        });
        await meeting.save();

        // Create RSVP relation records
        await Attendee.create({
          userId: userId,
          meetingId: meeting._id,
          rsvpStatus: 'accepted',
          notified: true
        });

        importedCount++;
      } else {
        // Update meeting details if changed
        meeting.title = meetingTitle;
        meeting.date = meetingDate;
        meeting.time = meetingTime;
        meeting.duration = meetingDuration;
        meeting.videoLink = videoLink;
        meeting.notes = notes;
        meeting.status = 'confirmed';
        await meeting.save();
      }
    }

    res.json({ synced: true, eventsImported: importedCount });
  } catch (err) {
    console.error('[CALENDAR SYNC GCAL] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 4. POST /api/calendar/create-event
// ---------------------------------------------------------
router.post('/create-event', protect, async (req, res) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) {
      return res.status(400).json({ error: 'Meeting ID required' });
    }

    const meeting = await Meeting.findById(meetingId).populate('attendees');
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const userId = req.user._id;
    const accessToken = await refreshIfExpired(userId);
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Build event start and end DateTimes
    const startStr = getIsoDateTime(meeting.date, meeting.time);
    const endStr = new Date(new Date(startStr).getTime() + meeting.duration * 60 * 1000).toISOString();

    const gcalEvent = {
      summary: meeting.title,
      description: meeting.notes || '',
      start: {
        dateTime: new Date(startStr).toISOString(),
        timeZone: req.user.timezone || 'Asia/Kolkata'
      },
      end: {
        dateTime: endStr,
        timeZone: req.user.timezone || 'Asia/Kolkata'
      },
      attendees: meeting.attendees.map(a => ({ email: a.email })),
      conferenceData: {
        createRequest: {
          requestId: meeting._id.toString(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: gcalEvent,
      conferenceDataVersion: 1
    });

    const googleEventId = response.data.id;
    const videoLink = response.data.hangoutLink || response.data.htmlLink || '';

    // Save event ID and link to MongoDB
    meeting.googleEventId = googleEventId;
    if (videoLink) meeting.videoLink = videoLink;
    await meeting.save();

    res.json({ googleEventId, htmlLink: response.data.htmlLink, videoLink });
  } catch (err) {
    console.error('[CALENDAR CREATE EVENT] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 5. PUT /api/calendar/update-event/:googleEventId
// ---------------------------------------------------------
router.put('/update-event/:googleEventId', protect, async (req, res) => {
  try {
    const { title, date, time, duration } = req.body;
    const { googleEventId } = req.params;

    const userId = req.user._id;
    const accessToken = await refreshIfExpired(userId);
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const startStr = getIsoDateTime(date, time);
    const endStr = new Date(new Date(startStr).getTime() + parseInt(duration) * 60 * 1000).toISOString();

    const patchResource = {
      summary: title,
      start: {
        dateTime: new Date(startStr).toISOString(),
        timeZone: req.user.timezone
      },
      end: {
        dateTime: endStr,
        timeZone: req.user.timezone
      }
    };

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: googleEventId,
      resource: patchResource
    });

    // Update MongoDB meeting record
    await Meeting.findOneAndUpdate({ googleEventId }, {
      title,
      date: new Date(date),
      time,
      duration: parseInt(duration)
    });

    res.json({ updated: true });
  } catch (err) {
    console.error('[CALENDAR UPDATE EVENT] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 6. DELETE /api/calendar/delete-event/:googleEventId
// ---------------------------------------------------------
router.delete('/delete-event/:googleEventId', protect, async (req, res) => {
  try {
    const { googleEventId } = req.params;

    const userId = req.user._id;
    const accessToken = await refreshIfExpired(userId);
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId
    });

    // Set meeting status to cancelled in database
    await Meeting.findOneAndUpdate({ googleEventId }, {
      status: 'cancelled'
    });

    res.json({ deleted: true });
  } catch (err) {
    console.error('[CALENDAR DELETE EVENT] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 7. GET /api/calendar/free-busy
// ---------------------------------------------------------
router.get('/free-busy', protect, async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime query parameters required (ISO format)' });
    }

    const userId = req.user._id;
    const accessToken = await refreshIfExpired(userId);
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const queryBody = {
      timeMin: new Date(startTime).toISOString(),
      timeMax: new Date(endTime).toISOString(),
      items: [{ id: 'primary' }]
    };

    const response = await calendar.freebusy.query({
      resource: queryBody
    });

    const busyPeriods = response.data.calendars.primary.busy || [];
    res.json({ busySlots: busyPeriods, freeSlots: [] });
  } catch (err) {
    console.error('[CALENDAR FREE-BUSY] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 8. POST /api/calendar/disconnect
// ---------------------------------------------------------
router.post('/disconnect', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, {
      'googleCalendar.connected': false,
      $unset: {
        'googleCalendar.accessToken': 1,
        'googleCalendar.refreshToken': 1,
        'googleCalendar.tokenExpiry': 1
      }
    });

    res.json({ success: true, message: 'Google Calendar integration disconnected' });
  } catch (err) {
    console.error('[CALENDAR DISCONNECT] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
