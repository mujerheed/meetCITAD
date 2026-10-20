import { User, Event } from '../models/index.js';
import { qrService } from '../services/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Attendance Controller
 * Handles QR code scanning and attendance tracking.
 *
 * Event.attendedUsers is the canonical attendance store. The matching
 * User.registeredEvents entry is updated as a denormalized mirror.
 */

const toId = (value) => (value?._id ? value._id.toString() : value?.toString());

const getRegistration = (event, userId) =>
  event.registeredUsers.find(
    (registration) =>
      toId(registration.userId) === userId.toString() &&
      registration.status !== 'cancelled'
  );

const getAttendance = (event, userId) =>
  event.attendedUsers.find(
    (attendance) => toId(attendance.userId) === userId.toString()
  );

const syncUserAttendance = async (user, eventId, attended, checkInTime = null) => {
  const registration = (user.registeredEvents || []).find(
    (item) => toId(item.eventId) === eventId.toString()
  );

  if (!registration) return;

  registration.attended = attended;
  registration.attendedAt = attended ? checkInTime : undefined;
  registration.checkInTime = attended ? checkInTime : undefined;

  const attendedCount = user.registeredEvents.filter(
    (item) => item.attended
  ).length;
  user.stats.totalEventsAttended = attendedCount;

  await user.save();
};

