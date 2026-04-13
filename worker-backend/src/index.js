import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { connectDB } from './utils/db.js';
import { initSendGrid } from './services/emailService.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import rsvpRoutes from './routes/rsvps.js';
import notificationRoutes from './routes/notifications.js';

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

// Routes
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

export default app;
