import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../middleware/error.js';
import { sendRegistrationEmail } from '../services/emailService.js';
import { getDB } from '../utils/db.js';

const app = new Hono();

/**
 * Register a new user
 * POST /api/auth/register
 */
app.post('/register', async (c) => {
  try {
    const { username, email, password, role = 'student' } = await c.req.json();

    console.log('📝 Registration attempt:', { username, email, role });

    // Validation
    if (!username || !email || !password) {
      return errorResponse(c, 'Username, email, and password are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(c, 'Invalid email format', 400);
    }

    if (password.length < 8) {
      return errorResponse(c, 'Password must be at least 8 characters', 400);
    }

    const db = getDB();
    const usersCollection = db.collection('users');

    // Check if user exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      console.log('❌ Username already exists:', username);
      return errorResponse(c, 'Username already exists', 400);
    }

    // Check if email already registered
    const existingEmail = await usersCollection.findOne({ email });
    if (existingEmail) {
      console.log('❌ Email already registered:', email);
      return errorResponse(c, 'Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      username,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(user);
    user._id = result.insertedId;

    console.log('✅ User registered:', username);

    // Send registration email (non-blocking)
    sendRegistrationEmail(user).catch(err => {
      console.error('Email send failed:', err.message);
    });

    // Generate token
    const token = generateToken({ _id: user._id, username: user.username, role: user.role }, c.env.JWT_SECRET);

    return successResponse(c, {
      user: { ...user, password: undefined },
      token
    }, 'User registered successfully', 201);
  } catch (error) {
    console.error('Registration error:', error.message);
    return errorResponse(c, error);
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
app.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();

    // Validation
    if (!username || !password) {
      return errorResponse(c, 'Username and password are required', 400);
    }

    const db = getDB();
    const usersCollection = db.collection('users');

    // Find user
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return errorResponse(c, 'Invalid username or password', 401);
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(c, 'Invalid username or password', 401);
    }

    // Generate token
    const token = generateToken({ _id: user._id, username: user.username, role: user.role }, c.env.JWT_SECRET);

    return successResponse(c, {
      user: { ...user, password: undefined },
      token
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error.message);
    return errorResponse(c, error);
  }
});

/**
 * Verify token
 * POST /api/auth/verify
 */
app.post('/verify', async (c) => {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return errorResponse(c, 'Token is required', 400);
    }

    const db = getDB();
    const usersCollection = db.collection('users');

    // Token will be verified by middleware in real usage
    // This is just a simple endpoint for testing
    return successResponse(c, { message: 'Token verification requires middleware' }, 'Use /api/protected endpoints');
  } catch (error) {
    console.error('Verify error:', error.message);
    return errorResponse(c, error);
  }
});

export default app;
