/**
 * MeetAI Onboarding Tour Controller
 */

const TOUR_STEPS = [
  {
    stepNum: 1,
    title: "Welcome",
    view: "welcome",
    targetSelector: ".logo-section",
    tooltipPos: "bottom",
    tooltipTitle: "Welcome to MeetAI!",
    tooltipDesc: "This is your AI-powered scheduling assistant workspace. Let's take a quick 2-minute tour to get started.",
    tooltipAction: "Click 'Start Tour' in the card below to begin your tour.",
    chatMessage: "Welcome to MeetAI — your AI-powered meeting scheduler!\nI'm going to give you a quick 2-minute tour so you know exactly where everything is.\nYou'll learn how to:\n- See today's meetings at a glance\n- Schedule a meeting just by typing\n- Fix conflicts automatically\n- Connect your Google or Outlook calendar\n\nReady? Let's go → tap 'Start Tour' to begin."
  },
  {
    stepNum: 2,
    title: "Dashboard",
    view: "dashboard",
    targetSelector: "#dashboardStatsRow",
    tooltipPos: "bottom",
    tooltipTitle: "Your Home Dashboard",
    tooltipDesc: "See your quick stats and schedule. A RED card indicates a meeting conflict. Don't worry — click it and MeetAI will fix it automatically.",
    tooltipAction: "Tap the red 'Client Sync Overlap' conflict card below, or click 'Got it' to continue.",
    chatMessage: "This is your Dashboard — your home base every time you log in.\n\nHere's what you're looking at:\nThe 4 boxes at the top = your quick stats (meetings today, focus time, pending replies)\nThe list below = all your meetings for today, in order\n\nSee a RED card? That means a scheduling conflict. Don't worry — just click it and I'll fix it for you automatically.\n\nEach meeting shows:\n— The time and duration\n— Who it's with\n— The status (Confirmed / Pending / Conflict)\n\nGot it! Let's look at your Calendar next →"
  },
  {
    stepNum: 3,
    title: "Calendar",
    view: "calendar",
    targetSelector: "#calendarMonthGridWrapper",
    tooltipPos: "right",
    tooltipTitle: "Monthly Calendar Grid",
    tooltipDesc: "Check date schedules. Days with blue dots have meetings. Clicking a day loads its schedule below.",
    tooltipAction: "Click 'Calendar' in the left sidebar or select a date in the grid to continue.",
    chatMessage: "This is your Calendar — a full monthly view of all your meetings.\n\nHere's how to read it:\nBlue dot under a date = you have a meeting that day\nHighlighted circle = today's date\nClick any date = see that day's meeting list below the grid\n\nPro tip: You can spot busy weeks at a glance just by looking at how many blue dots appear. More dots = more meetings that week.\n\nNice! Now let's see the most powerful feature — the AI Assistant →"
  },
  {
    stepNum: 4,
    title: "AI Assistant",
    view: "ai-assistant",
    targetSelector: "#chatInputAreaWrapper",
    tooltipPos: "top",
    tooltipTitle: "AI Scheduler Console",
    tooltipDesc: "No forms required! Simply type in plain English to book, reschedule, or sync. Suggestions are listed above the input.",
    tooltipAction: "Type a prompt like 'Schedule with Priya tomorrow' or click 'Got it' to see confirmations.",
    chatMessage: "This is the AI Assistant — the heart of MeetAI.\n\nYou don't need to fill out any forms or click through menus.\nJust TYPE what you want in plain English and I'll do the rest.\n\nHere are some things you can say:\n- 'Schedule a call with Priya tomorrow at 2pm'\n- 'Find a time for me and Ahmed this Friday'\n- 'Reschedule my 12pm meeting — it has a conflict'\n- 'Set up a weekly standup every Monday at 10am'\n\nI will automatically:\n- Check everyone's calendar for free slots\n- Handle different timezones\n- Generate a video link (Zoom / Google Meet)\n- Send invites to all attendees\n\nTry typing something! Or tap Next to see how booking confirmation works →"
  },
  {
    stepNum: 5,
    title: "Schedule",
    view: "ai-assistant",
    targetSelector: "#tourConfirmationCard",
    tooltipPos: "top",
    tooltipTitle: "Review Confirmation",
    tooltipDesc: "Nothing is scheduled without your review. Verify attendees, timezone offsets, and video links here.",
    tooltipAction: "Click 'Confirm & Book' inside the chat message to proceed to Integrations.",
    chatMessage: "Before any meeting gets booked, I always show you a Confirmation Card so you can review everything first.\n\nThe card shows:\nMeeting title\nDate, time, and duration\nWho's invited\nVideo call link\n\nOnce you're happy, tap 'Confirm & Book' and I will:\n→ Create the calendar event\n→ Send email invites to all attendees\n→ Add reminders (24 hours before + 15 minutes before)\n\nNothing is booked until YOU confirm it. You're always in control.\n\nPerfect! Now let's connect your calendar so everything stays in sync →"
  },
  {
    stepNum: 6,
    title: "Integrations",
    view: "integrations",
    targetSelector: ".integrations-grid",
    tooltipPos: "top",
    tooltipTitle: "Connect Calendars",
    tooltipDesc: "Sync with Google Calendar, Outlook, and Zoom to enable real-time slot checking and auto-link generation.",
    tooltipAction: "Tap the blue 'Connect' button next to Google Calendar to finish setup.",
    chatMessage: "This is the most important setup step — connecting your calendar.\n\nMeetAI works with:\nGoogle Calendar — connect your Gmail/Google Workspace\nOutlook Calendar — connect Microsoft 365 or Hotmail\nZoom — auto-generate Zoom links for every meeting\n\nWhy should you connect right now?\nWithout a calendar connection, I can only schedule manually.\nWith a calendar connection, I can:\n- See your real availability instantly\n- Avoid booking over existing meetings\n- Sync new meetings to your phone and laptop automatically\n\nTap 'Connect' next to Google Calendar or Outlook to get started.\nIt only takes 30 seconds.\n\nOnce connected, you're fully set up! Let's wrap up →"
  },
  {
    stepNum: 7,
    title: "Done",
    view: "done",
    targetSelector: "#cheatSheetCard",
    tooltipPos: "top",
    tooltipTitle: "You're All Set!",
    tooltipDesc: "This quick cheat sheet lists shortcut views and options. Replay the tour anytime using the footer button.",
    tooltipAction: "Click 'Go to Dashboard' to start scheduling on your own!",
    chatMessage: "You're all set! Here's your quick cheat sheet:\n\nWHAT TO DO                    WHERE TO GO\n─────────────────────────────────────────\nSee today's meetings     →    Dashboard (home screen)\nSchedule a new meeting   →    AI Assistant → just type it\nFix a conflict           →    Click the red card on Dashboard\nView full month          →    Calendar\nConnect Google/Outlook   →    Integrations (do this first!)\nShare your availability  →    Share Link in the left sidebar\nSee meeting analytics    →    Analytics in the left sidebar\n\nOne last tip: The fastest way to do anything in MeetAI is to open the AI Assistant and just describe what you need in plain English. You'll be surprised how much it understands.\n\nWelcome aboard! I'm always here if you need help."
  }
];

