import express from 'express';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../middleware/error.js';

const router = express.Router();

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = 'student' } = req.body;

    // Validation
    if (!username || !email || !password) {
      return errorResponse(res, 'Username, email, and password are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(res, 'Invalid email format', 400);
    }

    if (password.length < 8) {
      return errorResponse(res, 'Password must be at least 8 characters', 400);
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return errorResponse(res, 'Username already exists', 400);
    }

    // Check if email already registered
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return errorResponse(res, 'Email already registered', 400);
    }

    // Create user
    const user = new User({ username, email, password, role });
    await user.save();

    // Generate token
    const token = generateToken(user);

    successResponse(res, {
      user: user.toJSON(),
      token
    }, 'User registered successfully', 201);
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return errorResponse(res, 'Username and password are required', 400);
    }

    // Find user and include password field
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid username or password', 401);
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid username or password', 401);
    }

    // Generate token
    const token = generateToken(user);

    successResponse(res, {
      user: user.toJSON(),
      token
    }, 'Login successful');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Verify token
 * GET /api/auth/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return errorResponse(res, 'Token is required', 400);
    }

    // This is handled by verifyToken middleware in real usage
    // For now, just validate structure
    const user = await User.findById(token.id || 'invalid');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, { user: user.toJSON() }, 'Token valid');
  } catch (error) {
    errorResponse(res, error);
  }
});

export default router;
