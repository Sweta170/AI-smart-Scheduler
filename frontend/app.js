/**
 * MeetAI UI Controller and Glue Code
 */

const API_BASE = 'http://localhost:5000/api';
let conversationHistory = [];
let chatDrawerOpen = false;

// Intercept all fetch requests to append JWT token
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
  const token = localStorage.getItem('meetai_token');
  options = options || {};
  
  if (!options.headers) {
    options.headers = {};
  }
  
  if (token) {
    if (options.headers instanceof Headers) {
      options.headers.set('Authorization', `Bearer ${token}`);
    } else {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  try {
    const response = await originalFetch(url, options);
    if (response.status === 401) {
      const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
      if (urlStr && urlStr.includes('/api/') && !urlStr.includes('/api/auth/')) {
        handleLogout();
      }
    }
    return response;
  } catch (error) {
    throw error;
  }
};

// Theme management
function changeTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('meetai_theme', themeName);
}

// Auth functions
function showAuthOverlay() {
  const overlay = document.getElementById('authOverlayScreen');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

function hideAuthOverlay() {
  const overlay = document.getElementById('authOverlayScreen');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

function setAuthMode(mode) {
  const overlay = document.getElementById('authOverlayScreen');
  if (!overlay) return;
  overlay.setAttribute('data-auth-mode', mode);
  
  const loginTab = document.getElementById('authTabLogin');
  const registerTab = document.getElementById('authTabRegister');
  const titleText = document.getElementById('authTitleText');
  const subtitleText = document.getElementById('authSubtitleText');
  const submitBtn = document.getElementById('authSubmitBtn');
  const submitBtnSpan = submitBtn ? submitBtn.querySelector('span') : null;
  const authNameInput = document.getElementById('authName');
  
  const alertEl = document.getElementById('authAlert');
  if (alertEl) {
    alertEl.className = 'auth-alert';
    alertEl.style.display = 'none';
  }
  
  if (mode === 'login') {
    if (loginTab) loginTab.classList.add('active');
    if (registerTab) registerTab.classList.remove('active');
    if (titleText) titleText.textContent = 'Welcome Back';
    if (subtitleText) subtitleText.textContent = 'Login to access your AI scheduling workspace';
    if (submitBtnSpan) submitBtnSpan.textContent = 'Login to Workspace';
    if (authNameInput) authNameInput.removeAttribute('required');
  } else {
    if (loginTab) loginTab.classList.remove('active');
    if (registerTab) registerTab.classList.add('active');
    if (titleText) titleText.textContent = 'Create Account';
    if (subtitleText) subtitleText.textContent = 'Register to start scheduling with MeetAI';
    if (submitBtnSpan) submitBtnSpan.textContent = 'Register & Setup';
    if (authNameInput) authNameInput.setAttribute('required', 'true');
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  
  const overlay = document.getElementById('authOverlayScreen');
  const mode = overlay ? overlay.getAttribute('data-auth-mode') : 'login';
  const alertEl = document.getElementById('authAlert');
  const submitBtn = document.getElementById('authSubmitBtn');
  
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  
  if (alertEl) {
    alertEl.style.display = 'none';
    alertEl.className = 'auth-alert';
  }
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
  }
  
  try {
    let response;
    if (mode === 'login') {
      response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } else {
      const name = document.getElementById('authName').value.trim();
      const timezone = document.getElementById('authTimezone').value;
      response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, timezone })
      });
    }
    
    const data = await response.json();
    if (response.ok && data.success) {
      if (alertEl) {
        alertEl.className = 'auth-alert success';
        alertEl.textContent = mode === 'login' ? 'Login successful! Entering workspace...' : 'Registration successful! Entering workspace...';
        alertEl.style.display = 'block';
      }
      
      localStorage.setItem('meetai_token', data.token);
      
      updateUserUI(data.user);
      
      setTimeout(() => {
        hideAuthOverlay();
        document.getElementById('authPassword').value = '';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '';
        }
        initApp();
      }, 1000);
    } else {
      let errMsg = data.error || 'Authentication failed';
      if (data.errors && Array.isArray(data.errors)) {
        errMsg = data.errors.map(e => e.msg).join(', ');
      }
      if (alertEl) {
        alertEl.className = 'auth-alert danger';
        alertEl.textContent = errMsg;
        alertEl.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
      }
    }
  } catch (err) {
    console.error("Auth submit error:", err);
    if (alertEl) {
      alertEl.className = 'auth-alert danger';
      alertEl.textContent = 'Server connection error. Please try again.';
      alertEl.style.display = 'block';
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '';
    }
  }
}

function updateUserUI(user) {
  if (typeof STATE !== 'undefined') {
    STATE.preferences.userId = user.id;
    STATE.preferences.userName = user.name;
    STATE.preferences.userEmail = user.email;
    STATE.preferences.timezone = user.timezone;
  }
  
  const badge = document.getElementById('userProfileBadge');
  const avatar = document.getElementById('userAvatar');
  const nameDisplay = document.getElementById('userNameDisplay');
  
  if (badge) badge.style.display = 'flex';
  if (avatar) avatar.textContent = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  if (nameDisplay) nameDisplay.textContent = user.name || 'User';

  // Google Calendar integration status updates
  const connected = user.googleCalendar?.connected || false;
  updateGcalUI(connected);
  updateDashboardSyncStatus(connected);
}

