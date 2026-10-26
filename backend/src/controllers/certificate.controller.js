import fs from 'fs/promises';
import path from 'path';
import { Certificate, CertificateTemplate, Event, User } from '../models/index.js';
import { certificateService } from '../services/index.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Certificate Controller
 * Handles certificate generation, templates, and verification.
 */

const toId = (value) => (value?._id ? value._id.toString() : value?.toString());

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uploadedTemplatePath = (value) => {
  if (!value || !String(value).startsWith('/uploads/certificate-templates/')) {
    return null;
  }

  return path.join(
    config.storage.uploadDir,
    'certificate-templates',
    path.basename(String(value))
  );
};

const CERTIFICATE_SORT_FIELDS = [
  '-issuedDate',
  'issuedDate',
  'certificateNumber',
  '-certificateNumber',
  'recipientName',
  '-recipientName',
  'status',
];

const userAttendedEvent = (event, userId) =>
  (event.attendedUsers || []).some(
    (attendance) => toId(attendance.userId) === userId.toString()
  );

const canReadCertificates = (req) =>
  req.userRole !== 'admin' || req.user.hasPermission('generate_certificates');

const markCertificateIssued = async (user, event) => {
  const registration = (user.registeredEvents || []).find(
    (item) => toId(item.eventId) === event._id.toString()
  );

  if (registration) {
    registration.certificateIssued = true;
    user.stats.totalCertificates = user.registeredEvents.filter(
      (item) => item.certificateIssued
    ).length;
    await user.save();
  }
};

