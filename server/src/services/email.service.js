import logger from '../config/logger.js';

/**
 * Email service interface.
 * Replace the stub implementations with a real provider (Nodemailer + SMTP, SendGrid, AWS SES, etc.)
 * without touching any other code — this is the only file that needs changing.
 */
export const emailService = {
  /**
   * Send a password reset email with a token link.
   */
  async sendPasswordResetEmail(to, resetToken, name) {
    // Stub: log in dev, replace with real provider in production
    logger.info(
      { to, name, tokenPreview: resetToken.slice(0, 8) + '...' },
      '[EmailService STUB] Password reset email queued',
    );
    // Real implementation example:
    // await transporter.sendMail({
    //   from: config.EMAIL_FROM,
    //   to,
    //   subject: 'Reset your Gangaram Sweets password',
    //   html: renderPasswordResetTemplate({ name, resetToken, expiryMinutes: config.PASSWORD_RESET_EXPIRES_MINUTES }),
    // });
  },

  /**
   * Send an order confirmation email.
   */
  async sendOrderConfirmationEmail(to, orderNumber, name, totalPaise) {
    logger.info(
      { to, orderNumber },
      '[EmailService STUB] Order confirmation email queued',
    );
  },

  /**
   * Send an order status update email.
   */
  async sendOrderStatusUpdateEmail(to, orderNumber, newStatus, name) {
    logger.info(
      { to, orderNumber, newStatus },
      '[EmailService STUB] Order status update email queued',
    );
  },

  /**
   * Send email verification link.
   */
  async sendEmailVerification(to, verificationToken, name) {
    logger.info(
      { to, name },
      '[EmailService STUB] Email verification queued',
    );
  },
};