function handleLogout() {
  localStorage.removeItem('meetai_token');
  
  const badge = document.getElementById('userProfileBadge');
  if (badge) badge.style.display = 'none';
  
  const emailInput = document.getElementById('authEmail');
  if (emailInput) emailInput.value = '';
  const pwdInput = document.getElementById('authPassword');
  if (pwdInput) pwdInput.value = '';
  const nameInput = document.getElementById('authName');
  if (nameInput) nameInput.value = '';
  
  const alertEl = document.getElementById('authAlert');
  if (alertEl) {
    alertEl.style.display = 'none';
    alertEl.className = 'auth-alert';
  }
  
  updateGcalUI(false);
  updateDashboardSyncStatus(false);
  showAuthOverlay();
}

async function checkAuthAndInit() {
  const token = localStorage.getItem('meetai_token');
  if (!token) {
    showAuthOverlay();
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/auth/me`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        updateUserUI(data.user);
        hideAuthOverlay();
        initApp();
        
        // Check for Google redirect success param
        const params = new URLSearchParams(window.location.search);
        if (params.get('connected') === 'true') {
          setTimeout(() => {
            alert("Google Calendar successfully connected!");
            // Clean URL query parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 500);
        }
      } else {
        handleLogout();
      }
    } else {
      handleLogout();
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    handleLogout();
  }
}

// Google Calendar OAuth functions
function connectGoogle() {
  const token = localStorage.getItem('meetai_token');
  window.location.href = `http://localhost:5000/api/calendar/connect?token=${token}`;
}

async function disconnectGoogle() {
  if (!confirm("Are you sure you want to disconnect Google Calendar?")) return;
  try {
    const res = await fetch(`${API_BASE}/calendar/disconnect`, {
      method: 'POST'
    });
    const data = await res.json();
    if (res.ok && data.success) {
      updateGcalUI(false);
      updateDashboardSyncStatus(false);
      alert("Successfully disconnected Google Calendar.");
      loadAllData();
    } else {
      alert(data.error || "Failed to disconnect Google Calendar");
    }
  } catch (err) {
    console.error("Disconnect GCal failed:", err);
    alert("Error disconnecting Google Calendar.");
  }
}

async function syncGoogle() {
  const wrapper = document.getElementById('gcal-actions-wrapper');
  if (wrapper) {
    wrapper.style.opacity = '0.5';
    wrapper.style.pointerEvents = 'none';
  }
  try {
    const res = await fetch(`${API_BASE}/calendar/sync/google`);
    const data = await res.json();
    if (res.ok && data.synced) {
      alert(`Successfully synced ${data.eventsImported} events from Google Calendar!`);
      loadAllData();
    } else {
      alert(data.error || 'Failed to sync Google Calendar');
    }
  } catch (err) {
    console.error("Sync GCal failed:", err);
    alert("Error syncing Google Calendar. Make sure your connection is active.");
  } finally {
    if (wrapper) {
      wrapper.style.opacity = '';
      wrapper.style.pointerEvents = '';
    }
  }
}

function updateGcalUI(connected) {
  const wrapper = document.getElementById('gcal-actions-wrapper');
  const statusGcal = document.getElementById('status-gcal');
  if (!statusGcal) return;
  
  if (connected) {
    statusGcal.textContent = '✓ Connected';
    statusGcal.className = 'integration-status text-success';
    if (wrapper) {
      wrapper.innerHTML = `
        <div style="display: flex; gap: 8px; width: 100%;">
          <button class="btn btn-primary" id="btn-sync-google" style="flex: 1;">Sync now</button>
          <button class="btn btn-secondary" id="btn-disconnect-google" style="flex: 1;">Disconnect</button>
        </div>
      `;

      const syncBtn = document.getElementById('btn-sync-google');
      if (syncBtn) {
        syncBtn.addEventListener('click', (e) => {
          e.preventDefault();
          syncGoogle();
        });
      }

      const disconnectBtn = document.getElementById('btn-disconnect-google');
      if (disconnectBtn) {
        disconnectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          disconnectGoogle();
        });
      }
    }
  } else {
    statusGcal.textContent = 'Disconnected';
    statusGcal.className = 'integration-status text-danger';
    if (wrapper) {
      wrapper.innerHTML = `
        <button class="btn btn-primary integration-connect-btn" id="btn-connect-google">Connect</button>
      `;

      const connectBtn = document.getElementById('btn-connect-google');
      if (connectBtn) {
        connectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          connectGoogle();
        });
      }
    }
  }
}

function updateDashboardSyncStatus(connected) {
  const statusText = document.getElementById('syncStatusText');
  const statusDesc = document.getElementById('syncStatusDesc');
  if (!statusText || !statusDesc) return;
  
  if (connected) {
    statusText.textContent = 'Connected';
    statusText.className = 'stat-value text-success';
    statusDesc.textContent = 'Google Calendar active';
  } else {
    statusText.textContent = 'Disconnected';
    statusText.className = 'stat-value text-danger';
    statusDesc.textContent = 'Google/Outlook sync pending';
  }
}

// Expose functions globally for HTML triggers
window.setAuthMode = setAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.handleLogout = handleLogout;
window.connectGoogle = connectGoogle;
window.disconnectGoogle = disconnectGoogle;
window.syncGoogle = syncGoogle;