let tourState = {
  activeStep: 1,
  maxReachedStep: 1,
  isActive: false,
  nudgeTimer: null,
  isCalendarConnected: false
};

// Initialize onboarding guide
function initOnboarding() {
  const isCompleted = localStorage.getItem("meetai_tour_completed") === "true";
  const isDismissed = localStorage.getItem("meetai_tour_dismissed") === "true";
  const floatingHelpBtn = document.getElementById("floatingHelpBtn");

  if (!isCompleted && !isDismissed) {
    // First-time user, start tour automatically
    startTour(false);
  } else {
    // Returning or dismissed user - show help button, switch to dashboard
    tourState.maxReachedStep = 7; // Unlock all steps for navigation if replaying
    if (floatingHelpBtn) floatingHelpBtn.classList.remove("tour-active");
    
    // Default view is Dashboard for returning users
    switchTab("dashboard");
    
    // Show a gentle top banner or tip
    showRefresherBanner();
  }
  
  // Render initial monthly calendar view events
  selectCalendarDate(26);
}

// Show a small refresher banner
function showRefresherBanner() {
  const history = document.getElementById("chatHistory");
  if (!history) return;
  
  const msg = document.createElement("div");
  msg.className = "message bot";
  msg.innerHTML = `
    <span class="message-sender">MeetAI Guide</span>
    <div class="message-bubble" style="border-left: 4px solid var(--accent); background: rgba(168, 85, 247, 0.05);">
      <p><strong>Need a refresher?</strong> Tap the <strong style="color: var(--primary); cursor: pointer;" onclick="startTour(true)">Replay Tour</strong> button in the left sidebar footer at any time.</p>
    </div>
  `;
  history.appendChild(msg);
  history.scrollTop = history.scrollHeight;
}

