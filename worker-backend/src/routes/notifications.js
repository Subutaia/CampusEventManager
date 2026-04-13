import { Hono } from 'hono';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../middleware/error.js';
import { initSendGrid, sendTestEmail } from '../services/emailService.js';

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
    
    // Initialize SendGrid with current API key
    initSendGrid(c.env.SENDGRID_API_KEY);
    
    // Send test email
    const result = await sendTestEmail(email);
    
    if (result) {
      return successResponse(c, { message: 'Test email sent successfully' });
    } else {
      return errorResponse(c, 'Failed to send test email - check SendGrid configuration', 500);
    }
  } catch (error) {
    console.error('Test email error:', error);
    return errorResponse(c, `Email test failed: ${error.message}`, 500);
  }
});

export default app;
