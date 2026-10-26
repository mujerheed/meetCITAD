import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

const isStandalone = function () {
  return this.source !== 'event';
};

const contactSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [120, 'Contact name cannot exceed 120 characters'],
    },
    officialEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid official email'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [40, 'Contact phone cannot exceed 40 characters'],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [120, 'Contact department cannot exceed 120 characters'],
    },
    publicEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid public email'],
    },
    publicPhone: {
      type: String,
      trim: true,
      maxlength: [40, 'Public phone cannot exceed 40 characters'],
    },
    showPublicContact: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const venueSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Venue name cannot exceed 200 characters'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Venue address cannot exceed 300 characters'],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    region: {
      type: String,
      trim: true,
      maxlength: [100, 'Region cannot exceed 100 characters'],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
      default: 'Nigeria',
    },
  },
  { _id: false }
);

const WeeklyActivitySchema = new Schema(
  {
    weeklyProgramId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyProgram',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['standalone', 'event'],
      default: 'standalone',
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      required: isStandalone,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    activityType: {
      type: String,
      enum: [
        'event',
        'meeting',
        'training',
        'field_activity',
        'campaign',
        'survey',
        'research',
        'assignment',
        'other',
      ],
      default: 'other',
      index: true,
    },
    project: {
      type: String,
      trim: true,
      maxlength: [160, 'Project cannot exceed 160 characters'],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [160, 'Department cannot exceed 160 characters'],
      index: true,
    },
    referenceCode: {
      type: String,
      trim: true,
      maxlength: [80, 'Reference code cannot exceed 80 characters'],
    },
    startDateTime: {
      type: Date,
      required: isStandalone,
      index: true,
    },
    endDateTime: {
      type: Date,
      required: isStandalone,
    },
    timezone: {
      type: String,
      default: 'Africa/Lagos',
      trim: true,
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    venue: {
      type: venueSchema,
      default: () => ({}),
    },
    mode: {
      type: String,
      enum: ['physical', 'virtual', 'hybrid'],
      default: 'physical',
    },
    meetingUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/i, 'Meeting URL must start with http:// or https://'],
    },
    contact: {
      type: contactSchema,
      default: () => ({}),
    },
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [3000, 'Internal notes cannot exceed 3000 characters'],
    },
    visibility: {
      type: String,
      enum: ['public', 'authenticated', 'staff'],
      default: 'public',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    bannerImage: String,
    thumbnail: String,
    publishedAt: Date,
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    archivedAt: Date,
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

WeeklyActivitySchema.index({ weeklyProgramId: 1, startDateTime: 1 });
WeeklyActivitySchema.index({
  startDateTime: 1,
  endDateTime: 1,
  status: 1,
  visibility: 1,
});
WeeklyActivitySchema.index(
  { weeklyProgramId: 1, eventId: 1 },
  {
    unique: true,
    partialFilterExpression: { eventId: { $type: 'objectId' } },
  }
);

WeeklyActivitySchema.virtual('isLinkedEvent').get(function () {
  return this.source === 'event' || Boolean(this.eventId);
});

WeeklyActivitySchema.methods.generateSlug = function () {
  const base = String(this.title || 'activity')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return `${base || 'activity'}-${crypto.randomBytes(4).toString('hex')}`;
};

WeeklyActivitySchema.pre('validate', function (next) {
  if (this.source === 'event') {
    if (!this.eventId) {
      return next(new Error('A linked weekly activity requires an eventId'));
    }
    return next();
  }

  if (!this.startDateTime || !this.endDateTime) {
    return next(new Error('Start and end date/time are required'));
  }

  if (new Date(this.endDateTime) <= new Date(this.startDateTime)) {
    return next(new Error('End date/time must be after start date/time'));
  }

  if (!this.slug && this.title) {
    this.slug = this.generateSlug();
  }

  return next();
});

const WeeklyActivity = mongoose.model('WeeklyActivity', WeeklyActivitySchema);

export default WeeklyActivity;
