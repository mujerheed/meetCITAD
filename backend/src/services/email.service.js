import Mailjet from 'node-mailjet';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Email Service
 * Handles email sending via Mailjet with templates
 */

class EmailService {
  constructor() {
    this.mailjet = null;
    this.fromEmail = config.email.fromEmail;
    this.fromName = config.email.fromName;
    this.initializeMailjet();
  }

  /**
   * Initialize Mailjet client
   */
  initializeMailjet() {
    try {
      if (config.email.apiKey && config.email.apiSecret) {
        this.mailjet = Mailjet.apiConnect(
          config.email.apiKey,
          config.email.apiSecret
        );
        logger.info('Mailjet initialized successfully');
      } else {
        logger.warn('Mailjet credentials not found. Email service disabled.');
      }
    } catch (error) {
      logger.error('Error initializing Mailjet:', error);
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail(options) {
    const {
      to,
      subject,
      text,
      html,
      cc = null,
      bcc = null,
      attachments = [],
    } = options;

    if (!this.mailjet) {
      logger.warn('Email service not initialized. Skipping email send.');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const message = {
        From: {
          Email: this.fromEmail,
          Name: this.fromName,
        },
        To: Array.isArray(to) ? to : [{ Email: to }],
        Subject: subject,
        TextPart: text,
        HTMLPart: html,
      };

      if (cc) {
        message.Cc = Array.isArray(cc) ? cc : [{ Email: cc }];
      }

      if (bcc) {
        message.Bcc = Array.isArray(bcc) ? bcc : [{ Email: bcc }];
      }

      if (attachments.length > 0) {
        message.Attachments = attachments;
      }

      const request = this.mailjet
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [message],
        });

      const result = await request;

      logger.info(`Email sent to ${to}: ${subject}`);
      return {
        success: true,
        messageId: result.body.Messages[0].To[0].MessageID,
        data: result.body,
      };
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new AppError('Failed to send email', 500);
    }
  }

  /**
   * Send welcome email
   * @param {Object} user - User object
   * @param {string} verificationToken - Email verification token
   * @returns {Promise<Object>}
   */
  async sendWelcomeEmail(user, verificationToken) {
    const verificationUrl = `${config.app.frontendUrl}/verify-email/${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to meetCITAD!</h1>
          </div>
          <div class="content">
            <p>Hello ${user.fullname},</p>
            <p>Thank you for registering with meetCITAD! We're excited to have you join our community.</p>
            <p>To get started, please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <p>Best regards,<br>The meetCITAD Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CITAD. All rights reserved.</p>
            <p>Kano, Nigeria</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to meetCITAD - Verify Your Email',
      text: `Hello ${user.fullname}, Please verify your email: ${verificationUrl}`,
      html,
    });
  }

  /**
   * Send event registration confirmation
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @param {string} qrCodeUrl - QR code image URL
   * @returns {Promise<Object>}
   */
  async sendEventRegistrationEmail(user, event, qrCodeUrl) {
    const eventDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const eventTime = new Date(event.startDateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .event-details { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #1976d2; }
          .qr-code { text-align: center; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Registration Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hello ${user.fullname},</p>
            <p>You have successfully registered for the following event:</p>
            <div class="event-details">
              <h2>${event.title}</h2>
              <p><strong>Date:</strong> ${eventDate}</p>
              <p><strong>Time:</strong> ${eventTime}</p>
              <p><strong>Venue:</strong> ${event.venue.name}</p>
              ${event.venue.address ? `<p><strong>Address:</strong> ${event.venue.address}</p>` : ''}
            </div>
            <p><strong>Important:</strong> Please save this email or take a screenshot of the QR code below. You'll need it for check-in at the event.</p>
            <div class="qr-code">
              <h3>Your Event Ticket</h3>
              <p>Show this QR code at the venue for check-in:</p>
              <img src="${config.app.backendUrl}${qrCodeUrl}" alt="Event QR Code" style="max-width: 300px;" />
            </div>
            <p>We look forward to seeing you at the event!</p>
            <p>Best regards,<br>The meetCITAD Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CITAD. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Registration Confirmed: ${event.title}`,
      text: `You are registered for ${event.title} on ${eventDate} at ${eventTime}`,
      html,
    });
  }

  /**
   * Send event reminder
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @returns {Promise<Object>}
   */
  async sendEventReminder(user, event) {
    const eventDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const eventTime = new Date(event.startDateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .event-details { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #ff9800; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Event Reminder</h1>
          </div>
          <div class="content">
            <p>Hello ${user.fullname},</p>
            <p>This is a friendly reminder about your upcoming event:</p>
            <div class="event-details">
              <h2>${event.title}</h2>
              <p><strong>Date:</strong> ${eventDate}</p>
              <p><strong>Time:</strong> ${eventTime}</p>
              <p><strong>Venue:</strong> ${event.venue.name}</p>
            </div>
            <p>Don't forget to bring your QR code for check-in!</p>
            <p>See you there!</p>
            <p>Best regards,<br>The meetCITAD Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CITAD. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Reminder: ${event.title} is coming up!`,
      text: `Reminder: ${event.title} on ${eventDate} at ${eventTime}`,
      html,
    });
  }

  /**
   * Send certificate ready notification
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @param {string} certificateUrl - Certificate download URL
   * @returns {Promise<Object>}
   */
  async sendCertificateEmail(user, event, certificateUrl) {
    const downloadUrl = `${config.app.frontendUrl}/certificates/${certificateUrl}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4caf50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #4caf50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Your Certificate is Ready!</h1>
          </div>
          <div class="content">
            <p>Hello ${user.fullname},</p>
            <p>Congratulations! Your certificate of attendance for <strong>${event.title}</strong> is now available for download.</p>
            <a href="${downloadUrl}" class="button">Download Certificate</a>
            <p>You can also access your certificate anytime from your profile dashboard.</p>
            <p>Thank you for attending our event!</p>
            <p>Best regards,<br>The meetCITAD Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CITAD. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Your Certificate for ${event.title} is Ready!`,
      text: `Your certificate is ready. Download it here: ${downloadUrl}`,
      html,
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   * @returns {Promise<Object>}
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${config.app.frontendUrl}/reset-password/${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #f44336; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${user.fullname},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p><strong>If you didn't request this,</strong> please ignore this email and your password will remain unchanged.</p>
            <p>Best regards,<br>The meetCITAD Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CITAD. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Reset your password: ${resetUrl}`,
      html,
    });
  }

  /**
   * Send feedback request email
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @returns {Promise<Object>}
   */
  async sendFeedbackRequest(user, event) {
    const feedbackUrl = `${config.app.frontendUrl}/events/${event._id}/feedback`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9c27b0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #9c27b0; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 We Value Your Feedback!</h1>
          </div>
          <div class="content">
            <p>Hello ${user.fullname},</p>
            <p>Thank you for attending <strong>${event.title}</strong>!</p>
            <p>We'd love to hear about your experience. Your feedback helps us improve future events.</p>
            <a href="${feedbackUrl}" class="button">Share Your Feedback</a>
            <p>The survey only takes 2-3 minutes to complete.</p>
            <p>Thank you for your time!</p>
            <p>Best regards,<br>The meetCITAD Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CITAD. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Share Your Feedback: ${event.title}`,
      text: `Please share your feedback for ${event.title}: ${feedbackUrl}`,
      html,
    });
  }
}

// Export singleton instance
export default new EmailService();
