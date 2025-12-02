import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    // Basic Information
    fullname: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [3, 'Full name must be at least 3 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
      index: true,
    },

    // Authentication
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password in queries by default
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationExpires: Date,

    // Password Reset
    resetToken: String,
    resetTokenExpiration: Date,
    passwordChangedAt: Date,
    passwordHistory: [String], // Last 5 hashed passwords

    // Profile Information
    phone: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^[0-9]{10,15}$/.test(v.replace(/[\s\-\(\)]/g, ''));
        },
        message: 'Please provide a valid phone number',
      },
    },
    organisation: {
      type: String,
      maxlength: [200, 'Organisation name cannot exceed 200 characters'],
    },
    jobTitle: {
      type: String,
      maxlength: [100, 'Job title cannot exceed 100 characters'],
    },
    biography: {
      type: String,
      maxlength: [500, 'Biography cannot exceed 500 characters'],
    },
    profileImage: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'Nigeria' },
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    dateOfBirth: Date,

    // Preferences
    preferences: {
      language: {
        type: String,
        enum: ['en', 'ha'],
        default: 'en',
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      marketingEmails: {
        type: Boolean,
        default: false,
      },
      eventReminders: {
        dayBefore: { type: Boolean, default: true },
        twoHours: { type: Boolean, default: true },
        startTime: { type: Boolean, default: false },
      },
    },

    // Activity & Relationships
    registeredEvents: [
      {
        eventId: {
          type: Schema.Types.ObjectId,
          ref: 'Event',
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
        qrCode: String,
      },
    ],
    attendedEvents: [
      {
        eventId: {
          type: Schema.Types.ObjectId,
          ref: 'Event',
        },
        attendedAt: Date,
        checkInMethod: {
          type: String,
          enum: ['qr', 'manual'],
          default: 'qr',
        },
      },
    ],
    certificates: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Certificate',
      },
    ],
    feedbacks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Feedback',
      },
    ],

    // Gamification & Stats
    stats: {
      totalEventsRegistered: { type: Number, default: 0 },
      totalEventsAttended: { type: Number, default: 0 },
      totalCertificates: { type: Number, default: 0 },
      attendanceStreak: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
    },
    badges: [String],

    // Account Status & Security
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    // Two-Factor Authentication
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },

    // Sessions
    sessions: [
      {
        token: String,
        device: String,
        ip: String,
        lastActive: Date,
      },
    ],

    // Metadata
    lastLogin: Date,
    lastActivity: Date,
    registrationSource: {
      type: String,
      enum: ['web', 'mobile', 'admin'],
      default: 'web',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ status: 1 });
UserSchema.index({ 'stats.totalEventsAttended': -1 }); // For leaderboards

// Virtual Properties
UserSchema.virtual('attendanceRate').get(function () {
  if (this.stats.totalEventsRegistered === 0) return 0;
  return ((this.stats.totalEventsAttended / this.stats.totalEventsRegistered) * 100).toFixed(2);
});

UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Instance Methods
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.incrementLoginAttempts = function () {
  // Lock account after 5 failed attempts for 2 hours
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

UserSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Pre-save Middleware
UserSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();

  try {
    // Hash password
    this.password = await bcrypt.hash(this.password, config.security.bcryptRounds);

    // Update passwordChangedAt
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save: Generate username if not provided
UserSchema.pre('save', function (next) {
  if (!this.username && this.email) {
    this.username = this.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  next();
});

const User = mongoose.model('User', UserSchema);

export default User;
