const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const transporter = require('../config/mailer');

// Helper to format date cleanly
function formatDateStr(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
}

// Build HTML email template
function buildHtmlEmail(emailTitle, meeting, attendeeNames) {
  const dateStr = formatDateStr(meeting.date);
  const videoLink = meeting.videoLink.startsWith('http') ? meeting.videoLink : `https://${meeting.videoLink}`;

  return `
<div style="font-family:Arial,sans-serif; max-width:560px; margin:0 auto; background:#f8fafc; padding:20px; border-radius:10px;">
  <div style="font-family:Arial,sans-serif; max-width:560px; margin:0 auto">
    <!-- Header -->
    <div style="background:#7C6EF5; padding:20px 24px; border-radius:10px 10px 0 0">
      <h1 style="color:#fff; margin:0; font-size:20px">MeetAI</h1>
      <p style="color:rgba(255,255,255,0.8); margin:4px 0 0; font-size:13px;">Smart Meeting Scheduler</p>
    </div>

    <!-- Body -->
    <div style="background:#1A1A28; padding:24px; border:1px solid #2A2A40; color:#E8E8F0">
      <h2 style="color:#E8E8F0; font-size:16px; margin-top:0">${emailTitle}</h2>
      
      <!-- Meeting details table -->
      <table style="width:100%; border-collapse:collapse; margin-top:16px">
        <tr>
          <td style="color:#9898B8; font-size:12px; padding:8px 0; width:100px">Meeting</td>
          <td style="color:#E8E8F0; font-size:13px; font-weight:500; padding:8px 0">${meeting.title}</td>
        </tr>
        <tr>
          <td style="color:#9898B8; font-size:12px; padding:8px 0">Date & Time</td>
          <td style="color:#E8E8F0; font-size:13px; font-weight:500; padding:8px 0">${dateStr} · ${meeting.time} IST</td>
        </tr>
        <tr>
          <td style="color:#9898B8; font-size:12px; padding:8px 0">Duration</td>
          <td style="color:#E8E8F0; font-size:13px; padding:8px 0">${meeting.duration} minutes</td>
        </tr>
        <tr>
          <td style="color:#9898B8; font-size:12px; padding:8px 0">Attendees</td>
          <td style="color:#E8E8F0; font-size:13px; padding:8px 0">${attendeeNames.join(', ')}</td>
        </tr>
        <tr>
          <td style="color:#9898B8; font-size:12px; padding:8px 0">Video Link</td>
          <td style="padding:8px 0">
            <a href="${videoLink}" style="color:#9D91FF; font-size:13px">${meeting.videoLink}</a>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <a href="${videoLink}" style="display:inline-block; background:#7C6EF5; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:500; margin-top:16px">Join Meeting</a>
    </div>

    <!-- Footer -->
    <div style="background:#13131E; padding:12px 24px; border-radius:0 0 10px 10px; border:1px solid #2A2A40; border-top:none">
      <p style="color:#5A5A78; font-size:11px; margin:0">Powered by MeetAI · FYP Workspace</p>
    </div>
  </div>
</div>
  `;
}

// Run every minute to check and send due reminders
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Find unsent reminders due
    const dueReminders = await Reminder.find({
      sent: false,
      scheduledAt: { $lte: now }
    }).populate({
      path: 'meetingId',
      populate: { path: 'attendees' }
    }).populate('userId');

    if (dueReminders.length === 0) return;

    console.log(`[REMINDER CRON] Found ${dueReminders.length} due reminders.`);

    for (const reminder of dueReminders) {
      const meeting = reminder.meetingId;
      if (!meeting) {
        // Meeting was likely cancelled/deleted; mark reminder as processed
        reminder.sent = true;
        await reminder.save();
        continue;
      }

      // Determine reminder type (24h vs 15m) based on meeting start time
      const [h, m] = meeting.time.split(":").map(Number);
      const meetingStart = new Date(meeting.date);
      meetingStart.setHours(h, m, 0, 0);

      const diffMs = meetingStart.getTime() - reminder.scheduledAt.getTime();
      const diffMins = diffMs / (60 * 1000);

      const is24hReminder = diffMins > 60;
      const attendeeNames = meeting.attendees.map(a => a.name);

      let emailTitle = '';
      let subject = '';
      let recipientEmail = '';

      if (is24hReminder) {
        emailTitle = `Tomorrow: ${meeting.title}`;
        subject = `Tomorrow: ${meeting.title} at ${meeting.time}`;
        recipientEmail = meeting.attendees.map(a => a.email).filter(e => !!e).join(', ');
      } else {
        emailTitle = `Starting soon: ${meeting.title}`;
        subject = `Starting soon: ${meeting.title} in 15 min`;
        // 15-minute reminder is sent to organizer only (host: you@company.com)
        const organizer = meeting.attendees.find(a => a.email === 'you@company.com') || meeting.attendees[0];
        recipientEmail = organizer ? organizer.email : 'you@company.com';
      }

      const htmlContent = buildHtmlEmail(emailTitle, meeting, attendeeNames);

      // Send mail if configured
      if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
        await transporter.sendMail({
          from: `"${process.env.APP_NAME || 'MeetAI'}" <${process.env.EMAIL_USER}>`,
          to: recipientEmail,
          subject: subject,
          html: htmlContent
        });
        console.log(`[REMINDER] Sent: "${subject}" to ${recipientEmail}`);
      } else {
        console.log(`[REMINDER MOCK] Send skipped (no EMAIL_USER configured). Sent: "${subject}" to ${recipientEmail}`);
      }

      // Mark as sent
      reminder.sent = true;
      reminder.sentAt = new Date();
      await reminder.save();
    }
  } catch (error) {
    console.error('[REMINDER CRON] Error executing reminders:', error);
  }
});

module.exports = buildHtmlEmail; // Export template builder for reuse in invite routes