document.addEventListener("DOMContentLoaded", () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('meetai_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.value = savedTheme;
  }

  // Password visibility toggle
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const authPasswordInput = document.getElementById('authPassword');
  if (togglePasswordBtn && authPasswordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = authPasswordInput.getAttribute('type') === 'password';
      authPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
      
      const eyeShow = togglePasswordBtn.querySelector('.eye-icon-show');
      const eyeHide = togglePasswordBtn.querySelector('.eye-icon-hide');
      if (eyeShow && eyeHide) {
        if (isPassword) {
          eyeShow.classList.add('hidden');
          eyeHide.classList.remove('hidden');
        } else {
          eyeShow.classList.remove('hidden');
          eyeHide.classList.add('hidden');
        }
      }
    });
  }

  checkAuthAndInit();
});


function initApp() {
  startClocks();
  renderTeam();
  
  // Load data from Express backend
  loadAllData();
  
  // Register event listeners
  window.addEventListener('calendarUpdated', () => {
    loadAllData();
  });
  
  window.addEventListener('systemLogAdded', (e) => {
    appendSystemLog(e.detail);
  });

  // Bind key interactive buttons programmatically to bypass potential CSP/inline-script restrictions
  const fab = document.getElementById('chatFab');
  if (fab) {
    fab.onclick = null;
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      toggleChatDrawer();
    });
  }

  const sidebarAiBtn = document.getElementById('sidebar-ai-assistant');
  if (sidebarAiBtn) {
    sidebarAiBtn.onclick = null;
    sidebarAiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('ai-assistant');
    });
  }

  const connectGcalBtn = document.getElementById('btn-connect-google');
  if (connectGcalBtn) {
    connectGcalBtn.onclick = null;
    connectGcalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      connectGoogle();
    });
  }

  // Initialize Onboarding Tour
  if (typeof initOnboarding === 'function') {
    initOnboarding();
  }
}

async function loadAllData() {
  try {
    // 1. Fetch preferences
    const prefRes = await fetch(`${API_BASE}/users/preferences/current`);
    if (prefRes.ok) {
      const pref = await prefRes.json();
      STATE.preferences.userId = pref.userId;
      STATE.preferences.timezone = pref.timezone;
      STATE.preferences.workingHours = pref.workingHours;
      STATE.preferences.buffer = pref.bufferTime;
      STATE.preferences.preferredPlatform = pref.preferredPlatform;
      
      const startEl = document.getElementById("settingStartHour");
      const endEl = document.getElementById("settingEndHour");
      const bufferEl = document.getElementById("settingBuffer");
      const platformEl = document.getElementById("settingPlatform");
      
      if (startEl) startEl.value = pref.workingHours.start;
      if (endEl) endEl.value = pref.workingHours.end;
      if (bufferEl) bufferEl.value = String(pref.bufferTime);
      if (platformEl) platformEl.value = pref.preferredPlatform;
    }

    // 2. Fetch week meetings
    const weekRes = await fetch(`${API_BASE}/meetings/week`);
    if (weekRes.ok) {
      const data = await weekRes.json();
      STATE.events = data.meetings.map(m => ({
        id: m.id,
        title: m.title,
        date: m.date,
        time: m.time,
        duration: m.duration,
        type: m.type,
        status: m.status,
        videoLink: m.videoLink,
        notes: m.notes,
        attendees: m.attendees
      }));
      
      // Group meetings for monthly grid
      for (let d = 25; d <= 29; d++) {
        MONTH_MEETINGS[d] = [];
      }
      STATE.events.forEach(event => {
        const dayNum = new Date(event.date).getUTCDate();
        if (dayNum >= 25 && dayNum <= 29) {
          if (!MONTH_MEETINGS[dayNum]) MONTH_MEETINGS[dayNum] = [];
          MONTH_MEETINGS[dayNum].push({
            time: formatTime12h(event.time),
            title: event.title,
            duration: `${event.duration} min`,
            type: event.type
          });
        }
      });
      
      renderCalendar();
      
      const selectedDayEl = document.querySelector(".month-day.active-selected");
      if (selectedDayEl) {
        const day = parseInt(selectedDayEl.textContent.trim());
        selectCalendarDate(day);
      } else {
        selectCalendarDate(26);
      }
    }

    // 3. Render Dashboard
    await fetchAndRenderDashboard();

  } catch (err) {
    console.error("Error loading data from API:", err);
  }
}