class AttendanceController {
  /**
   * Scan QR Code for Check-in
   * POST /api/v1/attendance/scan
   */
  async scanQRCode(req, res, next) {
    try {
      const { qrData } = req.body;
      const verification = qrService.verifyQRCode(qrData);

      if (!verification.valid) {
        throw new AppError(
          verification.error || 'Invalid QR code',
          400
        );
      }

      const { userId, eventId, type } = verification.data;

      if (type === 'event' || !userId) {
        throw new AppError(
          'This is an event QR code, not a participant ticket. Please scan the attendee ticket.',
          400
        );
      }

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

      if (!getRegistration(event, userId)) {
        throw new AppError('User is not registered for this event', 400);
      }

      const existing = getAttendance(event, userId);
      if (existing) {
        return res.json({
          success: true,
          message: 'User already checked in',
          data: {
            user: {
              id: user._id,
              fullname: user.fullname,
              email: user.email,
            },
            event: {
              id: event._id,
              title: event.title,
            },
            checkInTime: existing.checkInTime,
            alreadyCheckedIn: true,
          },
        });
      }

      const checkInTime = new Date();

      event.attendedUsers.push({
        userId: user._id,
        checkInTime,
        checkInMethod: 'qr',
        checkInBy: req.userRole === 'admin' ? req.user.id : undefined,
      });
      event.attendanceCount = event.attendedUsers.length;
      await event.save();

      await syncUserAttendance(user, event._id, true, checkInTime);

      logger.info(`User ${user.email} checked in for event: ${event.title}`);

      res.json({
        success: true,
        message: 'Check-in successful',
        data: {
          user: {
            id: user._id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
          },
          event: {
            id: event._id,
            title: event.title,
            startDateTime: event.startDateTime,
          },
          checkInTime,
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

      if (!getRegistration(event, userId)) {
        throw new AppError('User is not registered for this event', 400);
      }

      if (getAttendance(event, userId)) {
        throw new AppError('User already checked in', 400);
      }

      const checkInTime = new Date();

      event.attendedUsers.push({
        userId: user._id,
        checkInTime,
        checkInMethod: 'manual',
        checkInBy: req.user.id,
      });
      event.attendanceCount = event.attendedUsers.length;
      await event.save();

      await syncUserAttendance(user, event._id, true, checkInTime);

      logger.info(
        `Manual check-in for user ${user.email} at event: ${event.title} by admin ${req.user.id}`
      );

      res.json({
        success: true,
        message: 'Manual check-in successful',
        data: {
          user: {
            id: user._id,
            fullname: user.fullname,
            email: user.email,
          },
          event: {
            id: event._id,
            title: event.title,
          },
          checkInTime,
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

      const results = { success: [], failed: [] };
      const now = new Date();

      for (const userId of userIds) {
        try {
          const user = await User.findById(userId);
          if (!user) {
            results.failed.push({ userId, reason: 'User not found' });
            continue;
          }

          if (!getRegistration(event, userId)) {
            results.failed.push({ userId, reason: 'Not registered for event' });
            continue;
          }

          if (getAttendance(event, userId)) {
            results.failed.push({ userId, reason: 'Already checked in' });
            continue;
          }

          event.attendedUsers.push({
            userId: user._id,
            checkInTime: now,
            checkInMethod: 'manual',
            checkInBy: req.user.id,
          });

          await syncUserAttendance(user, event._id, true, now);

          results.success.push({
            userId,
            fullname: user.fullname,
            email: user.email,
          });
        } catch (error) {
          results.failed.push({ userId, reason: error.message });
        }
      }

      event.attendanceCount = event.attendedUsers.length;
      await event.save();

      logger.info(
        `Bulk check-in: ${results.success.length} users for event: ${event.title}`
      );

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

      if (!getAttendance(event, userId)) {
        throw new AppError('User has not checked in yet', 400);
      }

      event.attendedUsers = event.attendedUsers.filter(
        (attendance) => toId(attendance.userId) !== userId.toString()
      );
      event.attendanceCount = event.attendedUsers.length;
      await event.save();

      await syncUserAttendance(user, event._id, false);

      logger.info(
        `Check-in undone for user ${user.email} at event: ${event.title} by admin ${req.user.id}`
      );

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

      const event = await Event.findById(eventId).populate(
        'registeredUsers.userId',
        'fullname email phone organisation'
      );

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const attendedIds = new Set(
        event.attendedUsers.map((attendance) => toId(attendance.userId))
      );

      const attendees = event.registeredUsers
        .filter((registration) => registration.userId)
        .map((registration) => {
          const user = registration.userId;
          const attendance = event.attendedUsers.find(
            (item) => toId(item.userId) === toId(user._id)
          );

          return {
            userId: user._id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            organisation: user.organisation,
            registeredAt: registration.registeredAt,
            attended: attendedIds.has(toId(user._id)),
            checkInTime: attendance?.checkInTime || null,
            status: registration.status,
          };
        });

      const attended = attendees.filter((item) => item.attended).length;

      const summary = {
        eventTitle: event.title,
        eventDate: event.startDateTime,
        totalRegistered: attendees.length,
        totalAttended: attended,
        totalAbsent: attendees.length - attended,
        attendanceRate:
          attendees.length > 0
            ? ((attended / attendees.length) * 100).toFixed(2)
            : '0.00',
      };

      res.json({
        success: true,
        data: { summary, attendees },
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

      const event = await Event.findById(eventId).populate(
        'registeredUsers.userId',
        'fullname email phone profileImage'
      );

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const search = query.toLowerCase();
      const attendedIds = new Set(
        event.attendedUsers.map((attendance) => toId(attendance.userId))
      );

      const results = event.registeredUsers
        .filter((registration) => registration.userId)
        .map((registration) => registration.userId)
        .filter((user) => {
          return (
            user.fullname?.toLowerCase().includes(search) ||
            user.email?.toLowerCase().includes(search) ||
            user.phone?.includes(search)
          );
        })
        .map((user) => {
          const attendance = event.attendedUsers.find(
            (item) => toId(item.userId) === toId(user._id)
          );

          return {
            userId: user._id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            attended: attendedIds.has(toId(user._id)),
            checkInTime: attendance?.checkInTime || null,
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

      const totalRegistered = event.registrationCount;
      const totalAttended = event.attendanceCount;

      const stats = {
        eventTitle: event.title,
        eventDate: event.startDateTime,
        capacity: event.capacity,
        totalRegistered,
        totalAttended,
        totalAbsent: Math.max(0, totalRegistered - totalAttended),
        attendanceRate:
          totalRegistered > 0
            ? ((totalAttended / totalRegistered) * 100).toFixed(2)
            : '0.00',
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
