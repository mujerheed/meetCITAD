import { Feedback, Event, User } from '../models/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Feedback Controller
 * Handles event feedback, analytics and admin responses.
 */

const toId = (value) => (value?._id ? value._id.toString() : value?.toString());

const FEEDBACK_SORT_FIELDS = [
  '-createdAt',
  'createdAt',
  '-ratings.overall',
  'ratings.overall',
  '-npsScore',
  'npsScore',
];

const feedbackSort = (sort) =>
  FEEDBACK_SORT_FIELDS.includes(sort) ? sort : '-createdAt';

const userAttendedEvent = (event, user, userId) => {
  if (
    (event.attendedUsers || []).some(
      (attendance) => toId(attendance.userId) === userId.toString()
    )
  ) {
    return true;
  }

  return (user.registeredEvents || []).some(
    (registration) =>
      toId(registration.eventId) === event._id.toString() && registration.attended
  );
};

const refreshEventRating = async (eventId) => {
  const [summary] = await Feedback.aggregate([
    { $match: { eventId: eventId, status: { $ne: 'draft' } } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$ratings.overall' },
        totalFeedbacks: { $sum: 1 },
      },
    },
  ]);

  await Event.findByIdAndUpdate(eventId, {
    averageRating: summary?.averageRating
      ? Number(summary.averageRating.toFixed(2))
      : 0,
    totalFeedbacks: summary?.totalFeedbacks || 0,
  });
};

