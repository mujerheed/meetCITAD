import { Event, User, Certificate } from '../models/index.js';
import { storageService, qrService } from '../services/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Event Controller
 * Handles event CRUD operations, QR codes, statistics and attendee listings.
 * Uses the canonical Event schema fields (startDateTime, endDateTime, venue.name,
 * registrationCount, attendanceCount, registeredUsers, attendedUsers).
 */

const toId = (value) => (value?._id ? value._id.toString() : value?.toString());

const buildDateTime = (date, time) => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (!time) return new Date(date);
  return new Date(`${String(date).slice(0, 10)}T${time}`);
};

const normalizeVenue = (venue, body = {}) => {
  if (venue && typeof venue === 'object') {
    return {
      name: venue.name || body.venueName || 'CITAD Center, Kano',
      address: venue.address,
      city: venue.city || 'Kano',
      state: venue.state || 'Kano',
      country: venue.country || 'Nigeria',
      coordinates: venue.coordinates,
    };
  }

  if (typeof venue === 'string' && venue.trim()) {
    return { name: venue.trim(), city: 'Kano', state: 'Kano', country: 'Nigeria' };
  }

  if (body.venueName) {
    return {
      name: body.venueName,
      city: body.city || 'Kano',
      state: 'Kano',
      country: 'Nigeria',
    };
  }

  return { name: 'CITAD Center, Kano', city: 'Kano', state: 'Kano', country: 'Nigeria' };
};

const sortField = (sort = 'startDateTime') => {
  if (!sort) return 'startDateTime';
  const direction = sort.startsWith('-') ? '-' : '';
  const field = sort.replace(/^-/, '');
  const map = {
    date: 'startDateTime',
    startDate: 'startDateTime',
    startDateTime: 'startDateTime',
    endDate: 'endDateTime',
    endDateTime: 'endDateTime',
    createdAt: 'createdAt',
    title: 'title',
  };
  return `${direction}${map[field] || 'startDateTime'}`;
};