async function fetchAndRenderDashboard() {
  try {
    const res = await fetch(`${API_BASE}/meetings/today`);
    if (!res.ok) return;
    const data = await res.json();
    
    const dashboardList = document.getElementById("dashboardMeetingsList");
    if (!dashboardList) return;
    
    dashboardList.innerHTML = `<h3 class="section-subtitle">Today's Schedule</h3>`;
    
    const listDiv = document.createElement("div");
    listDiv.className = "meetings-list";
    
    let meetingsCount = data.meetings.length;
    let confirmedCount = 0;
    let conflictCount = 0;
    
    if (meetingsCount === 0) {
      listDiv.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No meetings scheduled for today.</div>`;
    } else {
      const sortedMeetings = data.meetings.slice().sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
      sortedMeetings.forEach(m => {
        const item = document.createElement("div");
        const isConflict = m.status.toLowerCase() === "conflict";
        
        if (isConflict) {
          conflictCount++;
          item.className = "meeting-item-card conflict";
          item.id = "conflictRedCard";
          item.onclick = () => resolveDashboardConflict();
        } else {
          confirmedCount++;
          item.className = "meeting-item-card confirmed";
        }
        
        const startMins = parseTimeToMins(m.time);
        const endMins = startMins + m.duration;
        const endStr = minsToTimeStr(endMins);
        
        const timeBadge = formatTime12h(m.time);
        const timeRangeStr = `${timeBadge} – ${formatTime12h(endStr)} · ${m.status.charAt(0).toUpperCase() + m.status.slice(1)} · ${m.attendees.map(a => a.split("@")[0]).join(", ")}`;
        
        item.innerHTML = `
          <div class="meeting-time-badge">${timeBadge}</div>
          <div class="meeting-info">
            <h4>${m.title}</h4>
            <span>${timeRangeStr}</span>
            ${isConflict ? `<p class="conflict-warning-text">Overlaps with your protected lunch block. Click here to auto-fix.</p>` : ''}
          </div>
          <div class="meeting-status-tag tag-${m.status.toLowerCase()}">${m.status.charAt(0).toUpperCase() + m.status.slice(1)}</div>
        `;
        listDiv.appendChild(item);
      });
    }
    
    dashboardList.appendChild(listDiv);
    
    const statsRow = document.getElementById("dashboardStatsRow");
    if (statsRow) {
      const cards = statsRow.querySelectorAll(".stat-card");
      if (cards.length >= 3) {
        const card1 = cards[0];
        card1.querySelector(".stat-value").textContent = String(meetingsCount);
        card1.querySelector(".stat-desc").textContent = `${confirmedCount} confirmed, ${conflictCount} conflict`;
      }
    }
  } catch (err) {
    console.error("Error rendering dashboard:", err);
  }
}

// ==========================================
// TABS NAVIGATION
// ==========================================
function switchTab(tabId) {
  // Map old tabId names to the new view pane IDs
  let viewId = tabId;
  if (tabId === 'booking') viewId = 'share-link';
  if (tabId === 'team') viewId = 'analytics';
  
  // If trying to switch to AI assistant, open the drawer instead (unless tour is active)
  if (viewId === 'ai-assistant') {
    if (typeof tourState === 'undefined' || !tourState.isActive) {
      openChatDrawer();
      return;
    }
  }
  
  // Intercept view switching during onboarding tour
  if (typeof tourState !== 'undefined' && tourState.isActive) {
    const targetStep = TOUR_STEPS.find(s => s.view === viewId);
    if (targetStep) {
      if (targetStep.stepNum > tourState.maxReachedStep) {
        appendTourChatMessage(`Let's finish the current tour step first! Follow the guide instructions on the tooltip.`);
        return;
      }
      
      if (tourState.activeStep === 2 && viewId === 'calendar') {
        advanceTourStep();
        return;
      }
      if (tourState.activeStep === 3 && viewId === 'ai-assistant') {
        advanceTourStep();
        return;
      }
      if (tourState.activeStep === 5 && viewId === 'integrations') {
        advanceTourStep();
        return;
      }
      
      loadTourStep(targetStep.stepNum);
      return;
    } else {
      appendTourChatMessage(`Please complete the onboarding tour first before exploring other settings! We are almost done.`);
      return;
    }
  }

  // Update sidebar buttons
  const buttons = document.querySelectorAll(".sidebar-btn");
  buttons.forEach(btn => {
    let active = false;
    if (viewId === 'dashboard' && btn.id === 'sidebar-dashboard') active = true;
    if (viewId === 'calendar' && btn.id === 'sidebar-calendar') active = true;
    if (viewId === 'integrations' && btn.id === 'sidebar-integrations') active = true;
    if (viewId === 'share-link' && btn.id === 'sidebar-share-link') active = true;
    if (viewId === 'analytics' && btn.id === 'sidebar-analytics') active = true;
    if (viewId === 'settings' && btn.id === 'sidebar-settings') active = true;
    
    if (active) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update view panes
  const panes = document.querySelectorAll(".view-pane");
  panes.forEach(pane => {
    if (pane.id === `view-${viewId}`) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });
  
  // Special action for booking simulator
  if (viewId === 'share-link') {
    regenerateGuestSlots();
  }
}

// ==========================================
// CALENDAR RENDER ENGINE
// ==========================================
function renderCalendar() {
  // Clear existing non-static items in all columns
  const columns = document.querySelectorAll(".day-column");
  columns.forEach(col => {
    col.innerHTML = '';
  });

  const baseDate = new Date("2026-05-25"); // Monday

  STATE.events.forEach(event => {
    // Determine column day (Mon-Fri)
    const eventDate = new Date(event.date);
    const diffTime = eventDate - baseDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // 1-indexed (Mon = 1, Tue = 2...)
    
    if (diffDays < 1 || diffDays > 5) return; // Mon-Fri only
    
    const dayCol = document.getElementById(`day-col-${diffDays}`);
    if (!dayCol) return;

    // Calculate position
    const [startH, startM] = event.time.split(":").map(Number);
    const startMinsSince8AM = (startH - 8) * 60 + startM;
    
    // 60px represents 60 mins (1 hour)
    const topPx = startMinsSince8AM;
    const heightPx = event.duration;

    // Create event element
    const eventEl = document.createElement("div");
    eventEl.classList.add("event-block");
    eventEl.classList.add(event.status.toLowerCase() === 'tentative' ? 'tentative' : event.type);
    
    eventEl.style.top = `${topPx}px`;
    eventEl.style.height = `${heightPx}px`;

    // Time Label
    const endMins = startMinsSince8AM + event.duration;
    const endH = Math.floor(endMins / 60) + 8;
    const endM = endMins % 60;
    const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    
    const timeLabel = `${formatTime12h(event.time)} – ${formatTime12h(endStr)}`;

    eventEl.innerHTML = `
      <div class="event-title">${event.title}</div>
      <div class="event-time">${timeLabel}</div>
      ${event.attendees && event.attendees.length > 1 ? `<div class="event-attendees">Attendees: ${event.attendees.map(a => a.split("@")[0]).join(", ")}</div>` : ''}
    `;

    // Only allow details for actual meetings (skip lunch blocks to prevent visual clutter)
    if (event.type !== 'lunch') {
      eventEl.onclick = (e) => {
        e.stopPropagation();
        openEventModal(event);
      };
    } else {
      eventEl.title = "Protected Lunch Block";
    }

    dayCol.appendChild(eventEl);
  });
}

// ==========================================
// TEAM DIRECTORY RENDER
// ==========================================
function renderTeam() {
  const grid = document.getElementById("teamGrid");
  grid.innerHTML = '';

  STATE.contacts.forEach((contact, idx) => {
    const card = document.createElement("div");
    card.classList.add("contact-card");

    card.innerHTML = `
      <div class="contact-profile">
        <div class="profile-avatar">${contact.avatar}</div>
        <div class="profile-info">
          <span class="profile-name">${contact.name}</span>
          <span class="profile-title">${contact.title}</span>
        </div>
      </div>
      <div class="contact-details">
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-val">${contact.email}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Timezone:</span>
          <span class="detail-val timezone">${contact.timezone}</span>
        </div>
        <div class="detail-row" style="margin-top: 6px;">
          <span class="detail-label">Status:</span>
          <span class="availability-pill free" id="status-pill-${idx}">Checking...</span>
        </div>
      </div>
      <div class="contact-clock">
        <span class="clock-label">Local Time:</span>
        <span class="clock-time" id="clock-${idx}">00:00:00 PM</span>
      </div>
    `;

    grid.appendChild(card);
  });
}

function startClocks() {
  setInterval(updateClocks, 1000);
  updateClocks();
}

function updateClocks() {
  // Update clocks based on timezone offsets
  const now = new Date();
  
  STATE.contacts.forEach((contact, idx) => {
    const clockEl = document.getElementById(`clock-${idx}`);
    const statusPill = document.getElementById(`status-pill-${idx}`);
    if (!clockEl) return;

    // Use Intl.DateTimeFormat to get timezone specific time
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: contact.timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      });
      
      const timeParts = formatter.format(now);
      clockEl.textContent = timeParts;

      // Determine local hour to set availability status (9 AM to 6 PM is working hours)
      const hourFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: contact.timezone,
        hour: 'numeric',
        hour12: false
      });
      
      const currentHour = parseInt(hourFormatter.format(now));
      
      if (currentHour >= 9 && currentHour < 18) {
        statusPill.textContent = "Available";
        statusPill.className = "availability-pill free";
      } else {
        statusPill.textContent = "Off-Duty";
        statusPill.className = "availability-pill busy";
      }
    } catch (err) {
      clockEl.textContent = "Time Error";
    }
  });
}