class FeedbackController {
  /**
   * Submit Feedback
   * POST /api/v1/feedback
   */
  async submitFeedback(req, res, next) {
    try {
      const body = req.body || {};
      const eventId = body.eventId || body.event;
      const overall =
        body.ratings?.overall ??
        body.rating?.overall ??
        body.rating;

      if (!eventId) {
        throw new AppError('Event ID is required', 400);
      }

      if (!overall) {
        throw new AppError('Overall rating is required', 400);
      }

      const userId = req.user.id;

      const [event, user] = await Promise.all([
        Event.findById(eventId),
        User.findById(userId),
      ]);

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!userAttendedEvent(event, user, userId)) {
        throw new AppError('You must attend the event to submit feedback', 403);
      }

      const existingFeedback = await Feedback.findOne({ userId, eventId });
      if (existingFeedback) {
        throw new AppError('Feedback already submitted for this event', 400);
      }

      const ratings = {
        ...(body.ratings || {}),
        overall,
        venue: body.ratings?.venue ?? body.venue,
        organization: body.ratings?.organization ?? body.organization,
      };

      const comments = body.comments || {
        whatYouLiked: body.content,
        whatCanBeImproved: body.suggestions,
      };

      const booleanQuestions = body.booleanQuestions || {
        wouldRecommend: body.wouldRecommend ?? true,
      };

      const feedback = await Feedback.create({
        userId,
        eventId,
        npsScore: body.npsScore,
        ratings,
        comments,
        booleanQuestions,
        customResponses: body.customResponses || [],
        isAnonymous: Boolean(body.isAnonymous),
        submittedFrom: 'web',
        ipAddress: req.ip,
        metadata: {
          userAgent: req.get('user-agent'),
          language: body.language,
        },
      });

      await refreshEventRating(event._id);

      logger.info(
        `Feedback submitted for event ${event.title} by user ${user.email}`
      );

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
   * Get Event Feedback (Admin)
   * GET /api/v1/feedback/event/:eventId
   */
  async getEventFeedback(req, res, next) {
    try {
      const { eventId } = req.params;
      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        rating,
      } = req.query;

      const query = { eventId };
      if (rating) query['ratings.overall'] = parseInt(rating, 10);

      const pageNumber = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const [feedback, total] = await Promise.all([
        Feedback.find(query)
          .populate('userId', 'fullname email profileImage')
          .sort(feedbackSort(sort))
          .skip((pageNumber - 1) * pageSize)
          .limit(pageSize),
        Feedback.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          feedback,
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
   * Get Single Feedback
   * GET /api/v1/feedback/:id
   */
  async getFeedback(req, res, next) {
    try {
      const feedback = await Feedback.findById(req.params.id)
        .populate('userId', 'fullname email profileImage')
        .populate('eventId', 'title startDateTime venue');

      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      if (
        req.userRole !== 'admin' &&
        toId(feedback.userId) !== req.user.id.toString()
      ) {
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
   * Get User Feedback (Admin)
   * GET /api/v1/feedback/user/:userId
   */
  async getUserFeedback(req, res, next) {
    try {
      const { userId } = req.params;

      if (req.userRole !== 'admin' && userId !== req.user.id.toString()) {
        throw new AppError('Not authorized to view this feedback', 403);
      }

      const feedback = await Feedback.find({ userId })
        .populate('eventId', 'title startDateTime venue')
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
      const body = req.body || {};

      const feedback = await Feedback.findById(req.params.id);
      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      if (toId(feedback.userId) !== req.user.id.toString()) {
        throw new AppError('Not authorized to update this feedback', 403);
      }

      if (body.ratings) {
        Object.assign(feedback.ratings, body.ratings);
      }
      if (body.rating !== undefined) {
        feedback.ratings.overall =
          typeof body.rating === 'object'
            ? body.rating.overall
            : body.rating;
      }
      if (body.comments) feedback.comments = { ...feedback.comments, ...body.comments };
      if (body.content !== undefined) feedback.comments.whatYouLiked = body.content;
      if (body.suggestions !== undefined) {
        feedback.comments.whatCanBeImproved = body.suggestions;
      }
      if (body.booleanQuestions) {
        Object.assign(feedback.booleanQuestions, body.booleanQuestions);
      }
      if (body.wouldRecommend !== undefined) {
        feedback.booleanQuestions.wouldRecommend = body.wouldRecommend;
      }
      if (body.npsScore !== undefined) feedback.npsScore = body.npsScore;

      await feedback.save();
      await refreshEventRating(feedback.eventId);

      logger.info(`Feedback updated: ${feedback._id} by user ${req.user.id}`);

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
      const feedback = await Feedback.findById(req.params.id);
      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      if (
        req.userRole !== 'admin' &&
        toId(feedback.userId) !== req.user.id.toString()
      ) {
        throw new AppError('Not authorized to delete this feedback', 403);
      }

      const eventId = feedback.eventId;
      await feedback.deleteOne();
      await refreshEventRating(eventId);

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
      const feedback = await Feedback.findById(req.params.id);
      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      feedback.response = {
        message: req.body.message,
        respondedBy: req.user.id,
        respondedAt: new Date(),
      };

      await feedback.save();

      logger.info(`Feedback response added: ${feedback._id} by admin ${req.user.id}`);

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
      const feedback = await Feedback.findById(req.params.id);
      if (!feedback) {
        throw new AppError('Feedback not found', 404);
      }

      feedback.isFlagged = true;
      feedback.flagReason = req.body.reason;
      await feedback.save();

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
   * Get Feedback Analytics (Admin)
   * GET /api/v1/feedback/analytics/:eventId
   */
  async getFeedbackAnalytics(req, res, next) {
    try {
      const { eventId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const feedback = await Feedback.find({ eventId });

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

      const totalRatings = feedback.reduce(
        (sum, item) => sum + (item.ratings?.overall || 0),
        0
      );
      const averageRating = (totalRatings / feedback.length).toFixed(2);

      const withVenue = feedback.filter((item) => item.ratings?.venue);
      const averageVenueRating = withVenue.length
        ? (
            withVenue.reduce((sum, item) => sum + item.ratings.venue, 0) /
            withVenue.length
          ).toFixed(2)
        : 0;

      const withOrganization = feedback.filter(
        (item) => item.ratings?.organization
      );
      const averageOrganizationRating = withOrganization.length
        ? (
            withOrganization.reduce(
              (sum, item) => sum + item.ratings.organization,
              0
            ) / withOrganization.length
          ).toFixed(2)
        : 0;

      const ratingDistribution = {};
      for (let i = 1; i <= 5; i += 1) {
        ratingDistribution[i] = feedback.filter(
          (item) => item.ratings?.overall === i
        ).length;
      }

      const recommendCount = feedback.filter(
        (item) => item.booleanQuestions?.wouldRecommend === true
      ).length;

      const npsScores = feedback
        .map((item) => item.npsScore)
        .filter((score) => score !== undefined && score !== null);

      let npsScore = 0;
      if (npsScores.length > 0) {
        const promoters = npsScores.filter((score) => score >= 9).length;
        const detractors = npsScores.filter((score) => score <= 6).length;
        npsScore = (
          ((promoters - detractors) / npsScores.length) *
          100
        ).toFixed(2);
      }

      const responseRate = event.attendanceCount
        ? ((feedback.length / event.attendanceCount) * 100).toFixed(2)
        : 0;

      res.json({
        success: true,
        data: {
          analytics: {
            totalFeedback: feedback.length,
            averageRating: parseFloat(averageRating),
            averageVenueRating: parseFloat(averageVenueRating),
            averageOrganizationRating: parseFloat(averageOrganizationRating),
            ratingDistribution,
            npsScore: parseFloat(npsScore),
            recommendationRate: (
              (recommendCount / feedback.length) *
              100
            ).toFixed(2),
            responseRate: parseFloat(responseRate),
            suggestionsCount: feedback.filter(
              (item) => item.comments?.whatCanBeImproved
            ).length,
          },
        },
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

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const feedback = await Feedback.find({ eventId })
        .populate('userId', 'fullname email')
        .sort('-createdAt');

      res.json({
        success: true,
        data: {
          event: {
            id: event._id,
            title: event.title,
            startDateTime: event.startDateTime,
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
        eventId,
        rating,
        flagged,
        hasResponse,
        sort = '-createdAt',
      } = req.query;

      const query = {};
      if (eventId) query.eventId = eventId;
      if (rating) query['ratings.overall'] = parseInt(rating, 10);
      if (flagged === 'true') query.isFlagged = true;
      if (flagged === 'false') query.isFlagged = { $ne: true };
      if (hasResponse === 'true') query['response.message'] = { $exists: true, $ne: '' };
      if (hasResponse === 'false') {
        query.$or = [
          { 'response.message': { $exists: false } },
          { 'response.message': '' },
        ];
      }

      const pageNumber = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const [feedback, total] = await Promise.all([
        Feedback.find(query)
          .populate('userId', 'fullname email')
          .populate('eventId', 'title startDateTime')
          .sort(feedbackSort(sort))
          .skip((pageNumber - 1) * pageSize)
          .limit(pageSize),
        Feedback.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          feedback,
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
}

export default new FeedbackController();