// Start the tour
function startTour(force = false) {
  tourState.isActive = true;
  tourState.activeStep = 1;
  if (force) {
    tourState.maxReachedStep = 7; // Allow navigation if replaying
  } else {
    tourState.maxReachedStep = 1;
  }
  
  // Hide floating help btn during tour
  const floatingHelpBtn = document.getElementById("floatingHelpBtn");
  if (floatingHelpBtn) floatingHelpBtn.classList.add("tour-active");

  // Show progress bar
  document.getElementById("tourProgressBar").style.display = "flex";
  
  // Show welcome view
  switchViewPane("welcome");
  
  // Render step
  loadTourStep(1);
}

// Load a specific step details
function loadTourStep(stepNum) {
  tourState.activeStep = stepNum;
  if (stepNum > tourState.maxReachedStep) {
    tourState.maxReachedStep = stepNum;
  }

  const step = TOUR_STEPS.find(s => s.stepNum === stepNum);
  if (!step) return;

  // Render Progress Bar
  renderProgressBar();

  // Switch view pane to match step
  switchViewPane(step.view);

  // If AI Assistant step, append message
  if (step.view === "ai-assistant") {
    // Append the chatbot instruction
    appendTourChatMessage(step.chatMessage);
  }
  
  // Handle highlights
  clearHighlights();
  
  // Special exception: confirmation card is printed dynamically in Step 5
  if (stepNum === 5) {
    // Print confirmation card if not already there
    ensureConfirmationCard();
  }

  // Set timeout to position tooltip to ensure layout renders first
  setTimeout(() => {
    const target = document.querySelector(step.targetSelector);
    if (target) {
      target.classList.add("tour-highlight");
      showTooltip(target, step);
    } else {
      // Center tooltip
      showTooltip(null, step);
    }
  }, 100);

  // Reset inactivity nudge timer
  resetInactivityTimer();
}

// Ensure the confirmation card is visible in the chat history
function ensureConfirmationCard() {
  const card = document.getElementById("tourConfirmationCard");
  if (card) return;

  const chatHistory = document.getElementById("chatHistory");
  const msg = document.createElement("div");
  msg.className = "message bot";
  msg.innerHTML = `
    <span class="message-sender">MeetAI Assistant</span>
    <div class="message-bubble">
      <p>I've drafted your calendar event details based on the details we checked. Review the card below:</p>
      <div class="confirmation-block" id="tourConfirmationCard" style="border: 2px solid var(--primary); box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);">
Title: Client Call with Priya Sharma
Time: Wed, May 27 · 2:00 PM – 2:45 PM IST
Attendees: You + Priya Sharma
Link: meet.google.com/xyz-abc-123
Agenda:
1. Opening context (5 min)
2. Requirements gathering (20 min)
3. Action items & next steps (20 min)
      </div>
      <div class="confirmation-actions" style="margin-top: 10px;">
        <button class="btn btn-primary" onclick="confirmTourMeeting()">Confirm & Book</button>
        <button class="btn btn-secondary" onclick="advanceTourStep()">Dismiss</button>
      </div>
    </div>
  `;
  chatHistory.appendChild(msg);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Confirm meeting inside the tour flow
function confirmTourMeeting() {
  // Add actual event to state
  create_event(
    "Client Call with Priya Sharma",
    "2026-05-27",
    "14:00",
    45,
    ["you@company.com", "priya.sharma@example.com"],
    "Google Meet",
    "Onboarding tutorial client call."
  );
  
  appendTourChatMessage("✓ Booked! Invites sent to Priya. Meet link: https://meet.google.com/xyz-abc-123\n\nI've set reminders: 24 hours before and 15 minutes before.");
  
  // Celebrate small win!
  appendTourChatMessage("Great! You just booked your first meeting!");

  // Advance step to Integrations
  advanceTourStep();
}

// Append tour guide text to chat history
function appendTourChatMessage(text) {
  const history = document.getElementById("chatHistory");
  const msg = document.createElement("div");
  msg.className = "message bot";
  
  // Format simple lists/bold markup
  const content = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/✦ (.*?)/g, '<span style="color: var(--primary);">✦</span> $1')
    .replace(/✓ (.*?)/g, '<span style="color: var(--success);">✓</span> $1')
    .replace(/→ (.*?)/g, '<span style="color: var(--accent);">→</span> $1')
    .split("\n")
    .map(line => line ? `<p>${line}</p>` : '<br>')
    .join("");

  msg.innerHTML = `
    <span class="message-sender">MeetAI Guide</span>
    <div class="message-bubble" style="border-left: 3px solid var(--primary); background: rgba(99, 102, 241, 0.02);">
      ${content}
    </div>
  `;
  history.appendChild(msg);
  history.scrollTop = history.scrollHeight;
}