// ==========================================
// SYSTEM LOGS LOGGER
// ==========================================
let logsExpanded = false;
function toggleLogsHeight() {
  const panel = document.getElementById("systemLogsPanel");
  const arrow = document.getElementById("logsToggleArrow");
  if (logsExpanded) {
    panel.style.maxHeight = "40px";
    arrow.textContent = "▲";
    logsExpanded = false;
  } else {
    panel.style.maxHeight = "160px";
    arrow.textContent = "▼";
    logsExpanded = true;
  }
}

function appendSystemLog(log) {
  const body = document.getElementById("logsBody");
  const drawerBody = document.getElementById("drawerLogsBody");
  
  const createEntry = () => {
    const entry = document.createElement("div");
    entry.classList.add("log-entry");
    entry.innerHTML = `
      <span class="log-time">[${log.time}]</span>
      <span class="log-tool">${log.tool}</span>
      <span class="log-info">(${log.args}) → ${log.result.substring(0, 80)}${log.result.length > 80 ? '...' : ''}</span>
    `;
    return entry;
  };
  
  if (body) {
    body.appendChild(createEntry());
    body.scrollTop = body.scrollHeight;
  }
  if (drawerBody) {
    drawerBody.appendChild(createEntry());
    drawerBody.scrollTop = drawerBody.scrollHeight;
  }
}

// ==========================================
// CHAT FEED CONTROLLERS
// ==========================================
function setInput(text) {
  const input = document.getElementById("chatInput");
  input.value = text;
  input.focus();
}

function handleInputKeyPress(e) {
  if (e.key === 'Enter') {
    submitMessage();
  }
}

