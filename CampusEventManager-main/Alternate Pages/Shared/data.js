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
            {
                id: 'ev_1', title: 'Tech Innovation Summit',
                description: 'Join us for an inspiring day of technology talks and networking opportunities.',
                date: '2026-03-25', time: '14:00', location: 'Student Center, Room 301',
                category: 'technology', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 45, tags: ['Technology', 'Networking'], createdAt: now
            },
            {
                id: 'ev_2', title: 'Cultural Night Festival',
                description: 'Celebrate diversity with food, music, and performances from around the world.',
                date: '2026-03-28', time: '18:00', location: 'Main Auditorium',
                category: 'cultural', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'pending', attendeeCount: 0, tags: ['Cultural', 'Entertainment'], createdAt: now
            },
            {
                id: 'ev_3', title: 'Career Fair 2026',
                description: 'Meet with top employers and explore internship and career opportunities.',
                date: '2026-04-01', time: '10:00', location: 'Recreation Center',
                category: 'career', organizerId: 'u_org1', organizerName: 'organizer',
                status: 'approved', attendeeCount: 200, tags: ['Career', 'Professional'], createdAt: now
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

    // ── Session ──────────────────────────────────────────────────────────────
    getCurrentUser()     { return JSON.parse(sessionStorage.getItem('cem_user') || 'null'); },
    setCurrentUser(user) { sessionStorage.setItem('cem_user', JSON.stringify(user)); },
    logout()             { sessionStorage.removeItem('cem_user'); }
};

CampusData.init();
