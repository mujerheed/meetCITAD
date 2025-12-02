import QRCode from 'qrcode';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * QR Code Service
 * Handles QR code generation, verification, and anti-fraud measures
 */

class QRService {
  constructor() {
    this.qrDir = 'backend/uploads/qr-codes';
    this.signatureKey = config.security.qrSignatureKey || process.env.QR_SIGNATURE_KEY || 'default-qr-key';
    this.initializeQRDirectory();
  }

  /**
   * Initialize QR code directory
   */
  async initializeQRDirectory() {
    try {
      await fs.mkdir(this.qrDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating QR directory:', error);
    }
  }

  /**
   * Generate HMAC signature for QR data
   * @param {string} data - Data to sign
   * @returns {string} - HMAC signature
   */
  generateSignature(data) {
    return crypto
      .createHmac('sha256', this.signatureKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   * @param {string} data - Original data
   * @param {string} signature - Signature to verify
   * @returns {boolean} - True if valid
   */
  verifySignature(data, signature) {
    try {
      const expectedSignature = this.generateSignature(data);
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Generate QR code data for an event
   * @param {Object} event - Event object
   * @returns {Object} - QR data and signature
   */
  generateEventQRData(event) {
    const qrData = {
      type: 'event',
      eventId: event._id.toString(),
      title: event.title,
      date: event.startDateTime.toISOString(),
      venue: event.venue.name,
      timestamp: Date.now(),
    };

    const dataString = JSON.stringify(qrData);
    const signature = this.generateSignature(dataString);

    return {
      data: dataString,
      signature,
      qrData,
    };
  }

  /**
   * Generate QR code data for user ticket
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @returns {Object} - QR data and signature
   */
  generateUserTicketQRData(user, event) {
    const qrData = {
      type: 'ticket',
      userId: user._id.toString(),
      eventId: event._id.toString(),
      userName: user.fullname,
      userEmail: user.email,
      eventTitle: event.title,
      eventDate: event.startDateTime.toISOString(),
      timestamp: Date.now(),
    };

    const dataString = JSON.stringify(qrData);
    const signature = this.generateSignature(dataString);

    return {
      data: dataString,
      signature,
      qrData,
    };
  }

  /**
   * Generate QR code image
   * @param {string} data - Data to encode
   * @param {Object} options - QR code options
   * @returns {Promise<string>} - File path or data URL
   */
  async generateQRCode(data, options = {}) {
    const {
      width = 300,
      margin = 2,
      errorCorrectionLevel = 'H',
      color = { dark: '#000000', light: '#FFFFFF' },
      toFile = false,
      fileName = null,
    } = options;

    const qrOptions = {
      width,
      margin,
      errorCorrectionLevel,
      color,
    };

    try {
      if (toFile && fileName) {
        // Generate to file
        const filePath = path.join(this.qrDir, fileName);
        await QRCode.toFile(filePath, data, qrOptions);
        logger.info(`QR code generated: ${filePath}`);
        return `/uploads/qr-codes/${fileName}`;
      } else {
        // Generate data URL
        const dataURL = await QRCode.toDataURL(data, qrOptions);
        return dataURL;
      }
    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw new AppError('Failed to generate QR code', 500);
    }
  }

  /**
   * Generate event QR code
   * @param {Object} event - Event object
   * @returns {Promise<Object>} - QR code URL and data
   */
  async generateEventQR(event) {
    try {
      const { data, signature, qrData } = this.generateEventQRData(event);
      
      // Create composite data for QR code
      const qrContent = JSON.stringify({
        data,
        signature,
      });

      const fileName = `event-${event._id}-${Date.now()}.png`;
      const qrCodeUrl = await this.generateQRCode(qrContent, {
        toFile: true,
        fileName,
        width: 400,
        errorCorrectionLevel: 'H',
      });

      return {
        qrCodeUrl,
        qrData: data,
        qrSignature: signature,
        decodedData: qrData,
      };
    } catch (error) {
      logger.error('Error generating event QR:', error);
      throw error;
    }
  }

  /**
   * Generate user ticket QR code
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @returns {Promise<Object>} - QR code URL and data
   */
  async generateUserTicketQR(user, event) {
    try {
      const { data, signature, qrData } = this.generateUserTicketQRData(user, event);
      
      // Create composite data for QR code
      const qrContent = JSON.stringify({
        data,
        signature,
      });

      const fileName = `ticket-${user._id}-${event._id}-${Date.now()}.png`;
      const qrCodeUrl = await this.generateQRCode(qrContent, {
        toFile: true,
        fileName,
        width: 300,
        errorCorrectionLevel: 'H',
      });

      return {
        qrCodeUrl,
        qrData: data,
        qrSignature: signature,
        decodedData: qrData,
      };
    } catch (error) {
      logger.error('Error generating user ticket QR:', error);
      throw error;
    }
  }

  /**
   * Verify QR code data
   * @param {string} qrContent - Scanned QR content
   * @returns {Object} - Verification result
   */
  verifyQRCode(qrContent) {
    try {
      // Parse QR content
      const parsed = JSON.parse(qrContent);
      const { data, signature } = parsed;

      if (!data || !signature) {
        return {
          valid: false,
          error: 'Invalid QR code format',
        };
      }

      // Verify signature
      const isValid = this.verifySignature(data, signature);

      if (!isValid) {
        logger.warn('QR code signature verification failed');
        return {
          valid: false,
          error: 'QR code signature is invalid. Possible tampering detected.',
        };
      }

      // Parse data
      const qrData = JSON.parse(data);

      // Check timestamp (QR codes expire after 24 hours for security)
      const qrAge = Date.now() - qrData.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (qrAge > maxAge) {
        return {
          valid: false,
          error: 'QR code has expired',
        };
      }

      return {
        valid: true,
        data: qrData,
      };
    } catch (error) {
      logger.error('Error verifying QR code:', error);
      return {
        valid: false,
        error: 'Failed to verify QR code',
      };
    }
  }

  /**
   * Generate batch QR codes for multiple users
   * @param {Array} users - Array of user objects
   * @param {Object} event - Event object
   * @returns {Promise<Array>} - Array of QR code results
   */
  async generateBatchUserTickets(users, event) {
    try {
      const results = [];

      for (const user of users) {
        try {
          const qr = await this.generateUserTicketQR(user, event);
          results.push({
            userId: user._id,
            success: true,
            ...qr,
          });
        } catch (error) {
          logger.error(`Failed to generate QR for user ${user._id}:`, error);
          results.push({
            userId: user._id,
            success: false,
            error: error.message,
          });
        }
      }

      logger.info(`Generated ${results.filter(r => r.success).length}/${users.length} QR codes`);
      return results;
    } catch (error) {
      logger.error('Error in batch QR generation:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for certificate verification
   * @param {Object} certificate - Certificate object
   * @returns {Promise<string>} - QR code data URL
   */
  async generateCertificateVerificationQR(certificate) {
    try {
      const verificationUrl = `${config.app.frontendUrl}/verify/${certificate.verificationHash}`;
      
      const qrData = {
        type: 'certificate',
        certificateId: certificate._id.toString(),
        certificateNumber: certificate.certificateNumber,
        verificationUrl,
        timestamp: Date.now(),
      };

      const dataString = JSON.stringify(qrData);
      const signature = this.generateSignature(dataString);

      const qrContent = JSON.stringify({
        data: dataString,
        signature,
      });

      // Generate as data URL for embedding in PDF
      const dataURL = await this.generateQRCode(qrContent, {
        width: 200,
        errorCorrectionLevel: 'H',
      });

      return dataURL;
    } catch (error) {
      logger.error('Error generating certificate QR:', error);
      throw error;
    }
  }

  /**
   * Delete QR code file
   * @param {string} filePath - File path to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteQRCode(filePath) {
    try {
      // Extract filename from path
      const fileName = path.basename(filePath);
      const fullPath = path.join(this.qrDir, fileName);
      
      await fs.unlink(fullPath);
      logger.info(`Deleted QR code: ${fullPath}`);
      return true;
    } catch (error) {
      logger.error('Error deleting QR code:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new QRService();
