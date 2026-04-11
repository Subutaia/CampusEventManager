import express from 'express';
import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../middleware/error.js';
import { sendEventApprovalEmail, sendEventRejectionEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * Create an event
 * POST /api/events
 */
router.post('/', verifyToken, requireRole('organizer', 'admin'), async (req, res) => {
  try {
    const { title, description, date, time, location, category, tags } = req.body;

    // Validation
    if (!title || !description || !date || !time || !location || !category) {
      return errorResponse(res, 'All fields are required', 400);
    }

    const eventDate = new Date(date);
    if (eventDate < new Date()) {
      return errorResponse(res, 'Event date must be in the future', 400);
    }

    // Create event
    const event = new Event({
      title,
      description,
      date: eventDate,
      time,
      location,
      category,
      tags: tags || [],
      organizerId: req.user.id,
      organizerName: req.user.username,
      status: req.user.role === 'admin' ? 'approved' : 'pending'
    });

    await event.save();

    // Notify admins if event is pending
    if (event.status === 'pending') {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          eventId: event._id,
          message: `New event "${event.title}" submitted by ${event.organizerName} awaiting approval.`,
          type: 'event_approval'
        });
      }
    }

    successResponse(res, event, 'Event created successfully', 201);
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Get all approved events
 * GET /api/events
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, status = 'approved', sort = '-createdAt' } = req.query;

    let filter = { status };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(filter)
      .populate('organizerId', 'username')
      .sort(sort)
      .limit(100);

    successResponse(res, events, 'Events retrieved successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Get single event
 * GET /api/events/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'username');

    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    successResponse(res, event, 'Event retrieved successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Update event
 * PUT /api/events/:id
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Authorization check
    if (event.organizerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized to update this event', 403);
    }

    // Update fields
    const { title, description, date, time, location, category, tags } = req.body;
    if (title) event.title = title;
    if (description) event.description = description;
    if (date) event.date = new Date(date);
    if (time) event.time = time;
    if (location) event.location = location;
    if (category) event.category = category;
    if (tags) event.tags = tags;
    event.updatedAt = new Date();

    await event.save();

    successResponse(res, event, 'Event updated successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Delete event
 * DELETE /api/events/:id
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Authorization check
    if (event.organizerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized to delete this event', 403);
    }

    await Event.findByIdAndDelete(req.params.id);

    successResponse(res, null, 'Event deleted successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Approve event (admin only)
 * PATCH /api/events/:id/approve
 */
router.patch('/:id/approve', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', updatedAt: new Date() },
      { new: true }
    );

    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Get organizer info for email
    const organizer = await User.findById(event.organizerId);

    // Send approval notification in database
    await Notification.create({
      userId: event.organizerId,
      eventId: event._id,
      message: `Your event "${event.title}" has been approved!`,
      type: 'event_approval'
    });

    // Send approval email to organizer
    if (organizer && organizer.email) {
      await sendEventApprovalEmail(organizer, event);
    }

    successResponse(res, event, 'Event approved successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Reject event (admin only)
 * PATCH /api/events/:id/reject
 */
router.patch('/:id/reject', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', updatedAt: new Date() },
      { new: true }
    );

    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Get organizer info for email
    const organizer = await User.findById(event.organizerId);

    // Send rejection notification in database
    await Notification.create({
      userId: event.organizerId,
      eventId: event._id,
      message: `Your event "${event.title}" was not approved.`,
      type: 'event_approval'
    });

    // Send rejection email to organizer
    if (organizer && organizer.email) {
      await sendEventRejectionEmail(organizer, event);
    }

    successResponse(res, event, 'Event rejected successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Get pending events (admin only)
 * GET /api/events/admin/pending
 */
router.get('/admin/pending', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const events = await Event.find({ status: 'pending' })
      .populate('organizerId', 'username')
      .sort('-createdAt');

    successResponse(res, events, 'Pending events retrieved successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

export default router;
