/**
 * Audit Logging Service
 * Tracks user actions, admin operations, and system events for compliance
 * Uses existing Prisma AuditLog model with AuditAction enum
 */

import { AuditAction } from '@prisma/client';
import { prisma, createLogger } from '../lib';

const logger = createLogger('AuditService');

// Re-export the Prisma AuditAction enum for convenience
export { AuditAction };

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  entityType: string;
  entityId?: string;
  transferOrderId?: string;
  ipAddress?: string;
  userAgent?: string;
  oldData?: any;
  newData?: any;
}

class AuditService {
  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: entry.action,
          userId: entry.userId,
          entityType: entry.entityType,
          entityId: entry.entityId,
          transferOrderId: entry.transferOrderId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          oldData: entry.oldData,
          newData: entry.newData,
        },
      });

      logger.info(`Audit: ${entry.action}`, {
        userId: entry.userId,
        entityType: entry.entityType,
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      logger.error('Failed to create audit log entry:', error);
    }
  }

  /**
   * Log user login
   */
  async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    await this.log({
      action: AuditAction.LOGIN,
      userId,
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log transfer creation
   */
  async logTransferCreated(userId: string, transferId: string, transferData: any, ipAddress?: string) {
    await this.log({
      action: AuditAction.TRANSFER_ORDER_CREATED,
      userId,
      entityType: 'TransferOrder',
      entityId: transferId,
      transferOrderId: transferId,
      ipAddress,
      newData: {
        amount: transferData.sendAmount,
        recipient: transferData.recipientName,
        recipientPhone: transferData.recipientPhone,
      },
    });
  }

  /**
   * Log transfer update
   */
  async logTransferUpdated(userId: string, transferId: string, oldData: any, newData: any) {
    await this.log({
      action: AuditAction.TRANSFER_ORDER_UPDATED,
      userId,
      entityType: 'TransferOrder',
      entityId: transferId,
      transferOrderId: transferId,
      oldData,
      newData,
    });
  }

  /**
   * Log user status change by admin
   */
  async logUserStatusChange(adminId: string, targetUserId: string, oldStatus: string, newStatus: string) {
    await this.log({
      action: AuditAction.UPDATE,
      userId: adminId,
      entityType: 'User',
      entityId: targetUserId,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
    });
  }

  /**
   * Log user role change by admin
   */
  async logUserRoleChange(adminId: string, targetUserId: string, oldRole: string, newRole: string) {
    await this.log({
      action: AuditAction.UPDATE,
      userId: adminId,
      entityType: 'User',
      entityId: targetUserId,
      oldData: { role: oldRole },
      newData: { role: newRole },
    });
  }

  /**
   * Log password change
   */
  async logPasswordChange(userId: string, ipAddress?: string) {
    await this.log({
      action: AuditAction.PASSWORD_CHANGE,
      userId,
      entityType: 'User',
      entityId: userId,
      ipAddress,
    });
  }

  /**
   * Log profile update
   */
  async logProfileUpdate(userId: string, oldData: any, newData: any) {
    await this.log({
      action: AuditAction.PROFILE_UPDATE,
      userId,
      entityType: 'User',
      entityId: userId,
      oldData,
      newData,
    });
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters: {
    userId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { userId, action, startDate, endDate, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const auditService = new AuditService();
