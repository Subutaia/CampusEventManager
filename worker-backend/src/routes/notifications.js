import { Hono } from 'hono';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../middleware/error.js';
import { 
  initSendGrid, 
  sendTestEmail,
  sendEventApprovalEmail,
  sendEventRejectionEmail,
  sendRSVPConfirmationEmail,
  sendEventReminderEmail,
  sendEventUpdateEmail,
  sendNewRSVPNotificationEmail,
  sendRSVPCancelledEmail,
  sendRegistrationEmail
} from '../services/emailService.js';

const app = new Hono();

app.get('/', verifyToken, async (c) => {
  try {
    return successResponse(c, [], 'Notifications retrieved');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.get('/unread/count', verifyToken, async (c) => {
  try {
    return successResponse(c, { unreadCount: 0 }, 'Unread count');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.patch('/read/all', verifyToken, async (c) => {
  try {
    return successResponse(c, { marked: 0 }, 'All marked as read');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.patch('/:id', verifyToken, async (c) => {
  try {
    const id = c.req.param('id');
    return successResponse(c, { _id: id, read: true }, 'Notification updated');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.delete('/:id', verifyToken, async (c) => {
  try {
    return successResponse(c, { message: 'Notification deleted' });
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.post('/test-email', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email || !email.includes('@')) {
      return errorResponse(c, 'Valid email required', 400);
    }
    
    console.log(`🧪 Testing SendGrid email to: ${email}`);
    
    // Initialize SendGrid with current API key
    initSendGrid(c.env.SENDGRID_API_KEY);
    
    // Send test email
    const result = await sendTestEmail(email);
    
    if (result) {
      return c.json({
        success: true,
        message: 'Test email sent successfully',
        recipientEmail: email,
        details: 'Check your inbox (and spam folder) for the test email'
      }, 200);
    } else {
      return c.json({
        success: false,
        error: 'Failed to send test email',
        recipientEmail: email,
        details: 'Check worker logs for detailed error information. This usually means: 1) Sender email not verified in SendGrid, 2) Domain needs DNS verification',
        debugUrl: 'https://campus-event-manager-worker.memelord801.workers.dev/api/debug/sendgrid'
      }, 500);
    }
  } catch (error) {
    console.error('Test email error:', error);
    return c.json({
      success: false,
      error: `Email test failed: ${error.message}`,
      details: error.toString()
    }, 500);
  }
});

// Test email: Registration/Welcome
app.post('/test/registration', async (c) => {
  try {
    const { email, username = 'TestUser', role = 'student' } = await c.req.json();
    
    if (!email) return errorResponse(c, 'Email required', 400);
    
    initSendGrid(c.env.SENDGRID_API_KEY);
    const result = await sendRegistrationEmail({
      email,
      username,
      role
    });
    
    return c.json({
      success: result,
      messageType: 'registration',
      recipientEmail: email,
      message: result ? '✅ Registration welcome email sent' : '❌ Failed to send'
    }, result ? 200 : 500);
  } catch (error) {
    console.error('Registration email test error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Test email: Event Approval
app.post('/test/event-approval', async (c) => {
  try {
    const { organizerEmail, organizerUsername = 'Organizer', eventTitle = 'Test Event', eventDate = '2026-05-15', eventTime = '2:00 PM', eventLocation = 'Student Center', eventCategory = 'Academic' } = await c.req.json();
    
    if (!organizerEmail) return errorResponse(c, 'organizerEmail required', 400);
    
    initSendGrid(c.env.SENDGRID_API_KEY);
    const result = await sendEventApprovalEmail(
      { email: organizerEmail, username: organizerUsername },
      {
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        location: eventLocation,
        category: eventCategory
      }
    );
    
    return c.json({
      success: result,
      messageType: 'event_approval',
      recipientEmail: organizerEmail,
      message: result ? '✅ Event approval email sent' : '❌ Failed to send'
    }, result ? 200 : 500);
  } catch (error) {
    console.error('Event approval email test error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Test email: Event Rejection
app.post('/test/event-rejection', async (c) => {
  try {
    const { organizerEmail, organizerUsername = 'Organizer', eventTitle = 'Test Event', eventDate = '2026-05-15', eventTime = '2:00 PM', eventLocation = 'Student Center' } = await c.req.json();
    
    if (!organizerEmail) return errorResponse(c, 'organizerEmail required', 400);
    
    initSendGrid(c.env.SENDGRID_API_KEY);
    const result = await sendEventRejectionEmail(
      { email: organizerEmail, username: organizerUsername },
      {
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        location: eventLocation
      }
    );
    
    return c.json({
      success: result,
      messageType: 'event_rejection',
      recipientEmail: organizerEmail,
      message: result ? '✅ Event rejection email sent' : '❌ Failed to send'
    }, result ? 200 : 500);
  } catch (error) {
    console.error('Event rejection email test error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Test email: RSVP Confirmation
app.post('/test/rsvp-confirmation', async (c) => {
  try {
    const { studentEmail, studentUsername = 'Student', eventTitle = 'Test Event', eventDate = '2026-05-15', eventTime = '2:00 PM', eventLocation = 'Student Center' } = await c.req.json();
    
    if (!studentEmail) return errorResponse(c, 'studentEmail required', 400);
    
    initSendGrid(c.env.SENDGRID_API_KEY);
    const result = await sendRSVPConfirmationEmail(
      { email: studentEmail, username: studentUsername },
      {
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        location: eventLocation
      }
    );
    
    return c.json({
      success: result,
      messageType: 'rsvp_confirmation',
      recipientEmail: studentEmail,
      message: result ? '✅ RSVP confirmation email sent' : '❌ Failed to send'
    }, result ? 200 : 500);
  } catch (error) {
    console.error('RSVP confirmation email test error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Test email: Event Reminder
app.post('/test/event-reminder', async (c) => {
  try {
    const { attendeeEmail, attendeeUsername = 'Attendee', eventTitle = 'Test Event', eventTime = '2:00 PM', eventLocation = 'Student Center', eventOrganizerName = 'John Organizer', eventDescription = 'This is a great event!' } = await c.req.json();
    
    if (!attendeeEmail) return errorResponse(c, 'attendeeEmail required', 400);
    
    initSendGrid(c.env.SENDGRID_API_KEY);
    const result = await sendEventReminderEmail(
      { email: attendeeEmail, username: attendeeUsername },
      {
        title: eventTitle,
        time: eventTime,
        location: eventLocation,
        organizerName: eventOrganizerName,
        description: eventDescription
      }
    );
    
    return c.json({
      success: result,
      messageType: 'event_reminder',
      recipientEmail: attendeeEmail,
      message: result ? '✅ Event reminder email sent' : '❌ Failed to send'
    }, result ? 200 : 500);
  } catch (error) {
    console.error('Event reminder email test error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Test email: Event Update
app.post('/test/event-update', async (c) => {
  try {
    const { attendeeEmail, attendeeUsername = 'Attendee', eventTitle = 'Test Event', eventDate = '2026-05-15', eventTime = '2:00 PM', eventLocation = 'Student Center', updateMessage = 'The event time has been changed to 3:00 PM' } = await c.req.json();
    
    if (!attendeeEmail) return errorResponse(c, 'attendeeEmail required', 400);
    
    initSendGrid(c.env.SENDGRID_API_KEY);
    const result = await sendEventUpdateEmail(
      { email: attendeeEmail, username: attendeeUsername },
      {
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        location: eventLocation
      },
      updateMessage
    );
    
    return c.json({
      success: result,
      messageType: 'event_update',
      recipientEmail: attendeeEmail,
      message: result ? '✅ Event update email sent' : '❌ Failed to send'
    }, result ? 200 : 500);
  } catch (error) {
    console.error('Event update email test error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Test email: New RSVP Notification
app.post('/test/new-rsvp-notification', async (c) => {
  try {
    const { organizerEmail, organizerUsername = 'Organizer', studentUsername = 'Jane Student', eventTitle = 'Test Event', attendeeCount = 42 } = await c.req.json();
    
    if (!organizerEmail) return errorResponse(c, 'organizerEmail required', 400);
    
    initSendGrid(c.env.SENDGRID_API_KEY);
    const result = await sendNewRSVPNotificationEmail(
      { email: organizerEmail, username: organizerUsername },
      { username: studentUsername },
      {
        title: eventTitle,
        attendeeCount
      }
    );
    
    return c.json({
      success: result,
      messageType: 'new_rsvp_notification',
      recipientEmail: organizerEmail,
      message: result ? '✅ New RSVP notification email sent' : '❌ Failed to send'
    }, result ? 200 : 500);
  } catch (error) {
    console.error('New RSVP notification email test error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Test email: RSVP Cancelled
app.post('/test/rsvp-cancelled', async (c) => {
  try {
    const { studentEmail, studentUsername = 'Student', eventTitle = 'Test Event', eventDate = '2026-05-15', eventTime = '2:00 PM', eventLocation = 'Student Center' } = await c.req.json();
    
    if (!studentEmail) return errorResponse(c, 'studentEmail required', 400);
    
    initSendGrid(c.env.SENDGRID_API_KEY);
    const result = await sendRSVPCancelledEmail(
      { email: studentEmail, username: studentUsername },
      {
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        location: eventLocation
      }
    );
    
    return c.json({
      success: result,
      messageType: 'rsvp_cancelled',
      recipientEmail: studentEmail,
      message: result ? '✅ RSVP cancelled email sent' : '❌ Failed to send'
    }, result ? 200 : 500);
  } catch (error) {
    console.error('RSVP cancelled email test error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
