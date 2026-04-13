import { Hono } from 'hono';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../middleware/error.js';

const app = new Hono();

app.get('/', async (c) => {
  try {
    // Return sample events for demo
    const sampleEvents = [
      {
        _id: 'evt_001',
        title: 'Tech Innovation Summit',
        description: 'Join us for an inspiring day of technology talks.',
        date: '2026-04-05',
        time: '14:00',
        location: 'Student Center, Room 301',
        category: 'technology',
        status: 'approved',
        attendeeCount: 87,
        image: 'https://via.placeholder.com/400x250?text=Tech+Summit'
      },
      {
        _id: 'evt_002',
        title: 'Web Development Workshop',
        description: 'Learn React, Node.js, and modern web development practices.',
        date: '2026-04-02',
        time: '10:00',
        location: 'Tech Lab, Building B',
        category: 'technology',
        status: 'approved',
        attendeeCount: 62,
        image: 'https://via.placeholder.com/400x250?text=Web+Dev'
      },
      {
        _id: 'evt_003',
        title: 'Hackathon 2026',
        description: '24-hour coding challenge with prizes and mentorship.',
        date: '2026-04-20',
        time: '09:00',
        location: 'Engineering Building',
        category: 'technology',
        status: 'approved',
        attendeeCount: 156,
        image: 'https://via.placeholder.com/400x250?text=Hackathon'
      },
      {
        _id: 'evt_004',
        title: 'Cultural Night Festival',
        description: 'Celebrate diversity with food, music, and performances.',
        date: '2026-03-31',
        time: '18:00',
        location: 'Main Auditorium',
        category: 'cultural',
        status: 'approved',
        attendeeCount: 234,
        image: 'https://via.placeholder.com/400x250?text=Cultural+Night'
      },
      {
        _id: 'evt_005',
        title: 'Sports Tournament',
        description: 'Annual inter-college basketball championship.',
        date: '2026-04-15',
        time: '15:00',
        location: 'University Arena',
        category: 'sports',
        status: 'approved',
        attendeeCount: 450,
        image: 'https://via.placeholder.com/400x250?text=Sports'
      }
    ];
    
    return successResponse(c, sampleEvents, 'Events retrieved');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.post('/', verifyToken, requireRole('organizer'), async (c) => {
  try {
    const body = await c.req.json();
    return successResponse(c, { ...body, _id: 'stub-id' }, 'Event created', 201);
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    return successResponse(c, { _id: id }, 'Event retrieved');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.put('/:id', verifyToken, requireRole('organizer'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    return successResponse(c, { ...body, _id: id }, 'Event updated');
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.delete('/:id', verifyToken, requireRole('organizer'), async (c) => {
  try {
    return successResponse(c, { message: 'Event deleted' });
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.patch('/:id/approve', verifyToken, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    return successResponse(c, { _id: id, status: 'approved' }, 'Event approved');
  } catch (error) {
    return errorResponse(c, error);
  }
});

export default app;
