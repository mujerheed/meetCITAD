import { User, Event, Certificate } from '../models/index.js';
import { storageService, notificationService, qrService } from '../services/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * User Controller
 * Handles user profile and event registration operations.
 *
 * Event.registeredUsers is the canonical registration store. User.registeredEvents
 * is kept in sync as a denormalized mirror for fast profile/dashboard reads.
 */

const toId = (value) => (value?._id ? value._id.toString() : value?.toString());

const findEventRegistration = (event, userId) =>
  (event.registeredUsers || []).find(
    (registration) =>
      toId(registration.userId) === userId.toString() &&
      registration.status !== 'cancelled'
  );

const findUserRegistration = (user, eventId) =>
  (user.registeredEvents || []).find(
    (registration) => toId(registration.eventId) === eventId.toString()
  );

const isEventPast = (event) => {
  const end = event.endDateTime || event.startDateTime;
  return end ? new Date(end) < new Date() : false;
};

const syncUserStats = (user) => {
  const registrations = user.registeredEvents || [];
  const attended = registrations.filter((registration) => registration.attended);

  user.stats.totalEventsRegistered = registrations.length;
  user.stats.totalEventsAttended = attended.length;
  user.stats.totalCertificates = registrations.filter(
    (registration) => registration.certificateIssued
  ).length;
};