class CertificateController {
  /**
   * Create Certificate Template
   * POST /api/v1/certificates/templates
   */
  async createTemplate(req, res, next) {
    try {
      const body = { ...req.body };

      if (body.backgroundImage) {
        body.design = {
          ...(body.design || {}),
          backgroundImage: body.backgroundImage,
        };
        delete body.backgroundImage;
      }

      const template = await CertificateTemplate.create({
        ...body,
        createdBy: req.user.id,
      });

      logger.info(
        `Certificate template created: ${template.name} by admin ${req.user.id}`
      );

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
      if (active === 'true') query.isActive = true;

      const templates = await CertificateTemplate.find(query)
        .populate('createdBy', 'fullname email')
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
      const template = await CertificateTemplate.findById(req.params.id).populate(
        'createdBy',
        'fullname email'
      );

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
      const template = await CertificateTemplate.findById(req.params.id);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      Object.assign(template, req.body);
      template.lastModifiedBy = req.user.id;
      await template.save();

      logger.info(
        `Certificate template updated: ${template.name} by admin ${req.user.id}`
      );

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
   * Upload or replace a pre-designed certificate image
   * POST /api/v1/certificates/templates/:id/background
   */
  async uploadTemplateBackground(req, res, next) {
    try {
      if (!req.file || !req.body.backgroundImage) {
        throw new AppError('Upload a certificate design image to continue', 400);
      }

      const template = await CertificateTemplate.findById(req.params.id);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      const previous = template.design?.backgroundImage;
      template.design = template.design || {};
      template.design.backgroundImage = req.body.backgroundImage;
      template.lastModifiedBy = req.user.id;
      await template.save();

      const previousPath = uploadedTemplatePath(previous);
      if (previousPath && previousPath !== uploadedTemplatePath(req.body.backgroundImage)) {
        await fs.unlink(previousPath).catch(() => {});
      }

      logger.info(
        `Certificate template design uploaded: ${template.name} by admin ${req.user.id}`
      );

      res.json({
        success: true,
        message: 'Certificate design uploaded successfully',
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove an uploaded certificate design
   * DELETE /api/v1/certificates/templates/:id/background
   */
  async removeTemplateBackground(req, res, next) {
    try {
      const template = await CertificateTemplate.findById(req.params.id);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      const previous = template.design?.backgroundImage;
      template.design = template.design || {};
      template.design.backgroundImage = null;
      template.lastModifiedBy = req.user.id;
      await template.save();

      const previousPath = uploadedTemplatePath(previous);
      if (previousPath) {
        await fs.unlink(previousPath).catch(() => {});
      }

      res.json({
        success: true,
        message: 'Uploaded certificate design removed',
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
      const template = await CertificateTemplate.findById(req.params.id);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      const inUse = await Certificate.countDocuments({ templateId: template._id });
      if (inUse > 0) {
        throw new AppError(
          'Cannot delete a template that is already in use by certificates',
          400
        );
      }

      await template.deleteOne();

      logger.info(
        `Certificate template deleted: ${template.name} by admin ${req.user.id}`
      );

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

      const [user, event] = await Promise.all([
        User.findById(userId),
        Event.findById(eventId),
      ]);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      if (!userAttendedEvent(event, userId)) {
        throw new AppError('User did not attend this event', 400);
      }

      const existingCertificate = await Certificate.findOne({
        userId,
        eventId,
        status: { $ne: 'revoked' },
      });

      if (existingCertificate) {
        throw new AppError(
          'Certificate already exists for this user and event',
          400
        );
      }

      const template = templateId
        ? await CertificateTemplate.findById(templateId)
        : null;

      const certificate = await certificateService.generateCertificate(
        user,
        event,
        template
      );

      await markCertificateIssued(user, event);

      logger.info(
        `Certificate generated for user ${user.email} for event ${event.title}`
      );

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
      const { eventId } = req.body;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const result = await certificateService.generateBulkCertificates(eventId);

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
      const certificate = await Certificate.findById(req.params.id)
        .populate('userId', 'fullname email')
        .populate('eventId', 'title startDateTime venue')
        .populate('templateId', 'name type');

      if (!certificate) {
        throw new AppError('Certificate not found', 404);
      }

      if (!canReadCertificates(req)) {
        throw new AppError('Not authorized to view certificates', 403);
      }

      if (
        req.userRole !== 'admin' &&
        toId(certificate.userId) !== req.user.id.toString()
      ) {
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

      if (req.userRole !== 'admin' && userId !== req.user.id.toString()) {
        throw new AppError('Not authorized to view these certificates', 403);
      }

      if (!canReadCertificates(req)) {
        throw new AppError('Not authorized to view certificates', 403);
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
      const certificate = await Certificate.findById(req.params.id);

      if (!certificate) {
        throw new AppError('Certificate not found', 404);
      }

      if (!canReadCertificates(req)) {
        throw new AppError('Not authorized to view certificates', 403);
      }

      if (
        req.userRole !== 'admin' &&
        toId(certificate.userId) !== req.user.id.toString()
      ) {
        throw new AppError('Not authorized to download this certificate', 403);
      }

      if (certificate.status !== 'active') {
        throw new AppError(
          certificate.status === 'revoked'
            ? 'This certificate has been revoked'
            : 'This certificate is no longer active',
          400
        );
      }

      await certificate.incrementDownloadCount();

      const fileName = path.basename(
        certificate.fileName || certificate.fileUrl || ''
      );
      const filePath = path.join(config.storage.certificateDir, fileName);

      let fileBuffer;
      try {
        fileBuffer = await fs.readFile(filePath);
      } catch {
        throw new AppError('Certificate file is not available', 404);
      }

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
      const result = await certificateService.verifyCertificate(req.params.hash);

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
      const certificate = await certificateService.revokeCertificate(
        req.params.id,
        req.user.id,
        req.body.reason
      );

      logger.info(
        `Certificate revoked: ${certificate.certificateNumber} by admin ${req.user.id}`
      );

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
   * Get All Certificates (Admin)
   * GET /api/v1/certificates
   */
  async getAllCertificates(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        eventId,
        status,
        search,
        sort = '-issuedDate',
      } = req.query;

      const query = {};
      if (eventId) query.eventId = eventId;
      if (status) query.status = status;

      if (search) {
        const safeSearch = escapeRegex(String(search).slice(0, 100));
        query.$or = [
          { certificateNumber: { $regex: safeSearch, $options: 'i' } },
          { recipientName: { $regex: safeSearch, $options: 'i' } },
          { recipientEmail: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      const pageNumber = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const sortField = CERTIFICATE_SORT_FIELDS.includes(sort) ? sort : '-issuedDate';

      const [certificates, total] = await Promise.all([
        Certificate.find(query)
          .populate('userId', 'fullname email')
          .populate('eventId', 'title startDateTime')
          .populate('templateId', 'name type')
          .sort(sortField)
          .skip((pageNumber - 1) * pageSize)
          .limit(pageSize),
        Certificate.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          certificates,
          pagination: {
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize) || 1,
          },
        },
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
      if (eventId) query.eventId = eventId;

      const [total, active, revoked, downloaded] = await Promise.all([
        Certificate.countDocuments(query),
        Certificate.countDocuments({ ...query, status: 'active' }),
        Certificate.countDocuments({ ...query, status: 'revoked' }),
        Certificate.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: '$downloadCount' } } },
        ]),
      ]);

      const stats = {
        total,
        active,
        revoked,
        totalDownloads: downloaded[0]?.total || 0,
        averageDownloadsPerCertificate:
          total > 0 ? ((downloaded[0]?.total || 0) / total).toFixed(2) : 0,
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
      const certificate = await Certificate.findById(req.params.id);

      if (!certificate) {
        throw new AppError('Certificate not found', 404);
      }

      if (certificate.status === 'revoked') {
        throw new AppError('Cannot regenerate a revoked certificate', 400);
      }

      const userId = certificate.userId;
      const eventId = certificate.eventId;
      const templateId = req.body.templateId || certificate.templateId;

      const [user, event, template] = await Promise.all([
        User.findById(userId),
        Event.findById(eventId),
        templateId ? CertificateTemplate.findById(templateId) : null,
      ]);

      if (!user || !event) {
        throw new AppError('User or event for this certificate was not found', 404);
      }

      await certificateService.deleteCertificateFile(certificate.fileUrl);
      await certificate.deleteOne();

      const newCertificate = await certificateService.generateCertificate(
        user,
        event,
        template
      );

      await markCertificateIssued(user, event);

      logger.info(
        `Certificate regenerated: ${newCertificate.certificateNumber} by admin ${req.user.id}`
      );

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