// Render progress bar
function renderProgressBar() {
  const bar = document.getElementById("tourProgressBar");
  if (!bar) return;

  bar.innerHTML = "";
  
  TOUR_STEPS.forEach((step, idx) => {
    const isCurrent = step.stepNum === tourState.activeStep;
    const isCompleted = step.stepNum < tourState.activeStep || (tourState.maxReachedStep >= step.stepNum && step.stepNum !== tourState.activeStep);
    
    const stepEl = document.createElement("div");
    let statusClass = "locked";
    let icon = "○";
    
    if (isCurrent) {
      statusClass = "current";
      icon = "●";
    } else if (isCompleted) {
      statusClass = "completed";
      icon = "✓";
    }
    
    stepEl.className = `progress-step ${statusClass}`;
    stepEl.innerHTML = `<span class="progress-step-marker">${icon}</span> ${step.title}`;
    
    if (isCompleted) {
      stepEl.onclick = () => {
        loadTourStep(step.stepNum);
      };
    }
    
    bar.appendChild(stepEl);
    
    // Separator
    if (idx < TOUR_STEPS.length - 1) {
      const sep = document.createElement("span");
      sep.className = "progress-separator";
      sep.textContent = "—";
      bar.appendChild(sep);
    }
  });
}

// Render tooltip relative to targeted element
function showTooltip(element, step) {
  const tooltip = document.getElementById("tourTooltip");
  const overlay = document.getElementById("tourOverlay");
  if (!tooltip) return;

  overlay.classList.add("active");
  tooltip.style.display = "block";
  
  // Set contents
  document.getElementById("tooltipTitle").textContent = step.tooltipTitle;
  document.getElementById("tooltipDesc").textContent = step.tooltipDesc;
  document.getElementById("tooltipAction").textContent = "→ " + step.tooltipAction;

  // Got it button click
  const gotItBtn = document.getElementById("tooltipGotItBtn");
  gotItBtn.onclick = (e) => {
    e.stopPropagation();
    advanceTourStep();
  };

  // Dismiss button click
  const dismissBtn = document.getElementById("tooltipDismissBtn");
  dismissBtn.onclick = (e) => {
    e.stopPropagation();
    skipTour(e);
  };

  positionTooltip(element, step.tooltipPos);
}

// Position tooltip
function positionTooltip(element, pos) {
  const tooltip = document.getElementById("tourTooltip");
  if (!element) {
    // Center of viewport
    tooltip.style.position = "fixed";
    tooltip.style.left = "50%";
    tooltip.style.top = "50%";
    tooltip.style.transform = "translate(-50%, -50%) scale(1)";
    tooltip.className = "tour-tooltip active";
    return;
  }
  
  tooltip.style.position = "absolute";
  const rect = element.getBoundingClientRect();
  const mainContent = document.querySelector(".main-content");
  const mainRect = mainContent.getBoundingClientRect();
  
  // Relative position to the main content element (or absolute scroll offset)
  const leftOffset = rect.left - mainRect.left;
  const topOffset = rect.top - mainRect.top;
  
  let left = 0;
  let top = 0;
  tooltip.className = `tour-tooltip active arrow-${pos}`;
  
  const tooltipWidth = tooltip.offsetWidth || 320;
  const tooltipHeight = tooltip.offsetHeight || 180;
  
  if (pos === 'top') {
    left = leftOffset + rect.width / 2 - tooltipWidth / 2;
    top = topOffset - tooltipHeight - 12;
  } else if (pos === 'bottom') {
    left = leftOffset + rect.width / 2 - tooltipWidth / 2;
    top = topOffset + rect.height + 12;
  } else if (pos === 'left') {
    left = leftOffset - tooltipWidth - 12;
    top = topOffset + rect.height / 2 - tooltipHeight / 2;
  } else if (pos === 'right') {
    left = leftOffset + rect.width + 12;
    top = topOffset + rect.height / 2 - tooltipHeight / 2;
  }
  
  // Boundary check
  if (left < 10) left = 10;
  if (left + tooltipWidth > mainRect.width - 10) left = mainRect.width - tooltipWidth - 10;
  if (top < 10) top = 10;
  if (top + tooltipHeight > mainRect.height - 10) top = mainRect.height - tooltipHeight - 10;
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.transform = "scale(1)";
}