function submitMessage(isDrawer = false) {
  const inputId = isDrawer ? "drawerChatInput" : "chatInput";
  const input = document.getElementById(inputId);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  
  // Clear input
  input.value = "";
  
  // Also clear the other input
  const otherInputId = isDrawer ? "chatInput" : "drawerChatInput";
  const otherInput = document.getElementById(otherInputId);
  if (otherInput) otherInput.value = "";

  // Append user bubble to both
  appendChatBubble(text, "user", "You");
  conversationHistory.push({ role: "user", content: text });

  // Reset inactivity nudge timer because user interacted!
  if (typeof resetInactivityTimer === 'function') {
    resetInactivityTimer();
  }

  // Show simulated typing status in both
  appendTypingIndicator();

  // Onboarding intercepts first
  if (typeof handleOnboardingChatInterception === 'function') {
    const intercepted = handleOnboardingChatInterception(text);
    if (intercepted) {
      removeTypingIndicators();
      return;
    }
  }

  // Log the AI tool call
  logTool("ai_agent_call", { userId: STATE.preferences.userId, message: text }, "PENDING");

  // Call Express API route
  fetch(`${API_BASE}/ai/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: STATE.preferences.userId,
      message: text,
      conversationHistory: conversationHistory.slice(0, -1)
    })
  })
  .then(res => res.json())
  .then(data => {
    removeTypingIndicators();
    
    logTool("ai_agent_call", { message: text }, "SUCCESS");
    
    // Render reply in both
    appendChatBubble(data.reply, "bot", "MeetAI");
    conversationHistory.push({ role: "assistant", content: data.reply });

    if (data.actions && data.actions.length > 0) {
      loadAllData();
    }
    
    // Onboarding tour state checks
    if (typeof tourState !== 'undefined' && tourState.isActive) {
      if (tourState.activeStep === 4) {
        if (data.reply.includes("─────────────────────────") && data.reply.toLowerCase().includes("confirm")) {
          setTimeout(() => {
            advanceTourStep();
          }, 1000);
        }
      }
    }
  })
  .catch(err => {
    removeTypingIndicators();
    logTool("ai_agent_call", { message: text }, "FAILED");
    appendChatBubble("Error communicating with MeetAI Agent backend. Make sure the server is running.", "bot", "MeetAI");
    console.error("AI Agent error:", err);
  });
}

function appendChatBubble(text, sender, name) {
  const mainHistory = document.getElementById("chatHistory");
  const drawerHistory = document.getElementById("drawerChatHistory");
  
  // Format the content
  let contentHtml = "";
  if (text.includes("─────────────────────────")) {
    const lines = text.split("\n");
    let bubbleText = "";
    let confBlockText = "";
    let isBlock = false;
    
    lines.forEach(line => {
      if (line.includes("─────────────────────────")) {
        isBlock = !isBlock;
        if (!isBlock) {
          contentHtml += `<div class="confirmation-block">${confBlockText.trim()}</div>`;
          confBlockText = "";
        }
      } else if (isBlock) {
        confBlockText += line + "\n";
      } else {
        bubbleText += line + "<br>";
      }
    });
    
    if (bubbleText) {
      contentHtml = `<p>${bubbleText}</p>` + contentHtml;
    }
  } else {
    contentHtml = formatMarkdownLike(text);
  }

  // Helper to create bubble element
  const createBubbleEl = () => {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    msg.innerHTML = `
      <span class="message-sender">${name}</span>
      <div class="message-bubble">
        ${contentHtml}
      </div>
    `;
    return msg;
  };

  if (mainHistory) {
    mainHistory.appendChild(createBubbleEl());
    mainHistory.scrollTop = mainHistory.scrollHeight;
  }
  
  if (drawerHistory) {
    drawerHistory.appendChild(createBubbleEl());
    drawerHistory.scrollTop = drawerHistory.scrollHeight;
  }
}

function formatMarkdownLike(text) {
  // Very basic list and bold HTML formatter
  let formatted = text
    .replace(/\*\*(.*?)\*\`/g, '<strong>$1</strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/✓ (.*?)/g, '<span style="color: var(--success);">✓</span> $1')
    .replace(/⚠️ (.*?)/g, '<span style="color: var(--warning);">⚠️</span> $1')
    .split("\n")
    .map(line => {
      if (line.startsWith("- ")) {
        return `<li style="margin-left: 20px;">${line.substring(2)}</li>`;
      }
      if (/^\d+\./.test(line)) {
        return `<li style="margin-left: 20px; list-style-type: decimal;">${line.replace(/^\d+\.\s*/, '')}</li>`;
      }
      return line ? `<p>${line}</p>` : '<br>';
    })
    .join("");
    
  return formatted;
}

function appendTypingIndicator() {
  const mainHistory = document.getElementById("chatHistory");
  const drawerHistory = document.getElementById("drawerChatHistory");

  const createIndicatorEl = () => {
    const msg = document.createElement("div");
    msg.className = "message bot typing-indicator-msg";
    msg.innerHTML = `
      <span class="message-sender">MeetAI</span>
      <div class="message-bubble" style="padding: 10px 16px;">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    `;
    return msg;
  };

  if (mainHistory) {
    mainHistory.appendChild(createIndicatorEl());
    mainHistory.scrollTop = mainHistory.scrollHeight;
  }
  if (drawerHistory) {
    drawerHistory.appendChild(createIndicatorEl());
    drawerHistory.scrollTop = drawerHistory.scrollHeight;
  }
}

function removeTypingIndicators() {
  document.querySelectorAll(".typing-indicator-msg").forEach(el => el.remove());
}

// ==========================================
// DEMO SCENARIOS TRIGGER
// ==========================================
function triggerDemoScenario(scenario) {
  const input = document.getElementById("chatInput");
  
  if (scenario === 'priya') {
    switchTab('calendar');
    input.value = "Schedule a 1:1 call with Priya tomorrow at 2pm";
  } else if (scenario === 'overlap') {
    switchTab('calendar');
    input.value = "Find a time for me, Ahmed, and Sunita this week";
  } else if (scenario === 'conflict') {
    switchTab('calendar');
    input.value = "Book a client call at 12pm today";
  } else if (scenario === 'summary') {
    switchTab('calendar');
    input.value = "The Q3 roadmap meeting just ended";
  }
  
  input.focus();
}

// ==========================================
// BOOKING LINK SIMULATOR
// ==========================================
function copyBookingLink() {
  const btn = document.querySelector(".booking-link-btn");
  navigator.clipboard.writeText("https://meetai.link/book/user-98836");
  btn.textContent = "Copied!";
  btn.style.background = "var(--success)";
  
  setTimeout(() => {
    btn.textContent = "Copy Link";
    btn.style.background = "";
  }, 2000);
}

function openBookingPortalSim() {
  document.getElementById("sandboxPlaceholder").style.display = "none";
  document.getElementById("bookingPortalView").style.display = "block";
  regenerateGuestSlots();
}

let guestSelectedSlot = null;

function regenerateGuestSlots() {
  const tz = document.getElementById("guestTimezone").value;
  const slotList = document.getElementById("portalSlotsList");
  slotList.innerHTML = '';
  guestSelectedSlot = null;
  document.getElementById("portalBookingForm").style.display = "none";

  // Host free slots on Wednesday May 27th (IST)
  // Let's offer standard slot times: 10:00 AM IST, 2:00 PM IST, 4:30 PM IST
  // We will convert these host times to the selected guest timezone
  const slotsIST = [
    { start: "10:00", duration: 30, date: "2026-05-27" },
    { start: "14:00", duration: 30, date: "2026-05-27" },
    { start: "16:30", duration: 30, date: "2026-05-27" }
  ];

  slotsIST.forEach((slot, idx) => {
    const guestStart = convert_timezone(slot.start, STATE.preferences.timezone, tz);
    
    // Calculate end time
    const startMins = parseTimeToMins(guestStart);
    const endMins = startMins + slot.duration;
    const guestEnd = minsToTimeStr(endMins);

    const btn = document.createElement("button");
    btn.className = "portal-slot-btn";
    btn.innerHTML = `${formatTime12h(guestStart)} – ${formatTime12h(guestEnd)} (${tz.split("/")[1]})`;
    
    btn.onclick = () => {
      document.querySelectorAll(".portal-slot-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      
      guestSelectedSlot = {
        title: "Guest Appointment",
        date: slot.date,
        time: slot.start,
        duration: slot.duration
      };
      
      document.getElementById("portalBookingForm").style.display = "flex";
    };

    slotList.appendChild(btn);
  });
}

function submitGuestBooking() {
  const name = document.getElementById("portalGuestName").value.trim();
  const email = document.getElementById("portalGuestEmail").value.trim();

  if (!name || !email) {
    alert("Please fill in your name and email to book the meeting.");
    return;
  }

  if (guestSelectedSlot) {
    const e = create_event(
      `Guest Booking: ${name}`,
      guestSelectedSlot.date,
      guestSelectedSlot.time,
      guestSelectedSlot.duration,
      ["you@company.com", email],
      "Google Meet",
      `External guest booking via meetai.link.\nGuest: ${name} (${email})`
    );

    alert(`Appointment successfully booked for ${guestSelectedSlot.date} at ${formatTime12h(guestSelectedSlot.time)} IST! This will now appear on the host's calendar.`);
    
    // Clear and reset simulator
    document.getElementById("portalGuestName").value = "";
    document.getElementById("portalGuestEmail").value = "";
    document.getElementById("bookingPortalView").style.display = "none";
    document.getElementById("sandboxPlaceholder").style.display = "flex";
    
    // Switch to calendar to show the result
    switchTab('calendar');
  }
}

