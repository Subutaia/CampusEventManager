import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { connectDB } from './utils/db.js';
import { initSendGrid } from './services/emailService.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import rsvpRoutes from './routes/rsvps.js';
import notificationRoutes from './routes/notifications.js';
import aiRoutes from './routes/ai.js';

const app = new Hono();

// Health check (before DB middleware)
app.get('/api/health', (c) => {
  return c.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: 'Cloudflare Workers'
  }, 200);
});

// Debug endpoint to check env vars
app.get('/api/debug/env', (c) => {
  return c.json({
    MONGODB_URI: c.env.MONGODB_URI ? '✓ Set' : '✗ Missing',
    JWT_SECRET: c.env.JWT_SECRET ? '✓ Set' : '✗ Missing',
    SENDGRID_API_KEY: c.env.SENDGRID_API_KEY ? '✓ Set' : '✗ Missing',
    DB_NAME: c.env.DB_NAME || 'Not set',
    NODE_ENV: c.env.NODE_ENV || 'Not set'
  }, 200);
});

// Debug endpoint to list all registered users
app.get('/api/debug/users', async (c) => {
  try {
    await connectDB(c.env.MONGODB_URI, c.env.DB_NAME);
    const db = (await import('./utils/db.js')).getDB();
    const usersCollection = db.collection('users');
    
    const users = await usersCollection.find({}).toArray();
    
    // Remove sensitive data (passwords)
    const publicUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    return c.json({
      totalUsers: publicUsers.length,
      users: publicUsers
    }, 200);
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    return c.json({
      error: 'Could not fetch users',
      details: error.message
    }, 500);
  }
});

// Debug endpoint to add users in bulk (for testing)
app.post('/api/debug/add-users', async (c) => {
  try {
    const { users: newUsers } = await c.req.json();
    
    if (!Array.isArray(newUsers) || newUsers.length === 0) {
      return c.json({
        error: 'Expected array of users with username, password, email, and role'
      }, 400);
    }

    await connectDB(c.env.MONGODB_URI, c.env.DB_NAME);
    const { default: bcrypt } = await import('bcryptjs');
    const db = (await import('./utils/db.js')).getDB();
    const usersCollection = db.collection('users');
    
    const results = [];
    
    for (const user of newUsers) {
      const { username, password, email, role = 'student' } = user;
      
      // Validation
      if (!username || !password) {
        results.push({
          username,
          success: false,
          error: 'Username and password are required'
        });
        continue;
      }

      // Check if user exists
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        results.push({
          username,
          success: false,
          error: 'Username already exists'
        });
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = {
        username,
        email: email || `${username}@test.com`,
        password: hashedPassword,
        role,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        const result = await usersCollection.insertOne(newUser);
        results.push({
          username,
          success: true,
          _id: result.insertedId
        });
      } catch (insertError) {
        results.push({
          username,
          success: false,
          error: insertError.message
        });
      }
    }

    return c.json({
      message: 'Bulk user creation completed',
      results
    }, 201);
  } catch (error) {
    console.error('❌ Error adding users:', error.message);
    return c.json({
      error: 'Could not add users',
      details: error.message
    }, 500);
  }
});

// Initialize CORS
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'https://*.pages.dev',
    'https://campuseventmanager.pages.dev'
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));

// Initialize database and SendGrid once at startup/lazily per request
app.use('/api/auth/*', async (c, next) => {
  try {
    c.set('mongoConnected', await connectDB(c.env.MONGODB_URI, c.env.DB_NAME));
    initSendGrid(c.env.SENDGRID_API_KEY);
  } catch (error) {
    console.error('❌ Auth DB init error:', error.message);
    return c.json({ error: 'Service unavailable', details: error.message }, 503);
  }
  await next();
});

app.use('/api/events/*', async (c, next) => {
  try {
    c.set('mongoConnected', await connectDB(c.env.MONGODB_URI, c.env.DB_NAME));
  } catch (error) {
    console.error('❌ Events DB init error:', error.message);
    return c.json({ error: 'Service unavailable', details: error.message }, 503);
  }
  await next();
});

app.use('/api/rsvps/*', async (c, next) => {
  try {
    c.set('mongoConnected', await connectDB(c.env.MONGODB_URI, c.env.DB_NAME));
  } catch (error) {
    console.error('❌ RSVPs DB init error:', error.message);
    return c.json({ error: 'Service unavailable', details: error.message }, 503);
  }
  await next();
});

app.use('/api/notifications/*', async (c, next) => {
  try {
    c.set('mongoConnected', await connectDB(c.env.MONGODB_URI, c.env.DB_NAME));
  } catch (error) {
    console.error('❌ Notifications DB init error:', error.message);
    return c.json({ error: 'Service unavailable', details: error.message }, 503);
  }
  await next();
});

// Debug endpoint to test SendGrid
app.get('/api/debug/sendgrid', (c) => {
  return c.json({
    sendgridApiKey: c.env.SENDGRID_API_KEY ? (c.env.SENDGRID_API_KEY.substring(0, 10) + '...') : 'NOT SET',
    senderEmail: 'noreply@campuseventmanager.com',
    status: c.env.SENDGRID_API_KEY && c.env.SENDGRID_API_KEY !== 'SG.YOUR_KEY_HERE' ? '✅ Configured' : '❌ Not configured'
  }, 200);
});

// Debug endpoint to test SendGrid API directly
app.post('/api/debug/test-sendgrid-raw', async (c) => {
  try {
    const { email } = await c.req.json();
    const apiKey = c.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      return c.json({
        error: 'SendGrid API key not set',
        status: 'error'
      }, 400);
    }

    console.log(`🧪 Testing SendGrid API directly for ${email}`);
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email }]
        }],
        from: {
          email: 'noreply@campuseventmanager.com',
          name: 'Campus Event Manager'
        },
        subject: 'Test Email from Raw API',
        content: [{
          type: 'text/html',
          value: '<h2>Test Email</h2><p>This was sent using the raw SendGrid API.</p>'
        }]
      })
    });

    const status = response.status;
    const responseText = await response.text();
    
    console.log(`SendGrid API Response - Status: ${status}`);
    console.log(`Response body: ${responseText}`);

    if (status === 202) {
      return c.json({
        success: true,
        message: 'Email sent successfully via SendGrid API',
        httpStatus: status,
        recipientEmail: email
      }, 200);
    } else {
      return c.json({
        success: false,
        message: 'SendGrid API returned non-202 status',
        httpStatus: status,
        responseBody: responseText,
        recipientEmail: email
      }, status);
    }
  } catch (error) {
    console.error('Raw SendGrid test error:', error);
    return c.json({
      success: false,
      error: error.message,
      errorType: error.constructor.name
    }, 500);
  }
});

// Routes
app.route('/api/ai', aiRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/events', eventRoutes);
app.route('/api/rsvps', rsvpRoutes);
app.route('/api/notifications', notificationRoutes);

// 404 handler
app.use('*', (c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handling
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.json({
    error: err.message || 'Internal server error',
    status: 500
  }, 500);
});
c.env.GEMINI_API_KEY
export default app;
