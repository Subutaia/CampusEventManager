// Campus Event Management System – Data Layer
// All persistence via localStorage; session state via sessionStorage.

const CampusData = {

    // Seed default accounts and sample events on first load
    init() {
        if (localStorage.getItem('cem_initialized')) return;

        const now = new Date().toISOString();
        const users = [
            { id: 'u_admin',  username: 'admin',     password: 'admin123', role: 'admin',     createdAt: now },
            { id: 'u_org1',   username: 'organizer', password: 'org123',   role: 'organizer', createdAt: now },
            { id: 'u_std1',   username: 'student',   password: 'std123',   role: 'student',   createdAt: now }
        ];
        this.saveUsers(users);

        const events = [
            // Technology (3)
            {
                id: 'ev_1', title: 'Tech Innovation Summit',
                description: 'Join us for an inspiring day of technology talks and networking opportunities with industry leaders.',
                date: '2026-04-05', time: '14:00', location: 'Student Center, Room 301',
                category: 'technology', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 87, tags: ['AI', 'Networking', 'Tech'], createdAt: now
            },
            {
                id: 'ev_2', title: 'Web Development Workshop',
                description: 'Learn React, Node.js, and modern web development practices from seasoned developers.',
                date: '2026-04-02', time: '10:00', location: 'Tech Lab, Building B',
                category: 'technology', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 62, tags: ['Web Dev', 'Workshop'], createdAt: now
            },
            {
                id: 'ev_6', title: 'Hackathon 2026',
                description: '24-hour coding challenge with prizes, mentorship, and potential job offers from tech companies.',
                date: '2026-04-20', time: '09:00', location: 'Engineering Building',
                category: 'technology', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 156, tags: ['Coding', 'Hackathon', 'Prizes'], createdAt: now
            },

            // Cultural (2)
            {
                id: 'ev_7', title: 'Cultural Night Festival',
                description: 'Celebrate diversity with food, music, and performances from around the world.',
                date: '2026-03-31', time: '18:00', location: 'Main Auditorium',
                category: 'cultural', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 234, tags: ['Diversity', 'Entertainment', 'Music'], createdAt: now
            },
            {
                id: 'ev_11', title: 'International Food Tasting',
                description: 'Sample cuisines from 15+ countries. Hosted by international student organizations.',
                date: '2026-04-25', time: '17:00', location: 'Student Dining Hall',
                category: 'cultural', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 312, tags: ['Food', 'International'], createdAt: now
            },

            // Career (2)
            {
                id: 'ev_3', title: 'Career Fair 2026',
                description: 'Meet with top employers and explore internship and career opportunities.',
                date: '2026-04-01', time: '10:00', location: 'Recreation Center',
                category: 'career', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 289, tags: ['Career', 'Jobs', 'Internships'], createdAt: now
            },
            {
                id: 'ev_12', title: 'Resume & LinkedIn Workshop',
                description: 'Professional tips on crafting resumes and optimizing your LinkedIn profile for employers.',
                date: '2026-04-04', time: '14:00', location: 'Career Center',
                category: 'career', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 94, tags: ['Resume', 'LinkedIn'], createdAt: now
            },

            // Sports (2)
            {
                id: 'ev_16', title: 'Campus 5K Run',
                description: 'Join the community for a fun 5K run around campus. All fitness levels welcome!',
                date: '2026-04-09', time: '07:00', location: 'Main Campus Lawn',
                category: 'sports', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 267, tags: ['Running', 'Fitness'], createdAt: now
            },
            {
                id: 'ev_17', title: 'Volleyball League Championships',
                description: 'Finals of the intramural volleyball league with team matches and awards.',
                date: '2026-04-16', time: '18:30', location: 'Gymnasium',
                category: 'sports', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 189, tags: ['Volleyball', 'Sports'], createdAt: now
            },

            // Other (1)
            {
                id: 'ev_21', title: 'Volunteer Service Day',
                description: 'Join your community in environmental cleanup and service projects around campus.',
                date: '2026-04-21', time: '09:00', location: 'Campus Grounds',
                category: 'other', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 178, tags: ['Volunteering', 'Community'], createdAt: now
            }
        ];
        this.saveEvents(events);
        this.saveRSVPs([]);
        this.saveNotifications([]);
        localStorage.setItem('cem_initialized', 'true');
    },

    // ── Users ────────────────────────────────────────────────────────────────
    getUsers()             { return JSON.parse(localStorage.getItem('cem_users') || '[]'); },
    saveUsers(users)       { localStorage.setItem('cem_users', JSON.stringify(users)); },
    getUserById(id)        { return this.getUsers().find(u => u.id === id) || null; },
    getUserByUsername(name){ return this.getUsers().find(u => u.username.toLowerCase() === name.toLowerCase()) || null; },

    addUser(data) {
        const users = this.getUsers();
        const user = { ...data, id: 'u_' + Date.now(), createdAt: new Date().toISOString() };
        users.push(user);
        this.saveUsers(users);
        return user;
    },

    deleteUser(id) {
        this.saveUsers(this.getUsers().filter(u => u.id !== id));
    },

    // ── Events ───────────────────────────────────────────────────────────────
    getEvents()                  { return JSON.parse(localStorage.getItem('cem_events') || '[]'); },
    saveEvents(events)           { localStorage.setItem('cem_events', JSON.stringify(events)); },
    getEventById(id)             { return this.getEvents().find(e => e.id === id) || null; },
    getApprovedEvents()          { return this.getEvents().filter(e => e.status === 'approved'); },
    getPendingEvents()           { return this.getEvents().filter(e => e.status === 'pending'); },
    getEventsByOrganizer(orgId)  { return this.getEvents().filter(e => e.organizerId === orgId); },

    addEvent(data) {
        const events = this.getEvents();
        const event = { ...data, id: 'ev_' + Date.now(), status: 'pending', attendeeCount: 0, createdAt: new Date().toISOString() };
        events.push(event);
        this.saveEvents(events);
        // Notify all admins
        this.getUsers().filter(u => u.role === 'admin').forEach(admin =>
            this.addNotification(admin.id, `New event "${event.title}" submitted by ${event.organizerName} awaiting approval.`)
        );
        return event;
    },

    updateEvent(id, updates) {
        const events = this.getEvents();
        const idx = events.findIndex(e => e.id === id);
        if (idx === -1) return null;
        events[idx] = { ...events[idx], ...updates };
        this.saveEvents(events);
        return events[idx];
    },

    deleteEvent(id) {
        const event = this.getEventById(id);
        this.saveEvents(this.getEvents().filter(e => e.id !== id));
        this.saveRSVPs(this.getRSVPs().filter(r => r.eventId !== id));
        return event;
    },

    approveEvent(id) {
        const event = this.updateEvent(id, { status: 'approved' });
        if (event) this.addNotification(event.organizerId, `Your event "${event.title}" has been approved!`);
        return event;
    },

    rejectEvent(id) {
        const event = this.updateEvent(id, { status: 'rejected' });
        if (event) this.addNotification(event.organizerId, `Your event "${event.title}" was not approved.`);
        return event;
    },

    // ── RSVPs ────────────────────────────────────────────────────────────────
    getRSVPs()                        { return JSON.parse(localStorage.getItem('cem_rsvps') || '[]'); },
    saveRSVPs(rsvps)                  { localStorage.setItem('cem_rsvps', JSON.stringify(rsvps)); },
    isRSVPed(userId, eventId)         { return this.getRSVPs().some(r => r.userId === userId && r.eventId === eventId); },
    getRSVPsByUser(userId)            { return this.getRSVPs().filter(r => r.userId === userId); },
    getRSVPsByEvent(eventId)          { return this.getRSVPs().filter(r => r.eventId === eventId); },

    addRSVP(userId, eventId) {
        if (this.isRSVPed(userId, eventId)) return false;
        const rsvps = this.getRSVPs();
        rsvps.push({ userId, eventId, timestamp: new Date().toISOString() });
        this.saveRSVPs(rsvps);
        const event = this.getEventById(eventId);
        if (event) {
            this.updateEvent(eventId, { attendeeCount: (event.attendeeCount || 0) + 1 });
            this.addNotification(event.organizerId, `A student RSVP'd to your event "${event.title}".`);
        }
        return true;
    },

    removeRSVP(userId, eventId) {
        if (!this.isRSVPed(userId, eventId)) return false;
        this.saveRSVPs(this.getRSVPs().filter(r => !(r.userId === userId && r.eventId === eventId)));
        const event = this.getEventById(eventId);
        if (event) this.updateEvent(eventId, { attendeeCount: Math.max(0, (event.attendeeCount || 0) - 1) });
        return true;
    },

    // ── Notifications ────────────────────────────────────────────────────────
    getNotifications()        { return JSON.parse(localStorage.getItem('cem_notifications') || '[]'); },
    saveNotifications(notifs) { localStorage.setItem('cem_notifications', JSON.stringify(notifs)); },

    getNotificationsForUser(userId) {
        return this.getNotifications()
            .filter(n => n.userId === userId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    _notifCounter: 0,

    addNotification(userId, message) {
        const notifs = this.getNotifications();
        this._notifCounter += 1;
        notifs.push({
            id: 'n_' + Date.now() + '_' + this._notifCounter,
            userId, message, read: false, timestamp: new Date().toISOString()
        });
        this.saveNotifications(notifs);
    },

    markNotificationRead(notifId) {
        this.saveNotifications(this.getNotifications().map(n => n.id === notifId ? { ...n, read: true } : n));
    },

    markAllRead(userId) {
        this.saveNotifications(this.getNotifications().map(n => n.userId === userId ? { ...n, read: true } : n));
    },

    getUnreadCount(userId) {
        return this.getNotificationsForUser(userId).filter(n => !n.read).length;
    },

    // ── Shared Utilities ─────────────────────────────────────────────────────
    formatDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr + 'T00:00:00').toLocaleDateString(navigator.language || 'en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    },

    formatTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hr = parseInt(h);
        return (hr % 12 || 12) + ':' + m + ' ' + (hr >= 12 ? 'PM' : 'AM');
    },

        // ── Session / Auth Persistence ──────────────────────────────────────────────
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('cem_user') || 'null');
    },

    setCurrentUser(user) {
        localStorage.setItem('cem_user', JSON.stringify(user));
    },

    logout() {
        localStorage.removeItem('cem_user');
        localStorage.removeItem('cem_token');
    }
};

CampusData.init();
