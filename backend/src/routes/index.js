import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import eventRoutes from './event.routes.js';
import attendanceRoutes from './attendance.routes.js';
import certificateRoutes from './certificate.routes.js';
import feedbackRoutes from './feedback.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';

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
      admin: '/api/v1/admin',
    },
    documentation: '/api-docs',
  });
});

// Mount sub-routers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/certificates', certificateRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;

