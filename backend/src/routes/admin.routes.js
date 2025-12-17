import express from 'express';
import { adminController } from '../controllers/index.js';
import { protect, restrictTo } from '../middleware/index.js';

const router = express.Router();

router.post('/', protect, restrictTo('admin'), adminController.createAdmin.bind(adminController));
router.get('/', protect, restrictTo('admin'), adminController.getAllAdmins.bind(adminController));
router.get('/:id', protect, restrictTo('admin'), adminController.getAdmin.bind(adminController));
router.put('/:id', protect, restrictTo('admin'), adminController.updateAdmin.bind(adminController));
router.delete('/:id', protect, restrictTo('admin'), adminController.deleteAdmin.bind(adminController));

// User management
router.get('/users', protect, restrictTo('admin'), adminController.getAllUsers.bind(adminController));
router.get('/users/:id', protect, restrictTo('admin'), adminController.getUserDetails.bind(adminController));
router.put('/users/:id/status', protect, restrictTo('admin'), adminController.updateUserStatus.bind(adminController));
router.delete('/users/:id', protect, restrictTo('admin'), adminController.deleteUser.bind(adminController));

// System / analytics
router.get('/dashboard', protect, restrictTo('admin'), adminController.getDashboardStats.bind(adminController));
router.get('/analytics', protect, restrictTo('admin'), adminController.getSystemAnalytics.bind(adminController));
router.get('/audit', protect, restrictTo('admin'), adminController.getAuditLog.bind(adminController));
router.get('/export', protect, restrictTo('admin'), adminController.exportData.bind(adminController));
router.get('/health', protect, restrictTo('admin'), adminController.getSystemHealth.bind(adminController));

export default router;