// ==========================================
// PREFERENCES CONTROLLER
// ==========================================
function savePreferences() {
  const start = document.getElementById("settingStartHour").value;
  const end = document.getElementById("settingEndHour").value;
  const buffer = parseInt(document.getElementById("settingBuffer").value);
  const platform = document.getElementById("settingPlatform").value;

  STATE.preferences.workingHours.start = start;
  STATE.preferences.workingHours.end = end;
  STATE.preferences.buffer = buffer;
  STATE.preferences.preferredPlatform = platform;

  logTool("update_user_preferences", { workingHours: `${start}-${end}`, buffer, platform }, "SAVED");

  fetch(`${API_BASE}/users/preferences/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startHour: start,
      endHour: end,
      buffer: buffer,
      platform: platform
    })
  })
  .then(res => res.json())
  .then(data => {
    loadAllData();
  })
  .catch(err => console.error("Error saving preferences:", err));
}

// Redefine event creation and cancellation to communicate with Express REST API
function create_event(title, date, time, duration, attendees, link_type, notes) {
  logTool("create_meeting", { title, date, time, duration }, "REQUESTED");
  
  fetch(`${API_BASE}/meetings/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      date,
      time,
      duration,
      attendees,
      type: title.toLowerCase().includes("client") ? "client" : "1:1 check-in",
      notes,
      videoLink: "meet.google.com/xyz-abc-123"
    })
  })
  .then(res => res.json())
  .then(data => {
    logTool("create_meeting", { title }, "SUCCESS");
    loadAllData();
  })
  .catch(err => {
    logTool("create_meeting", { title }, "FAILED");
    console.error("Error creating event:", err);
  });
}

