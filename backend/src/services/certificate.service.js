import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';
import { Certificate, CertificateTemplate, Event, User } from '../models/index.js';
import qrService from './qr.service.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Certificate Service
 * Handles certificate generation, templates, and verification
 */

class CertificateService {
  constructor() {
    this.certificatesDir = 'backend/certificates';
    this.initializeCertificatesDir();
  }

  /**
   * Initialize certificates directory
   */
  async initializeCertificatesDir() {
    try {
      await fs.mkdir(this.certificatesDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating certificates directory:', error);
    }
  }

  /**
   * Generate certificate for user
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @param {Object} template - Certificate template (optional)
   * @returns {Promise<Object>} - Certificate object
   */
  async generateCertificate(user, event, template = null) {
    try {
      // Check if certificate already exists
      const existing = await Certificate.findOne({
        userId: user._id,
        eventId: event._id,
      });

      if (existing) {
        logger.info(`Certificate already exists for user ${user._id} and event ${event._id}`);
        return existing;
      }

      // Get template
      if (!template) {
        template = event.certificateTemplateId
          ? await CertificateTemplate.findById(event.certificateTemplateId)
          : await CertificateTemplate.findOne({ isDefault: true, isActive: true });
      }

      if (!template) {
        throw new AppError('No certificate template found', 404);
      }

      // Prepare certificate data
      const certificateData = {
        recipientName: user.fullname,
        eventTitle: event.title,
        eventDate: event.startDateTime.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        eventVenue: event.venue.name,
        issuedDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      };

      // Validate required fields
      const validation = template.validateRequiredFields(certificateData);
      if (!validation.isValid) {
        throw new AppError(`Missing required fields: ${validation.missingFields.join(', ')}`, 400);
      }

      // Create certificate record
      const certificate = new Certificate({
        userId: user._id,
        eventId: event._id,
        templateId: template._id,
        recipientName: user.fullname,
        recipientEmail: user.email,
        eventTitle: event.title,
        eventDate: event.startDateTime,
        eventVenue: event.venue.name,
      });

      // Generate verification QR code
      const qrDataURL = await qrService.generateCertificateVerificationQR(certificate);

      // Generate PDF
      const pdfPath = await this.generatePDF(certificate, template, certificateData, qrDataURL);

      // Update certificate with file info
      certificate.fileUrl = pdfPath;
      certificate.fileName = path.basename(pdfPath);
      certificate.qrCode = qrDataURL;

      // Save certificate
      await certificate.save();

      // Increment template usage
      await template.incrementUsage();

      logger.info(`Certificate generated for user ${user._id} and event ${event._id}`);
      return certificate;
    } catch (error) {
      logger.error('Error generating certificate:', error);
      throw error;
    }
  }

  /**
   * Generate PDF certificate
   * @param {Object} certificate - Certificate object
   * @param {Object} template - Certificate template
   * @param {Object} data - Certificate data
   * @param {string} qrDataURL - QR code data URL
   * @returns {Promise<string>} - PDF file path
   */
  async generatePDF(certificate, template, data, qrDataURL) {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `${certificate.certificateNumber}.pdf`;
        const filePath = path.join(this.certificatesDir, fileName);

        // Create PDF document
        const doc = new PDFDocument({
          size: template.design.size === 'A4' ? 'A4' : 'LETTER',
          layout: template.design.orientation || 'landscape',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        });

        // Pipe to file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Set background color
        if (template.design.backgroundColor) {
          doc.rect(0, 0, doc.page.width, doc.page.height)
            .fill(template.design.backgroundColor);
        }

        // Add border if enabled
        if (template.design.border?.enabled) {
          doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
            .lineWidth(template.design.border.width || 2)
            .stroke(template.design.border.color || '#C9A661');
        }

        // Render template content
        const content = template.renderContent(data);

        // Add title
        doc.fontSize(template.design.fonts.heading.size || 36)
          .font('Helvetica-Bold')
          .fillColor(template.design.fonts.heading.color || '#000000')
          .text(content.title, 50, 100, {
            align: 'center',
            width: doc.page.width - 100,
          });

        // Add recipient name
        doc.fontSize(template.design.fonts.recipient.size || 28)
          .font('Times-Italic')
          .fillColor(template.design.fonts.recipient.color || '#000000')
          .text(data.recipientName, 50, 200, {
            align: 'center',
            width: doc.page.width - 100,
          });

        // Add body text
        doc.fontSize(template.design.fonts.body.size || 14)
          .font('Helvetica')
          .fillColor(template.design.fonts.body.color || '#333333')
          .text(content.body, 50, 280, {
            align: 'center',
            width: doc.page.width - 100,
          });

        // Add certificate number
        doc.fontSize(10)
          .fillColor('#666666')
          .text(`Certificate No: ${certificate.certificateNumber}`, 50, doc.page.height - 120, {
            align: 'center',
            width: doc.page.width - 100,
          });

        // Add QR code
        if (qrDataURL) {
          // Convert data URL to buffer
          const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');
          doc.image(qrBuffer, doc.page.width - 150, doc.page.height - 150, {
            width: 100,
            height: 100,
          });
        }

        // Add signatures if available
        if (template.signatures && template.signatures.length > 0) {
          const signatureY = doc.page.height - 180;
          const spacing = (doc.page.width - 100) / template.signatures.length;

          template.signatures.forEach((signature, index) => {
            const x = 50 + (index * spacing);
            
            // Add signature line
            doc.moveTo(x, signatureY)
              .lineTo(x + 150, signatureY)
              .stroke('#000000');

            // Add signature name and title
            doc.fontSize(10)
              .fillColor('#000000')
              .text(signature.name, x, signatureY + 10, {
                width: 150,
                align: 'center',
              })
              .fontSize(8)
              .fillColor('#666666')
              .text(signature.title, x, signatureY + 25, {
                width: 150,
                align: 'center',
              });
          });
        }

        // Finalize PDF
        doc.end();

        // Wait for file to be written
        stream.on('finish', () => {
          resolve(`/certificates/${fileName}`);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate certificates for all attendees of an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} - Generation results
   */
  async generateBulkCertificates(eventId) {
    try {
      const event = await Event.findById(eventId).populate('certificateTemplateId');

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      if (!event.certificateEnabled) {
        throw new AppError('Certificates are not enabled for this event', 400);
      }

      // Get all users who attended
      const attendeeIds = event.attendedUsers.map(a => a.userId);
      const users = await User.find({ _id: { $in: attendeeIds } });

      const results = {
        total: users.length,
        generated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };

      for (const user of users) {
        try {
          const existing = await Certificate.findOne({
            userId: user._id,
            eventId: event._id,
          });

          if (existing) {
            results.skipped++;
            continue;
          }

          await this.generateCertificate(user, event, event.certificateTemplateId);
          results.generated++;
        } catch (error) {
          logger.error(`Failed to generate certificate for user ${user._id}:`, error);
          results.failed++;
          results.errors.push({
            userId: user._id,
            userName: user.fullname,
            error: error.message,
          });
        }
      }

      // Mark event as certificates generated
      event.certificatesGenerated = true;
      event.certificateGeneratedAt = new Date();
      await event.save();

      logger.info(`Bulk certificate generation complete for event ${eventId}: ${results.generated} generated, ${results.skipped} skipped, ${results.failed} failed`);
      return results;
    } catch (error) {
      logger.error('Error in bulk certificate generation:', error);
      throw error;
    }
  }

  /**
   * Verify certificate by verification hash
   * @param {string} verificationHash - Verification hash
   * @returns {Promise<Object>} - Certificate verification result
   */
  async verifyCertificate(verificationHash) {
    try {
      const certificate = await Certificate.findOne({ verificationHash })
        .populate('userId', 'fullname email')
        .populate('eventId', 'title startDateTime venue');

      if (!certificate) {
        return {
          valid: false,
          message: 'Certificate not found',
        };
      }

      // Increment verification count
      await certificate.incrementVerificationCount();

      return {
        valid: certificate.isValid,
        certificate: {
          certificateNumber: certificate.certificateNumber,
          recipientName: certificate.recipientName,
          eventTitle: certificate.eventTitle,
          eventDate: certificate.eventDate,
          issuedDate: certificate.issuedDate,
          status: certificate.status,
        },
        message: certificate.isValid ? 'Certificate is valid' : 'Certificate is not valid',
      };
    } catch (error) {
      logger.error('Error verifying certificate:', error);
      throw error;
    }
  }

  /**
   * Get user certificates
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - User certificates
   */
  async getUserCertificates(userId) {
    try {
      const certificates = await Certificate.find({ userId, status: 'active' })
        .populate('eventId', 'title startDateTime venue')
        .sort({ issuedDate: -1 });

      return certificates;
    } catch (error) {
      logger.error('Error getting user certificates:', error);
      throw error;
    }
  }

  /**
   * Download certificate
   * @param {string} certificateId - Certificate ID
   * @param {string} userId - User ID (for verification)
   * @returns {Promise<Object>} - File path and metadata
   */
  async downloadCertificate(certificateId, userId) {
    try {
      const certificate = await Certificate.findOne({
        _id: certificateId,
        userId,
      });

      if (!certificate) {
        throw new AppError('Certificate not found', 404);
      }

      if (!certificate.isValid) {
        throw new AppError('Certificate is not valid', 400);
      }

      // Increment download count
      await certificate.incrementDownloadCount();

      return {
        filePath: path.join(this.certificatesDir, certificate.fileName),
        fileName: certificate.fileName,
        mimeType: 'application/pdf',
      };
    } catch (error) {
      logger.error('Error downloading certificate:', error);
      throw error;
    }
  }

  /**
   * Revoke certificate
   * @param {string} certificateId - Certificate ID
   * @param {string} adminId - Admin ID
   * @param {string} reason - Revocation reason
   * @returns {Promise<Object>}
   */
  async revokeCertificate(certificateId, adminId, reason) {
    try {
      const certificate = await Certificate.findById(certificateId);

      if (!certificate) {
        throw new AppError('Certificate not found', 404);
      }

      await certificate.revoke(adminId, reason);

      logger.info(`Certificate ${certificateId} revoked by admin ${adminId}`);
      return certificate;
    } catch (error) {
      logger.error('Error revoking certificate:', error);
      throw error;
    }
  }

  /**
   * Delete certificate file
   * @param {string} filePath - File path
   * @returns {Promise<boolean>}
   */
  async deleteCertificateFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info(`Deleted certificate file: ${filePath}`);
      return true;
    } catch (error) {
      logger.error('Error deleting certificate file:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new CertificateService();
