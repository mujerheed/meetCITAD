import { User, Event } from '../models/index.js';
import { storageService, notificationService } from '../services/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * User Controller
 * Handles user profile and event registration operations
 */

class UserController {
  /**
   * Get User Profile
   * GET /api/v1/users/profile
   */
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id)
        .select('-password')
        .populate('registeredEvents.event', 'title date venue');

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
      const { firstName, lastName, phone, bio, organization, jobTitle } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Update allowed fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone) user.phone = phone;
      if (bio !== undefined) user.bio = bio;
      if (organization !== undefined) user.organization = organization;
      if (jobTitle !== undefined) user.jobTitle = jobTitle;

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
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Delete old profile picture if exists
      if (user.profilePicture) {
        await storageService.deleteFile(user.profilePicture);
      }

      // Upload new profile picture
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

      user.profilePicture = result.url;
      await user.save();

      logger.info(`Profile picture updated for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          profilePicture: result.fullUrl,
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

      if (!user.profilePicture) {
        throw new AppError('No profile picture to delete', 400);
      }

      await storageService.deleteFile(user.profilePicture);
      user.profilePicture = null;
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
      const { emailNotifications, smsNotifications, pushNotifications } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (emailNotifications !== undefined) {
        user.preferences.notifications.email = emailNotifications;
      }
      if (smsNotifications !== undefined) {
        user.preferences.notifications.sms = smsNotifications;
      }
      if (pushNotifications !== undefined) {
        user.preferences.notifications.push = pushNotifications;
      }

      await user.save();

      logger.info(`Preferences updated for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: {
          preferences: user.preferences,
        },
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

      // Check if event is active
      if (event.status !== 'published') {
        throw new AppError('Event is not available for registration', 400);
      }

      // Check if registration is open
      if (event.registrationDeadline && new Date() > event.registrationDeadline) {
        throw new AppError('Registration deadline has passed', 400);
      }

      // Check if already registered
      const alreadyRegistered = user.registeredEvents.some(
        (reg) => reg.event.toString() === eventId
      );

      if (alreadyRegistered) {
        throw new AppError('Already registered for this event', 400);
      }

      // Check capacity
      if (event.capacity && event.registeredCount >= event.capacity) {
        throw new AppError('Event is full', 400);
      }

      // Register user
      user.registeredEvents.push({
        event: eventId,
        registeredAt: new Date(),
        status: 'registered',
      });
      await user.save();

      // Update event registration count
      event.registeredCount += 1;
      await event.save();

      // Send registration notification
      await notificationService.sendEventRegistrationNotification(userId, eventId);

      logger.info(`User ${user.email} registered for event: ${event.title}`);

      res.json({
        success: true,
        message: 'Successfully registered for the event',
        data: {
          event: {
            id: event._id,
            title: event.title,
            date: event.date,
            venue: event.venue,
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

      // Find registration
      const registrationIndex = user.registeredEvents.findIndex(
        (reg) => reg.event.toString() === eventId
      );

      if (registrationIndex === -1) {
        throw new AppError('Not registered for this event', 400);
      }

      // Check if already attended
      const registration = user.registeredEvents[registrationIndex];
      if (registration.attended) {
        throw new AppError('Cannot unregister after attending the event', 400);
      }

      // Check if event has already occurred
      if (new Date() > event.date) {
        throw new AppError('Cannot unregister from past events', 400);
      }

      // Unregister user
      user.registeredEvents.splice(registrationIndex, 1);
      await user.save();

      // Update event registration count
      event.registeredCount = Math.max(0, event.registeredCount - 1);
      await event.save();

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
        path: 'registeredEvents.event',
        select: 'title description date venue capacity status banner',
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      let events = user.registeredEvents;

      // Filter by status
      if (status) {
        events = events.filter((reg) => reg.status === status);
      }

      // Filter upcoming events
      if (upcoming === 'true') {
        events = events.filter((reg) => {
          return reg.event && new Date(reg.event.date) > new Date();
        });
      }

      res.json({
        success: true,
        data: {
          total: events.length,
          events,
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

      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const registration = user.registeredEvents.find(
        (reg) => reg.event.toString() === eventId
      );

      res.json({
        success: true,
        data: {
          isRegistered: !!registration,
          registration: registration || null,
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
      const user = await User.findById(req.user.id).populate({
        path: 'registeredEvents.event',
        select: 'title date',
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Filter events with certificates
      const eventsWithCertificates = user.registeredEvents.filter(
        (reg) => reg.attended && reg.certificateIssued
      );

      res.json({
        success: true,
        data: {
          total: eventsWithCertificates.length,
          certificates: eventsWithCertificates,
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
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const stats = {
        totalRegistrations: user.registeredEvents.length,
        attendedEvents: user.registeredEvents.filter((reg) => reg.attended).length,
        upcomingEvents: user.registeredEvents.filter((reg) => {
          return !reg.attended && reg.status === 'registered';
        }).length,
        certificates: user.registeredEvents.filter((reg) => reg.certificateIssued).length,
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

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('Invalid password', 401);
      }

      // Soft delete (set status to deleted)
      user.status = 'deleted';
      await user.save();

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
