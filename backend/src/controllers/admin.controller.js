import { Admin, User, Event, Certificate, Feedback } from '../models/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Admin Controller
 * Handles admin management, user management, and system analytics
 */

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePagination = (page, limit, defaultLimit = 20) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || defaultLimit));
  return { pageNumber, pageSize };
};

const USER_SORT_FIELDS = [
  '-createdAt',
  'createdAt',
  'fullname',
  '-fullname',
  'lastLogin',
  '-lastLogin',
  'status',
];

class AdminController {
  /**
   * Create Admin
   * POST /api/v1/admin/admins
   */
  async createAdmin(req, res, next) {
    try {
      const {
        email,
        password,
        fullname,
        firstName,
        lastName,
        role,
        permissions,
        department,
      } = req.body;

      const resolvedName =
        (fullname || [firstName, lastName].filter(Boolean).join(' ')).trim();

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
      if (existingAdmin) {
        throw new AppError('Admin with this email already exists', 409);
      }

      // Only super_admin can create other admins
      const currentAdmin = await Admin.findById(req.user.id);
      if (currentAdmin.role !== 'super_admin') {
        throw new AppError('Only super admins can create new admins', 403);
      }

      const admin = await Admin.create({
        email: email.toLowerCase(),
        password,
        fullname: resolvedName,
        role: role || 'staff',
        permissions,
        department,
        createdBy: currentAdmin._id,
      });

      await currentAdmin.logAction('create', 'admin', admin._id, 'Created new admin', req.ip);

      logger.info(`New admin created: ${admin.email} by ${currentAdmin.email}`);

      res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        data: {
          admin: {
            id: admin._id,
            email: admin.email,
            fullname: admin.fullname,
            role: admin.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get All Admins
   * GET /api/v1/admin/admins
   */
  async getAllAdmins(req, res, next) {
    try {
      const { page = 1, limit = 20, role, status } = req.query;
      const { pageNumber, pageSize } = parsePagination(page, limit);

      const query = {};
      if (role) query.role = role;
      if (status) query.status = status;

      const admins = await Admin.find(query)
        .select('-password -otpSecret -backupCodes')
        .limit(pageSize)
        .skip((pageNumber - 1) * pageSize)
        .sort('-createdAt');

      const total = await Admin.countDocuments(query);

      res.json({
        success: true,
        data: {
          admins,
          total,
          page: pageNumber,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Single Admin
   * GET /api/v1/admin/admins/:id
   */
  async getAdmin(req, res, next) {
    try {
      const { id } = req.params;

      const admin = await Admin.findById(id).select('-password -otpSecret -backupCodes');

      if (!admin) {
        throw new AppError('Admin not found', 404);
      }

      res.json({
        success: true,
        data: { admin },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Admin
   * PUT /api/v1/admin/admins/:id
   */
  async updateAdmin(req, res, next) {
    try {
      const { id } = req.params;
      const {
        fullname,
        firstName,
        lastName,
        role,
        permissions,
        status,
        department,
        phone,
        profileImage,
      } = req.body;

      const admin = await Admin.findById(id);
      if (!admin) {
        throw new AppError('Admin not found', 404);
      }

      const currentAdmin = req.user;
      const isSelf = currentAdmin.id.toString() === id.toString();
      const isSuperAdmin = currentAdmin.role === 'super_admin';

      // Administrators may edit their own profile, but never their own role,
      // permissions, or status. All changes to another administrator require
      // a super administrator.
      if (!isSelf && !isSuperAdmin) {
        throw new AppError(
          'Only super admins can update other administrator accounts',
          403
        );
      }

      if (isSelf && (role !== undefined || permissions !== undefined || status !== undefined)) {
        throw new AppError(
          'You cannot change your own role, permissions, or status',
          403
        );
      }

      let invalidateSessions = false;

      if (fullname) admin.fullname = fullname;
      if (firstName || lastName) {
        const parts = admin.fullname ? admin.fullname.split(/\s+/) : [];
        admin.fullname = [
          firstName || parts[0] || '',
          lastName || parts.slice(1).join(' ') || '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim();
      }
      if (role !== undefined && role !== admin.role) {
        admin.role = role;
        invalidateSessions = true;
      }
      if (permissions !== undefined) {
        admin.permissions = permissions;
        invalidateSessions = true;
      }
      if (status !== undefined && status !== admin.status) {
        admin.status = status;
        invalidateSessions = true;
      }
      if (department !== undefined) admin.department = department;
      if (phone !== undefined) admin.phone = phone;
      if (profileImage !== undefined) admin.profileImage = profileImage;

      if (invalidateSessions) {
        admin.tokenVersion = (admin.tokenVersion || 0) + 1;
      }

      await admin.save();

      await currentAdmin.logAction('update', 'admin', admin._id, 'Updated admin details', req.ip);

      logger.info(`Admin updated: ${admin.email} by ${currentAdmin.email}`);

      res.json({
        success: true,
        message: 'Admin updated successfully',
        data: { admin },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Admin
   * DELETE /api/v1/admin/admins/:id
   */
  async deleteAdmin(req, res, next) {
    try {
      const { id } = req.params;

      const admin = await Admin.findById(id);
      if (!admin) {
        throw new AppError('Admin not found', 404);
      }

      // Only super_admin can delete admins
      const currentAdmin = await Admin.findById(req.user.id);
      if (currentAdmin.role !== 'super_admin') {
        throw new AppError('Only super admins can delete admins', 403);
      }

      // Can't delete yourself
      if (id === req.user.id) {
        throw new AppError('You cannot delete your own admin account', 400);
      }

      await admin.deleteOne();

      await currentAdmin.logAction('delete', 'admin', id, 'Deleted admin', req.ip);

      logger.info(`Admin deleted: ${admin.email} by ${currentAdmin.email}`);

      res.json({
        success: true,
        message: 'Admin deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get All Users
   * GET /api/v1/admin/users
   */
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, status, search, sort = '-createdAt' } = req.query;
      const { pageNumber, pageSize } = parsePagination(page, limit);
      const sortField = USER_SORT_FIELDS.includes(sort) ? sort : '-createdAt';

      const query = {};
      if (status) query.status = status;

      if (search) {
        const safeSearch = escapeRegex(String(search).slice(0, 100));
        query.$or = [
          { email: { $regex: safeSearch, $options: 'i' } },
          { fullname: { $regex: safeSearch, $options: 'i' } },
          { phone: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      const users = await User.find(query)
        .select('-password -twoFactorSecret -resetToken -resetTokenExpiration')
        .limit(pageSize)
        .skip((pageNumber - 1) * pageSize)
        .sort(sortField);

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        data: {
          users,
          total,
          page: pageNumber,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Single User
   * GET /api/v1/admin/users/:id
   */
  async getUserDetails(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findById(id)
        .select('-password')
        .populate('registeredEvents.eventId', 'title startDateTime endDateTime venue');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update User Status
   * PUT /api/v1/admin/users/:id/status
   */
  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const user = await User.findById(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      user.status = status;
      await user.save();

      const admin = await Admin.findById(req.user.id);
      await admin.logAction('update', 'user', id, `Changed user status to ${status}`, req.ip);

      logger.info(`User status updated: ${user.email} to ${status} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'User status updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete User
   * DELETE /api/v1/admin/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Soft delete
      user.status = 'deleted';
      await user.save();

      const admin = await Admin.findById(req.user.id);
      await admin.logAction('delete', 'user', id, 'Deleted user', req.ip);

      logger.info(`User deleted: ${user.email} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Dashboard Statistics
   * GET /api/v1/admin/dashboard
   */
  async getDashboardStats(req, res, next) {
    try {
      const [
        totalUsers,
        activeUsers,
        totalEvents,
        upcomingEvents,
        totalCertificates,
        totalFeedback,
        recentUsers,
        recentEvents,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        Event.countDocuments(),
        Event.countDocuments({ startDateTime: { $gte: new Date() }, status: 'published' }),
        Certificate.countDocuments({ status: 'active' }),
        Feedback.countDocuments(),
        User.find().select('fullname email createdAt').sort('-createdAt').limit(5),
        Event.find()
          .select('title startDateTime registrationCount attendanceCount')
          .sort('-createdAt')
          .limit(5),
      ]);

      // Get registration trend (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentRegistrations = await User.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
      });

      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          recentRegistrations,
        },
        events: {
          total: totalEvents,
          upcoming: upcomingEvents,
        },
        certificates: {
          total: totalCertificates,
        },
        feedback: {
          total: totalFeedback,
        },
        recent: {
          users: recentUsers,
          events: recentEvents,
        },
      };

      res.json({
        success: true,
        data: { statistics: stats },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get System Analytics
   * GET /api/v1/admin/analytics
   */
  async getSystemAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      // User analytics
      const usersByMonth = await User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Event analytics
      const eventsByCategory = await Event.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);

      const eventsByStatus = await Event.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      // Attendance analytics
      const totalEventAttendance = await Event.aggregate([
        {
          $group: {
            _id: null,
            totalRegistrations: { $sum: '$registrationCount' },
            totalAttendance: { $sum: '$attendanceCount' },
          },
        },
      ]);

      const attendanceRate =
        totalEventAttendance[0]?.totalRegistrations > 0
          ? (
              (totalEventAttendance[0].totalAttendance / totalEventAttendance[0].totalRegistrations) *
              100
            ).toFixed(2)
          : 0;

      // Feedback analytics
      const averageFeedbackRating = await Feedback.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$ratings.overall' },
            count: { $sum: 1 },
          },
        },
      ]);

      const analytics = {
        users: {
          registrationTrend: usersByMonth,
        },
        events: {
          byCategory: eventsByCategory,
          byStatus: eventsByStatus,
          totalRegistrations: totalEventAttendance[0]?.totalRegistrations || 0,
          totalAttendance: totalEventAttendance[0]?.totalAttendance || 0,
          attendanceRate: parseFloat(attendanceRate),
        },
        feedback: {
          averageRating: (averageFeedbackRating[0]?.avgRating || 0).toFixed(2),
          totalFeedback: averageFeedbackRating[0]?.count || 0,
        },
      };

      res.json({
        success: true,
        data: { analytics },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Audit Log
   * GET /api/v1/admin/audit-log
   */
  async getAuditLog(req, res, next) {
    try {
      const { page = 1, limit = 50, adminId, action, resource } = req.query;
      const { pageNumber, pageSize } = parsePagination(page, limit, 50);

      const query = {};
      if (adminId) query._id = adminId;

      const admins = await Admin.find(query).select('email actionsLog').lean();

      let allActions = [];
      admins.forEach((admin) => {
        const actions = (admin.actionsLog || []).map((log) => ({
          ...log,
          adminEmail: admin.email,
          adminId: admin._id,
        }));
        allActions = allActions.concat(actions);
      });

      // Filter by action and resource
      if (action) {
        allActions = allActions.filter((log) => log.action === action);
      }
      if (resource) {
        allActions = allActions.filter((log) => log.resource === resource);
      }

      // Sort by timestamp (newest first)
      allActions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Pagination
      const startIndex = (pageNumber - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedActions = allActions.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          logs: paginatedActions,
          total: allActions.length,
          page: pageNumber,
          totalPages: Math.ceil(allActions.length / pageSize) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export Data
   * GET /api/v1/admin/export/:type
   */
  async exportData(req, res, next) {
    try {
      const { type } = req.params;
      const { format = 'json' } = req.query;

      let data;
      let filename;

      switch (type) {
        case 'users':
          data = await User.find()
            .select('-password -twoFactorSecret -resetToken -resetTokenExpiration')
            .lean();
          filename = 'users-export';
          break;
        case 'events':
          data = await Event.find().lean();
          filename = 'events-export';
          break;
        case 'certificates':
          data = await Certificate.find()
            .select('-fileUrl')
            .populate('userId eventId')
            .lean();
          filename = 'certificates-export';
          break;
        case 'feedback':
          data = await Feedback.find().populate('userId eventId').lean();
          filename = 'feedback-export';
          break;
        default:
          throw new AppError('Invalid export type', 400);
      }

      // TODO: Implement CSV/Excel export based on format
      // For now, return JSON

      const admin = await Admin.findById(req.user.id);
      await admin.logAction('export', type, null, `Exported ${type} data`, req.ip);

      res.json({
        success: true,
        data: {
          type,
          count: data.length,
          data,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get System Health
   * GET /api/v1/admin/health
   */
  async getSystemHealth(req, res, next) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        database: {
          status: 'connected',
          // TODO: Add database connection check
        },
        services: {
          email: 'operational',
          sms: 'operational',
          storage: 'operational',
          // TODO: Add actual service health checks
        },
      };

      res.json({
        success: true,
        data: { health },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
