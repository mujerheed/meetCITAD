import { Feedback, Event, User } from '../models/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Feedback Controller
 * Handles event feedback and suggestions
 */

class FeedbackController {
  /**
   * Submit Feedback
   * POST /api/v1/feedback
   */
  async submitFeedback(req, res, next) {
    try {
      const {
        event: eventId,
        rating,
        content,
        venue,
        organization,
        suggestions,
        wouldRecommend,
        category,
      } = req.body;

      const userId = req.user.id;

      // Verify event exists
      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Check if user attended the event
      const user = await User.findById(userId);
      const registration = user.registeredEvents.find(
        (reg) => reg.event.toString() === eventId && reg.attended
      );

      if (!registration) {
        throw new AppError('You must attend the event to submit feedback', 403);
      }

      // Check if feedback already submitted
      const existingFeedback = await Feedback.findOne({
        user: userId,
        event: eventId,
      });

      if (existingFeedback) {
        throw new AppError('Feedback already submitted for this event', 400);
      }

      // Create feedback
      const feedback = await Feedback.create({
        user: userId,
        event: eventId,
        rating: {
          overall: rating?.overall || rating,
          venue: venue,
          organization: organization,
        },
        content,
        suggestions,
        wouldRecommend,
        category,
      });

      logger.info(`Feedback submitted for event ${event.title} by user ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: { feedback },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Event Feedback
   * GET /api/v1/feedback/event/:eventId
   */
  async getEventFeedback(req, res, next) {
    try {
      const { eventId } = req.params;
      const { page = 1, limit = 20, sort = '-createdAt', rating } = req.query;

      const query = { event: eventId };

      // Filter by rating
      if (rating) {
        query['rating.overall'] = parseInt(rating);
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        populate: {
          path: 'user',
          select: 'firstName lastName profilePicture',
        },
      };

      const feedback = await Feedback.paginate(query, options);

      res.json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Single Feedback
   * GET /api/v1/feedback/:id
   */
  async getFeedback(req, res, next) {
    try {
      const { id } = req.params;

      const feedback = await Feedback.findById(id)
        .populate('user', 'firstName lastName email profilePicture')
        .populate('event', 'title date venue')
        .populate('response.respondedBy', 'firstName lastName');

      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      // Check permission (user can only view their own feedback unless admin)
      if (req.user.role !== 'admin' && feedback.user._id.toString() !== req.user.id) {
        throw new AppError('Not authorized to view this feedback', 403);
      }

      res.json({
        success: true,
        data: { feedback },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get User Feedback
   * GET /api/v1/feedback/user/:userId
   */
  async getUserFeedback(req, res, next) {
    try {
      const { userId } = req.params;

      // Check permission
      if (req.user.role !== 'admin' && userId !== req.user.id) {
        throw new AppError('Not authorized to view this feedback', 403);
      }

      const feedback = await Feedback.find({ user: userId })
        .populate('event', 'title date venue')
        .sort('-createdAt');

      res.json({
        success: true,
        data: {
          total: feedback.length,
          feedback,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Feedback
   * PUT /api/v1/feedback/:id
   */
  async updateFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { rating, content, venue, organization, suggestions, wouldRecommend } = req.body;

      const feedback = await Feedback.findById(id);
      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      // Check permission
      if (feedback.user.toString() !== req.user.id) {
        throw new AppError('Not authorized to update this feedback', 403);
      }

      // Update fields
      if (rating !== undefined) {
        if (typeof rating === 'object') {
          if (rating.overall) feedback.rating.overall = rating.overall;
          if (venue) feedback.rating.venue = venue;
          if (organization) feedback.rating.organization = organization;
        } else {
          feedback.rating.overall = rating;
        }
      }
      if (content !== undefined) feedback.content = content;
      if (suggestions !== undefined) feedback.suggestions = suggestions;
      if (wouldRecommend !== undefined) feedback.wouldRecommend = wouldRecommend;

      await feedback.save();

      logger.info(`Feedback updated: ${id} by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Feedback updated successfully',
        data: { feedback },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Feedback
   * DELETE /api/v1/feedback/:id
   */
  async deleteFeedback(req, res, next) {
    try {
      const { id } = req.params;

      const feedback = await Feedback.findById(id);
      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      // Check permission (user can delete own, admin can delete any)
      if (req.user.role !== 'admin' && feedback.user.toString() !== req.user.id) {
        throw new AppError('Not authorized to delete this feedback', 403);
      }

      await feedback.deleteOne();

      logger.info(`Feedback deleted: ${id} by ${req.user.role} ${req.user.id}`);

      res.json({
        success: true,
        message: 'Feedback deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Respond to Feedback (Admin)
   * POST /api/v1/feedback/:id/respond
   */
  async respondToFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { message } = req.body;

      const feedback = await Feedback.findById(id);
      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      feedback.response = {
        message,
        respondedBy: req.user.id,
        respondedAt: new Date(),
      };

      await feedback.save();

      logger.info(`Feedback response added: ${id} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Response added successfully',
        data: { feedback },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Flag Feedback (Admin)
   * POST /api/v1/feedback/:id/flag
   */
  async flagFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const feedback = await Feedback.findById(id);
      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      feedback.flagged = true;
      feedback.flagReason = reason;
      await feedback.save();

      logger.info(`Feedback flagged: ${id} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Feedback flagged successfully',
        data: { feedback },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Feedback Analytics
   * GET /api/v1/feedback/analytics/:eventId
   */
  async getFeedbackAnalytics(req, res, next) {
    try {
      const { eventId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const feedback = await Feedback.find({ event: eventId });

      if (feedback.length === 0) {
        return res.json({
          success: true,
          data: {
            totalFeedback: 0,
            averageRating: 0,
            ratingDistribution: {},
            npsScore: 0,
            responseRate: 0,
          },
        });
      }

      // Calculate average ratings
      const totalRatings = feedback.reduce((sum, f) => sum + f.rating.overall, 0);
      const averageRating = (totalRatings / feedback.length).toFixed(2);

      const totalVenueRatings = feedback
        .filter((f) => f.rating.venue)
        .reduce((sum, f) => sum + f.rating.venue, 0);
      const averageVenueRating = feedback.filter((f) => f.rating.venue).length
        ? (totalVenueRatings / feedback.filter((f) => f.rating.venue).length).toFixed(2)
        : 0;

      const totalOrgRatings = feedback
        .filter((f) => f.rating.organization)
        .reduce((sum, f) => sum + f.rating.organization, 0);
      const averageOrgRating = feedback.filter((f) => f.rating.organization).length
        ? (totalOrgRatings / feedback.filter((f) => f.rating.organization).length).toFixed(2)
        : 0;

      // Rating distribution
      const ratingDistribution = {};
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i] = feedback.filter((f) => f.rating.overall === i).length;
      }

      // NPS Score (based on wouldRecommend)
      const recommendCount = feedback.filter((f) => f.wouldRecommend === true).length;
      const notRecommendCount = feedback.filter((f) => f.wouldRecommend === false).length;
      const npsScore = feedback.length
        ? (((recommendCount - notRecommendCount) / feedback.length) * 100).toFixed(2)
        : 0;

      // Response rate
      const responseRate = event.attendedCount
        ? ((feedback.length / event.attendedCount) * 100).toFixed(2)
        : 0;

      // Category distribution
      const categoryDistribution = {};
      feedback.forEach((f) => {
        if (f.category) {
          categoryDistribution[f.category] = (categoryDistribution[f.category] || 0) + 1;
        }
      });

      // Common suggestions (simplified - just count of suggestions)
      const suggestionsCount = feedback.filter((f) => f.suggestions).length;

      const analytics = {
        totalFeedback: feedback.length,
        averageRating: parseFloat(averageRating),
        averageVenueRating: parseFloat(averageVenueRating),
        averageOrganizationRating: parseFloat(averageOrgRating),
        ratingDistribution,
        npsScore: parseFloat(npsScore),
        recommendationRate: ((recommendCount / feedback.length) * 100).toFixed(2),
        responseRate: parseFloat(responseRate),
        categoryDistribution,
        suggestionsCount,
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
   * Export Feedback (Admin)
   * GET /api/v1/feedback/export/:eventId
   */
  async exportFeedback(req, res, next) {
    try {
      const { eventId } = req.params;
      const { format = 'json' } = req.query;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const feedback = await Feedback.find({ event: eventId })
        .populate('user', 'firstName lastName email')
        .sort('-createdAt');

      // TODO: Implement CSV/PDF export based on format

      res.json({
        success: true,
        data: {
          event: {
            id: event._id,
            title: event.title,
            date: event.date,
          },
          totalFeedback: feedback.length,
          feedback,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get All Feedback (Admin)
   * GET /api/v1/feedback
   */
  async getAllFeedback(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        event,
        rating,
        flagged,
        hasResponse,
        sort = '-createdAt',
      } = req.query;

      const query = {};

      if (event) query.event = event;
      if (rating) query['rating.overall'] = parseInt(rating);
      if (flagged === 'true') query.flagged = true;
      if (hasResponse === 'true') query['response.message'] = { $exists: true };

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        populate: [
          { path: 'user', select: 'firstName lastName email' },
          { path: 'event', select: 'title date' },
        ],
      };

      const feedback = await Feedback.paginate(query, options);

      res.json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FeedbackController();
