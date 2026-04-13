import { Hono } from 'hono';
import { verifyToken } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../middleware/error.js';

const app = new Hono();

app.get('/', verifyToken, async (c) => {
  try {
    return successResponse(c, [], 'RSVPs retrieved');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.post('/', verifyToken, async (c) => {
  try {
    const body = await c.req.json();
    return successResponse(c, { ...body, _id: 'stub-id' }, 'RSVP created', 201);
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.get('/user/mine', verifyToken, async (c) => {
  try {
    return successResponse(c, [], 'Your RSVPs retrieved');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.get('/check/:eventId', verifyToken, async (c) => {
  try {
    const eventId = c.req.param('eventId');
    return successResponse(c, { hasRSVP: false }, 'RSVP check complete');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.delete('/:id', verifyToken, async (c) => {
  try {
    return successResponse(c, { message: 'RSVP cancelled' });
  } catch (error) {
    return errorResponse(c, error);
  }
});

export default app;
