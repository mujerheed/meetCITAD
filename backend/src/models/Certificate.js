import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

const CertificateSchema = new Schema(
  {
    // Certificate Identification
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    verificationHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    qrCode: String, // QR code image URL for verification

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
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'CertificateTemplate',
    },

    // Recipient Information (captured at generation time)
    recipientName: {
      type: String,
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
    },

    // Event Information (captured at generation time)
    eventTitle: {
      type: String,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    eventVenue: String,

    // Certificate Data
    issuedDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiryDate: Date, // Optional, for certificates with validity period

    // File Information
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: String,
    fileSize: Number, // in bytes
    fileType: {
      type: String,
      default: 'application/pdf',
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    revokedAt: Date,
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    revokeReason: String,

    // Delivery Status
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: Date,
    downloaded: {
      type: Boolean,
      default: false,
    },
    downloadedAt: Date,
    downloadCount: {
      type: Number,
      default: 0,
    },

    // Verification
    verificationCount: {
      type: Number,
      default: 0,
    },
    lastVerifiedAt: Date,

    // Metadata
    metadata: {
      grade: String, // If applicable
      score: Number, // If applicable
      hours: Number, // CPD hours if applicable
      customFields: Schema.Types.Mixed, // For additional template-specific data
    },

    // Generation Info
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    generationMethod: {
      type: String,
      enum: ['auto', 'manual', 'bulk'],
      default: 'auto',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
CertificateSchema.index({ userId: 1, eventId: 1 });
CertificateSchema.index({ status: 1, issuedDate: -1 });
CertificateSchema.index({ verificationHash: 1 }, { unique: true });
CertificateSchema.index({ certificateNumber: 1 }, { unique: true });

// Virtual Properties
CertificateSchema.virtual('isValid').get(function () {
  if (this.status === 'revoked') return false;
  if (this.status === 'expired') return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  return true;
});

CertificateSchema.virtual('verificationUrl').get(function () {
  const baseUrl = process.env.FRONTEND_URL || 'https://meetcitad.org';
  return `${baseUrl}/verify/${this.verificationHash}`;
});

// Instance Methods
CertificateSchema.methods.generateCertificateNumber = function () {
  const year = new Date().getFullYear();
  const randomId = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `CITAD-${year}-${randomId}`;
};

CertificateSchema.methods.generateVerificationHash = function () {
  const data = `${this.userId}-${this.eventId}-${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

CertificateSchema.methods.incrementDownloadCount = function () {
  this.downloadCount += 1;
  if (!this.downloaded) {
    this.downloaded = true;
    this.downloadedAt = new Date();
  }
  return this.save();
};

CertificateSchema.methods.incrementVerificationCount = function () {
  this.verificationCount += 1;
  this.lastVerifiedAt = new Date();
  return this.save();
};

CertificateSchema.methods.revoke = function (adminId, reason) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedBy = adminId;
  this.revokeReason = reason;
  return this.save();
};

CertificateSchema.methods.markEmailSent = function () {
  this.emailSent = true;
  this.emailSentAt = new Date();
  return this.save();
};

// Pre-save Middleware
CertificateSchema.pre('save', function (next) {
  // Generate certificate number if not exists
  if (!this.certificateNumber) {
    this.certificateNumber = this.generateCertificateNumber();
  }

  // Generate verification hash if not exists
  if (!this.verificationHash) {
    this.verificationHash = this.generateVerificationHash();
  }

  // Auto-expire if past expiry date
  if (
    this.expiryDate &&
    this.expiryDate < new Date() &&
    this.status === 'active'
  ) {
    this.status = 'expired';
  }

  next();
});

const Certificate = mongoose.model('Certificate', CertificateSchema);

export default Certificate;
