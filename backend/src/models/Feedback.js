import mongoose from 'mongoose';

const { Schema } = mongoose;

const FeedbackSchema = new Schema(
  {
    // References
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },

    // NPS Score (Net Promoter Score)
    npsScore: {
      type: Number,
      min: [0, 'NPS score must be between 0 and 10'],
      max: [10, 'NPS score must be between 0 and 10'],
      index: true,
    },

    // Category Ratings (1-5 stars)
    ratings: {
      overall: {
        type: Number,
        required: [true, 'Overall rating is required'],
        min: [1, 'Rating must be between 1 and 5'],
        max: [5, 'Rating must be between 1 and 5'],
      },
      content: {
        type: Number,
        min: [1, 'Rating must be between 1 and 5'],
        max: [5, 'Rating must be between 1 and 5'],
      },
      speakers: {
        type: Number,
        min: [1, 'Rating must be between 1 and 5'],
        max: [5, 'Rating must be between 1 and 5'],
      },
      venue: {
        type: Number,
        min: [1, 'Rating must be between 1 and 5'],
        max: [5, 'Rating must be between 1 and 5'],
      },
      organization: {
        type: Number,
        min: [1, 'Rating must be between 1 and 5'],
        max: [5, 'Rating must be between 1 and 5'],
      },
      logistics: {
        type: Number,
        min: [1, 'Rating must be between 1 and 5'],
        max: [5, 'Rating must be between 1 and 5'],
      },
    },

    // Qualitative Feedback
    comments: {
      whatYouLiked: {
        type: String,
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      },
      whatCanBeImproved: {
        type: String,
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      },
      generalComments: {
        type: String,
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      },
    },

    // Yes/No Questions
    booleanQuestions: {
      wouldRecommend: {
        type: Boolean,
        required: true,
      },
      willAttendFuture: Boolean,
      objectivesMet: Boolean,
      valuableContent: Boolean,
    },

    // Custom Questions (if event has specific questions)
    customResponses: [
      {
        question: String,
        questionType: {
          type: String,
          enum: ['text', 'rating', 'boolean', 'choice'],
        },
        answer: Schema.Types.Mixed,
      },
    ],

    // Sentiment Analysis (if implemented)
    sentiment: {
      score: {
        type: Number,
        min: -1,
        max: 1,
      }, // -1 (negative) to 1 (positive)
      label: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
      },
      confidence: Number,
    },

    // Submission Info
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    submittedFrom: {
      type: String,
      enum: ['web', 'mobile', 'email'],
      default: 'web',
    },
    ipAddress: String,

    // Status
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewed'],
      default: 'submitted',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    reviewedAt: Date,

    // Flags
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: String,
    isAnonymous: {
      type: Boolean,
      default: false,
    },

    // Metadata
    metadata: {
      userAgent: String,
      timeSpent: Number, // seconds spent filling the form
      language: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
FeedbackSchema.index({ userId: 1, eventId: 1 }, { unique: true }); // One feedback per user per event
FeedbackSchema.index({ eventId: 1, status: 1 });
FeedbackSchema.index({ 'ratings.overall': 1 });
FeedbackSchema.index({ npsScore: 1 });
FeedbackSchema.index({ submittedAt: -1 });

// Virtual Properties
FeedbackSchema.virtual('npsCategory').get(function () {
  if (!this.npsScore && this.npsScore !== 0) return null;
  if (this.npsScore >= 9) return 'promoter';
  if (this.npsScore >= 7) return 'passive';
  return 'detractor';
});

FeedbackSchema.virtual('averageRating').get(function () {
  const ratings = Object.values(this.ratings).filter(r => typeof r === 'number');
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return (sum / ratings.length).toFixed(2);
});

FeedbackSchema.virtual('isPositive').get(function () {
  return this.ratings.overall >= 4;
});

FeedbackSchema.virtual('isNegative').get(function () {
  return this.ratings.overall <= 2;
});

// Instance Methods
FeedbackSchema.methods.markAsReviewed = function (adminId) {
  this.status = 'reviewed';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  return this.save();
};

FeedbackSchema.methods.flag = function (reason) {
  this.isFlagged = true;
  this.flagReason = reason;
  return this.save();
};

FeedbackSchema.methods.unflag = function () {
  this.isFlagged = false;
  this.flagReason = undefined;
  return this.save();
};

// Static Methods for Analytics
FeedbackSchema.statics.getEventAnalytics = async function (eventId) {
  const feedbacks = await this.find({ eventId, status: 'submitted' });

  if (feedbacks.length === 0) {
    return {
      totalFeedbacks: 0,
      averageRating: 0,
      nps: 0,
      ratings: {},
    };
  }

  // Calculate average ratings
  const ratingCategories = ['overall', 'content', 'speakers', 'venue', 'organization', 'logistics'];
  const ratings = {};

  ratingCategories.forEach(category => {
    const validRatings = feedbacks
      .map(f => f.ratings[category])
      .filter(r => typeof r === 'number');
    if (validRatings.length > 0) {
      ratings[category] = (
        validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
      ).toFixed(2);
    }
  });

  // Calculate NPS
  const npsScores = feedbacks.map(f => f.npsScore).filter(s => s !== null && s !== undefined);
  let nps = 0;
  if (npsScores.length > 0) {
    const promoters = npsScores.filter(s => s >= 9).length;
    const detractors = npsScores.filter(s => s <= 6).length;
    nps = ((promoters - detractors) / npsScores.length * 100).toFixed(2);
  }

  // Sentiment distribution
  const sentimentCounts = {
    positive: feedbacks.filter(f => f.sentiment?.label === 'positive').length,
    neutral: feedbacks.filter(f => f.sentiment?.label === 'neutral').length,
    negative: feedbacks.filter(f => f.sentiment?.label === 'negative').length,
  };

  // Recommendation rate
  const recommendCount = feedbacks.filter(f => f.booleanQuestions.wouldRecommend === true).length;
  const recommendationRate = ((recommendCount / feedbacks.length) * 100).toFixed(2);

  return {
    totalFeedbacks: feedbacks.length,
    averageRating: ratings.overall || 0,
    ratings,
    nps: parseFloat(nps),
    npsDistribution: {
      promoters: npsScores.filter(s => s >= 9).length,
      passives: npsScores.filter(s => s >= 7 && s < 9).length,
      detractors: npsScores.filter(s => s <= 6).length,
    },
    sentimentDistribution: sentimentCounts,
    recommendationRate: parseFloat(recommendationRate),
  };
};

// Pre-save Middleware
FeedbackSchema.pre('save', function (next) {
  // Auto-detect sentiment based on ratings if not already set
  if (!this.sentiment || !this.sentiment.label) {
    const avgRating = parseFloat(this.averageRating);
    if (avgRating >= 4) {
      this.sentiment = { label: 'positive', score: 0.7, confidence: 0.8 };
    } else if (avgRating >= 3) {
      this.sentiment = { label: 'neutral', score: 0, confidence: 0.7 };
    } else {
      this.sentiment = { label: 'negative', score: -0.7, confidence: 0.8 };
    }
  }

  next();
});

const Feedback = mongoose.model('Feedback', FeedbackSchema);

export default Feedback;
