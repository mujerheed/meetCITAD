import twilio from 'twilio';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * SMS Service
 * Handles SMS sending via Twilio
 */

class SMSService {
  constructor() {
    this.client = null;
    this.fromPhone = config.sms.fromPhone;
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client
   */
  initializeTwilio() {
    try {
      if (config.sms.accountSid && config.sms.authToken) {
        this.client = twilio(config.sms.accountSid, config.sms.authToken);
        logger.info('Twilio initialized successfully');
      } else {
        logger.warn('Twilio credentials not found. SMS service disabled.');
      }
    } catch (error) {
      logger.error('Error initializing Twilio:', error);
    }
  }

  /**
   * Send SMS
   * @param {string} to - Recipient phone number
   * @param {string} message - SMS message
   * @returns {Promise<Object>} - Send result
   */
  async sendSMS(to, message) {
    if (!this.client) {
      logger.warn('SMS service not initialized. Skipping SMS send.');
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      // Ensure phone number is in E.164 format
      const formattedPhone = this.formatPhoneNumber(to);

      const result = await this.client.messages.create({
        body: message,
        from: this.fromPhone,
        to: formattedPhone,
      });

      logger.info(`SMS sent to ${formattedPhone}: ${message.substring(0, 50)}...`);
      return {
        success: true,
        messageId: result.sid,
        status: result.status,
      };
    } catch (error) {
      logger.error('Error sending SMS:', error);
      throw new AppError('Failed to send SMS', 500);
    }
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phone - Phone number
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with +234 (Nigeria)
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    }

    // If doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Send OTP via SMS
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code
   * @returns {Promise<Object>}
   */
  async sendOTP(phone, otp) {
    const message = `Your meetCITAD verification code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send event registration confirmation SMS
   * @param {string} phone - Phone number
   * @param {string} userName - User name
   * @param {string} eventTitle - Event title
   * @param {Date} eventDate - Event date
   * @returns {Promise<Object>}
   */
  async sendEventRegistrationSMS(phone, userName, eventTitle, eventDate) {
    const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const message = `Hi ${userName}, you're registered for "${eventTitle}" on ${formattedDate}. Check your email for your QR ticket. - meetCITAD`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send event reminder SMS
   * @param {string} phone - Phone number
   * @param {string} userName - User name
   * @param {string} eventTitle - Event title
   * @param {Date} eventDate - Event date
   * @returns {Promise<Object>}
   */
  async sendEventReminderSMS(phone, userName, eventTitle, eventDate) {
    const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const message = `Reminder: "${eventTitle}" is tomorrow (${formattedDate}). Don't forget your QR code! - meetCITAD`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send certificate ready SMS
   * @param {string} phone - Phone number
   * @param {string} userName - User name
   * @param {string} eventTitle - Event title
   * @returns {Promise<Object>}
   */
  async sendCertificateSMS(phone, userName, eventTitle) {
    const message = `Hi ${userName}, your certificate for "${eventTitle}" is ready! Download it from your meetCITAD profile.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send password reset SMS
   * @param {string} phone - Phone number
   * @param {string} resetCode - Reset code
   * @returns {Promise<Object>}
   */
  async sendPasswordResetSMS(phone, resetCode) {
    const message = `Your meetCITAD password reset code is: ${resetCode}. This code will expire in 1 hour. If you didn't request this, please ignore.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send bulk SMS
   * @param {Array} recipients - Array of {phone, message} objects
   * @returns {Promise<Array>} - Array of send results
   */
  async sendBulkSMS(recipients) {
    if (!this.client) {
      logger.warn('SMS service not initialized. Skipping bulk SMS send.');
      return recipients.map(() => ({ success: false, message: 'SMS service not configured' }));
    }

    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS(recipient.phone, recipient.message);
        results.push({
          phone: recipient.phone,
          ...result,
        });
      } catch (error) {
        logger.error(`Failed to send SMS to ${recipient.phone}:`, error);
        results.push({
          phone: recipient.phone,
          success: false,
          error: error.message,
        });
      }
    }

    logger.info(`Sent ${results.filter(r => r.success).length}/${recipients.length} SMS messages`);
    return results;
  }

  /**
   * Check SMS delivery status
   * @param {string} messageId - Twilio message SID
   * @returns {Promise<Object>} - Delivery status
   */
  async checkDeliveryStatus(messageId) {
    if (!this.client) {
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        success: true,
        status: message.status,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error) {
      logger.error('Error checking SMS status:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export default new SMSService();
