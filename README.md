# MeetAI — AI Smart Meeting Scheduler

## Tech Stack
- MongoDB + Mongoose (5 collections)
- Express.js (17 API routes)
- React.js (glassmorphic UI, 3 themes)
- Node.js
- Claude 3.5 Sonnet (Anthropic API)
- Google Calendar OAuth 2.0
- NodeMailer + Gmail SMTP
- node-cron (automated reminders)
- JWT + bcryptjs (authentication)

## Setup
1. Clone the repo
2. Copy `.env.example` to `.env`
3. Add your API keys
4. `npm install`
5. `npm run dev`

## Features

### 1. 🔐 JWT-Based Authentication & Session Security
- **MERN-Stack Auth Pipeline**: Complete user registration, login, and persistent session management.
- **Secure Password Hashing**: User credentials are encrypted using `bcryptjs` with 12 salt rounds before database insertion.
- **Authorization Interceptor**: Automatic fetch request interception in the client to securely attach `Authorization: Bearer <token>` headers.
- **Route Guarding**: All core scheduling endpoints are protected by Express middleware, redirecting unauthorized traffic to the login overlay.

### 2. 📅 Real-time Google Calendar OAuth 2.0 Sync
- **OAuth Consent Integration**: Secure authentication flow utilizing custom token parsing and Google's `state` parameter to bind tokens to database users.
- **Bidirectional Event Syncing**:
  - Automatically imports Google Calendar events into MongoDB while preventing duplicate entries.
  - Creating a meeting automatically provisions a real event on Google Calendar, generating a **Google Meet video link**.
  - Updating or deleting events in the workspace automatically patches/deletes them on Google Calendar.
- **Token Refresh Daemon**: Background validation checks access token expiry (within 5 mins) and silently refreshes it using stored refresh tokens.

### 3. 🤖 Intelligent AI Assistant (Claude 3.5 Sonnet)
- **Natural Language Parsing**: Evaluates scheduling instructions (e.g., *"Schedule a 1:1 call with Priya tomorrow at 2pm"*) to extract dates, times, attendees, and agendas.
- **Smart Availability Checks**: Queries Google Calendar's `FreeBusy` API and merges it with local MongoDB schedules to find conflict-free slots.
- **Interactive Confirmation Widgets**: Displays dynamically generated confirmation blocks in the chat thread, waiting for a user `"yes"` or `"confirm"` input before committing the event.
- **Unified Chat Drawer**: Dual-channel history syncing between the main panel and the floating assistant drawer.

### 4. 🎨 Premium Glassmorphic Bento UI
- **Bento Grid Dashboard**: High-fidelity dashboard presenting real-time stats cards (meetings count, focus blocks, sync status) alongside chronologically sorted schedules.
- **Multi-Theme Support**: Instant switching between **Dark Nebula**, **Light Clarity**, and **Cyberpunk** themes with automatic theme state persistence.
- **Monthly & Daily Timelines**: 
  - Interactive monthly grid with today/meeting indicator rings.
  - Daily list layout utilizing a vertical timeline axis with breathing status nodes and conflict warning markers.
- **Collapsible Sidebar**: Hover-activated collapsible navigation bar maximizing workspace real estate.

### 5. ✉️ NodeMailer SMTP & Automated Cron Reminders
- **Google SMTP Integration**: Communicates with Gmail servers utilizing secure App Password parameters.
- **Background Cron Engine (`node-cron`)**: Scans database records every minute to evaluate upcoming meetings.
- **2-Tier Reminder System**:
  - **24-Hour Reminder**: Dispatches a custom-styled HTML email to **all attendees**.
  - **15-Minute Alert**: Dispatches a reminder containing the video meeting link directly to the **host organizer**.
- **Lifecycle Notifications**: Automatically triggers mail notifications on meeting creation, updates (time/location changes), and cancellations.
