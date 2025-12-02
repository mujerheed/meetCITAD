import mongoose from 'mongoose';

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    // Recipient
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Notification Content
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    shortMessage: {
      type: String,
      maxlength: [160, 'Short message cannot exceed 160 characters (SMS limit)'],
    },

    // Type & Category
    type: {
      type: String,
      enum: [
        'event_reminder',
        'registration_confirmation',
        'event_update',
        'certificate_ready',
        'feedback_request',
        'system',
        'promotional',
        'announcement',
      ],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },

    // Related Resources
    relatedEvent: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      index: true,
    },
    relatedCertificate: {
      type: Schema.Types.ObjectId,
      ref: 'Certificate',
    },

    // Channels
    channels: {
      inApp: {
        enabled: {
          type: Boolean,
          default: true,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
      },
      email: {
        enabled: {
          type: Boolean,
          default: false,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        messageId: String, // Email service message ID
        error: String,
      },
      sms: {
        enabled: {
          type: Boolean,
          default: false,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        messageId: String, // SMS service message ID
        error: String,
      },
      push: {
        enabled: {
          type: Boolean,
          default: false,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        messageId: String,
        error: String,
      },
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,

    // Priority & Scheduling
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    scheduledFor: {
      type: Date,
      index: true,
    },
    expiresAt: Date,

    // Action/CTA
    actionUrl: String,
    actionLabel: String,
    actionData: Schema.Types.Mixed,

    // Metadata
    metadata: {
      icon: String,
      image: String,
      sound: String,
      badge: Number,
      customData: Schema.Types.Mixed,
    },

    // Tracking
    clicked: {
      type: Boolean,
      default: false,
    },
    clickedAt: Date,
    dismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: Date,

    // Sender (for admin-initiated notifications)
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },

    // Batch Info (for bulk notifications)
    batchId: String,
    isBulk: {
      type: Boolean,
      default: false,
    },

    // Retry Logic
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastError: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ status: 1, scheduledFor: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
NotificationSchema.index({ batchId: 1 });

// Virtual Properties
NotificationSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

NotificationSchema.virtual('isSent').get(function () {
  return this.status === 'sent';
});

NotificationSchema.virtual('isPending').get(function () {
  return this.status === 'pending';
});

NotificationSchema.virtual('shouldSendNow').get(function () {
  if (this.status !== 'pending') return false;
  if (this.isExpired) return false;
  if (this.scheduledFor && this.scheduledFor > new Date()) return false;
  return true;
});

NotificationSchema.virtual('deliveryStatus').get(function () {
  const channels = [];
  if (this.channels.inApp.sent) channels.push('in-app');
  if (this.channels.email.sent) channels.push('email');
  if (this.channels.sms.sent) channels.push('sms');
  if (this.channels.push.sent) channels.push('push');
  return channels;
});

// Instance Methods
NotificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsClicked = function () {
  this.clicked = true;
  this.clickedAt = new Date();
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
  }
  return this.save();
};

NotificationSchema.methods.dismiss = function () {
  this.dismissed = true;
  this.dismissedAt = new Date();
  return this.save();
};

NotificationSchema.methods.markChannelSent = function (channel, messageId = null) {
  if (!this.channels[channel]) return this;
  this.channels[channel].sent = true;
  this.channels[channel].sentAt = new Date();
  if (messageId) {
    this.channels[channel].messageId = messageId;
  }

  // Update overall status
  const allChannelsSent = Object.keys(this.channels).every(
    ch => !this.channels[ch].enabled || this.channels[ch].sent
  );
  if (allChannelsSent) {
    this.status = 'sent';
  }

  return this.save();
};

NotificationSchema.methods.markChannelFailed = function (channel, error) {
  if (!this.channels[channel]) return this;
  this.channels[channel].error = error;
  this.lastError = error;
  this.retryCount += 1;

  if (this.retryCount >= this.maxRetries) {
    this.status = 'failed';
  }

  return this.save();
};

NotificationSchema.methods.retry = function () {
  if (this.retryCount >= this.maxRetries) {
    throw new Error('Maximum retry attempts reached');
  }
  this.status = 'pending';
  this.retryCount += 1;
  return this.save();
};

// Static Methods
NotificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ userId, read: false, status: 'sent' });
};

NotificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
};

NotificationSchema.statics.getPendingNotifications = async function () {
  return this.find({
    status: 'pending',
    $or: [{ scheduledFor: { $lte: new Date() } }, { scheduledFor: { $exists: false } }],
    $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
  }).sort({ priority: -1, createdAt: 1 });
};

NotificationSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $lte: new Date() },
  });
  return result.deletedCount;
};

// Pre-save Middleware
NotificationSchema.pre('save', function (next) {
  // Generate short message from message if not provided
  if (!this.shortMessage && this.message) {
    this.shortMessage = this.message.substring(0, 157) + '...';
  }

  // Set default expiry (30 days for non-urgent, 7 days for urgent)
  if (!this.expiresAt) {
    const days = this.priority === 'urgent' ? 7 : 30;
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  next();
});

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;