function cancel_event(event_id, notify_attendees = true) {
  logTool("cancel_event", { event_id, notify_attendees }, "REQUESTED");
  
  fetch(`${API_BASE}/meetings/cancel/${event_id}`, {
    method: 'DELETE'
  })
  .then(res => res.json())
  .then(data => {
    logTool("cancel_event", { event_id }, "SUCCESS");
    loadAllData();
  })
  .catch(err => {
    logTool("cancel_event", { event_id }, "FAILED");
    console.error("Error cancelling meeting:", err);
  });
}

// ==========================================
// EVENT DETAILS MODAL
// ==========================================
let activeModalEventId = null;

function openEventModal(event) {
  activeModalEventId = event.id;
  
  document.getElementById("modalEventTitle").textContent = event.title;
  
  const dateLong = formatDateLong(event.date);
  const start12h = formatTime12h(event.time);
  const endMins = parseTimeToMins(event.time) + event.duration;
  const end12h = formatTime12h(minsToTimeStr(endMins));
  
  document.getElementById("modalEventTime").textContent = `${dateLong} · ${start12h} – ${end12h} IST`;
  document.getElementById("modalEventDuration").textContent = `${event.duration} minutes`;
  
  // Attendees
  const atts = event.attendees.map(a => a === STATE.preferences.userEmail ? "You" : a.split("@")[0]);
  document.getElementById("modalEventAttendees").textContent = atts.join(", ");
  
  // Platform link
  const linkEl = document.getElementById("modalEventLink");
  linkEl.textContent = event.videoLink || event.link;
  linkEl.href = `https://${event.videoLink || event.link}`;

  // Notes
  const notesCont = document.getElementById("modalEventNotesContainer");
  const notesEl = document.getElementById("modalEventNotes");
  if (event.notes) {
    notesEl.textContent = event.notes;
    notesCont.style.display = "block";
  } else {
    notesCont.style.display = "none";
  }

  // Display overlay
  document.getElementById("eventModal").classList.add("active");
}

function closeModal() {
  document.getElementById("eventModal").classList.remove("active");
  activeModalEventId = null;
}

function triggerModalCancel() {
  if (activeModalEventId) {
    if (confirm("Are you sure you want to cancel this event? This will notify all attendees.")) {
      cancel_event(activeModalEventId, true);
      closeModal();
    }
  }
}

// ==========================================
// FLOATING CHAT DRAWER
// ==========================================
function toggleChatDrawer() {
  if (chatDrawerOpen) {
    closeChatDrawer();
  } else {
    openChatDrawer();
  }
}

function openChatDrawer() {
  chatDrawerOpen = true;
  const drawer = document.getElementById('chatDrawer');
  const overlay = document.getElementById('chatDrawerOverlay');
  const fab = document.getElementById('chatFab');
  
  drawer.classList.add('open');
  overlay.classList.add('active');
  fab.classList.add('hidden');
  
  // Highlight the sidebar button
  document.getElementById('sidebar-ai-assistant').classList.add('active');
  
  // Sync chat history from main to drawer
  syncChatToDrawer();
  
  // Focus input
  setTimeout(() => {
    const input = document.getElementById('drawerChatInput');
    if (input) input.focus();
  }, 350);
}
function closeChatDrawer() {
  chatDrawerOpen = false;
  const drawer = document.getElementById('chatDrawer');
  const overlay = document.getElementById('chatDrawerOverlay');
  const fab = document.getElementById('chatFab');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  if (fab) fab.classList.remove('hidden');
  const sidebarBtn = document.getElementById('sidebar-ai-assistant');
  if (sidebarBtn) sidebarBtn.classList.remove('active');
}

function syncChatToDrawer() {
  const mainHistory = document.getElementById('chatHistory');
  const drawerHistory = document.getElementById('drawerChatHistory');
  if (mainHistory && drawerHistory) {
    drawerHistory.innerHTML = mainHistory.innerHTML;
    drawerHistory.scrollTop = drawerHistory.scrollHeight;
  }
}

function setDrawerInput(text) {
  const input = document.getElementById('drawerChatInput');
  if (input) {
    input.value = text;
    input.focus();
  }
}

function handleDrawerKeyPress(e) {
  if (e.key === 'Enter') {
    submitDrawerMessage();
  }
}

function submitDrawerMessage() {
  submitMessage(true);
}

let drawerLogsExpanded = false;
function toggleDrawerLogs() {
  const panel = document.getElementById("drawerSystemLogs");
  const arrow = document.getElementById("drawerLogsArrow");
  if (drawerLogsExpanded) {
    panel.style.maxHeight = "40px";
    arrow.textContent = "▼";
    drawerLogsExpanded = false;
  } else {
    panel.style.maxHeight = "160px";
    arrow.textContent = "▲";
    drawerLogsExpanded = true;
  }
}

function prevMonth() {
  logTool("navigate_calendar", { month: "April 2026" }, "SUCCESS: Displaying mock previous month slots");
  alert("Calendar navigation is simulated for May 2026 (Tour/Onboarding consistency).");
}

function nextMonth() {
  logTool("navigate_calendar", { month: "June 2026" }, "SUCCESS: Displaying mock next month slots");
  alert("Calendar navigation is simulated for May 2026 (Tour/Onboarding consistency).");
}


