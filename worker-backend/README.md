# Campus Event Manager API - Cloudflare Workers Backend

Professional backend API for managing campus events, built with Cloudflare Workers, Express.js, and MongoDB Atlas.

## 🚀 Features

- **User Management**: Registration, authentication, role-based access control
- **Event Management**: Create, read, update, delete events with approval workflow
- **RSVP System**: Students can register for events with attendance tracking
- **Notifications**: Real-time notifications for events and RSVPs
- **Email Integration**: Gmail-based email notifications for registrations, approvals, and event updates
- **Admin Dashboard**: Manage pending events, user accounts, and system notifications
- **JWT Authentication**: Secure token-based authentication with role-based permissions

## 📋 Architecture

```
worker-backend/
├── src/
│   ├── models/           # Mongoose schemas
│   │   ├── User.js
│   │   ├── Event.js
│   │   ├── RSVP.js
│   │   └── Notification.js
│   ├── routes/           # API endpoints
│   │   ├── auth.js       # Authentication endpoints
│   │   ├── events.js     # Event CRUD operations
│   │   ├── rsvps.js      # RSVP management
│   │   └── notifications.js # Notification endpoints
│   ├── middleware/       # Custom middleware
│   │   ├── auth.js       # JWT verification & role checking
│   │   └── error.js      # Error handling & response formatting
│   ├── services/         # Business logic
│   │   └── emailService.js # Email templates & sending
│   ├── utils/            # Utilities
│   │   └── db.js         # Database connection
│   └── index.js          # Main Express application
├── package.json
├── wrangler.toml         # Cloudflare Workers configuration
├── .dev.vars             # Local environment variables
└── README.md
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- MongoDB Atlas account
- Gmail account with App Password

### 1. Install Dependencies

```bash
cd worker-backend
npm install
```

### 2. Configure Environment Variables

Create `.dev.vars` file in worker-backend directory:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=campus_events

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_characters

# Email (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
SENDER_EMAIL=your-email@gmail.com

# Environment
NODE_ENV=development
```

### 3. Start Development Server

```bash
npm run dev
```

Server will run at `http://localhost:8787`

## 📚 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token

### Events

- `GET /api/events` - Get all approved events (with filters)
- `GET /api/events/:id` - Get single event details
- `POST /api/events` - Create new event (requires: organizer/admin role)
- `PUT /api/events/:id` - Update event (requires: organizer/admin role)
- `DELETE /api/events/:id` - Delete event (requires: organizer/admin role)
- `PATCH /api/events/:id/approve` - Approve event (requires: admin role)
- `PATCH /api/events/:id/reject` - Reject event (requires: admin role)
- `GET /api/events/admin/pending` - Get pending events (requires: admin role)

### RSVPs

- `POST /api/rsvps` - RSVP to an event
- `DELETE /api/rsvps/:eventId` - Cancel RSVP
- `GET /api/rsvps/user/mine` - Get user's RSVPs
- `GET /api/rsvps/check/:eventId` - Check if user RSVP'd
- `GET /api/rsvps/event/:eventId` - Get event attendees

### Notifications

- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread/count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read/all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/test-email` - Test email setup
- `POST /api/notifications/send` - Send notification (requires: admin role)

## 🔐 Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

### User Roles

- **student** - Can view events and RSVP
- **organizer** - Can create and manage events
- **admin** - Can approve/reject events and manage system

## 📧 Email Configuration

### Gmail Setup

1. Enable 2-Factor Authentication on Gmail account
2. Generate App Password:
   - Go to Google Account settings
   - Security → App passwords
   - Select Mail and Windows Computer
   - Copy generated password
3. Add to `.env`:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=yourcodepassword
   ```

### Email Templates

- **Registration Confirmation** - Sent on user signup
- **Event Approval** - Sent when admin approves event
- **Event Rejection** - Sent when admin rejects event
- **RSVP Confirmation** - Sent when student RSVPs
- **New RSVP Notification** - Sent to organizer when student RSVPs
- **Event Reminder** - Sent 24 hours before event
- **Event Update** - Sent when event is modified

## 🚀 Deployment

### Deploy to Cloudflare Workers

```bash
npm run build
wrangler deploy
```

### Environment Variables on Production

Set environment variables in `wrangler.toml` or via Cloudflare dashboard:

```toml
[env.production]
vars = { NODE_ENV = "production" }

[[env.production.secrets]]
name = "MONGODB_URI"
path = ".env.prod"

[[env.production.secrets]]
name = "JWT_SECRET"
path = ".env.prod"

[[env.production.secrets]]
name = "GMAIL_USER"
path = ".env.prod"

[[env.production.secrets]]
name = "GMAIL_APP_PASSWORD"
path = ".env.prod"
```

## 🧪 Testing

### Test Email Setup

```bash
curl -X POST http://localhost:8787/api/notifications/test-email \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "test@example.com"}'
```

### Register User

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student1",
    "email": "student1@example.com",
    "password": "password123",
    "role": "student"
  }'
```

### Create Event

```bash
curl -X POST http://localhost:8787/api/events \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tech Workshop",
    "description": "Learn advanced web development techniques",
    "date": "2024-06-15T14:00:00Z",
    "time": "14:00",
    "location": "Tech Building, Room 201",
    "category": "technology",
    "tags": ["web", "development"]
  }'
```

## 🔄 MongoDB Indexes

The system creates the following indexes for efficient querying:

- **Events**: status + date, organizerId, category
- **RSVPs**: userId + eventId (unique)
- **Notifications**: userId + read, userId + timestamp

## 📝 Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Additional info"]
}
```

## 🤝 Contributing

When adding new features:

1. Create schemas in `/src/models`
2. Implement routes in `/src/routes`
3. Add middleware if needed in `/src/middleware`
4. Create services in `/src/services` if complex logic
5. Update this README

## 📄 License

MIT

## 🆘 Support

For issues and questions:
1. Check error logs in terminal
2. Verify environment variables are set
3. Ensure MongoDB connection is active
4. Test email configuration with test endpoint

## 🔄 Recent Updates

- ✅ Full Cloudflare Workers migration
- ✅ Gmail email integration
- ✅ JWT authentication with role-based access
- ✅ Comprehensive error handling
- ✅ MongoDB Atlas integration
- ✅ Email notification system
