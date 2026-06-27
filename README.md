# MeetAI — AI Smart Meeting Scheduler

A next-generation, AI-powered meeting scheduling workspace that automatically resolves timezone conflicts, parses natural language scheduling requests, and integrates seamlessly with Google Calendar. 

![MeetAI 3D Landing Page UI](https://via.placeholder.com/1200x600.png?text=MeetAI+Premium+Glassmorphic+UI)

## 🚀 Comprehensive Tech Stack

### Frontend Architecture
- **Vanilla JS / HTML5 / CSS3**: High-performance, framework-less frontend built for extreme speed and granular DOM control.
- **Three.js (WebGL)**: Powers the stunning interactive 3D particle network and geometry on the landing/login screen.
- **Premium CSS3**: Implements advanced Glassmorphism (`backdrop-filter`), glowing neon box-shadows, animated gradients, and floating UI components.
- **Responsive Bento Grid**: Modern dashboard layout utilizing CSS Grid and Flexbox.

### Backend Engine
- **Node.js & Express.js**: Handles API routing, middleware execution, and controller logic (17 REST endpoints).
- **MongoDB & Mongoose**: NoSQL document storage managing Users, Meetings, Teams, and Settings across 5 interconnected collections.
- **Claude 3.5 Sonnet (Anthropic API)**: The NLP brain behind the AI Assistant, evaluating contextual English prompts to extract dates, agendas, and generate schedule confirmations.

### Integrations & Background Processing
- **Google Calendar API (OAuth 2.0)**: Bi-directional event syncing, automatic Google Meet link generation, and `FreeBusy` availability checks.
- **Redis & Bull**: Enterprise-grade background queue system for reliably scheduling and dispatching massive email bursts without blocking the main server thread.
- **NodeMailer & Gmail SMTP**: Delivers beautifully styled HTML emails for meeting invites, updates, and lifecycle notifications.

### Security
- **JWT (JSON Web Tokens)**: Secure, stateless session management.
- **Bcrypt.js**: One-way cryptographic hashing (12 salt rounds) for user credentials.
- **Route Guarding**: Express middleware explicitly blocking unauthorized access to protected API paths.

---

## 🛠️ Setup Instructions

1. Clone the repo
2. Copy `.env.example` to `.env`
3. Add your API keys (Google OAuth, Anthropic Claude, MongoDB URI, Redis URI, SMTP Credentials)
4. Ensure **Redis** is running locally (or provide a remote Redis URI in your `.env`)
5. Run `npm install`
6. Run `npm run dev` (Starts both the Node backend and HTTP static server concurrently)
7. Navigate to `http://localhost:3000`

---

## ✨ Feature Breakdown

### 1. 🌌 Interactive 3D Landing & Authentication
- **WebGL Particle Network**: An immersive 3D background featuring 1,500 glowing neon particles and rotating wireframe geometry that actively responds to user mouse movements.
- **Glassmorphic Login/Register Cards**: Translucent frosted-glass authentication forms featuring glowing borders, futuristic uppercase tracking, and dynamic tab pill animations.
- **MERN-Stack Auth Pipeline**: Secure user registration, persistent session management, and encrypted password storage.

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

### 5. ✉️ Scalable Notifications via Redis & Bull Queue
- **Google SMTP Integration**: Communicates with Gmail servers utilizing secure App Password parameters.
- **Redis-Backed Job Queues**: Meeting reminders are offloaded to Bull queues, ensuring the Express server remains highly responsive even during massive email bursts.
- **2-Tier Reminder System**:
  - **24-Hour Reminder**: Dispatches a custom-styled HTML email to **all attendees**.
  - **15-Minute Alert**: Dispatches a reminder containing the video meeting link directly to the **host organizer**.
- **Lifecycle Notifications**: Automatically triggers mail notifications on meeting creation, updates (time/location changes), and cancellations.
