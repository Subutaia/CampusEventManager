import express from 'express';
import RSVP from '../models/RSVP.js';
import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../middleware/error.js';
import { sendRSVPConfirmationEmail, sendNewRSVPNotificationEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * Add RSVP
 * POST /api/rsvps
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return errorResponse(res, 'Event ID is required', 400);
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'Event not found', 404);
    }

    // Check if already RSVP'd
    const existingRSVP = await RSVP.findOne({ userId: req.user.id, eventId });
    if (existingRSVP) {
      return errorResponse(res, 'Already RSVP\'d to this event', 400);
    }

    // Create RSVP
    const rsvp = new RSVP({
      userId: req.user.id,
      eventId
    });

    await rsvp.save();

    // Update attendee count
    event.attendeeCount = (event.attendeeCount || 0) + 1;
    await event.save();

    // Notify organizer
    await Notification.create({
      userId: event.organizerId,
      eventId: event._id,
      message: `A student RSVP'd to your event "${event.title}".`,
      type: 'rsvp_confirmation'
    });

    // Get student and organizer info for emails
    const student = await User.findById(req.user.id);
    const organizer = await User.findById(event.organizerId);

    // Send RSVP confirmation email to student
    if (student && student.email) {
      await sendRSVPConfirmationEmail(student, event);
    }

    // Send notification email to organizer
    if (organizer && organizer.email) {
      await sendNewRSVPNotificationEmail(organizer, student, event);
    }

    successResponse(res, rsvp, 'RSVP created successfully', 201);
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Remove RSVP
 * DELETE /api/rsvps/:eventId
 */
router.delete('/:eventId', verifyToken, async (req, res) => {
  try {
    const rsvp = await RSVP.findOneAndDelete({
      userId: req.user.id,
      eventId: req.params.eventId
    });

    if (!rsvp) {
      return errorResponse(res, 'RSVP not found', 404);
    }

    // Update attendee count
    const event = await Event.findById(req.params.eventId);
    if (event) {
      event.attendeeCount = Math.max(0, (event.attendeeCount || 0) - 1);
      await event.save();
    }

    successResponse(res, null, 'RSVP removed successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Get user's RSVPs
 * GET /api/rsvps/user/mine
 */
router.get('/user/mine', verifyToken, async (req, res) => {
  try {
    const rsvps = await RSVP.find({ userId: req.user.id })
      .populate({
        path: 'eventId',
        select: 'title date time location description category'
      })
      .sort('-timestamp');

    const events = rsvps.map(r => r.eventId).filter(e => e);

    successResponse(res, events, 'User RSVPs retrieved successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Check if user RSVP'd to event
 * GET /api/rsvps/check/:eventId
 */
router.get('/check/:eventId', verifyToken, async (req, res) => {
  try {
    const rsvp = await RSVP.findOne({
      userId: req.user.id,
      eventId: req.params.eventId
    });

    successResponse(res, { isRsvpd: !!rsvp }, 'RSVP status retrieved successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

/**
 * Get event attendees
 * GET /api/rsvps/event/:eventId
 */
router.get('/event/:eventId', async (req, res) => {
  try {
    const rsvps = await RSVP.find({ eventId: req.params.eventId })
      .populate('userId', 'username')
      .sort('-timestamp');

    successResponse(res, rsvps, 'Event attendees retrieved successfully');
  } catch (error) {
    errorResponse(res, error);
  }
});

export default router;
