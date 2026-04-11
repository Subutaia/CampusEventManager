import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../middleware/error.js';
import { sendTestEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * Get user notifications
 * GET /api/notifications
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('eventId', 'title')
      .sort('-timestamp')
      .limit(100);

    successResponse(res, notifications, 'Notifications retrieved successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Get unread notification count
 * GET /api/notifications/unread/count
 */
router.get('/unread/count', verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      read: false
    });

    successResponse(res, { unreadCount: count }, 'Unread count retrieved successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    // Verify ownership
    if (notification.userId.toString() !== req.user.id) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    successResponse(res, notification, 'Notification marked as read');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read/all
 */
router.patch('/read/all', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );

    successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    // Verify ownership
    if (notification.userId.toString() !== req.user.id) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    successResponse(res, null, 'Notification deleted successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Test email endpoint - verify SendGrid is working
 * POST /api/notifications/test-email
 */
router.post('/test-email', verifyToken, async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return errorResponse(res, 'Test email address is required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return errorResponse(res, 'Invalid email address format', 400);
    }

    // Send test email
    const success = await sendTestEmail(testEmail);

    if (success) {
      successResponse(res, { 
        message: 'Test email sent successfully!',
        recipientEmail: testEmail,
        nextSteps: 'Check your inbox (and spam folder) within 1-2 minutes.'
      }, 'Test email sent', 200);
    } else {
      errorResponse(res, 'Failed to send test email. Check backend logs for details.', 500);
    }
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Send notification (admin only)
 * POST /api/notifications/send
 */
router.post('/send', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId, message, type = 'general' } = req.body;

    if (!userId || !message) {
      return errorResponse(res, 'User ID and message are required', 400);
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const notification = new Notification({
      userId,
      message,
      type
    });

    await notification.save();

    successResponse(res, notification, 'Notification sent successfully', 201);
  } catch (error) {
    errorResponse(res, error);
  }
});

export default router;
