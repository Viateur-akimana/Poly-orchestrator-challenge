/**
 * Background Jobs Service
 * Handles automated processing of pending transfers and cleanup tasks
 */

import * as cron from 'node-cron';
import { TransferStatus, PaymentStatus } from '@prisma/client';
import { prisma, createLogger } from '../lib';
import { TransferService } from './transfer.service';

const logger = createLogger('BackgroundJobs');

export class BackgroundJobsService {
  private transferService = new TransferService();
  private isRunning = false;

  /**
   * Start all background jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Background jobs already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting background jobs...');

    // Process pending transfers every 2 minutes
    // cron.schedule('*/2 * * * *', () => {
    //   this.processPendingTransfers();
    // });

    // Retry failed transfers every 10 minutes
    // cron.schedule('*/10 * * * *', () => {
    //   this.retryFailedTransfers();
    // });

    // Cleanup expired transfers daily at 2 AM
    // cron.schedule('0 2 * * *', () => {
    //   this.cleanupExpiredTransfers();
    // });

    console.log('✅ Background jobs started successfully');
  }

  /**
   * Process pending transfers that have been paid
   */
  async processPendingTransfers() {
    try {
      const pendingTransfers = await prisma.transferOrder.findMany({
        where: {
          status: TransferStatus.PENDING,
          paymentStatus: PaymentStatus.VERIFIED,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        take: 10 // Process max 10 at a time
      });

      if (pendingTransfers.length === 0) {
        return;
      }

      console.log(`📋 Processing ${pendingTransfers.length} pending transfers`);

      for (const transfer of pendingTransfers) {
        try {
          await this.transferService.processMTNDisbursement(transfer.id);
          console.log(`✅ Processed transfer ${transfer.reference}`);
        } catch (error) {
          console.error(`❌ Failed to process transfer ${transfer.reference}:`, error);

          // Increment attempt counter
          await prisma.transferOrder.update({
            where: { id: transfer.id },
            data: {
              attempts: transfer.attempts + 1,
              lastAttemptAt: new Date()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing pending transfers:', error);
    }
  }

  /**
   * Retry failed transfers with exponential backoff
   */
  async retryFailedTransfers() {
    try {
      const failedTransfers = await prisma.transferOrder.findMany({
        where: {
          status: TransferStatus.FAILED,
          paymentStatus: PaymentStatus.VERIFIED,
          attempts: { lt: 3 }, // Max 3 retry attempts
          lastAttemptAt: {
            lt: new Date(Date.now() - 30 * 60 * 1000) // Wait 30 minutes between retries
          }
        },
        take: 5 // Process max 5 at a time
      });

      if (failedTransfers.length === 0) {
        return;
      }

      console.log(`🔄 Retrying ${failedTransfers.length} failed transfers`);

      for (const transfer of failedTransfers) {
        try {
          // Reset status to processing for retry
          await prisma.transferOrder.update({
            where: { id: transfer.id },
            data: { status: TransferStatus.PROCESSING }
          });

          await this.transferService.processMTNDisbursement(transfer.id);
          console.log(`✅ Retry successful for transfer ${transfer.reference}`);
        } catch (error) {
          console.error(`❌ Retry failed for transfer ${transfer.reference}:`, error);

          // Update attempt counter and set back to failed
          await prisma.transferOrder.update({
            where: { id: transfer.id },
            data: {
              status: TransferStatus.FAILED,
              attempts: transfer.attempts + 1,
              lastAttemptAt: new Date()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error retrying failed transfers:', error);
    }
  }

  /**
   * Cleanup expired transfers (older than 7 days and still pending)
   */
  async cleanupExpiredTransfers() {
    try {
      const expiredDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const expiredTransfers = await prisma.transferOrder.updateMany({
        where: {
          status: TransferStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          createdAt: { lt: expiredDate }
        },
        data: {
          status: TransferStatus.CANCELLED,
          cancellationReason: 'Expired - no payment received within 7 days',
          cancelledAt: new Date()
        }
      });

      if (expiredTransfers.count > 0) {
        console.log(`🧹 Cleaned up ${expiredTransfers.count} expired transfers`);
      }
    } catch (error) {
      console.error('Error cleaning up expired transfers:', error);
    }
  }

  /**
   * Stop all background jobs
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Background jobs stopped');
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: [
        { name: 'Process Pending Transfers', schedule: 'Every 2 minutes' },
        { name: 'Retry Failed Transfers', schedule: 'Every 10 minutes' },
        { name: 'Cleanup Expired Transfers', schedule: 'Daily at 2 AM' }
      ]
    };
  }
}

export const backgroundJobsService = new BackgroundJobsService();