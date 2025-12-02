import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';

const { Schema } = mongoose;

const AdminSchema = new Schema(
  {
    // Basic Information
    fullname: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [3, 'Full name must be at least 3 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Only allow CITAD email addresses
          return /@citad\.(org|edu\.ng)$/i.test(v);
        },
        message: 'Only CITAD email addresses (@citad.org or @citad.edu.ng) are allowed',
      },
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    // OTP & Two-Factor Authentication
    otpSecret: {
      type: String,
      select: false,
    },
    otpEnabled: {
      type: Boolean,
      default: true,
    },
    backupCodes: {
      type: [String],
      select: false,
    },

    // Role-Based Access Control (RBAC)
    role: {
      type: String,
      enum: ['super_admin', 'event_manager', 'staff', 'auditor'],
      default: 'staff',
      required: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          'create_event',
          'edit_event',
          'delete_event',
          'manage_users',
          'view_reports',
          'generate_certificates',
          'send_notifications',
          'manage_admins',
          'view_analytics',
          'export_data',
          'manage_settings',
        ],
      },
    ],

    // Profile
    phone: String,
    profileImage: String,
    department: {
      type: String,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },

    // Activity Tracking
    lastLogin: Date,
    loginHistory: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        ip: String,
        userAgent: String,
        success: Boolean,
        location: String,
      },
    ],

    // Audit Trail
    actionsLog: [
      {
        action: {
          type: String,
          required: true,
        },
        resource: String,
        resourceId: Schema.Types.ObjectId,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: Schema.Types.Mixed,
        ipAddress: String,
      },
    ],

    // Account Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
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

    // Security
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    // Created By (for audit purposes)
    createdBy: {
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
AdminSchema.index({ email: 1 }, { unique: true });
AdminSchema.index({ role: 1, status: 1 });
AdminSchema.index({ 'actionsLog.timestamp': -1 }); // For recent actions query

// Virtual Properties
AdminSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

AdminSchema.virtual('recentActions').get(function () {
  return this.actionsLog.slice(-10).reverse(); // Last 10 actions
});

// Instance Methods
AdminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

AdminSchema.methods.logAction = async function (action, resource, resourceId, details, ipAddress) {
  this.actionsLog.push({
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    timestamp: new Date(),
  });

  // Keep only last 1000 actions to prevent document size issues
  if (this.actionsLog.length > 1000) {
    this.actionsLog = this.actionsLog.slice(-1000);
  }

  return this.save();
};

AdminSchema.methods.hasPermission = function (permission) {
  // Super admins have all permissions
  if (this.role === 'super_admin') return true;

  // Check if admin has the specific permission
  return this.permissions.includes(permission);
};

AdminSchema.methods.incrementLoginAttempts = function () {
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

AdminSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Pre-save Middleware
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, config.security.bcryptRounds);

    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save: Set default permissions based on role
AdminSchema.pre('save', function (next) {
  if (!this.isModified('role') && this.permissions.length > 0) return next();

  const rolePermissions = {
    super_admin: [
      'create_event',
      'edit_event',
      'delete_event',
      'manage_users',
      'view_reports',
      'generate_certificates',
      'send_notifications',
      'manage_admins',
      'view_analytics',
      'export_data',
      'manage_settings',
    ],
    event_manager: [
      'create_event',
      'edit_event',
      'delete_event',
      'view_reports',
      'generate_certificates',
      'send_notifications',
      'view_analytics',
      'export_data',
    ],
    staff: ['view_reports', 'generate_certificates', 'view_analytics'],
    auditor: ['view_reports', 'view_analytics'],
  };

  this.permissions = rolePermissions[this.role] || [];
  next();
});

const Admin = mongoose.model('Admin', AdminSchema);

export default Admin;
