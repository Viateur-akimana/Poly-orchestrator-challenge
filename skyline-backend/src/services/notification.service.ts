import { NotificationType, NotificationStatus, UserRole } from '@prisma/client';
import { prisma, createLogger } from '../lib';
import { emailService } from './email.service';
import webpush from 'web-push';

const logger = createLogger('NotificationService');

// Initialize Web Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || 'admin@skyline-transfers.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  logger.info('Web Push VAPID details set');
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels?: string[];
}

export class NotificationService {
  /**
   * Create a notification for a user
   */
  async createNotification(notifData: CreateNotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: notifData.userId,
          type: notifData.type,
          title: notifData.title,
          message: notifData.message,
          data: notifData.data || {},
          channels: notifData.channels || ['WEB', 'EMAIL', 'PUSH'],
          status: NotificationStatus.PENDING,
        }
      });

      // Handle Push Notifications
      if (notification.channels.includes('PUSH')) {
        this.sendPushNotification(notifData.userId, {
          title: notifData.title,
          body: notifData.message,
          data: {
            url: notifData.data?.url || '/dashboard',
            id: notification.id
          }
        }).catch(err => logger.error('Push notification failed:', err));
      }

      // Handle different channels
      if (notification.channels.includes('EMAIL')) {
        // Handled by specific email flows or a generic one can be added here
      }

      logger.info(`Notification created for user ${notifData.userId}: ${notifData.title}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to all user's devices
   */
  async sendPushNotification(userId: string, payload: { title: string, body: string, data?: any }) {
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
      });

      if (subscriptions.length === 0) return;

      const pushPayload = JSON.stringify(payload);

      const notifications = subscriptions.map(sub => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        return webpush.sendNotification(pushSubscription, pushPayload)
          .catch(async (error) => {
            if (error.statusCode === 410 || error.statusCode === 404) {
              // Subscription has expired or is no longer valid
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
              logger.info(`Deleted expired push subscription: ${sub.id}`);
            } else {
              logger.error(`Error sending push notification to ${sub.id}:`, error);
            }
          });
      });

      await Promise.all(notifications);
    } catch (error) {
      logger.error('Error in sendPushNotification:', error);
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribePush(userId: string, subscription: any) {
    try {
      const { endpoint, keys } = subscription;
      
      return await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth
        },
        create: {
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        }
      });
    } catch (error) {
      logger.error('Error subscribing to push:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribePush(userId: string, endpoint: string) {
    try {
      return await prisma.pushSubscription.deleteMany({
        where: {
          userId,
          endpoint
        }
      });
    } catch (error) {
      logger.error('Error unsubscribing from push:', error);
      throw error;
    }
  }

  /**
   * Notify all admins
   */
  async notifyAdmins(data: { title: string; message: string; type: NotificationType; payload?: any }) {
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: UserRole.ADMIN,
          status: 'ACTIVE'
        }
      });

      if (admins.length === 0) {
        logger.warn('No active admins found to notify');
        return;
      }

      await Promise.all(admins.map(admin => 
        this.createNotification({
          userId: admin.id,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.payload,
          channels: ['WEB', 'EMAIL', 'PUSH']
        })
      ));

      logger.info(`Admin notification sent to ${admins.length} admins: ${data.title}`);
    } catch (error) {
      logger.error('Error notifying admins:', error);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, filters: { read?: boolean, limit?: number, page?: number }) {
    try {
      const limit = filters.limit || 50;
      const page = filters.page || 1;
      const skip = (page - 1) * limit;

      const where: any = { userId };
      if (filters.read !== undefined) {
        where.readAt = filters.read ? { not: null } : null;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip
        }),
        prisma.notification.count({ where })
      ]);

      return {
        notifications: notifications.map(n => ({
          ...n,
          read: !!n.readAt
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark as read
   */
  async markAsRead(userId: string, notificationIds: string[]) {
    try {
      if (notificationIds.length === 0) {
        return await prisma.notification.updateMany({
          where: { userId, readAt: null },
          data: { readAt: new Date(), status: NotificationStatus.READ }
        });
      }

      return await prisma.notification.updateMany({
        where: {
          userId,
          id: { in: notificationIds }
        },
        data: {
          readAt: new Date(),
          status: NotificationStatus.READ
        }
      });
    } catch (error) {
      logger.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    try {
      return await prisma.notification.count({
        where: {
          userId,
          readAt: null
        }
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