// Clear highlights
function clearHighlights() {
  document.querySelectorAll(".tour-highlight").forEach(el => {
    el.classList.remove("tour-highlight");
  });
}

// Advance to next step
function advanceTourStep() {
  if (tourState.activeStep < 7) {
    loadTourStep(tourState.activeStep + 1);
  } else {
    // Finished step 7
    completeTour();
  }
}

// Complete the onboarding tour
function completeTour() {
  tourState.isActive = false;
  localStorage.setItem("meetai_tour_completed", "true");
  
  // Hide overlays/tooltips
  const tooltip = document.getElementById("tourTooltip");
  if (tooltip) tooltip.style.display = "none";
  
  const overlay = document.getElementById("tourOverlay");
  if (overlay) overlay.classList.remove("active");
  
  clearHighlights();

  // Show floating help btn in bottom corner
  const floatingHelpBtn = document.getElementById("floatingHelpBtn");
  if (floatingHelpBtn) floatingHelpBtn.classList.remove("tour-active");

  // Switch view to Done view
  switchViewPane("done");
  
  // Render Done page
  renderProgressBar();
  
  // Celebrating Done
  appendTourChatMessage("You're all set! Enjoy scheduling with MeetAI.");
}

// Skip tour
function skipTour(e) {
  if (e) e.preventDefault();
  tourState.isActive = false;
  localStorage.setItem("meetai_tour_dismissed", "true");
  
  // Hide overlays
  const tooltip = document.getElementById("tourTooltip");
  if (tooltip) tooltip.style.display = "none";
  
  const overlay = document.getElementById("tourOverlay");
  if (overlay) overlay.classList.remove("active");
  
  clearHighlights();

  // Hide progress bar
  document.getElementById("tourProgressBar").style.display = "none";

  // Show floating help btn
  const floatingHelpBtn = document.getElementById("floatingHelpBtn");
  if (floatingHelpBtn) floatingHelpBtn.classList.remove("tour-active");

  // Show Dashboard
  switchTab("dashboard");
  
  // App alert
  appendTourChatMessage("Tour dismissed. Click the Help (?) button in the bottom corner if you want to restart later.");
}

