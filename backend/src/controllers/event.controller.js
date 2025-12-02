import { Event, User } from '../models/index.js';
import { storageService, qrService } from '../services/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Event Controller
 * Handles event CRUD operations and event management
 */

class EventController {
  /**
   * Create Event
   * POST /api/v1/events
   */
  async createEvent(req, res, next) {
    try {
      const {
        title,
        description,
        date,
        startTime,
        endTime,
        venue,
        capacity,
        category,
        tags,
        registrationDeadline,
        requiresApproval,
      } = req.body;

      const event = await Event.create({
        title,
        description,
        date,
        startTime,
        endTime,
        venue,
        capacity,
        category,
        tags,
        registrationDeadline,
        requiresApproval,
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
        limit = 10,
        status,
        category,
        search,
        upcoming,
        past,
        sort = '-date',
      } = req.query;

      const query = {};

      // Filter by status (default to published for public access)
      if (!req.user || req.user.role !== 'admin') {
        query.status = 'published';
      } else if (status) {
        query.status = status;
      }

      // Filter by category
      if (category) {
        query.category = category;
      }

      // Search by title or description
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      // Filter upcoming/past events
      if (upcoming === 'true') {
        query.date = { $gte: new Date() };
      } else if (past === 'true') {
        query.date = { $lt: new Date() };
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        populate: {
          path: 'createdBy',
          select: 'firstName lastName email',
        },
      };

      const events = await Event.paginate(query, options);

      res.json({
        success: true,
        data: events,
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
        .populate('createdBy', 'firstName lastName email')
        .populate('certificateTemplate', 'name description');

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Check if user can view unpublished events
      if (event.status !== 'published' && (!req.user || req.user.role !== 'admin')) {
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
      const updateData = req.body;

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Prevent updating certain fields after event has started
      const eventStarted = new Date() > event.date;
      if (eventStarted) {
        const restrictedFields = ['date', 'capacity'];
        restrictedFields.forEach((field) => {
          if (updateData[field]) {
            delete updateData[field];
          }
        });
      }

      Object.assign(event, updateData);
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

      // Check if event has registrations
      if (event.registeredCount > 0) {
        throw new AppError('Cannot delete event with existing registrations', 400);
      }

      // Delete associated files
      if (event.banner) {
        await storageService.deleteFile(event.banner);
      }

      if (event.gallery && event.gallery.length > 0) {
        for (const image of event.gallery) {
          await storageService.deleteFile(image);
        }
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

      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Delete old banner if exists
      if (event.banner) {
        await storageService.deleteFile(event.banner);
      }

      // Upload new banner
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

      event.banner = result.url;
      await event.save();

      logger.info(`Banner uploaded for event: ${event.title}`);

      res.json({
        success: true,
        message: 'Banner uploaded successfully',
        data: {
          banner: result.fullUrl,
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

      if (!req.files || req.files.length === 0) {
        throw new AppError('No files uploaded', 400);
      }

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const uploadPromises = req.files.map(async (file) => {
        const result = await storageService.uploadFile(file.buffer, {
          directory: 'event-gallery',
          fileName: `${event._id}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`,
          mimeType: file.mimetype,
          processImage: true,
          imageOptions: {
            width: 1024,
            height: 768,
            format: 'jpeg',
            quality: 85,
            fit: 'cover',
          },
        });
        return result.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      event.gallery = [...(event.gallery || []), ...uploadedUrls];
      await event.save();

      logger.info(`Gallery images uploaded for event: ${event.title}`);

      res.json({
        success: true,
        message: 'Gallery images uploaded successfully',
        data: {
          gallery: event.gallery,
        },
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

      const index = parseInt(imageIndex);
      if (index < 0 || index >= event.gallery.length) {
        throw new AppError('Invalid image index', 400);
      }

      const imageUrl = event.gallery[index];
      await storageService.deleteFile(imageUrl);

      event.gallery.splice(index, 1);
      await event.save();

      logger.info(`Gallery image deleted from event: ${event.title}`);

      res.json({
        success: true,
        message: 'Gallery image deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate Event QR Code
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

      // Generate QR data
      const qrData = qrService.generateEventQRData(event._id.toString(), event.title);

      // Generate QR code
      const qrCode = await qrService.generateQRCode(qrData, {
        format: format === 'file' ? 'file' : 'dataURL',
        fileName: format === 'file' ? `event-${event._id}-qr.png` : undefined,
      });

      logger.info(`QR code generated for event: ${event.title}`);

      res.json({
        success: true,
        data: {
          qrCode: format === 'file' ? qrCode.url : qrCode,
          eventId: event._id,
          eventTitle: event.title,
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

      const stats = {
        totalRegistrations: event.registeredCount,
        totalAttendance: event.attendedCount,
        capacity: event.capacity,
        availableSeats: event.capacity ? event.capacity - event.registeredCount : null,
        attendanceRate: event.registeredCount > 0 
          ? ((event.attendedCount / event.registeredCount) * 100).toFixed(2) 
          : 0,
        certificatesIssued: event.certificatesIssued || 0,
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

      const event = await Event.findById(id);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const query = {
        'registeredEvents.event': id,
      };

      if (status) {
        query['registeredEvents.status'] = status;
      }

      const users = await User.find(query)
        .select('firstName lastName email phone registeredEvents.$')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        data: {
          attendees: users,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
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
