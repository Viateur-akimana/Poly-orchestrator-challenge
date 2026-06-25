/**
 * Email Service - Nodemailer Implementation
 * Handles email verification, password reset, and transfer notifications
 */

import nodemailer from 'nodemailer';
import { prisma, createLogger } from '../lib';

const logger = createLogger('EmailService');

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface TransferNotificationData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  amount: number;
  currency: string;
  receiveAmount: number;
  receiveCurrency: string;
  reference: string;
  status: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;
  private isConfigured: boolean = false;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@skyline-transfers.com';
    this.fromName = process.env.SMTP_FROM_NAME || 'SKYLINE Transfers';

    // Initialize transporter
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      logger.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.');
      this.isConfigured = false;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.isConfigured = true;
    console.log('✅ Email service configured successfully');
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Email service not configured. Email not sent:', options.subject);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      console.log(`✉️ Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SKYLINE Transfers</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Secure Russia to Rwanda Money Transfers</p>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Verify Your Email Address</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">Hi ${firstName},</p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Thank you for registering with SKYLINE Transfers. Please verify your email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Verify Email
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Or copy and paste this link in your browser:<br>
              <a href="${verificationUrl}" style="color: #10b981; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              This link will expire in 24 hours. If you didn't create an account, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} SKYLINE Transfers. All rights reserved.<br>
              Secure, fast, and affordable money transfers.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - SKYLINE Transfers',
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SKYLINE Transfers</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Reset Your Password</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">Hi ${firstName},</p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} SKYLINE Transfers. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - SKYLINE Transfers',
      html,
    });
  }

  /**
   * Send transfer created notification
   */
  async sendTransferCreatedEmail(data: TransferNotificationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transfer Created</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SKYLINE Transfers</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Transfer Order Created</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">Hi ${data.recipientName},</p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Your transfer order has been created successfully. Please complete the payment to proceed.
            </p>
            
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Transfer Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Reference:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Amount to Pay:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.amount.toLocaleString()} ${data.currency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Recipient Gets:</td>
                  <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">${data.receiveAmount.toLocaleString()} ${data.receiveCurrency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">AWAITING PAYMENT</span>
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Complete your payment via Sberbank using the QR code or card details in your dashboard.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/transfers/${data.reference}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Transfer
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} SKYLINE Transfers. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `Transfer Created - ${data.reference} - SKYLINE Transfers`,
      html,
    });
  }

  /**
   * Send transfer paid notification (awaiting approval)
   */
  async sendTransferPaidEmail(data: TransferNotificationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SKYLINE Transfers</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">💳 Payment Received!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">Hi ${data.recipientName},</p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              We have received your Sberbank payment for transfer <strong>${data.reference}</strong>. 
              Your transfer is now being reviewed and will be processed shortly.
            </p>
            
            <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">What's Next?</h3>
              <p style="color: #1e40af; margin: 0; font-size: 14px;">
                Our team will review your payment and process the Rwanda MTN payout within 1-24 hours. 
                You'll receive another email once your transfer is completed.
              </p>
            </div>
            
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Reference:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Amount Paid:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.amount.toLocaleString()} ${data.currency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Recipient Gets:</td>
                  <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">${data.receiveAmount.toLocaleString()} ${data.receiveCurrency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">PAID - AWAITING APPROVAL</span>
                  </td>
                </tr>
              </table>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} SKYLINE Transfers. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `Payment Received - ${data.reference} - SKYLINE Transfers`,
      html,
    });
  }

  /**
   * Send transfer completed notification
   */
  async sendTransferCompletedEmail(data: TransferNotificationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transfer Completed</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SKYLINE Transfers</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: #d1fae5; border-radius: 50%; padding: 20px;">
                <span style="font-size: 40px;">✅</span>
              </div>
            </div>
            
            <h2 style="color: #1f2937; margin: 0 0 20px 0; text-align: center;">Transfer Completed!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; text-align: center;">
              Great news! Your transfer has been completed successfully. 
              The money has been sent to the recipient's MTN Mobile Money account.
            </p>
            
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Reference:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Amount Sent:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.amount.toLocaleString()} ${data.currency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Recipient Received:</td>
                  <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">${data.receiveAmount.toLocaleString()} ${data.receiveCurrency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">COMPLETED</span>
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; text-align: center;">
              Thank you for using SKYLINE Transfers!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/send-money" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Send Another Transfer
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} SKYLINE Transfers. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `Transfer Completed ✅ - ${data.reference} - SKYLINE Transfers`,
      html,
    });
  }

  /**
   * Send admin notification for new transfer awaiting approval
   */
  async sendAdminApprovalNotification(transferData: any): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn('ADMIN_EMAIL not configured. Admin notification not sent.');
      return false;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Transfer Awaiting Approval</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Admin Alert</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">New Transfer Awaiting Approval</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              A new transfer has been paid and requires your approval. Please review and process the Rwanda MTN payout.
            </p>
            
            <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px;">Transfer Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #78350f;">Reference:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${transferData.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #78350f;">Sender:</td>
                  <td style="padding: 8px 0; color: #1f2937; text-align: right;">${transferData.senderName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #78350f;">Amount Paid:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${Number(transferData.sendAmount).toLocaleString()} RUB</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #dbeafe; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">Rwanda MTN Payout Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #1e40af;">Recipient:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${transferData.recipientName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #1e40af;">Phone:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${transferData.recipientPhone}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #1e40af;">Amount:</td>
                  <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">${Number(transferData.receiveAmount).toLocaleString()} RWF</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/transfers" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Review & Approve
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              SKYLINE Transfers Admin Notification
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `⚠️ New Transfer Awaiting Approval - ${transferData.reference}`,
      html,
    });
  }

  /**
   * Send admin notification for a BRAND NEW transfer order
   */
  async sendAdminNewOrderNotification(transferData: any): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn('ADMIN_EMAIL not configured. Admin notification not sent.');
      return false;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Transfer Order Created</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📦 New Order Notification</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">New Transfer Order Created</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              A new transfer order has been created by <strong>${transferData.senderName}</strong>. 
              The user is currently in the payment stage.
            </p>
            
            <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Reference:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${transferData.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Sender:</td>
                  <td style="padding: 8px 0; color: #1f2937; text-align: right;">${transferData.senderName} (${transferData.user?.email || 'N/A'})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${Number(transferData.sendAmount).toLocaleString()} ${transferData.fromCurrency?.code || 'RUB'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Recipient:</td>
                  <td style="padding: 8px 0; color: #1f2937; text-align: right;">${transferData.recipientName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Gets:</td>
                  <td style="padding: 8px 0; color: #059669; font-weight: 600; text-align: right;">${Number(transferData.receiveAmount).toLocaleString()} ${transferData.toCurrency?.code || 'RWF'}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/transfers" style="display: inline-block; background: #10b981; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View in Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              SKYLINE Transfers Admin Notification system
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `📦 New Order Created - ${transferData.reference} - ${transferData.senderName}`,
      html,
    });
  }

  /**
   * Send notification when payment proof is uploaded
   */
  async sendProofUploadedEmail(data: { senderEmail: string; senderName: string; reference: string; amount: number }): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Proof Received</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Proof Received</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Your payment proof has been received</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Thank you! We've received your payment proof and it is now under review by our admin team.
            </p>
            
            <div style="background: #dbeafe; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0;">Transfer Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #1e40af;">Reference:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #1e40af;">Amount:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${Number(data.amount).toLocaleString()} RUB</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #1e40af;">Status:</td>
                  <td style="padding: 8px 0; color: #f59e0b; font-weight: 600; text-align: right;">Under Review</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Our team will verify your payment within 24 hours. Once approved, the funds will be sent to Rwanda via MTN.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              SKYLINE Transfers - Secure Money Transfer
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.senderEmail,
      subject: `Payment Proof Received - ${data.reference} - SKYLINE Transfers`,
      html,
    });
  }

  /**
   * Send notification when payment proof is verified
   */
  async sendPaymentVerifiedEmail(data: { recipientEmail: string; recipientName: string; reference: string; amount: number }): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Verified</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Payment Verified</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Your payment has been verified!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Great news! Your payment has been verified and approved. Your MTN payout is being processed.
            </p>
            
            <div style="background: #d1fae5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="color: #065f46; margin: 0 0 15px 0;">Transfer Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Reference:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Amount:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${Number(data.amount).toLocaleString()} RWF</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Status:</td>
                  <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">Processing</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              You should receive your MTN payout within 1-3 minutes. Please check your phone for an incoming transfer.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              SKYLINE Transfers - Secure Money Transfer
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `Payment Verified - ${data.reference} - SKYLINE Transfers`,
      html,
    });
  }

  /**
   * Send notification when payment proof is rejected
   */
  async sendPaymentRejectedEmail(data: { senderEmail: string; senderName: string; reference: string; reason: string }): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Proof Rejected</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Proof Rejected</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Your payment proof was rejected</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              We were unable to verify your payment proof. Please review the reason below and resubmit a clear, valid proof of payment.
            </p>
            
            <div style="background: #fee2e2; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <h3 style="color: #7f1d1d; margin: 0 0 15px 0;">Rejection Reason</h3>
              <p style="color: #7f1d1d; margin: 0; line-height: 1.6;">${data.reason}</p>
            </div>
            
            <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0;">What to do next:</h3>
              <ul style="color: #78350f; margin: 10px 0; padding-left: 20px;">
                <li>Take a clear screenshot or photo of your bank transfer confirmation</li>
                <li>Ensure the reference number is visible in the payment description</li>
                <li>Resubmit the proof through your dashboard</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/transfers/${data.reference}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Resubmit Proof
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              SKYLINE Transfers - Secure Money Transfer
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.senderEmail,
      subject: `Action Required: Proof Rejected - ${data.reference} - SKYLINE Transfers`,
      html,
    });
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Check if email service is configured
   */
  isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();
