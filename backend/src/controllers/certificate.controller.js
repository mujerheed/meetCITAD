import { Certificate, CertificateTemplate, Event, User } from '../models/index.js';
import { certificateService, storageService } from '../services/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Certificate Controller
 * Handles certificate generation, templates, and verification
 */

class CertificateController {
  /**
   * Create Certificate Template
   * POST /api/v1/certificates/templates
   */
  async createTemplate(req, res, next) {
    try {
      const {
        name,
        description,
        content,
        layout,
        styles,
        placeholders,
        isDefault,
      } = req.body;

      const template = await CertificateTemplate.create({
        name,
        description,
        content,
        layout,
        styles,
        placeholders,
        isDefault,
        createdBy: req.user.id,
      });

      logger.info(`Certificate template created: ${template.name} by admin ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Certificate template created successfully',
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get All Templates
   * GET /api/v1/certificates/templates
   */
  async getTemplates(req, res, next) {
    try {
      const { active } = req.query;

      const query = {};
      if (active === 'true') {
        query.isActive = true;
      }

      const templates = await CertificateTemplate.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort('-createdAt');

      res.json({
        success: true,
        data: {
          total: templates.length,
          templates,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Single Template
   * GET /api/v1/certificates/templates/:id
   */
  async getTemplate(req, res, next) {
    try {
      const { id } = req.params;

      const template = await CertificateTemplate.findById(id)
        .populate('createdBy', 'firstName lastName email');

      if (!template) {
        throw new AppError('Template not found', 404);
      }

      res.json({
        success: true,
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Template
   * PUT /api/v1/certificates/templates/:id
   */
  async updateTemplate(req, res, next) {
    try {
      const { id } = req.params;

      const template = await CertificateTemplate.findById(id);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      Object.assign(template, req.body);
      await template.save();

      logger.info(`Certificate template updated: ${template.name} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Template
   * DELETE /api/v1/certificates/templates/:id
   */
  async deleteTemplate(req, res, next) {
    try {
      const { id } = req.params;

      const template = await CertificateTemplate.findById(id);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      // Check if template is in use
      const certificatesUsingTemplate = await Certificate.countDocuments({
        template: id,
      });

      if (certificatesUsingTemplate > 0) {
        throw new AppError('Cannot delete template that is in use', 400);
      }

      await template.deleteOne();

      logger.info(`Certificate template deleted: ${template.name} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate Certificate for User
   * POST /api/v1/certificates/generate
   */
  async generateCertificate(req, res, next) {
    try {
      const { userId, eventId, templateId } = req.body;

      const [user, event, template] = await Promise.all([
        User.findById(userId),
        Event.findById(eventId),
        templateId ? CertificateTemplate.findById(templateId) : CertificateTemplate.findOne({ isDefault: true }),
      ]);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      if (!template) {
        throw new AppError('Certificate template not found', 404);
      }

      // Check if user attended the event
      const registration = user.registeredEvents.find(
        (reg) => reg.event.toString() === eventId && reg.attended
      );

      if (!registration) {
        throw new AppError('User did not attend this event', 400);
      }

      // Check if certificate already exists
      const existingCertificate = await Certificate.findOne({
        user: userId,
        event: eventId,
        status: { $ne: 'revoked' },
      });

      if (existingCertificate) {
        throw new AppError('Certificate already exists for this user and event', 400);
      }

      // Generate certificate
      const certificate = await certificateService.generateCertificate({
        userId,
        eventId,
        templateId: template._id,
      });

      // Update user registration
      const regIndex = user.registeredEvents.findIndex(
        (reg) => reg.event.toString() === eventId
      );
      if (regIndex !== -1) {
        user.registeredEvents[regIndex].certificateIssued = true;
        await user.save();
      }

      logger.info(`Certificate generated for user ${user.email} for event ${event.title}`);

      res.status(201).json({
        success: true,
        message: 'Certificate generated successfully',
        data: { certificate },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate Bulk Certificates for Event
   * POST /api/v1/certificates/bulk-generate
   */
  async bulkGenerateCertificates(req, res, next) {
    try {
      const { eventId, templateId } = req.body;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Generate certificates for all attendees
      const result = await certificateService.generateBulkCertificates(eventId, templateId);

      // Update event
      event.certificatesIssued = result.success.length;
      await event.save();

      logger.info(`Bulk certificates generated for event ${event.title}: ${result.success.length} certificates`);

      res.json({
        success: true,
        message: 'Bulk certificate generation completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Certificate
   * GET /api/v1/certificates/:id
   */
  async getCertificate(req, res, next) {
    try {
      const { id } = req.params;

      const certificate = await Certificate.findById(id)
        .populate('user', 'firstName lastName email')
        .populate('event', 'title date venue')
        .populate('template', 'name');

      if (!certificate) {
        throw new AppError('Certificate not found', 404);
      }

      // Check permission (user can only view their own certificate unless admin)
      if (req.user.role !== 'admin' && certificate.user._id.toString() !== req.user.id) {
        throw new AppError('Not authorized to view this certificate', 403);
      }

      res.json({
        success: true,
        data: { certificate },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get User Certificates
   * GET /api/v1/certificates/user/:userId
   */
  async getUserCertificates(req, res, next) {
    try {
      const { userId } = req.params;

      // Check permission
      if (req.user.role !== 'admin' && userId !== req.user.id) {
        throw new AppError('Not authorized to view these certificates', 403);
      }

      const certificates = await certificateService.getUserCertificates(userId);

      res.json({
        success: true,
        data: {
          total: certificates.length,
          certificates,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download Certificate
   * GET /api/v1/certificates/:id/download
   */
  async downloadCertificate(req, res, next) {
    try {
      const { id } = req.params;

      const certificate = await Certificate.findById(id)
        .populate('user', 'firstName lastName')
        .populate('event', 'title');

      if (!certificate) {
        throw new AppError('Certificate not found', 404);
      }

      // Check permission
      if (req.user.role !== 'admin' && certificate.user._id.toString() !== req.user.id) {
        throw new AppError('Not authorized to download this certificate', 403);
      }

      if (certificate.status === 'revoked') {
        throw new AppError('This certificate has been revoked', 400);
      }

      // Track download
      await certificateService.downloadCertificate(id);

      // Get file
      const fileBuffer = await storageService.getFile(certificate.filePath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="certificate-${certificate.certificateNumber}.pdf"`
      );
      res.send(fileBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Certificate
   * GET /api/v1/certificates/verify/:hash
   */
  async verifyCertificate(req, res, next) {
    try {
      const { hash } = req.params;

      const result = await certificateService.verifyCertificate(hash);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke Certificate
   * POST /api/v1/certificates/:id/revoke
   */
  async revokeCertificate(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const certificate = await certificateService.revokeCertificate(id, reason, req.user.id);

      logger.info(`Certificate revoked: ${certificate.certificateNumber} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Certificate revoked successfully',
        data: { certificate },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Certificate Statistics
   * GET /api/v1/certificates/statistics
   */
  async getCertificateStatistics(req, res, next) {
    try {
      const { eventId } = req.query;

      const query = {};
      if (eventId) {
        query.event = eventId;
      }

      const [total, issued, revoked, downloaded] = await Promise.all([
        Certificate.countDocuments(query),
        Certificate.countDocuments({ ...query, status: 'issued' }),
        Certificate.countDocuments({ ...query, status: 'revoked' }),
        Certificate.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: '$downloadCount' } } },
        ]),
      ]);

      const stats = {
        total,
        issued,
        revoked,
        totalDownloads: downloaded[0]?.total || 0,
        averageDownloadsPerCertificate: total > 0 ? ((downloaded[0]?.total || 0) / total).toFixed(2) : 0,
      };

      res.json({
        success: true,
        data: { statistics: stats },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate Certificate
   * POST /api/v1/certificates/:id/regenerate
   */
  async regenerateCertificate(req, res, next) {
    try {
      const { id } = req.params;
      const { templateId } = req.body;

      const certificate = await Certificate.findById(id)
        .populate('user')
        .populate('event');

      if (!certificate) {
        throw new AppError('Certificate not found', 404);
      }

      if (certificate.status === 'revoked') {
        throw new AppError('Cannot regenerate revoked certificate', 400);
      }

      // Delete old file
      if (certificate.filePath) {
        await certificateService.deleteCertificateFile(certificate.filePath);
      }

      // Generate new certificate
      const newCertificate = await certificateService.generateCertificate({
        userId: certificate.user._id,
        eventId: certificate.event._id,
        templateId: templateId || certificate.template,
      });

      // Delete old certificate record
      await certificate.deleteOne();

      logger.info(`Certificate regenerated: ${certificate.certificateNumber} by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Certificate regenerated successfully',
        data: { certificate: newCertificate },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CertificateController();
