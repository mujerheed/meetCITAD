import express from 'express';
import { adminController } from '../controllers/index.js';
import {
  protect,
  restrictTo,
  checkPermission,
  adminLimiter,
  exportLimiter,
} from '../middleware/index.js';

const router = express.Router();

// Every administrators' endpoint requires an active admin session.
router.use(protect, restrictTo('admin'), adminLimiter);

// System / analytics (static paths first)
router.get(
  '/dashboard',
  checkPermission('view_analytics'),
  adminController.getDashboardStats.bind(adminController)
);
router.get(
  '/analytics',
  checkPermission('view_analytics'),
  adminController.getSystemAnalytics.bind(adminController)
);
router.get(
  '/audit',
  checkPermission('manage_settings'),
  adminController.getAuditLog.bind(adminController)
);
router.get(
  '/health',
  checkPermission('manage_settings'),
  adminController.getSystemHealth.bind(adminController)
);

// User management
router.get(
  '/users',
  checkPermission('manage_users'),
  adminController.getAllUsers.bind(adminController)
);
router.get(
  '/users/:id',
  checkPermission('manage_users'),
  adminController.getUserDetails.bind(adminController)
);
router.put(
  '/users/:id/status',
  checkPermission('manage_users'),
  adminController.updateUserStatus.bind(adminController)
);
router.delete(
  '/users/:id',
  checkPermission('manage_users'),
  adminController.deleteUser.bind(adminController)
);

// Export
router.get(
  '/export/:type',
  checkPermission('export_data'),
  exportLimiter,
  adminController.exportData.bind(adminController)
);

// Admin management
router.post(
  '/',
  checkPermission('manage_admins'),
  adminController.createAdmin.bind(adminController)
);
router.get(
  '/',
  checkPermission('manage_admins'),
  adminController.getAllAdmins.bind(adminController)
);
router.get(
  '/:id',
  checkPermission('manage_admins'),
  adminController.getAdmin.bind(adminController)
);

// The controller permits self-profile updates and protects role/permission/
// status changes behind a super-admin check.
router.put('/:id', adminController.updateAdmin.bind(adminController));

router.delete(
  '/:id',
  checkPermission('manage_admins'),
  adminController.deleteAdmin.bind(adminController)
);

export default router;
