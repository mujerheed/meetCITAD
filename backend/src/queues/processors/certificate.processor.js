/**
 * Certificate Queue Processor
 * Process certificate generation jobs
 */

import { certificateQueue } from '../index.js';
import { certificateService } from '../../services/index.js';
import { queueEmail } from './email.processor.js';
import { queueNotification } from './notification.processor.js';
import { EMAIL_JOB_TYPES } from './email.processor.js';
import { NOTIFICATION_JOB_TYPES } from './notification.processor.js';
import logger from '../../utils/logger.js';

/**
 * Certificate job types
 */
export const CERTIFICATE_JOB_TYPES = {
  GENERATE_SINGLE: 'generate_single',
  GENERATE_BULK: 'generate_bulk',
  REGENERATE: 'regenerate',
};

/**
 * Process certificate jobs
 */
certificateQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`Processing certificate job [${job.id}]: ${type}`);

  try {
    let result;

    switch (type) {
      case CERTIFICATE_JOB_TYPES.GENERATE_SINGLE: {
        // Generate single certificate
        result = await certificateService.generateCertificate({
          userId: data.userId,
          eventId: data.eventId,
          templateId: data.templateId,
        });

        // Queue notification and email
        await Promise.all([
          queueNotification(NOTIFICATION_JOB_TYPES.CERTIFICATE_READY, {
            userId: data.userId,
            certificateId: result._id,
          }),
          queueEmail(EMAIL_JOB_TYPES.CERTIFICATE_READY, {
            userId: data.userId,
            certificateId: result._id,
            eventTitle: data.eventTitle,
          }),
        ]);

        logger.info(`Certificate generated for user ${data.userId}`);
        break;
      }

      case CERTIFICATE_JOB_TYPES.GENERATE_BULK: {
        // Generate bulk certificates
        result = await certificateService.generateBulkCertificates(
          data.eventId,
          data.templateId
        );

        logger.info(
          `Bulk certificates generated: ${result.success.length} success, ${result.failed.length} failed`
        );
        break;
      }

      case CERTIFICATE_JOB_TYPES.REGENERATE: {
        // Regenerate existing certificate
        const certificate = await certificateService.getCertificate(data.certificateId);
        
        if (certificate.filePath) {
          await certificateService.deleteCertificateFile(certificate.filePath);
        }

        result = await certificateService.generateCertificate({
          userId: certificate.user._id,
          eventId: certificate.event._id,
          templateId: data.templateId || certificate.template,
        });

        logger.info(`Certificate regenerated: ${data.certificateId}`);
        break;
      }

      default:
        throw new Error(`Unknown certificate job type: ${type}`);
    }

    logger.info(`Certificate job [${job.id}] completed successfully`);
    return result;
  } catch (error) {
    logger.error(`Certificate job [${job.id}] failed:`, error);
    throw error;
  }
});

/**
 * Add certificate job to queue
 */
export const queueCertificate = async (type, data, options = {}) => {
  try {
    const job = await certificateQueue.add(
      { type, data },
      {
        ...options,
        attempts: options.attempts || 3,
        timeout: options.timeout || 60000, // 1 minute
      }
    );

    logger.info(`Certificate job queued [${job.id}]: ${type}`);
    return job;
  } catch (error) {
    logger.error(`Error queuing certificate job:`, error);
    throw error;
  }
};

/**
 * Queue bulk certificate generation
 */
export const queueBulkCertificates = async (eventId, templateId, options = {}) => {
  try {
    const job = await queueCertificate(
      CERTIFICATE_JOB_TYPES.GENERATE_BULK,
      { eventId, templateId },
      {
        ...options,
        timeout: 300000, // 5 minutes for bulk
      }
    );

    logger.info(`Bulk certificate generation queued for event ${eventId}`);
    return job;
  } catch (error) {
    logger.error('Error queuing bulk certificate generation:', error);
    throw error;
  }
};

export default {
  queueCertificate,
  queueBulkCertificates,
  CERTIFICATE_JOB_TYPES,
};
