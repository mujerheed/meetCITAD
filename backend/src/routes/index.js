import express from 'express';

const router = express.Router();

// Root API route
router.get('/', (req, res) => {
  res.json({
    message: 'meetCITAD API v2.0',
    status: 'success',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      events: '/api/v1/events',
      attendance: '/api/v1/attendance',
      certificates: '/api/v1/certificates',
      feedback: '/api/v1/feedback',
      notifications: '/api/v1/notifications',
    },
    documentation: '/api-docs',
  });
});

// Placeholder route groups (to be implemented)
router.all('/auth*', (req, res) => {
  res.json({ 
    status: 'info',
    message: 'Auth routes - Coming in Phase 2',
    endpoints: ['POST /auth/signup', 'POST /auth/login', 'POST /auth/refresh']
  });
});

router.all('/users*', (req, res) => {
  res.json({ 
    status: 'info',
    message: 'User routes - Coming in Phase 2',
    endpoints: ['GET /users/:id', 'PUT /users/:id', 'GET /users/profile']
  });
});

router.all('/events*', (req, res) => {
  res.json({ 
    status: 'info',
    message: 'Event routes - Coming in Phase 2',
    endpoints: ['GET /events', 'POST /events', 'GET /events/:id']
  });
});

router.all('/attendance*', (req, res) => {
  res.json({ 
    status: 'info',
    message: 'Attendance routes - Coming in Phase 2 (QR System)',
    endpoints: ['POST /attendance/scan', 'GET /attendance/:eventId']
  });
});

router.all('/certificates*', (req, res) => {
  res.json({ 
    status: 'info',
    message: 'Certificate routes - Coming in Phase 2',
    endpoints: ['GET /certificates/:id', 'POST /certificates/generate']
  });
});

export default router;

