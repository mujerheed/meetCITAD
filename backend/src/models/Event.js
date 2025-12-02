import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

const EventSchema = new Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    shortDescription: {
      type: String,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },

    // Scheduling
    startDateTime: {
      type: Date,
      required: [true, 'Start date and time is required'],
      index: true,
    },
    endDateTime: {
      type: Date,
      required: [true, 'End date and time is required'],
    },
    timezone: {
      type: String,
      default: 'Africa/Lagos',
    },

    // Location
    venue: {
      name: {
        type: String,
        required: [true, 'Venue name is required'],
      },
      address: String,
      city: {
        type: String,
        default: 'Kano',
      },
      state: {
        type: String,
        default: 'Kano',
      },
      country: {
        type: String,
        default: 'Nigeria',
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    // Metadata
    category: {
      type: String,
      enum: ['workshop', 'seminar', 'training', 'conference', 'webinar', 'other'],
      default: 'seminar',
      index: true,
    },
    tags: [String],
    hostBy: {
      type: String,
      required: [true, 'Host information is required'],
    },
    speakers: [
      {
        name: String,
        title: String,
        bio: String,
        photo: String,
      },
    ],

    // Media
    bannerImage: {
      type: String,
      required: [true, 'Event banner image is required'],
    },
    thumbnail: String,
    gallery: [String],

    // Capacity Management
    capacity: {
      type: Number,
      required: [true, 'Event capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    registrationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    attendanceCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    waitlistEnabled: {
      type: Boolean,
      default: false,
    },

    // QR Code & Attendance
    eventQRCode: String, // URL to QR code image
    qrData: String, // QR code content/data
    qrSignature: String, // HMAC signature for verification
    checkInEnabled: {
      type: Boolean,
      default: true,
    },

    // Certificates
    certificateEnabled: {
      type: Boolean,
      default: true,
    },
    certificateTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'CertificateTemplate',
    },
    certificatesGenerated: {
      type: Boolean,
      default: false,
    },
    certificateGeneratedAt: Date,

    // Feedback
    feedbackEnabled: {
      type: Boolean,
      default: true,
    },
    feedbackDeadline: Date,
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalFeedbacks: {
      type: Number,
      default: 0,
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public',
    },

    // Registration Control
    registrationOpens: Date,
    registrationCloses: Date,
    requireApproval: {
      type: Boolean,
      default: false,
    },

    // Registered Users
    registeredUsers: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['pending', 'confirmed', 'cancelled'],
          default: 'confirmed',
        },
        qrCode: String, // Personal QR code for this user
        qrSignature: String, // Signature for QR verification
      },
    ],

    // Attended Users
    attendedUsers: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        checkInTime: {
          type: Date,
          default: Date.now,
        },
        checkInMethod: {
          type: String,
          enum: ['qr', 'manual'],
          default: 'qr',
        },
        checkInBy: {
          type: Schema.Types.ObjectId,
          ref: 'Admin',
        },
      },
    ],

    // Waitlist
    waitlist: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Analytics
    views: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },

    // Admin References
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    lastModifiedBy: {
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

// Indexes
EventSchema.index({ startDateTime: 1, status: 1 });
EventSchema.index({ category: 1, status: 1 });
EventSchema.index({ slug: 1 }, { unique: true });
EventSchema.index({ 'venue.city': 1 });
EventSchema.index({ tags: 1 });

// Virtual Properties
EventSchema.virtual('isFull').get(function () {
  return this.registrationCount >= this.capacity;
});

EventSchema.virtual('spotsLeft').get(function () {
  return Math.max(0, this.capacity - this.registrationCount);
});

EventSchema.virtual('attendanceRate').get(function () {
  return this.registrationCount > 0
    ? ((this.attendanceCount / this.registrationCount) * 100).toFixed(2)
    : 0;
});

EventSchema.virtual('isUpcoming').get(function () {
  return this.startDateTime > new Date();
});

EventSchema.virtual('isOngoing').get(function () {
  const now = new Date();
  return this.startDateTime <= now && this.endDateTime >= now;
});

EventSchema.virtual('isPast').get(function () {
  return this.endDateTime < new Date();
});

EventSchema.virtual('registrationOpen').get(function () {
  const now = new Date();
  const opensAt = this.registrationOpens || this.createdAt;
  const closesAt = this.registrationCloses || this.startDateTime;
  return now >= opensAt && now <= closesAt && !this.isFull;
});

// Instance Methods
EventSchema.methods.generateSlug = function () {
  const baseSlug = this.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const uniqueId = crypto.randomBytes(4).toString('hex');
  return `${baseSlug}-${uniqueId}`;
};

EventSchema.methods.generateQRData = function () {
  const eventData = {
    eventId: this._id.toString(),
    title: this.title,
    date: this.startDateTime.toISOString(),
  };
  return JSON.stringify(eventData);
};

EventSchema.methods.generateQRSignature = function (data) {
  return crypto
    .createHmac('sha256', process.env.QR_SIGNATURE_KEY || 'default-qr-key')
    .update(data)
    .digest('hex');
};

EventSchema.methods.verifyQRSignature = function (data, signature) {
  const expectedSignature = this.generateQRSignature(data);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

EventSchema.methods.isUserRegistered = function (userId) {
  return this.registeredUsers.some(
    reg => reg.userId.toString() === userId.toString() && reg.status === 'confirmed'
  );
};

EventSchema.methods.isUserAttended = function (userId) {
  return this.attendedUsers.some(att => att.userId.toString() === userId.toString());
};

// Pre-save Middleware
EventSchema.pre('save', function (next) {
  // Generate slug if not exists or title changed
  if (!this.slug || this.isModified('title')) {
    this.slug = this.generateSlug();
  }

  // Generate short description from description if not provided
  if (!this.shortDescription && this.description) {
    this.shortDescription = this.description.substring(0, 297) + '...';
  }

  // Set feedback deadline if not set (7 days after event end)
  if (!this.feedbackDeadline && this.endDateTime) {
    this.feedbackDeadline = new Date(this.endDateTime.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  next();
});

// Pre-save: Update registration count
EventSchema.pre('save', function (next) {
  if (this.isModified('registeredUsers')) {
    this.registrationCount = this.registeredUsers.filter(
      reg => reg.status === 'confirmed'
    ).length;
  }
  if (this.isModified('attendedUsers')) {
    this.attendanceCount = this.attendedUsers.length;
  }
  next();
});

const Event = mongoose.model('Event', EventSchema);

export default Event;
