/**
 * Webhook Security Utilities
 * Handles signature verification for external webhooks
 */

import crypto from 'crypto';

export class WebhookSecurity {
  /**
   * Verify SBP webhook signature
   */
  static verifySBPSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('SBP signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify MTN webhook signature
   */
  static verifyMTNSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );
    } catch (error) {
      console.error('MTN signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate idempotency key for requests
   */
  static generateIdempotencyKey(transferId: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    return crypto
      .createHash('sha256')
      .update(`${transferId}-${ts}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Validate webhook timestamp (prevent replay attacks)
   */
  static isValidTimestamp(timestamp: number, toleranceSeconds = 300): boolean {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);
    return diff <= toleranceSeconds;
  }
}

export default WebhookSecurity;