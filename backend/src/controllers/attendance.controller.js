import { User, Event } from '../models/index.js';
import { qrService, notificationService } from '../services/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Attendance Controller
 * Handles QR code scanning and attendance tracking
 */

class AttendanceController {
  /**
   * Scan QR Code for Check-in
   * POST /api/v1/attendance/scan
   */
  async scanQRCode(req, res, next) {
    try {
      const { qrData } = req.body;

      // Verify QR code
      const verification = qrService.verifyQRCode(qrData);

      if (!verification.valid) {
        throw new AppError(verification.message || 'Invalid QR code', 400);
      }

      const { userId, eventId } = verification.data;

      // Find user and event
      const [user, event] = await Promise.all([
        User.findById(userId),
        Event.findById(eventId),
      ]);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Check if user is registered for this event
      const registrationIndex = user.registeredEvents.findIndex(
        (reg) => reg.event.toString() === eventId
      );

      if (registrationIndex === -1) {
        throw new AppError('User is not registered for this event', 400);
      }

      const registration = user.registeredEvents[registrationIndex];

      // Check if already checked in
      if (registration.attended) {
        return res.json({
          success: true,
          message: 'User already checked in',
          data: {
            user: {
              id: user._id,
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
            },
            event: {
              id: event._id,
              title: event.title,
            },
            checkInTime: registration.checkInTime,
            alreadyCheckedIn: true,
          },
        });
      }

      // Mark as attended
      user.registeredEvents[registrationIndex].attended = true;
      user.registeredEvents[registrationIndex].checkInTime = new Date();
      user.registeredEvents[registrationIndex].status = 'attended';
      await user.save();

      // Update event attendance count
      event.attendedCount += 1;
      await event.save();

      logger.info(`User ${user.email} checked in for event: ${event.title}`);

      res.json({
        success: true,
        message: 'Check-in successful',
        data: {
          user: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone,
            profilePicture: user.profilePicture,
          },
          event: {
            id: event._id,
            title: event.title,
            date: event.date,
          },
          checkInTime: user.registeredEvents[registrationIndex].checkInTime,
          alreadyCheckedIn: false,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manual Check-in
   * POST /api/v1/attendance/manual-checkin
   */
  async manualCheckIn(req, res, next) {
    try {
      const { userId, eventId } = req.body;

      const [user, event] = await Promise.all([
        User.findById(userId),
        Event.findById(eventId),
      ]);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Check if user is registered for this event
      const registrationIndex = user.registeredEvents.findIndex(
        (reg) => reg.event.toString() === eventId
      );

      if (registrationIndex === -1) {
        throw new AppError('User is not registered for this event', 400);
      }

      const registration = user.registeredEvents[registrationIndex];

      // Check if already checked in
      if (registration.attended) {
        throw new AppError('User already checked in', 400);
      }

      // Mark as attended
      user.registeredEvents[registrationIndex].attended = true;
      user.registeredEvents[registrationIndex].checkInTime = new Date();
      user.registeredEvents[registrationIndex].status = 'attended';
      await user.save();

      // Update event attendance count
      event.attendedCount += 1;
      await event.save();

      logger.info(`Manual check-in for user ${user.email} at event: ${event.title} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Manual check-in successful',
        data: {
          user: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
          },
          event: {
            id: event._id,
            title: event.title,
          },
          checkInTime: user.registeredEvents[registrationIndex].checkInTime,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk Check-in
   * POST /api/v1/attendance/bulk-checkin
   */
  async bulkCheckIn(req, res, next) {
    try {
      const { userIds, eventId } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('User IDs array is required', 400);
      }

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const results = {
        success: [],
        failed: [],
      };

      for (const userId of userIds) {
        try {
          const user = await User.findById(userId);
          if (!user) {
            results.failed.push({ userId, reason: 'User not found' });
            continue;
          }

          const registrationIndex = user.registeredEvents.findIndex(
            (reg) => reg.event.toString() === eventId
          );

          if (registrationIndex === -1) {
            results.failed.push({ userId, reason: 'Not registered for event' });
            continue;
          }

          const registration = user.registeredEvents[registrationIndex];
          if (registration.attended) {
            results.failed.push({ userId, reason: 'Already checked in' });
            continue;
          }

          user.registeredEvents[registrationIndex].attended = true;
          user.registeredEvents[registrationIndex].checkInTime = new Date();
          user.registeredEvents[registrationIndex].status = 'attended';
          await user.save();

          results.success.push({
            userId,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
          });
        } catch (error) {
          results.failed.push({ userId, reason: error.message });
        }
      }

      // Update event attendance count
      event.attendedCount += results.success.length;
      await event.save();

      logger.info(`Bulk check-in: ${results.success.length} users for event: ${event.title}`);

      res.json({
        success: true,
        message: 'Bulk check-in completed',
        data: {
          totalProcessed: userIds.length,
          successCount: results.success.length,
          failedCount: results.failed.length,
          results,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Undo Check-in
   * POST /api/v1/attendance/undo-checkin
   */
  async undoCheckIn(req, res, next) {
    try {
      const { userId, eventId } = req.body;

      const [user, event] = await Promise.all([
        User.findById(userId),
        Event.findById(eventId),
      ]);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const registrationIndex = user.registeredEvents.findIndex(
        (reg) => reg.event.toString() === eventId
      );

      if (registrationIndex === -1) {
        throw new AppError('User is not registered for this event', 400);
      }

      const registration = user.registeredEvents[registrationIndex];
      if (!registration.attended) {
        throw new AppError('User has not checked in yet', 400);
      }

      // Undo check-in
      user.registeredEvents[registrationIndex].attended = false;
      user.registeredEvents[registrationIndex].checkInTime = null;
      user.registeredEvents[registrationIndex].status = 'registered';
      await user.save();

      // Update event attendance count
      event.attendedCount = Math.max(0, event.attendedCount - 1);
      await event.save();

      logger.info(`Check-in undone for user ${user.email} at event: ${event.title} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Check-in undone successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Attendance Report
   * GET /api/v1/attendance/report/:eventId
   */
  async getAttendanceReport(req, res, next) {
    try {
      const { eventId } = req.params;
      const { export: exportFormat } = req.query;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Get all registered users
      const users = await User.find({
        'registeredEvents.event': eventId,
      }).select('firstName lastName email phone registeredEvents.$');

      const attendanceData = users.map((user) => {
        const registration = user.registeredEvents[0];
        return {
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          registeredAt: registration.registeredAt,
          attended: registration.attended,
          checkInTime: registration.checkInTime,
          status: registration.status,
        };
      });

      const summary = {
        eventTitle: event.title,
        eventDate: event.date,
        totalRegistered: attendanceData.length,
        totalAttended: attendanceData.filter((a) => a.attended).length,
        totalAbsent: attendanceData.filter((a) => !a.attended).length,
        attendanceRate:
          attendanceData.length > 0
            ? ((attendanceData.filter((a) => a.attended).length / attendanceData.length) * 100).toFixed(2)
            : 0,
      };

      // TODO: Implement CSV/PDF export if exportFormat is provided

      res.json({
        success: true,
        data: {
          summary,
          attendees: attendanceData,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search Attendee
   * GET /api/v1/attendance/search
   */
  async searchAttendee(req, res, next) {
    try {
      const { eventId, query } = req.query;

      if (!eventId || !query) {
        throw new AppError('Event ID and search query are required', 400);
      }

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Search by email, phone, or name
      const users = await User.find({
        'registeredEvents.event': eventId,
        $or: [
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
        ],
      }).select('firstName lastName email phone profilePicture registeredEvents.$');

      const results = users.map((user) => {
        const registration = user.registeredEvents[0];
        return {
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          profilePicture: user.profilePicture,
          attended: registration.attended,
          checkInTime: registration.checkInTime,
          status: registration.status,
        };
      });

      res.json({
        success: true,
        data: {
          total: results.length,
          results,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Live Attendance Stats
   * GET /api/v1/attendance/live/:eventId
   */
  async getLiveStats(req, res, next) {
    try {
      const { eventId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const totalRegistered = await User.countDocuments({
        'registeredEvents.event': eventId,
      });

      const totalAttended = await User.countDocuments({
        'registeredEvents.event': eventId,
        'registeredEvents.attended': true,
      });

      const stats = {
        eventTitle: event.title,
        eventDate: event.date,
        capacity: event.capacity,
        totalRegistered,
        totalAttended,
        totalAbsent: totalRegistered - totalAttended,
        attendanceRate: totalRegistered > 0 ? ((totalAttended / totalRegistered) * 100).toFixed(2) : 0,
        lastUpdate: new Date(),
      };

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceController();