class UserController {
  /**
   * Get User Profile
   * GET /api/v1/users/profile
   */
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id)
        .select('-password')
        .populate({
          path: 'registeredEvents.eventId',
          select: 'title description startDateTime endDateTime venue bannerImage status',
        });

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
   * Update User Profile
   * PUT /api/v1/users/profile
   */
  async updateProfile(req, res, next) {
    try {
      const {
        fullname,
        firstName,
        lastName,
        phone,
        biography,
        bio,
        organisation,
        organization,
        jobTitle,
        participantType,
        dateOfBirth,
        gender,
        address,
      } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (fullname) {
        user.fullname = fullname.trim();
      } else if (firstName || lastName) {
        const parts = user.fullname ? user.fullname.split(/\s+/) : [];
        user.fullname = [
          firstName || parts[0] || '',
          lastName || parts.slice(1).join(' ') || '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim();
      }

      if (phone !== undefined) user.phone = phone;
      if (organisation !== undefined) user.organisation = organisation;
      if (organization !== undefined) user.organisation = organization;
      if (jobTitle !== undefined) user.jobTitle = jobTitle;
      if (participantType !== undefined) user.participantType = participantType;
      if (biography !== undefined) user.biography = biography;
      if (bio !== undefined) user.biography = bio;
      if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
      if (gender !== undefined) user.gender = gender;
      if (address !== undefined) user.address = address;

      await user.save();

      logger.info(`Profile updated for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload Profile Picture
   * POST /api/v1/users/profile/picture
   */
  async uploadProfilePicture(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      let profileImage = req.body?.profileImage;

      // Fallback: process the in-memory upload directly through storage.
      if (!profileImage && req.file?.buffer) {
        const result = await storageService.uploadFile(req.file.buffer, {
          directory: 'profile-pictures',
          fileName: `${user._id}-${Date.now()}.jpg`,
          mimeType: req.file.mimetype,
          processImage: true,
          imageOptions: {
            width: 400,
            height: 400,
            format: 'jpeg',
            quality: 90,
          },
        });
        profileImage = result.url;
      }

      if (!profileImage) {
        throw new AppError('No file uploaded', 400);
      }

      if (user.profileImage) {
        await storageService.deleteFile(user.profileImage);
      }

      user.profileImage = profileImage;
      await user.save();

      logger.info(`Profile picture updated for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          profilePicture: profileImage,
          profileImage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Profile Picture
   * DELETE /api/v1/users/profile/picture
   */
  async deleteProfilePicture(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.profileImage) {
        throw new AppError('No profile picture to delete', 400);
      }

      await storageService.deleteFile(user.profileImage);
      user.profileImage = undefined;
      await user.save();

      logger.info(`Profile picture deleted for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Profile picture deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Notification Preferences
   * PUT /api/v1/users/preferences
   */
  async updatePreferences(req, res, next) {
    try {
      const body = req.body || {};
      const nested = body.notifications || body.preferences?.notifications || {};

      const email = body.emailNotifications ?? body.email ?? nested.email;
      const sms = body.smsNotifications ?? body.sms ?? nested.sms;
      const push = body.pushNotifications ?? body.push ?? nested.push;
      const marketing = body.marketingEmails;

      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (email !== undefined) user.preferences.emailNotifications = email;
      if (sms !== undefined) user.preferences.smsNotifications = sms;
      if (push !== undefined) user.preferences.pushNotifications = push;
      if (marketing !== undefined) user.preferences.marketingEmails = marketing;
      if (body.language !== undefined) user.preferences.language = body.language;

      await user.save();

      logger.info(`Preferences updated for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: { preferences: user.preferences },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register for Event
   * POST /api/v1/users/events/:eventId/register
   */
  async registerForEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;

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

      if (!['published', 'ongoing'].includes(event.status)) {
        throw new AppError('Event is not available for registration', 400);
      }

      if (isEventPast(event)) {
        throw new AppError('This event has already ended', 400);
      }

      if (event.registrationCloses && new Date() > event.registrationCloses) {
        throw new AppError('Registration for this event has closed', 400);
      }

      if (findEventRegistration(event, userId)) {
        throw new AppError('You are already registered for this event', 400);
      }

      const confirmedCount = event.registeredUsers.filter(
        (registration) => registration.status === 'confirmed'
      ).length;

      if (event.capacity && confirmedCount >= event.capacity) {
        throw new AppError('This event is fully booked', 400);
      }

      // Generate a personal ticket QR for the confirmation email.
      let ticket = null;
      try {
        ticket = await qrService.generateUserTicketQR(user, event);
      } catch (qrError) {
        logger.warn(`Ticket QR generation failed for ${user.email}: ${qrError.message}`);
      }

      event.registeredUsers.push({
        userId: user._id,
        registeredAt: new Date(),
        status: event.requireApproval ? 'pending' : 'confirmed',
        qrSignature: ticket?.qrSignature || undefined,
      });
      event.registrationCount = event.registeredUsers.filter(
        (registration) => registration.status === 'confirmed'
      ).length;
      await event.save();

      user.registeredEvents.push({
        eventId: event._id,
        registeredAt: new Date(),
        status: event.requireApproval ? 'pending' : 'confirmed',
        attended: false,
        certificateIssued: false,
      });
      syncUserStats(user);
      await user.save();

      try {
        await notificationService.sendEventRegistrationNotification(
          user,
          event,
          ticket?.qrCodeUrl
        );
      } catch (notificationError) {
        logger.warn(
          `Registration notification failed for ${user.email}: ${notificationError.message}`
        );
      }

      logger.info(`User ${user.email} registered for event: ${event.title}`);

      res.json({
        success: true,
        message: 'Successfully registered for the event',
        data: {
          event: {
            id: event._id,
            title: event.title,
            startDateTime: event.startDateTime,
            venue: event.venue,
          },
          registration: {
            status: event.requireApproval ? 'pending' : 'confirmed',
            registeredAt: new Date(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unregister from Event
   * DELETE /api/v1/users/events/:eventId/register
   */
  async unregisterFromEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;

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

      const eventRegistration = findEventRegistration(event, userId);
      if (!eventRegistration) {
        throw new AppError('You are not registered for this event', 400);
      }

      const attended = event.attendedUsers.some(
        (attendance) => toId(attendance.userId) === userId.toString()
      );

      if (attended) {
        throw new AppError('Cannot unregister after attending the event', 400);
      }

      if (isEventPast(event)) {
        throw new AppError('Cannot unregister from past events', 400);
      }

      event.registeredUsers = event.registeredUsers.filter(
        (registration) => toId(registration.userId) !== userId.toString()
      );
      event.registrationCount = event.registeredUsers.filter(
        (registration) => registration.status === 'confirmed'
      ).length;
      await event.save();

      user.registeredEvents = user.registeredEvents.filter(
        (registration) => toId(registration.eventId) !== eventId.toString()
      );
      syncUserStats(user);
      await user.save();

      logger.info(`User ${user.email} unregistered from event: ${event.title}`);

      res.json({
        success: true,
        message: 'Successfully unregistered from the event',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Registered Events
   * GET /api/v1/users/events/registered
   */
  async getRegisteredEvents(req, res, next) {
    try {
      const { status, upcoming } = req.query;

      const user = await User.findById(req.user.id).populate({
        path: 'registeredEvents.eventId',
        select:
          'title description shortDescription startDateTime endDateTime venue capacity registrationCount bannerImage category status certificateEnabled',
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      let events = [...user.registeredEvents];

      if (status) {
        events = events.filter((registration) => registration.status === status);
      }

      if (upcoming === 'true') {
        events = events.filter((registration) => {
          const end =
            registration.eventId?.endDateTime ||
            registration.eventId?.startDateTime;
          return end && new Date(end) >= new Date();
        });
      }

      const payload = events.map((registration) => ({
        event: registration.eventId,
        eventId: toId(registration.eventId),
        status: registration.status,
        registeredAt: registration.registeredAt,
        attended: Boolean(registration.attended),
        attendedAt: registration.attendedAt || registration.checkInTime,
        certificateIssued: Boolean(registration.certificateIssued),
        qrCode: registration.qrCode,
      }));

      res.json({
        success: true,
        data: {
          total: payload.length,
          events: payload,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Event Registration Status
   * GET /api/v1/users/events/:eventId/status
   */
  async getEventStatus(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;

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

      const registration =
        findUserRegistration(user, eventId) || findEventRegistration(event, userId);
      const attended = event.attendedUsers.some(
        (attendance) => toId(attendance.userId) === userId.toString()
      );

      res.json({
        success: true,
        data: {
          isRegistered: Boolean(registration),
          attended,
          registration: registration
            ? {
                status: registration.status,
                registeredAt: registration.registeredAt,
                attended,
                certificateIssued: Boolean(registration.certificateIssued),
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get User Certificates
   * GET /api/v1/users/certificates
   */
  async getCertificates(req, res, next) {
    try {
      const certificates = await Certificate.find({
        userId: req.user.id,
        status: { $ne: 'revoked' },
      })
        .populate('eventId', 'title startDateTime endDateTime venue bannerImage')
        .sort('-issuedDate');

      res.json({
        success: true,
        data: {
          total: certificates.length,
          certificates,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get User Statistics
   * GET /api/v1/users/statistics
   */
  async getUserStatistics(req, res, next) {
    try {
      const user = await User.findById(req.user.id).populate({
        path: 'registeredEvents.eventId',
        select: 'startDateTime endDateTime',
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const certificates = await Certificate.countDocuments({
        userId: user._id,
        status: { $ne: 'revoked' },
      });

      const now = new Date();
      const upcoming = user.registeredEvents.filter((registration) => {
        if (registration.attended) return false;
        const end =
          registration.eventId?.endDateTime ||
          registration.eventId?.startDateTime;
        return end && new Date(end) >= now;
      }).length;

      const statistics = {
        totalRegistrations: user.registeredEvents.length,
        attendedEvents: user.registeredEvents.filter((r) => r.attended).length,
        upcomingEvents: upcoming,
        certificates,
      };

      res.json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete User Account
   * DELETE /api/v1/users/account
   */
  async deleteAccount(req, res, next) {
    try {
      const { password } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('Invalid password', 401);
      }

      user.status = 'deleted';
      await user.save();

      // Release their places in future events.
      await Event.updateMany(
        { 'registeredUsers.userId': user._id },
        { $pull: { registeredUsers: { userId: user._id } } }
      );

      logger.info(`User account deleted: ${user.email}`);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
