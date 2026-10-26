import mongoose from 'mongoose';
import { endOfWeekForStart } from '../utils/week.js';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    version: Number,
    batchId: String,
    sentAt: Date,
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    channels: [String],
  },
  { _id: false }
);

const WeeklyProgramSchema = new Schema(
  {
    weekStart: {
      type: Date,
      required: [true, 'Week start is required'],
      unique: true,
      index: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: 'CITAD Weekly Programs',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publicContactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: () => process.env.WEEKLY_PUBLIC_CONTACT_EMAIL || 'info@citad.org',
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid public contact email'],
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    publishedVersion: {
      type: Number,
      default: 0,
    },
    publishedAt: Date,
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    unpublishedAt: Date,
    unpublishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    archivedAt: Date,
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    notification: {
      type: notificationSchema,
      default: () => ({}),
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

WeeklyProgramSchema.index({ status: 1, weekStart: -1 });

WeeklyProgramSchema.virtual('isPublished').get(function () {
  return this.status === 'published';
});

WeeklyProgramSchema.pre('save', function (next) {
  if (this.weekStart && (!this.weekEnd || this.isModified('weekStart'))) {
    this.weekEnd = endOfWeekForStart(this.weekStart);
  }
  next();
});

const WeeklyProgram = mongoose.model('WeeklyProgram', WeeklyProgramSchema);

export default WeeklyProgram;