class EventController {
  /**
   * Create Event
   * POST /api/v1/events
   */
  async createEvent(req, res, next) {
    try {
      const body = req.body;

      const startDateTime =
        body.startDateTime ||
        buildDateTime(body.date, body.startTime);
      const endDateTime =
        body.endDateTime || buildDateTime(body.date, body.endTime) || startDateTime;

      if (!startDateTime || !endDateTime) {
        throw new AppError('Start and end date/time are required', 400);
      }

      const event = await Event.create({
        title: body.title,
        description: body.description,
        shortDescription: body.shortDescription,
        startDateTime,
        endDateTime,
        timezone: body.timezone || 'Africa/Lagos',
        venue: normalizeVenue(body.venue, body),
        category: body.category || 'seminar',
        tags: body.tags || [],
        hostBy: body.hostBy || req.user.fullname || 'CITAD',
        speakers: body.speakers || [],
        bannerImage: body.bannerImage || body.banner,
        thumbnail: body.thumbnail,
        gallery: body.gallery || [],
        capacity: body.capacity,
        waitlistEnabled: Boolean(body.waitlistEnabled),
        certificateEnabled: body.certificateEnabled !== false,
        feedbackEnabled: body.feedbackEnabled !== false,
        registrationOpens: body.registrationOpens,
        registrationCloses: body.registrationCloses || body.registrationDeadline,
        requireApproval: Boolean(body.requireApproval),
        status: body.status || 'draft',
        visibility: body.visibility || 'public',
        createdBy: req.user.id,
      });

      logger.info(`Event created: ${event.title} by admin ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get All Events (Public)
   * GET /api/v1/events
   */
  async getAllEvents(req, res, next) {
    try {
      const {
        page = 1,
        limit = 12,
        status,
        category,
        search,
        upcoming,
        past,
        sort = 'startDateTime',
      } = req.query;

      const pageNumber = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));

      const query = {};

      if (!req.user || req.userRole !== 'admin') {
        query.status = 'published';
      } else if (status && !['upcoming', 'past', 'all'].includes(status)) {
        query.status = status;
      }

      if (category) query.category = category;

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const now = new Date();

      if (upcoming === 'true' || status === 'upcoming') {
        query.startDateTime = { $gte: now };
      } else if (past === 'true' || status === 'past') {
        query.endDateTime = { $lt: now };
      }

      const [events, total] = await Promise.all([
        Event.find(query)
          .populate('createdBy', 'fullname email')
          .sort(sortField(sort))
          .skip((pageNumber - 1) * pageSize)
          .limit(pageSize),
        Event.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          events,
          pagination: {
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize) || 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Single Event
   * GET /api/v1/events/:id
   */
  async getEvent(req, res, next) {
    try {
      const { id } = req.params;

      const event = await Event.findById(id)
        .populate('createdBy', 'fullname email')
        .populate('certificateTemplateId', 'name description type');

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      if (
        event.status !== 'published' &&
        event.status !== 'ongoing' &&
        (!req.user || req.userRole !== 'admin')
      ) {
        throw new AppError('Event not found', 404);
      }

      res.json({
        success: true,
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Event
   * PUT /api/v1/events/:id
   */
  async updateEvent(req, res, next) {
    try {
      const { id } = req.params;
      const body = req.body;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const eventStarted = new Date() > event.startDateTime;
      if (eventStarted) {
        delete body.startDateTime;
        delete body.date;
        delete body.startTime;
        delete body.capacity;
      }

      const allowed = [
        'title',
        'description',
        'shortDescription',
        'timezone',
        'category',
        'tags',
        'hostBy',
        'speakers',
        'thumbnail',
        'gallery',
        'waitlistEnabled',
        'certificateEnabled',
        'feedbackEnabled',
        'registrationOpens',
        'registrationCloses',
        'requireApproval',
        'status',
        'visibility',
        'cancellationReason',
      ];

      allowed.forEach((field) => {
        if (body[field] !== undefined) event[field] = body[field];
      });

      if (body.registrationDeadline !== undefined) {
        event.registrationCloses = body.registrationDeadline;
      }

      if (body.capacity !== undefined) event.capacity = body.capacity;
      if (body.bannerImage !== undefined) event.bannerImage = body.bannerImage;
      if (body.banner !== undefined) event.bannerImage = body.banner;

      if (body.venue !== undefined) {
        event.venue = normalizeVenue(body.venue, body);
      }

      const startDateTime =
        body.startDateTime || buildDateTime(body.date, body.startTime);
      const endDateTime =
        body.endDateTime || buildDateTime(body.date, body.endTime);

      if (startDateTime) event.startDateTime = startDateTime;
      if (endDateTime) event.endDateTime = endDateTime;

      await event.save();

      logger.info(`Event updated: ${event.title} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Event
   * DELETE /api/v1/events/:id
   */
  async deleteEvent(req, res, next) {
    try {
      const { id } = req.params;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      if (event.registrationCount > 0) {
        throw new AppError('Cannot delete an event with existing registrations', 400);
      }

      if (event.bannerImage) {
        await storageService.deleteFile(event.bannerImage);
      }

      for (const image of event.gallery || []) {
        await storageService.deleteFile(image);
      }

      await event.deleteOne();

      logger.info(`Event deleted: ${event.title} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload Event Banner
   * POST /api/v1/events/:id/banner
   */
  async uploadBanner(req, res, next) {
    try {
      const { id } = req.params;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      let bannerImage = req.body?.bannerImage;

      if (!bannerImage && req.file?.buffer) {
        const result = await storageService.uploadFile(req.file.buffer, {
          directory: 'event-banners',
          fileName: `${event._id}-${Date.now()}.jpg`,
          mimeType: req.file.mimetype,
          processImage: true,
          imageOptions: {
            width: 1200,
            height: 630,
            format: 'jpeg',
            quality: 90,
            fit: 'cover',
          },
        });
        bannerImage = result.url;
      }

      if (!bannerImage) {
        throw new AppError('No file uploaded', 400);
      }

      if (event.bannerImage && event.bannerImage !== bannerImage) {
        await storageService.deleteFile(event.bannerImage);
      }

      event.bannerImage = bannerImage;
      if (req.body?.thumbnail) event.thumbnail = req.body.thumbnail;
      await event.save();

      logger.info(`Banner uploaded for event: ${event.title}`);

      res.json({
        success: true,
        message: 'Banner uploaded successfully',
        data: {
          banner: bannerImage,
          thumbnail: event.thumbnail,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload Gallery Images
   * POST /api/v1/events/:id/gallery
   */
  async uploadGalleryImages(req, res, next) {
    try {
      const { id } = req.params;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const uploaded = req.body?.gallery;

      if ((!uploaded || uploaded.length === 0) && (!req.files || req.files.length === 0)) {
        throw new AppError('No files uploaded', 400);
      }

      if (uploaded?.length) {
        event.gallery.push(...uploaded);
        await event.save();
      } else {
        for (const file of req.files) {
          const result = await storageService.uploadFile(file.buffer, {
            directory: 'event-gallery',
            fileName: `${event._id}-${Date.now()}-${Math.random()
              .toString(36)
              .substring(7)}.jpg`,
            mimeType: file.mimetype,
            processImage: true,
            imageOptions: {
              width: 1024,
              height: 768,
              format: 'jpeg',
              quality: 85,
            },
          });
          event.gallery.push(result.url);
        }
        await event.save();
      }

      res.json({
        success: true,
        message: 'Gallery images uploaded successfully',
        data: { gallery: event.gallery },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Gallery Image
   * DELETE /api/v1/events/:id/gallery/:imageIndex
   */
  async deleteGalleryImage(req, res, next) {
    try {
      const { id, imageIndex } = req.params;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const index = parseInt(imageIndex, 10);
      if (Number.isNaN(index) || index < 0 || index >= event.gallery.length) {
        throw new AppError('Invalid gallery image index', 400);
      }

      const [removed] = event.gallery.splice(index, 1);
      await storageService.deleteFile(removed);
      await event.save();

      res.json({
        success: true,
        message: 'Gallery image deleted successfully',
        data: { gallery: event.gallery },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate Event QR Code (organizer code)
   * GET /api/v1/events/:id/qr
   */
  async generateEventQR(req, res, next) {
    try {
      const { id } = req.params;
      const { format = 'dataURL' } = req.query;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const qrData = qrService.generateEventQRData(event);
      const content = JSON.stringify({
        data: qrData.data,
        signature: qrData.signature,
      });

      const qrCode = await qrService.generateQRCode(content, {
        format: format === 'file' ? 'dataURL' : 'dataURL',
      });

      res.json({
        success: true,
        data: {
          qrCode,
          eventId: event._id,
          eventTitle: event.title,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Personal Ticket QR Code for the logged-in user
   * GET /api/v1/events/:id/ticket
   */
  async getUserTicketQR(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [event, user] = await Promise.all([
        Event.findById(id),
        User.findById(userId),
      ]);

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const registration = event.registeredUsers.find(
        (item) =>
          toId(item.userId) === userId.toString() &&
          item.status !== 'cancelled'
      );

      if (!registration) {
        throw new AppError('You are not registered for this event', 403);
      }

      const ticket = qrService.generateUserTicketQRData(user, event);
      const content = JSON.stringify({
        data: ticket.data,
        signature: ticket.signature,
      });

      const qrCode = await qrService.generateQRCode(content);

      // Keep the signature so scanners can validate the ticket even if the
      // image is regenerated later.
      registration.qrSignature = ticket.signature;
      await event.save();

      const mirror = user.registeredEvents.find(
        (item) => toId(item.eventId) === id.toString()
      );
      if (mirror) {
        mirror.qrCode = qrCode;
        await user.save();
      }

      res.json({
        success: true,
        data: {
          qrCode,
          eventId: event._id,
          eventTitle: event.title,
          ticket: {
            userName: user.fullname,
            userEmail: user.email,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Event Statistics
   * GET /api/v1/events/:id/statistics
   */
  async getEventStatistics(req, res, next) {
    try {
      const { id } = req.params;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const certificatesIssued = await Certificate.countDocuments({
        eventId: event._id,
        status: { $ne: 'revoked' },
      });

      const stats = {
        totalRegistrations: event.registrationCount,
        totalAttendance: event.attendanceCount,
        capacity: event.capacity,
        availableSeats: Math.max(0, event.capacity - event.registrationCount),
        attendanceRate:
          event.registrationCount > 0
            ? ((event.attendanceCount / event.registrationCount) * 100).toFixed(2)
            : '0.00',
        certificatesIssued,
        averageRating: event.averageRating,
        totalFeedbacks: event.totalFeedbacks,
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
   * Get Event Attendees
   * GET /api/v1/events/:id/attendees
   */
  async getEventAttendees(req, res, next) {
    try {
      const { id } = req.params;
      const { status, page = 1, limit = 50 } = req.query;

      const event = await Event.findById(id).populate(
        'registeredUsers.userId',
        'fullname email phone organisation profileImage'
      );

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const attendedIds = new Set(
        event.attendedUsers.map((attendance) => toId(attendance.userId))
      );

      let attendees = event.registeredUsers
        .filter((registration) => registration.userId)
        .map((registration) => {
          const user = registration.userId;
          const attended = attendedIds.has(toId(user._id));
          const attendance = event.attendedUsers.find(
            (item) => toId(item.userId) === toId(user._id)
          );

          return {
            userId: user._id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            organisation: user.organisation,
            profileImage: user.profileImage,
            registeredAt: registration.registeredAt,
            status: registration.status,
            attended,
            checkInTime: attendance?.checkInTime || null,
            checkInMethod: attendance?.checkInMethod || null,
          };
        });

      if (status) {
        attendees = attendees.filter((attendee) => attendee.status === status);
      }

      const pageNumber = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.max(1, parseInt(limit, 10) || 50);
      const total = attendees.length;
      const paginated = attendees.slice(
        (pageNumber - 1) * pageSize,
        pageNumber * pageSize
      );

      res.json({
        success: true,
        data: {
          attendees: paginated,
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
   * Publish Event
   * POST /api/v1/events/:id/publish
   */
  async publishEvent(req, res, next) {
    try {
      const { id } = req.params;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      if (event.status === 'published') {
        throw new AppError('Event is already published', 400);
      }

      event.status = 'published';
      await event.save();

      logger.info(`Event published: ${event.title} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Event published successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel Event
   * POST /api/v1/events/:id/cancel
   */
  async cancelEvent(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      event.status = 'cancelled';
      event.cancellationReason = reason;
      await event.save();

      // TODO: Notify all registered users about cancellation

      logger.info(`Event cancelled: ${event.title} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Event cancelled successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new EventController();
