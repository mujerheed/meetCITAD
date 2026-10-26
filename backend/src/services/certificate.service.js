import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import { Certificate, CertificateTemplate, Event, User } from '../models/index.js';
import qrService from './qr.service.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import config from '../config/index.js';
import {
  formatEventDateRange,
  renderInstitutionalCertificate,
  renderUploadedCertificate,
} from './certificateLayout.service.js';

/**
 * Resolve a template background value to a local file PDFKit can embed.
 * Uploaded designs live under /uploads/certificate-templates; legacy template
 * assets may still use /templates.
 */
const resolveCertificateBackground = (value) => {
  if (!value) return null;

  const source = String(value);
  if (/^https?:\/\//i.test(source)) return null;

  let localPath;
  if (source.startsWith('/uploads/')) {
    localPath = path.join(
      config.storage.uploadDir,
      source.slice('/uploads/'.length)
    );
  } else if (source.startsWith('/templates/')) {
    localPath = path.join(
      config.storage.templateDir,
      source.slice('/templates/'.length)
    );
  } else if (path.isAbsolute(source)) {
    localPath = source;
  } else {
    localPath = path.join(config.storage.uploadDir, source);
  }

  return existsSync(localPath) ? localPath : null;
};

/**
 * Certificate Service
 * Handles certificate generation, templates, and verification
 */

class CertificateService {
  constructor() {
    this.certificatesDir = config.storage.certificateDir || 'certificates';
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
      if (template && typeof template.validateRequiredFields !== 'function') {
        template = await CertificateTemplate.findById(template);
      }

      if (!template) {
        template = event.certificateTemplateId
          ? await CertificateTemplate.findById(event.certificateTemplateId)
          : await CertificateTemplate.findOne({ isDefault: true, isActive: true });
      }

      if (!template) {
        // Create a sensible default template so certificate generation works
        // out of the box before admins design their own.
        template = await CertificateTemplate.create({
          name: 'CITAD Certificate of Attendance',
          description:
            'Official CITAD certificate with institutional frame, logos, and verification QR.',
          type: 'attendance',
          isDefault: true,
          design: {
            backgroundColor: '#FFFFFF',
            border: {
              enabled: true,
              color: '#0E4F8B',
              width: 1.6,
              style: 'solid',
            },
            fonts: {
              heading: {
                family: 'Times New Roman',
                size: 34,
                color: '#0E4F8B',
                bold: true,
              },
              body: {
                family: 'Times New Roman',
                size: 14,
                color: '#1F2937',
              },
              recipient: {
                family: 'Great Vibes',
                size: 40,
                color: '#102A43',
                bold: false,
                italic: true,
              },
            },
          },
          content: {
            title: 'Certificate of Attendance',
            bodyText: 'has attended {{eventTitle}} held at {{eventVenue}}.',
            footerText:
              'Centre for Information Technology and Development (CITAD), Kano, Nigeria',
          },
          signatures: [
            {
              title: 'Training Facilitator, CITAD',
              position: 'left',
            },
            {
              title: 'Executive Director, CITAD',
              position: 'right',
            },
          ],
        });
      }

      // Create the certificate record first so identifiers can be rendered.
      const certificate = new Certificate({
        userId: user._id,
        eventId: event._id,
        templateId: template._id,
        recipientName: user.fullname,
        recipientEmail: user.email,
        eventTitle: event.title,
        eventDate: event.startDateTime,
        eventVenue: event.venue?.name,
      });

      certificate.certificateNumber = certificate.generateCertificateNumber();
      certificate.verificationHash = certificate.generateVerificationHash();

      const eventDate = new Date(event.startDateTime);
      const issuedDate = new Date();

      // Prepare certificate data (must include every required template field)
      const certificateData = {
        recipientName: user.fullname,
        eventTitle: event.title,
        eventDate: eventDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Africa/Lagos',
        }),
        eventDateRange: formatEventDateRange(
          event.startDateTime,
          event.endDateTime
        ),
        eventVenue: event.venue?.name || 'CITAD, Kano',
        certificateNumber: certificate.certificateNumber,
        issuedDate: issuedDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Africa/Lagos',
        }),
      };

      // Validate required fields
      const validation = template.validateRequiredFields(certificateData);
      if (!validation.isValid) {
        throw new AppError(`Missing required fields: ${validation.missingFields.join(', ')}`, 400);
      }

      // Generate verification QR code
      const qrDataURL = await qrService.generateCertificateVerificationQR(certificate);

      // Generate PDF
      const pdfPath = await this.generatePDF(certificate, template, certificateData, qrDataURL);

      // Update certificate with file info. Store only the filename; the
      // authenticated download endpoint resolves it against the configured
      // certificate directory. Never persist an absolute server path.
      certificate.fileUrl = path.basename(pdfPath);
      certificate.fileName = path.basename(pdfPath);
      certificate.qrCode = qrDataURL;

      // Save certificate
      await certificate.save();

      // Increment template usage
      await template.incrementUsage();

      // Mark the user's registration mirror as certified.
      const registration = (user.registeredEvents || []).find(
        (item) =>
          (item.eventId?._id || item.eventId)?.toString() === event._id.toString()
      );
      if (registration) {
        registration.certificateIssued = true;
        user.stats.totalCertificates = user.registeredEvents.filter(
          (item) => item.certificateIssued
        ).length;
        await user.save();
      }

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
        const backgroundImage = resolveCertificateBackground(
          template.design?.backgroundImage
        );

        if (template.design?.backgroundImage && !backgroundImage) {
          throw new AppError(
            'The uploaded certificate design could not be found. Re-upload it from the template editor.',
            400
          );
        }

        const doc = new PDFDocument({
          size: template.design.size === 'A4' ? 'A4' : 'LETTER',
          layout: template.design.orientation || 'landscape',
          margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
        });

        const stream = createWriteStream(filePath);
        doc.pipe(stream);

        if (backgroundImage) {
          renderUploadedCertificate(
            doc,
            certificate,
            template,
            data,
            qrDataURL,
            backgroundImage
          );
        } else {
          renderInstitutionalCertificate(doc, certificate, template, data, qrDataURL);
        }

        doc.end();

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
        filePath: path.join(
          config.storage.certificateDir,
          path.basename(certificate.fileName || certificate.fileUrl || '')
        ),
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
      if (!filePath) return false;

      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.certificatesDir, path.basename(filePath));

      await fs.unlink(resolved);
      logger.info(`Deleted certificate file: ${resolved}`);
      return true;
    } catch (error) {
      logger.error('Error deleting certificate file:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new CertificateService();
