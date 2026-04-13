/**
 * Campus Event Manager - SPA Application State & Logic
 * Handles authentication, dashboard rendering, and navigation
 */

// API Configuration - Change based on environment
const API_BASE_URL = (() => {
    // Local development - Cloudflare Workers local dev server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8787'; // Cloudflare Workers dev server
    }
    // Production - Cloudflare Workers deployed endpoint
    return 'https://campus-event-manager-worker.memelord801.workers.dev';
})();

const AppState = {
    currentUser: null,
    currentAuthTab: 'login',
    currentDashTab: 'browse',

    // Initialize app on page load
    init() {
        this.currentUser = CampusData.getCurrentUser();
        this.initDarkMode();
        this.setupEventListeners();
        this.renderUI();
        
        if (this.currentUser) {
            this.showDashboard();
            this.renderDashboard();
        } else {
            this.showLanding();
        }
    },
    renderMyEvents() {
    const container = document.getElementById('dashMyEventsContainer');

    if (!this.currentUser || this.currentUser.role !== 'organizer') {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><p>Only organizers can view created events.</p></div>';
        return;
    }

    const events = CampusData.getEventsByOrganizer(this.currentUser.id);

    if (!events.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-plus"></i><p>You have not created any events yet.</p></div>';
        return;
    }

    container.innerHTML = events.map(ev => `
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.75rem;gap:1rem">
                <div style="flex:1">
                    <h4 style="margin:0 0 0.5rem 0">${ev.title}</h4>
                    <div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:0.9rem;color:#6B7280">
                        <span><i class="far fa-calendar"></i> ${CampusData.formatDate(ev.date)}</span>
                        <span><i class="far fa-clock"></i> ${CampusData.formatTime(ev.time)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${ev.location}</span>
                    </div>
                </div>
                <span class="tag" style="
                    background:${ev.status === 'approved' ? '#D1FAE5' : ev.status === 'pending' ? '#FEF3C7' : '#FEE2E2'};
                    color:${ev.status === 'approved' ? '#065F46' : ev.status === 'pending' ? '#92400E' : '#991B1B'};
                    font-weight:600;
                ">
                    ${ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
                </span>
            </div>

            <p style="margin:0.75rem 0;color:#4B5563">${ev.description}</p>

            <div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:0.9rem;color:#6B7280;margin-bottom:0.75rem">
                <span><i class="fas fa-users"></i> ${ev.attendeeCount || 0} attending</span>
                <span><i class="fas fa-folder"></i> ${ev.category}</span>
            </div>

            <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                ${(ev.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');
},

    // Setup all event listeners
    setupEventListeners() {
        // Auth modal & form
        document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        document.getElementById('regConfirm')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister();
        });

        // Event form (organizer)
        document.getElementById('eventForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEventCreate();
        });

        // Dashboard interactions
        document.getElementById('dashSearchInput')?.addEventListener('input', () => this.renderBrowseEvents());
        document.getElementById('notifToggleDash')?.addEventListener('click', () => this.switchDashTab('notifications', event));
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());

        // Landing page interactions
        document.getElementById('searchInput')?.addEventListener('input', () => this.renderLandingEvents());
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.renderLandingEvents());
        document.getElementById('dateFilter')?.addEventListener('change', () => this.renderLandingEvents());
    },

    // Render UI based on auth state
    renderUI() {
        const navActions = document.getElementById('navActions');
        if (this.currentUser) {
            navActions.innerHTML = `<button class="btn btn-primary" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>`;
            document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        } else {
            navActions.innerHTML = `
                <button class="btn btn-outline" onclick="AppState.openModal()">Login</button>
                <button class="btn btn-primary" onclick="AppState.openAuthTab('register')">Sign Up</button>`;
        }
    },

    // Modal management
    openModal() {
        document.getElementById('loginModal').classList.add('active');
    },
    closeModal() {
        document.getElementById('loginModal').classList.remove('active');
        this.clearAuthErrors();
    },
    switchAuthTab(tab) {
        this.currentAuthTab = tab;
        document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.modal-tab-panes').forEach(p => p.classList.remove('active'));
        
        if (tab === 'login') {
            document.querySelectorAll('.modal-tab')[0].classList.add('active');
            document.getElementById('loginPane').classList.add('active');
        } else {
            document.querySelectorAll('.modal-tab')[1].classList.add('active');
            document.getElementById('registerPane').classList.add('active');
        }
    },
    openAuthTab(tab) {
        this.openModal();
        this.switchAuthTab(tab);
    },
    clearAuthErrors() {
        document.getElementById('loginError').innerText = '';
        document.getElementById('registerError').innerText = '';
    },

    // Auth handlers
    handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');

        if (!username || !password) {
            this.showError(errorEl, 'Please enter username and password.');
            return;
        }

        // Login via backend API
        fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                this.showError(errorEl, data.error || 'Login failed');
                return;
            }

            // Store token and user info
            localStorage.setItem('cem_token', data.data.token);
            CampusData.setCurrentUser(data.data.user);

            // Update current user
            this.currentUser = data.data.user;
            
            // Clear form
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            
            this.closeModal();
            this.renderUI();
            this.showDashboard();
            this.renderDashboard();
        })
        .catch(err => {
            console.error('Login error:', err);
            this.showError(errorEl, 'An error occurred. Please try again.');
        });
    },

    handleRegister() {
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirm').value;
        const errorEl = document.getElementById('registerError');
        const role = document.querySelector('input[name="role"]:checked').value;

        if (!username || !email || !password || !confirm) {
            this.showError(errorEl, 'Please fill in all fields.');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showError(errorEl, 'Please enter a valid email address.');
            return;
        }

        if (password !== confirm) {
            this.showError(errorEl, 'Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            this.showError(errorEl, 'Password must be at least 8 characters.');
            return;
        }

        // Register via backend API
        fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                role
            })
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                this.showError(errorEl, data.error || 'Registration failed');
                return;
            }

            // Store token and user info
            localStorage.setItem('cem_token', data.data.token);
            CampusData.setCurrentUser(data.data.user);

            // Update current user
            this.currentUser = data.data.user;
            
            // Clear form
            document.getElementById('regUsername').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regConfirm').value = '';
            
            this.closeModal();
            this.renderUI();
            this.showDashboard();
            this.renderDashboard();
        })
        .catch(err => {
            console.error('Registration error:', err);
            this.showError(errorEl, 'An error occurred. Please try again.');
        });
    },
        
    handleViewEventClick(eventId) {
        if (!this.currentUser) {
            this.openModal();
            return;
        }

        this.showDashboard();
        this.switchDashTab('browse');

        document.getElementById('dashEventsContainer')?.scrollIntoView({ behavior: 'smooth' });
    },

    handleCreateEventClick() {
        if (!this.currentUser) {
            this.openAuthTab('register');
            return;
        }

        if (this.currentUser.role !== 'organizer') {
            alert("Only organizers can create events.");
            return;
        }

        this.showDashboard();
        this.switchDashTab('create');
    },
    handleLogout() {
        CampusData.logout();
        this.currentUser = null;
        this.renderUI();
        this.showLanding();
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('dateFilter').value = '';
        this.renderLandingEvents();
    },

    
    toggleDarkMode() {
        const bodyEl = document.body;
        const currentTheme = bodyEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        bodyEl.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateDarkModeIcon(newTheme);
    },

    updateDarkModeIcon(theme) {
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            toggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
    },

    initDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        this.updateDarkModeIcon(savedTheme);
    },

    // UI state transitions
    showLanding() {
        document.getElementById('dashboardContainer').classList.remove('active');
        document.querySelector('.hero').style.display = 'block';
        document.getElementById('events').style.display = 'block';
        document.querySelector('.featured-section').style.display = 'block';
        document.querySelector('.calendar-section').style.display = 'block';
        // Show featured events section (first .events-section)
        const eventsSections = document.querySelectorAll('.events-section');
        if (eventsSections.length > 0) eventsSections[0].style.display = 'block';
        document.getElementById('about').style.display = 'block';
        this.renderLandingEvents();
        this.renderFeaturedEvents();
        this.renderCalendarSnippet();
    },
    showDashboard() {
        document.querySelector('.hero').style.display = 'none';
        document.getElementById('events').style.display = 'none';
        document.querySelector('.featured-section').style.display = 'none';
        document.querySelector('.calendar-section').style.display = 'none';
        // Hide featured events section (first .events-section)
        const eventsSections = document.querySelectorAll('.events-section');
        if (eventsSections.length > 0) eventsSections[0].style.display = 'none';
        document.getElementById('about').style.display = 'none';
        document.getElementById('dashboardContainer').classList.add('active');
        this.updateDashboardReadonly();
    },
    goHome(e) {
        if (this.currentUser) {
            e.preventDefault();
            this.showLanding();
        }
    },

    // Dashboard role-based UI
    updateDashboardReadonly() {
        const createTab = document.getElementById('createTab');
        const myEventsTab = document.getElementById('myEventsTab');
        const pendingTab = document.getElementById('pendingTab');
        const usersTab = document.getElementById('usersTab');

        // reset everything first
        if (createTab) createTab.style.display = 'none';
        if (myEventsTab) myEventsTab.style.display = 'none';
        if (pendingTab) pendingTab.style.display = 'none';
        if (usersTab) usersTab.style.display = 'none';

        if (this.currentUser?.role === 'organizer') {
            if (createTab) createTab.style.display = 'inline-block';
            if (myEventsTab) myEventsTab.style.display = 'inline-block';
        } else if (this.currentUser?.role === 'admin') {
            if (pendingTab) pendingTab.style.display = 'inline-block';
            if (usersTab) usersTab.style.display = 'inline-block';
        }

        document.getElementById('userWelcome').textContent = this.currentUser.username;
    },

    // Dashboard tab switching
    switchDashTab(tab, e) {
        if (e) e.preventDefault();
        this.currentDashTab = tab;
        
        // Remove active state from all tabs and panels
        document.querySelectorAll('.dashboard-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));
        
        // Find and activate the matching button by text content
            const tabMap = {
            'browse': 'Browse Events',
            'my-rsvps': 'My RSVPs',
            'create': 'Create Event',
            'my-events': 'My Events',
            'pending': 'Pending',
            'users': 'Manage Users',
            'notifications': 'Notifications'
        };
        
        const displayName = tabMap[tab] || tab;
        for (let btn of document.querySelectorAll('.dashboard-tab')) {
            if (btn.textContent.includes(displayName)) {
                btn.classList.add('active');
                break;
            }
        }
        
        // Show the panel
        document.getElementById(tab + 'Panel')?.classList.add('active');

        // Render content based on tab
        if (tab === 'browse') this.renderBrowseEvents();
        if (tab === 'my-rsvps') this.renderMyRSVPs();
        if (tab === 'notifications') this.renderNotifications();
        if (tab === 'pending') this.renderPendingEvents();
        if (tab === 'users') this.renderUsersTable();
        if (tab === 'my-events') this.renderMyEvents();
    },

    // Event rendering - Landing page
    renderLandingEvents() {
        const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const date = document.getElementById('dateFilter')?.value || '';

        let events = CampusData.getApprovedEvents();

        if (query) events = events.filter(e =>
            e.title.toLowerCase().includes(query) || e.description.toLowerCase().includes(query) || e.location.toLowerCase().includes(query)
        );
        if (category) events = events.filter(e => e.category === category);
        if (date === 'today') events = events.filter(e => this.isToday(e.date));
        if (date === 'this-week') events = events.filter(e => this.isThisWeek(e.date));
        if (date === 'this-month') events = events.filter(e => this.isThisMonth(e.date));

        const grid = document.getElementById('eventsGrid');
        const noMsg = document.getElementById('noEventsMsg');

        if (events.length === 0) {
            grid.innerHTML = '';
            noMsg.style.display = 'block';
            return;
        }
        noMsg.style.display = 'none';

        grid.innerHTML = events.map(ev => `
            <article class="event-card">
                <div class="event-image">
                    <img src="https://placehold.co/400x250?text=${encodeURIComponent(ev.category)}" alt="${ev.title}">
                    <span class="event-badge badge-success">Approved</span>
                </div>
                <div class="event-content">
                    <div class="event-meta">
                        <span class="event-date"><i class="far fa-calendar"></i> ${CampusData.formatDate(ev.date)}</span>
                        <span class="event-time"><i class="far fa-clock"></i> ${CampusData.formatTime(ev.time)}</span>
                    </div>
                    <h3 class="event-title">${ev.title}</h3>
                    <p class="event-description">${ev.description}</p>
                    <div class="event-footer">
                        <div class="event-location"><i class="fas fa-map-marker-alt"></i><span>${ev.location}</span></div>
                        <div class="event-attendees"><i class="fas fa-users"></i><span>${ev.attendeeCount} attending</span></div>
                    </div>
                    <div class="event-tags">${(ev.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                    <button class="btn btn-primary btn-block" onclick="AppState.handleViewEventClick('${ev.id}')" style="width:100%;padding:0.75rem;margin-top:0.75rem">View Details</button>
                </div>
            </article>`).join('');
    },

    // Featured/Trending Events
    renderFeaturedEvents() {
        let events = CampusData.getApprovedEvents();
        // Sort by attendee count and get top 6
        const featured = events.sort((a, b) => b.attendeeCount - a.attendeeCount).slice(0, 6);

        const container = document.getElementById('featuredEvents');
        if (featured.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#6B7280">No events available yet.</p>';
            return;
        }

        container.innerHTML = featured.map(ev => {
            return `
                <div class="featured-card">
                    <div class="featured-content">
                        <span class="featured-badge">${ev.category.charAt(0).toUpperCase() + ev.category.slice(1)}</span>
                        <h3 class="featured-title">${ev.title}</h3>
                        <div class="featured-meta">
                            <span><i class="far fa-calendar"></i> ${CampusData.formatDate(ev.date)}</span>
                            <span><i class="far fa-clock"></i> ${CampusData.formatTime(ev.time)}</span>
                        </div>
                        <p class="featured-desc">${ev.description.substring(0, 80)}...</p>
                        <div class="featured-attendees">
                            <i class="fas fa-users"></i>
                            <span>${ev.attendeeCount} attending</span>
                        </div>
                    </div>
                </div>`;
        }).join('');
    },

    // Calendar Snippet & Timeline
    renderCalendarSnippet() {
        const events = CampusData.getApprovedEvents();
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // Get days in current month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Render mini calendar
        const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
        let calendarHTML = `<h4 style="margin:0 0 1rem 0;color:#1F2937;text-align:center">${monthName} ${year}</h4>`;
        calendarHTML += '<div class="calendar-grid">';

        // Day headers
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            calendarHTML += `<div class="calendar-day-header">${day}</div>`;
        });

        // Empty cells before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-day" style="color:#D1D5DB">-</div>';
        }

        // Days of month with click handlers
        const eventDays = new Map();
        events.forEach(ev => {
            const evDate = new Date(ev.date + 'T00:00:00');
            if (evDate.getMonth() === month && evDate.getFullYear() === year) {
                const day = evDate.getDate();
                if (!eventDays.has(day)) eventDays.set(day, []);
                eventDays.get(day).push(ev);
            }
        });

        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === now.getDate() && month === now.getMonth();
            const hasEvents = eventDays.has(day);
            const classes = `calendar-day ${hasEvents ? 'has-events' : ''} ${isToday ? 'today' : ''}`;
            const style = hasEvents ? 'style="cursor:pointer"' : '';
            calendarHTML += `<div class="${classes}" data-day="${day}" ${style}>${day}</div>`;
        }

        calendarHTML += '</div>';
        document.getElementById('calendarMini').innerHTML = calendarHTML;

        // Add click handlers to calendar days
        document.querySelectorAll('.calendar-day[data-day]').forEach(dayEl => {
            if (eventDays.has(parseInt(dayEl.dataset.day))) {
                dayEl.addEventListener('click', (e) => {
                    const selectedDay = parseInt(e.target.dataset.day);
                    this.showCalendarDateEvents(selectedDay, month, year, eventDays.get(selectedDay));
                });
                dayEl.addEventListener('mouseenter', () => dayEl.style.transform = 'scale(1.1)');
                dayEl.addEventListener('mouseleave', () => dayEl.style.transform = 'scale(1)');
            }
        });

        // Render timeline of upcoming events this month
        const thisMonthEvents = events
            .filter(e => {
                const evDate = new Date(e.date + 'T00:00:00');
                return evDate.getMonth() === month && evDate.getFullYear() === year && new Date(e.date + 'T00:00:00') >= now;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const timelineContainer = document.getElementById('timelineEvents');
        if (thisMonthEvents.length === 0) {
            timelineContainer.innerHTML = '<p style="color:#6B7280;text-align:center;font-size:0.9rem">No upcoming events this month. Click on dates with events in the calendar to see details.</p>';
            return;
        }

        timelineContainer.innerHTML = '<p style="color:#6B7280;font-size:0.85rem;margin:0 0 1rem 0"><strong>Tip:</strong> Click on highlighted dates to see events for that day</p>' + thisMonthEvents.slice(0, 5).map(ev => {
            return `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-event">
                        <div class="timeline-date">${CampusData.formatDate(ev.date)}</div>
                        <div class="timeline-title">${ev.title}</div>
                        <div class="timeline-time"><i class="far fa-clock"></i> ${CampusData.formatTime(ev.time)} • ${ev.location}</div>
                        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap">
                            ${(ev.tags || []).slice(0, 2).map(t => `<span class="tag" style="font-size:0.75rem">${t}</span>`).join('')}
                        </div>
                    </div>
                </div>`;
        }).join('');
    },

    showCalendarDateEvents(day, month, year, dayEvents) {
        const dateStr = new Date(year, month, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timelineContainer = document.getElementById('timelineEvents');

        timelineContainer.innerHTML = `<div style="margin-bottom:1rem">
            <h4 style="margin:0 0 0.5rem 0;color:#4F46E5">${dateStr}</h4>
            <button onclick="location.reload()" style="padding:0.4rem 0.8rem;font-size:0.85rem;border:none;background:#E5E7EB;color:#1F2937;border-radius:0.375rem;cursor:pointer;transition:all 0.2s">← Back to Timeline</button>
        </div>` + dayEvents.map(ev => {
            return `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-event">
                        <div class="timeline-date">${ev.title}</div>
                        <div class="timeline-time"><i class="far fa-clock"></i> ${CampusData.formatTime(ev.time)} • ${ev.location}</div>
                        <div style="color:#6B7280;font-size:0.9rem;margin-top:0.5rem">${ev.description}</div>
                        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap">
                            ${(ev.tags || []).map(t => `<span class="tag" style="font-size:0.75rem">${t}</span>`).join('')}
                        </div>
                        <div style="color:#10B981;font-weight:500;margin-top:0.5rem"><i class="fas fa-users"></i> ${ev.attendeeCount} attending</div>
                    </div>
                </div>`;
        }).join('');
    },

    // Event rendering - Dashboard
    renderBrowseEvents() {
        const query = document.getElementById('dashSearchInput')?.value.toLowerCase() || '';
        let events = CampusData.getApprovedEvents();

        if (query) events = events.filter(e =>
            e.title.toLowerCase().includes(query) || e.description.toLowerCase().includes(query) || e.location.toLowerCase().includes(query)
        );

        const container = document.getElementById('dashEventsContainer');
        if (events.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No events found.</p></div>';
            return;
        }

        container.innerHTML = events.map(ev => {
            const rsvped = CampusData.isRSVPed(this.currentUser.id, ev.id);
            return `
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.75rem">
                        <h4 style="margin:0;flex:1">${ev.title}</h4>
                        <button class="btn ${rsvped ? 'btn-primary' : 'btn-outline'}" onclick="AppState.toggleRSVP('${ev.id}')" style="padding:0.5rem 1rem;font-size:0.9rem">
                            ${rsvped ? '✓ Attending' : 'RSVP'}
                        </button>
                    </div>
                    <div style="display:flex;gap:1rem;font-size:0.9rem;color:#6B7280;margin-bottom:0.75rem">
                        <span><i class="far fa-calendar"></i> ${CampusData.formatDate(ev.date)}</span>
                        <span><i class="far fa-clock"></i> ${CampusData.formatTime(ev.time)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${ev.location}</span>
                        <span><i class="fas fa-users"></i> ${ev.attendeeCount}</span>
                    </div>
                    <p style="margin:0.75rem 0;color:#4B5563">${ev.description}</p>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap">${(ev.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                </div>`;
        }).join('');
    },

    renderMyRSVPs() {
        const rsvps = CampusData.getRSVPsByUser(this.currentUser.id);
        const container = document.getElementById('dashRsvpsContainer');

        if (rsvps.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>You haven\'t RSVP\'d to any events yet.</p></div>';
            return;
        }

        container.innerHTML = rsvps.map(rsvp => {
            const event = CampusData.getEventById(rsvp.eventId);
            return !event ? '' : `
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:start">
                        <div style="flex:1">
                            <h4 style="margin:0 0 0.5rem 0">${event.title}</h4>
                            <div style="font-size:0.9rem;color:#6B7280;display:flex;gap:1rem">
                                <span><i class="far fa-calendar"></i> ${CampusData.formatDate(event.date)}</span>
                                <span><i class="far fa-clock"></i> ${CampusData.formatTime(event.time)}</span>
                            </div>
                        </div>
                        <button class="btn btn-danger" onclick="AppState.toggleRSVP('${event.id}')" style="padding:0.5rem 1rem;background:#EF4444;color:white;border:none;border-radius:6px;cursor:pointer">Remove</button>
                    </div>
                </div>`;
        }).join('');
    },

    renderNotifications() {
        const notifs = CampusData.getNotificationsForUser(this.currentUser.id);
        const container = document.getElementById('dashNotificationsContainer');

        if (notifs.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications yet.</p></div>';
            return;
        }

        container.innerHTML = notifs.map(n => `
            <div class="card" style="border-left:4px solid ${n.read ? '#E5E7EB' : '#4F46E5'};opacity:${n.read ? 0.7 : 1}">
                <div style="display:flex;justify-content:space-between;align-items:start">
                    <p style="margin:0;color:#1F2937">${n.message}</p>
                    ${!n.read ? `<button style="background:none;border:none;cursor:pointer;color:#4F46E5;font-weight:600;font-size:0.9rem" onclick="AppState.markNotifRead('${n.id}')">Mark Read</button>` : ''}
                </div>
                <p style="margin:0.5rem 0 0 0;font-size:0.85rem;color:#9CA3AF">${new Date(n.timestamp).toLocaleDateString()}</p>
            </div>`).join('');

        this.updateNotifBadge();
    },

    renderPendingEvents() {
        const events = CampusData.getPendingEvents();
        const container = document.getElementById('dashPendingContainer');

        if (events.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No pending events.</p></div>';
            return;
        }

        container.innerHTML = events.map(ev => `
            <div class="card">
                <div style="margin-bottom:0.75rem">
                    <h4 style="margin:0 0 0.25rem 0">${ev.title}</h4>
                    <p style="margin:0;font-size:0.9rem;color:#6B7280">By ${ev.organizerName}</p>
                </div>
                <p style="margin:0.75rem 0;color:#4B5563">${ev.description}</p>
                <div style="display:flex;gap:0.5rem;margin-top:1rem">
                    <button class="btn" onclick="AppState.approveEvent('${ev.id}')" style="flex:1;background:#10B981;color:white;padding:0.5rem;border:none;border-radius:6px;cursor:pointer">Approve</button>
                    <button class="btn" onclick="AppState.rejectEvent('${ev.id}')" style="flex:1;background:#EF4444;color:white;padding:0.5rem;border:none;border-radius:6px;cursor:pointer">Reject</button>
                </div>
            </div>`).join('');
    },

    renderUsersTable() {
        const users = CampusData.getUsers();
        const tbody = document.getElementById('dashUsersTable');

        tbody.innerHTML = users.map(u => `
            <tr style="border-bottom:1px solid #E5E7EB">
                <td style="padding:0.75rem">${u.username}</td>
                <td style="padding:0.75rem"><span style="background:#E5E7EB;padding:0.25rem 0.75rem;border-radius:4px;font-size:0.85rem">${u.role}</span></td>
                <td style="padding:0.75rem;font-size:0.9rem;color:#6B7280">${CampusData.formatDate(u.createdAt)}</td>
                <td style="padding:0.75rem"><button class="btn" onclick="AppState.deleteUser('${u.id}')" style="background:#EF4444;color:white;padding:0.4rem 0.8rem;border:none;border-radius:4px;cursor:pointer;font-size:0.9rem" ${u.id === this.currentUser.id ? 'disabled' : ''}>Delete</button></td>
            </tr>`).join('');
    },

    // Event handlers
    handleEventCreate() {
        const title = document.getElementById('evTitle').value.trim();
        const description = document.getElementById('evDescription').value.trim();
        const date = document.getElementById('evDate').value;
        const time = document.getElementById('evTime').value;
        const location = document.getElementById('evLocation').value.trim();
        const category = document.getElementById('evCategory').value;
        const tags = document.getElementById('evTags').value.split(',').map(t => t.trim()).filter(t => t);
        const errorEl = document.getElementById('createError');
        alert('Event submitted for approval! Admins will review it shortly.');
        this.switchDashTab('my-events');

        if (!title || !description || !date || !time || !location || !category) {
            this.showError(errorEl, 'Please fill in all required fields.');
            return;
        }

        const event = CampusData.addEvent({
            title, description, date, time, location, category, tags,
            organizerId: this.currentUser.id,
            organizerName: this.currentUser.username
        });

        // Clear form
        document.getElementById('eventForm').reset();
        errorEl.style.display = 'none';
        errorEl.innerText = '';

        // Notify admin
        alert('Event submitted for approval! Admins will review it shortly.');
    },

    toggleRSVP(eventId) {
        const isRsvped = CampusData.isRSVPed(this.currentUser.id, eventId);
        if (isRsvped) {
            CampusData.removeRSVP(this.currentUser.id, eventId);
        } else {
            CampusData.addRSVP(this.currentUser.id, eventId);
        }
        this.renderBrowseEvents();
        this.renderMyRSVPs();
    },

    approveEvent(eventId) {
        CampusData.approveEvent(eventId);
        this.renderPendingEvents();
    },

    rejectEvent(eventId) {
        CampusData.rejectEvent(eventId);
        this.renderPendingEvents();
    },

    deleteUser(userId) {
        if (confirm('Are you sure? This cannot be undone.')) {
            CampusData.deleteUser(userId);
            this.renderUsersTable();
        }
    },

    markNotifRead(notifId) {
        CampusData.markNotificationRead(notifId);
        this.renderNotifications();
    },

    markAllRead() {
        CampusData.markAllRead(this.currentUser.id);
        this.renderNotifications();
    },

    updateNotifBadge() {
        const count = CampusData.getUnreadCount(this.currentUser.id);
        const badge = document.getElementById('notifBadgeDash');
        if (count > 0) {
            badge.innerText = count > 99 ? '99+' : count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    },

    // Render dashboard on first load
    renderDashboard() {
        this.renderBrowseEvents();
        this.updateNotifBadge();
    },

    // Helper functions
    isToday(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(dateStr + 'T00:00:00');
        return d.getTime() === today.getTime();
    },
    isThisWeek(dateStr) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const d = new Date(dateStr + 'T00:00:00');
        const diff = (d - now) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff < 7;
    },
    isThisMonth(dateStr) {
        const now = new Date();
        const d = new Date(dateStr + 'T00:00:00');
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    },
    showError(element, message) {
        element.innerText = message;
        element.style.display = 'block';
    }
};
    document.getElementById('dashboardLink').addEventListener('click', function (e) {
    e.preventDefault();

    const user = CampusData.getCurrentUser();

    if (!user) {
        AppState.openModal(); // open login
        return;
    }

    AppState.showDashboard();
    AppState.renderDashboard();
});
