import mongoose from 'mongoose';

const { Schema } = mongoose;

const CertificateTemplateSchema = new Schema(
  {
    // Template Identification
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Template Type
    type: {
      type: String,
      enum: ['attendance', 'participation', 'achievement', 'training', 'custom'],
      default: 'attendance',
    },

    // Design Configuration
    design: {
      // Layout
      orientation: {
        type: String,
        enum: ['landscape', 'portrait'],
        default: 'landscape',
      },
      size: {
        type: String,
        enum: ['A4', 'Letter', 'Legal', 'Custom'],
        default: 'A4',
      },
      customDimensions: {
        width: Number, // in mm
        height: Number, // in mm
      },

      // Background
      backgroundImage: String, // URL to background image
      backgroundColor: {
        type: String,
        default: '#FFFFFF',
      },

      // Typography
      fonts: {
        heading: {
          family: {
            type: String,
            default: 'Arial',
          },
          size: {
            type: Number,
            default: 36,
          },
          color: {
            type: String,
            default: '#000000',
          },
          bold: {
            type: Boolean,
            default: true,
          },
        },
        body: {
          family: {
            type: String,
            default: 'Arial',
          },
          size: {
            type: Number,
            default: 14,
          },
          color: {
            type: String,
            default: '#333333',
          },
        },
        recipient: {
          family: {
            type: String,
            default: 'Georgia',
          },
          size: {
            type: Number,
            default: 28,
          },
          color: {
            type: String,
            default: '#000000',
          },
          bold: {
            type: Boolean,
            default: true,
          },
          italic: {
            type: Boolean,
            default: true,
          },
        },
      },

      // Layout Positioning (in mm from top-left)
      layout: {
        logo: {
          url: String,
          x: Number,
          y: Number,
          width: Number,
          height: Number,
        },
        title: {
          x: Number,
          y: Number,
          align: {
            type: String,
            enum: ['left', 'center', 'right'],
            default: 'center',
          },
        },
        recipientName: {
          x: Number,
          y: Number,
          align: {
            type: String,
            enum: ['left', 'center', 'right'],
            default: 'center',
          },
        },
        body: {
          x: Number,
          y: Number,
          align: {
            type: String,
            enum: ['left', 'center', 'right'],
            default: 'center',
          },
        },
        signature: {
          x: Number,
          y: Number,
          width: Number,
          height: Number,
        },
        qrCode: {
          x: Number,
          y: Number,
          size: Number,
        },
      },

      // Borders and Decorations
      border: {
        enabled: {
          type: Boolean,
          default: true,
        },
        color: {
          type: String,
          default: '#C9A661',
        },
        width: {
          type: Number,
          default: 2,
        },
        style: {
          type: String,
          enum: ['solid', 'dashed', 'dotted'],
          default: 'solid',
        },
      },
    },

    // Content Template (supports dynamic placeholders)
    content: {
      title: {
        type: String,
        default: 'Certificate of Attendance',
      },
      bodyText: {
        type: String,
        default: 'This is to certify that {{recipientName}} has successfully attended {{eventTitle}} held on {{eventDate}} at {{eventVenue}}.',
      },
      footerText: String,
    },

    // Signature Configuration
    signatures: [
      {
        name: String,
        title: String,
        imageUrl: String, // URL to signature image
        position: {
          type: String,
          enum: ['left', 'center', 'right'],
          default: 'center',
        },
      },
    ],

    // Dynamic Fields (placeholders available for this template)
    dynamicFields: [
      {
        fieldName: String, // e.g., 'recipientName', 'eventTitle', 'eventDate'
        displayName: String, // e.g., 'Recipient Name', 'Event Title'
        required: {
          type: Boolean,
          default: true,
        },
        format: String, // For dates: 'DD/MM/YYYY', for numbers: '0.00'
      },
    ],

    // Default Dynamic Fields
    defaultFields: {
      type: [String],
      default: [
        'recipientName',
        'eventTitle',
        'eventDate',
        'eventVenue',
        'certificateNumber',
        'issuedDate',
      ],
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },

    // Usage Statistics
    usageCount: {
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
CertificateTemplateSchema.index({ isActive: 1, isDefault: 1 });
CertificateTemplateSchema.index({ type: 1, isActive: 1 });
CertificateTemplateSchema.index({ createdBy: 1 });

// Virtual Properties
CertificateTemplateSchema.virtual('availablePlaceholders').get(function () {
  return this.dynamicFields.map(field => ({
    placeholder: `{{${field.fieldName}}}`,
    name: field.displayName,
  }));
});

// Instance Methods
CertificateTemplateSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  return this.save();
};

CertificateTemplateSchema.methods.renderContent = function (data) {
  let renderedBody = this.content.bodyText;

  // Replace all placeholders with actual data
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    renderedBody = renderedBody.replace(placeholder, data[key] || '');
  });

  return {
    title: this.content.title,
    body: renderedBody,
    footer: this.content.footerText,
  };
};

CertificateTemplateSchema.methods.validateRequiredFields = function (data) {
  const missingFields = [];

  this.dynamicFields
    .filter(field => field.required)
    .forEach(field => {
      if (!data[field.fieldName]) {
        missingFields.push(field.displayName);
      }
    });

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

// Pre-save Middleware
CertificateTemplateSchema.pre('save', async function (next) {
  // Ensure only one default template per type
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { type: this.type, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }

  // Set default dynamic fields if not provided
  if (!this.dynamicFields || this.dynamicFields.length === 0) {
    this.dynamicFields = this.defaultFields.map(fieldName => ({
      fieldName,
      displayName: fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase()),
      required: true,
    }));
  }

  next();
});

const CertificateTemplate = mongoose.model('CertificateTemplate', CertificateTemplateSchema);

export default CertificateTemplate;