// Switch pane visibility
function switchViewPane(viewId) {
  // Update sidebar navigation active state
  const sidebarButtons = document.querySelectorAll(".sidebar-btn");
  sidebarButtons.forEach(btn => {
    // Map button IDs to views
    let mapped = false;
    if (viewId === "dashboard" && btn.id === "sidebar-dashboard") mapped = true;
    if (viewId === "calendar" && btn.id === "sidebar-calendar") mapped = true;
    if (viewId === "ai-assistant" && btn.id === "sidebar-ai-assistant") mapped = true;
    if (viewId === "integrations" && btn.id === "sidebar-integrations") mapped = true;
    if (viewId === "booking" && btn.id === "sidebar-share-link") mapped = true;
    if (viewId === "team" && btn.id === "sidebar-analytics") mapped = true;
    if (viewId === "settings" && btn.id === "sidebar-settings") mapped = true;
    
    if (mapped) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Switch display panes
  const viewPanes = document.querySelectorAll(".view-pane");
  viewPanes.forEach(pane => {
    if (pane.id === `view-${viewId}`) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });
}

// Intercept clicks on dim overlay to dismiss tooltip
function handleOverlayClick() {
  const tooltip = document.getElementById("tourTooltip");
  if (tooltip && tooltip.style.display !== "none") {
    // Move to next step if user clicks overlay
    advanceTourStep();
  }
}

// Inactivity Nudge system
function resetInactivityTimer() {
  if (tourState.nudgeTimer) clearTimeout(tourState.nudgeTimer);
  if (!tourState.isActive) return;

  tourState.nudgeTimer = setTimeout(() => {
    // Triggers nudge after 30 seconds of inactivity
    triggerInactivityNudge();
  }, 30000);
}

// Trigger gentle inactivity nudge
function triggerInactivityNudge() {
  if (!tourState.isActive) return;
  
  const step = TOUR_STEPS.find(s => s.stepNum === tourState.activeStep);
  if (!step) return;

  // Nudge text based on active step
  const actionText = step.tooltipAction.replace("→ ", "");
  appendTourChatMessage(`Still with me? Whenever you're ready, just tap **Got it** or complete the step to continue:\n\n→ ${actionText}`);
  
  // Bounce tooltip animation
  const tooltip = document.getElementById("tourTooltip");
  if (tooltip) {
    tooltip.style.transform = "scale(1.05)";
    setTimeout(() => {
      tooltip.style.transform = "scale(1)";
    }, 200);
  }

  // Reset timer
  resetInactivityTimer();
}

// Track user interactions to reset nudge timer
window.addEventListener("click", () => {
  resetInactivityTimer();
});
window.addEventListener("keypress", () => {
  resetInactivityTimer();
});

// Floating Help Menu controls
function openFloatingHelp() {
  document.getElementById("floatingHelpModal").classList.add("active");
}

function closeFloatingHelp() {
  document.getElementById("floatingHelpModal").classList.remove("active");
}

// Resolve Conflict click from Dashboard Red Card
function resolveDashboardConflict() {
  const isTour = typeof tourState !== 'undefined' && tourState.isActive;
  
  if (isTour) {
    if (tourState.activeStep === 2) {
      tourState.maxReachedStep = 4;
      loadTourStep(4);
    } else if (tourState.activeStep !== 4) {
      appendTourChatMessage("Let's follow the tour steps first! Follow the guide instructions on the tooltip.");
      return;
    }
  }

  // Switch to AI Assistant tab/drawer
  switchTab("ai-assistant");
  
  // Set chat input and automatically type/submit
  const inputId = isTour ? "chatInput" : "drawerChatInput";
  const input = document.getElementById(inputId);
  if (input) {
    input.value = "Reschedule my 12pm meeting — it has a conflict";
  }
  
  if (isTour) {
    submitMessage(false);
  } else {
    submitDrawerMessage();
  }
}

// Connect Calendar Integrations simulation click
function connectService(serviceName) {
  const connectBtn = document.getElementById(`btn-connect-${serviceName === 'google' ? 'google' : serviceName}`);
  const statusBadge = document.getElementById(`status-${serviceName === 'google' ? 'gcal' : serviceName}`);
  
  if (!connectBtn || !statusBadge) return;
  
  if (connectBtn.textContent === "Connect") {
    connectBtn.textContent = "Disconnect";
    connectBtn.className = "btn btn-secondary integration-connect-btn";
    statusBadge.textContent = "Connected";
    statusBadge.className = "integration-status text-success";
    
    // Trigger sync indicators
    if (serviceName === "google" || serviceName === "outlook") {
      tourState.isCalendarConnected = true;
      
      const syncVal = document.getElementById("syncStatusText");
      const syncDesc = document.getElementById("syncStatusDesc");
      if (syncVal) {
        syncVal.textContent = "Synced";
        syncVal.className = "stat-value text-success";
      }
      if (syncDesc) {
        syncDesc.textContent = "Google/Outlook calendar active";
      }
      
      appendTourChatMessage(`✓ Connected! ${serviceName === 'google' ? 'Google' : 'Outlook'} Calendar successfully integrated. Availability synced!`);
      
      // Call real sync API route
      fetch(`${API_BASE}/calendar/sync/${serviceName}`)
        .then(res => res.json())
        .then(data => {
          logTool("sync_calendar", { provider: serviceName }, `SUCCESS: Synced and imported ${data.eventsImported} events`);
        })
        .catch(err => console.error("Error syncing calendar:", err));

      // If we are at Step 6, advance tour
      if (tourState.isActive && tourState.activeStep === 6) {
        setTimeout(() => {
          advanceTourStep();
        }, 1200);
      }
    }
  } else {
    // Disconnect
    connectBtn.textContent = "Connect";
    connectBtn.className = "btn btn-primary integration-connect-btn";
    statusBadge.textContent = "Disconnected";
    statusBadge.className = "integration-status text-danger";
    
    if (serviceName === "google" || serviceName === "outlook") {
      tourState.isCalendarConnected = false;
      const syncVal = document.getElementById("syncStatusText");
      const syncDesc = document.getElementById("syncStatusDesc");
      if (syncVal) {
        syncVal.textContent = "Disconnected";
        syncVal.className = "stat-value text-danger";
      }
      if (syncDesc) {
        syncDesc.textContent = "Google/Outlook sync pending";
      }
    }
  }
}

// Date selection on Monthly Calendar View
const MONTH_MEETINGS = {
  25: [
    { time: "12:00 PM", title: "Protected Lunch Block", duration: "60 min", type: "lunch" }
  ],
  26: [
    { time: "09:00 AM", title: "Daily Standup", duration: "15 min", type: "standup" },
    { time: "10:00 AM", title: "Sprint Planning", duration: "45 min", type: "meeting" },
    { time: "12:00 PM", title: "Client Sync (Conflict)", duration: "60 min", type: "conflict" }
  ],
  27: [
    { time: "12:00 PM", title: "Protected Lunch Block", duration: "60 min", type: "lunch" }
  ],
  28: [
    { time: "10:00 AM", title: "Deep Work Session", duration: "120 min", type: "focus" },
    { time: "12:00 PM", title: "Protected Lunch Block", duration: "60 min", type: "lunch" }
  ],
  29: [
    { time: "12:00 PM", title: "Protected Lunch Block", duration: "60 min", type: "lunch" }
  ]
};

function selectCalendarDate(dayNum) {
  // Update UI active styles on date grid
  document.querySelectorAll(".month-day").forEach(day => {
    if (day.dataset.day === String(dayNum)) {
      day.classList.add("active-selected");
    } else {
      day.classList.remove("active-selected");
    }
  });

  // Load events
  const container = document.getElementById("dayEventsContainer");
  const label = document.getElementById("selectedDateLabel");
  
  if (!container || !label) return;

  label.textContent = `Schedule for May ${dayNum}, 2026`;
  container.innerHTML = "";

  const meetings = (MONTH_MEETINGS[dayNum] || []).slice().sort((a, b) => {
    const parseTime = (tStr) => {
      const [time, modifier] = tStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (hours === 12) {
        hours = modifier === 'AM' ? 0 : 12;
      } else if (modifier === 'PM') {
        hours += 12;
      }
      return hours * 60 + minutes;
    };
    return parseTime(a.time) - parseTime(b.time);
  });
  
  if (meetings.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;">
        No meetings scheduled for this day. Enjoy your free time!
      </div>
    `;
    return;
  }

  meetings.forEach(m => {
    const card = document.createElement("div");
    card.className = "day-event-card";
    
    // Assign status classes to apply custom border markers
    if (m.title.toLowerCase().includes("conflict")) {
      card.classList.add("conflict");
    } else if (m.type === "lunch") {
      card.classList.add("lunch");
    } else if (m.type === "focus") {
      card.classList.add("focus");
    }

    card.innerHTML = `
      <div class="event-card-time">${m.time}</div>
      <div class="event-card-info">
        <h4 class="event-card-title">${m.title}</h4>
        <div class="event-card-meta">Duration: ${m.duration}</div>
      </div>
    `;
    container.appendChild(card);
  });
  
  // If at step 3, clicking calendar should trigger progress check
  if (tourState.isActive && tourState.activeStep === 3 && dayNum === 26) {
    // If they clicked the date grid, reset inactivity nudge
    resetInactivityTimer();
  }
}

// Onboarding Chat Q&A Interception engine
function handleOnboardingChatInterception(text) {
  if (!tourState.isActive) return false;
  
  const clean = text.toLowerCase().trim();
  
  // 1. Confusion Intent
  if (clean.includes("confused") || clean.includes("stuck") || clean.includes("help") || clean.includes("don't understand") || clean.includes("i'm stuck")) {
    let simplifyText = "";
    let actionText = "";
    
    switch(tourState.activeStep) {
      case 1:
        simplifyText = "Welcome to MeetAI. I'll guide you step by step in under 2 minutes.";
        actionText = "Tap the 'Start Tour' button in the card.";
        break;
      case 2:
        simplifyText = "This is your home dashboard, displaying stats and today's schedule.";
        actionText = "Just click the red conflict card on the meeting list.";
        break;
      case 3:
        simplifyText = "This is your monthly calendar where dates with dots have meetings.";
        actionText = "Click 'Calendar' in the left sidebar to see dates, then click 'AI Assistant' in the sidebar to continue.";
        break;
      case 4:
        simplifyText = "This is the AI Assistant console. You type meeting details here.";
        actionText = "Type a message in the chat box or tap Got it on the tooltip.";
        break;
      case 5:
        simplifyText = "This is a confirmation card checking date, time, and attendees.";
        actionText = "Tap 'Confirm & Book' inside the confirmation card.";
        break;
      case 6:
        simplifyText = "This is the integration screen to link Google Calendar, Outlook, and Zoom.";
        actionText = "Tap 'Connect' next to Google Calendar.";
        break;
      case 7:
        simplifyText = "You're done! Read the summary cheat sheet table to learn key pages.";
        actionText = "Tap 'Go to Dashboard' to start using MeetAI.";
        break;
    }
    
    appendTourChatMessage(`No worries! Let me simplify. ${simplifyText}\nJust do one thing: **${actionText}**`);
    return true;
  }
  
  // 2. Skip Intent
  if (clean === "skip" || clean.includes("skip the calendar") || clean.includes("skip step") || clean === "skip tour") {
    if (clean.includes("calendar")) {
      appendTourChatMessage("Of course! Skipping Calendar.\nNext up: the AI Assistant — this is where you type things like 'schedule a call with Priya tomorrow' and I handle everything. Want to go there now?");
      // Unlock step 4 and navigate
      setTimeout(() => {
        loadTourStep(4);
      }, 1000);
      return true;
    }
    
    appendTourChatMessage("Sure! You can always come back to this later. What would you like to see next?\n1. Dashboard\n2. AI Assistant\n3. Calendar\n4. Integrations");
    
    // Enable simple selection in chat
    tourState.pendingSkipChoice = true;
    return true;
  }
  
  // Handle choice after choosing skip options
  if (tourState.pendingSkipChoice) {
    tourState.pendingSkipChoice = false;
    if (clean === "1" || clean.includes("dashboard")) {
      skipTour();
      switchTab("dashboard");
      return true;
    } else if (clean === "2" || clean.includes("assistant") || clean.includes("ai")) {
      skipTour();
      switchTab("ai-assistant");
      return true;
    } else if (clean === "3" || clean.includes("calendar")) {
      skipTour();
      switchTab("calendar");
      return true;
    } else if (clean === "4" || clean.includes("integration")) {
      skipTour();
      switchTab("integrations");
      return true;
    }
  }

  // 3. Question about conflict at Step 2
  if (tourState.activeStep === 2 && (clean.includes("red card") || clean.includes("conflict") || clean.includes("overlap"))) {
    appendTourChatMessage(
      "No worries! A red card means two of your meetings are scheduled at the same time — that's called a conflict.\n" +
      "Just click the red card and I'll automatically suggest a new time that works for everyone. Easy fix!\n" +
      "Ready to continue? Let's look at the Calendar next →"
    );
    return true;
  }

  // 4. Questions about Zoom or pricing / off-topic during tour
  if (clean.includes("price") || clean.includes("cost") || clean.includes("pricing") || clean.includes("free")) {
    const stepLabel = TOUR_STEPS.find(s => s.stepNum === tourState.activeStep).title;
    appendTourChatMessage(
      `Great question! MeetAI is free for individuals during beta. Pricing details are in billing settings.\n` +
      `Now let's continue — you were exploring the **${stepLabel}** step. Ready to go to the next step? →`
    );
    return true;
  }
  
  if (clean.includes("zoom") && tourState.activeStep < 6) {
    appendTourChatMessage(
      "Great question — we'll cover Zoom in Step 6 (Integrations). For now, let's finish the tour step-by-step so it all makes sense in order.\n" +
      `Let's complete the current step first!`
    );
    return true;
  }
  
  return false;
}
